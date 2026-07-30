import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

import { ElementStructura } from '@/components/floor-plan/ElementStructura'
import { Masa } from '@/components/floor-plan/Masa'
import { cn } from '@/lib/utils'
import type { ElementStructura as Element, MasaHarta, ZonaHarta } from '@/types/floor-plan'

type Props = {
  zona: ZonaHarta
  /** Layer 1 — deocamdata doar se deseneaza, nu se editeaza de aici. */
  structura?: Element[]
  mese: MasaHarta[]
  masaSelectata: string | null
  onSelecteaza: (id: string | null) => void
  /** Se apeleaza o singura data, la finalul gestului, cu pozitia deja aliniata. */
  onMuta: (id: string, x: number, y: number) => void
  /** Cand e activ, un clic pe canvas gol adauga o masa acolo. */
  modAdaugare?: boolean
  onAdauga?: (x: number, y: number) => void
  className?: string
}

type Gest = {
  pointerId: number
  masaId: string
  /** Decalajul dintre coltul mesei si punctul apucat, in coordonate de canvas. */
  decalajX: number
  decalajY: number
}

export function EditorZona({
  zona,
  structura = [],
  mese,
  masaSelectata,
  onSelecteaza,
  onMuta,
  modAdaugare = false,
  onAdauga,
  className,
}: Props) {
  const refSvg = useRef<SVGSVGElement | null>(null)
  const idGrid = useId()

  // Sursa de adevar a gestului e ref-ul, nu starea: la o tragere scurta, cu un
  // singur pointermove, setState nu e inca vizibil in handler si gestul ar fi
  // citit gresit ca un simplu clic. Starea exista doar pentru previzualizare.
  // (Aceeasi lectie ca la mutarea rezervarilor pe calendar.)
  const refGest = useRef<Gest | null>(null)
  const [previzualizare, setPrevizualizare] = useState<{ id: string; x: number; y: number } | null>(
    null,
  )

  /**
   * Conversia din coordonate de ecran in coordonatele viewBox-ului.
   * Aici clientX/clientY sunt CORECTE (spre deosebire de calendar, unde a
   * trebuit pageY): getScreenCTM() lucreaza tot in spatiul clientului, deci
   * derularea paginii se anuleaza de ambele parti ale transformarii.
   */
  function laCanvas(eveniment: { clientX: number; clientY: number }) {
    const svg = refSvg.current
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const punct = svg.createSVGPoint()
    punct.x = eveniment.clientX
    punct.y = eveniment.clientY
    const { x, y } = punct.matrixTransform(ctm.inverse())
    return { x, y }
  }

  function aliniaza(valoare: number): number {
    return Math.round(valoare / zona.grid_marime) * zona.grid_marime
  }

  function inCanvas(masa: MasaHarta, x: number, y: number) {
    return {
      x: Math.min(Math.max(0, x), zona.canvas_latime - masa.latime),
      y: Math.min(Math.max(0, y), zona.canvas_inaltime - masa.inaltime),
    }
  }

  function laPointerDown(eveniment: PointerEvent<SVGSVGElement>) {
    const tinta = (eveniment.target as SVGElement).closest('[data-masa-id]')

    if (!tinta) {
      // Canvas gol: fie adaugam o masa, fie deselectam.
      const punct = laCanvas(eveniment)
      if (modAdaugare && punct && onAdauga) {
        onAdauga(aliniaza(punct.x), aliniaza(punct.y))
      } else {
        onSelecteaza(null)
      }
      return
    }

    const masaId = tinta.getAttribute('data-masa-id')!
    const masa = mese.find((m) => m.id === masaId)
    const punct = laCanvas(eveniment)
    if (!masa || !punct) return

    onSelecteaza(masaId)
    refGest.current = {
      pointerId: eveniment.pointerId,
      masaId,
      decalajX: punct.x - masa.pozitie_x,
      decalajY: punct.y - masa.pozitie_y,
    }
    // Captura pointerului: gestul supravietuieste iesirii de sub cursor si
    // primim pointerup chiar daca degetul pleaca de pe SVG.
    // Poate arunca daca pointerul nu mai e activ (ex. a fost eliberat intre
    // timp). Nu e fatal — fara captura tragerea merge cat timp raman pe SVG —
    // deci nu lasam exceptia sa rupa inceputul gestului.
    try {
      eveniment.currentTarget.setPointerCapture(eveniment.pointerId)
    } catch {
      // ignorat intentionat
    }
  }

  function laPointerMove(eveniment: PointerEvent<SVGSVGElement>) {
    const gest = refGest.current
    // Legat de pointerId-ul care l-a inceput: altfel un pointerup ramas dintr-o
    // alta secventa (ex. dupa hot-reload cu butonul apasat) ar confirma mutarea.
    if (!gest || gest.pointerId !== eveniment.pointerId) return

    const punct = laCanvas(eveniment)
    const masa = mese.find((m) => m.id === gest.masaId)
    if (!punct || !masa) return

    const pozitie = inCanvas(masa, punct.x - gest.decalajX, punct.y - gest.decalajY)
    setPrevizualizare({ id: gest.masaId, x: pozitie.x, y: pozitie.y })
  }

  function laPointerUp(eveniment: PointerEvent<SVGSVGElement>) {
    const gest = refGest.current
    if (!gest || gest.pointerId !== eveniment.pointerId) return

    // Curatam intai starea gestului, apoi eliberam captura. Ordinea conteaza:
    // releasePointerCapture ARUNCA daca pointerul nu mai e capturat — se
    // intampla la pointercancel, unde browserul a eliberat deja captura. Cand
    // apelul era inaintea comiterii, exceptia abandona mutarea si lasa masa
    // blocata in pozitia de previzualizare. (Gasit la testare.)
    refGest.current = null
    setPrevizualizare(null)

    try {
      eveniment.currentTarget.releasePointerCapture(eveniment.pointerId)
    } catch {
      // deja eliberata — nu schimba nimic pentru noi
    }

    const masa = mese.find((m) => m.id === gest.masaId)
    const punct = laCanvas(eveniment)
    if (!masa || !punct) return

    const brut = inCanvas(masa, punct.x - gest.decalajX, punct.y - gest.decalajY)
    const final = inCanvas(masa, aliniaza(brut.x), aliniaza(brut.y))

    // Un clic simplu (fara deplasare) nu trebuie sa produca un UPDATE inutil.
    if (final.x === masa.pozitie_x && final.y === masa.pozitie_y) return
    onMuta(gest.masaId, final.x, final.y)
  }

  /** Mutare de la tastatura: sageti = un pas de grid, cu Shift = un pixel. */
  function laTasta(eveniment: KeyboardEvent<SVGGElement>, masa: MasaHarta) {
    const pas = eveniment.shiftKey ? 1 : zona.grid_marime
    const deplasari: Record<string, [number, number]> = {
      ArrowLeft: [-pas, 0],
      ArrowRight: [pas, 0],
      ArrowUp: [0, -pas],
      ArrowDown: [0, pas],
    }
    const deplasare = deplasari[eveniment.key]
    if (!deplasare) return

    eveniment.preventDefault()
    const pozitie = inCanvas(masa, masa.pozitie_x + deplasare[0], masa.pozitie_y + deplasare[1])
    if (pozitie.x === masa.pozitie_x && pozitie.y === masa.pozitie_y) return
    onMuta(masa.id, pozitie.x, pozitie.y)
  }

  const structuraSortata = [...structura].sort((a, b) => (a.z ?? 0) - (b.z ?? 0))

  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-border', className)}>
      <svg
        ref={refSvg}
        viewBox={`0 0 ${zona.canvas_latime} ${zona.canvas_inaltime}`}
        preserveAspectRatio="xMidYMid meet"
        role="application"
        aria-label={`Editor pentru zona ${zona.nume}`}
        className={cn(
          'h-full w-full touch-none bg-canvas-fundal select-none',
          modAdaugare ? 'cursor-copy' : 'cursor-default',
        )}
        onPointerDown={laPointerDown}
        onPointerMove={laPointerMove}
        onPointerUp={laPointerUp}
        onPointerCancel={laPointerUp}
      >
        <defs>
          <pattern
            id={idGrid}
            width={zona.grid_marime}
            height={zona.grid_marime}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${zona.grid_marime} 0 L 0 0 0 ${zona.grid_marime}`}
              className="fill-none stroke-canvas-grid"
              strokeWidth={1}
            />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill={`url(#${idGrid})`} />

        {structuraSortata.map((element, indice) => (
          <ElementStructura key={`${element.tip}-${indice}`} element={element} />
        ))}

        {mese.map((masa) => {
          const mutata = previzualizare?.id === masa.id ? previzualizare : null
          const afisata = mutata ? { ...masa, pozitie_x: mutata.x, pozitie_y: mutata.y } : masa

          return (
            <g
              key={masa.id}
              data-masa-id={masa.id}
              tabIndex={0}
              role="button"
              aria-label={`Masa ${masa.numar_masa}. Trage cu mouse-ul sau muta cu sagetile.`}
              aria-pressed={masaSelectata === masa.id}
              onKeyDown={(eveniment) => laTasta(eveniment, masa)}
              className={cn(
                'outline-none',
                mutata ? 'cursor-grabbing opacity-80' : 'cursor-grab',
                'focus-visible:[&_.forma]:stroke-canvas-selectie focus-visible:[&_.forma]:stroke-[4]',
              )}
            >
              <Masa
                masa={afisata}
                status={masa.activa && !masa.indisponibila ? 'liber' : 'inactiv'}
                selectata={masaSelectata === masa.id}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
