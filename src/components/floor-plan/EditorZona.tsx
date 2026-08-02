import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { MaximizeIcon, MinusIcon, PlusIcon } from 'lucide-react'

import { ElementStructura } from '@/components/floor-plan/ElementStructura'
import { Masa } from '@/components/floor-plan/Masa'
import { useZoomPan } from '@/components/floor-plan/useZoomPan'
import { Button } from '@/components/ui/button'
import { aliniazaLaGrid, inCanvas as limiteazaInCanvas, pozitieFinala } from '@/lib/geometrie-plan'
import { cn } from '@/lib/utils'
import type {
  ElementStructura as Element,
  MasaHarta,
  StatusuriMese,
  ZonaHarta,
} from '@/types/floor-plan'

/** Se editeaza un singur strat odata — altfel testul de lovire e ambiguu:
 *  mesele se deseneaza PESTE structura si i-ar fura mereu clicul. */
export type Strat = 'mese' | 'structura'

type Props = {
  zona: ZonaHarta
  stratActiv: Strat
  /** Layer 1 — din floor_plan_layers.continut. */
  structura: Element[]
  /** Layer 2 — randurile din tables. */
  mese: MasaHarta[]
  /**
   * Statusurile pentru momentul afisat (§28.12). Lipsa lor pastreaza
   * comportamentul editorului echipei: verde daca masa e activa, gri daca nu —
   * acolo nu conteaza cine sta la masa, ci unde e asezata.
   *
   * In panoul restaurantului, dimpotriva: aceeasi harta trebuie sa arate si
   * ocuparea live, altfel ospatarul ar avea nevoie de doua ecrane.
   */
  statusuri?: StatusuriMese
  masaSelectata: string | null
  /**
   * Apasare FARA deplasare pe o masa. Editorul echipei nu o foloseste (acolo un
   * clic doar selecteaza), dar in panou clicul deschide rezervarea, iar
   * tragerea muta masa — cele doua gesturi trebuie sa ramana distincte
   * (§28.2, §28.3, §28.6).
   */
  onDeschideMasa?: (id: string) => void
  /**
   * Fals pentru ospatar: el foloseste harta, dar nu rearanjeaza mobila
   * (RLS ii refuza oricum scrierea in `tables`). Clicul si tragerea unei
   * REZERVARI raman ale lui — sunt operatii de sala, nu de plan.
   */
  poateMutaMese?: boolean
  /** Ce rezervare sta pe fiecare masa la ora afisata, pentru tragerea din §28.4. */
  rezervariPeMese?: Record<string, { id: string; eticheta: string }>
  /** Tragerea s-a incheiat pe alta masa: apelantul cere confirmarea. */
  onMutaRezervare?: (rezervareId: string, peMasa: string) => void
  onSelecteazaMasa: (id: string | null) => void
  onMutaMasa: (id: string, x: number, y: number) => void
  /** Elementele de structura se identifica prin indice in array-ul jsonb. */
  structuraSelectata: number | null
  onSelecteazaStructura: (indice: number | null) => void
  onMutaStructura: (indice: number, x: number, y: number) => void
  /** Cand e activ, un clic pe canvas gol adauga in stratul activ. */
  modAdaugare?: boolean
  onAdauga?: (x: number, y: number) => void
  /**
   * Schita originala ca imagine de fundal (§42.5), sub grid si sub straturi:
   * url semnat + opacitate 0..1. null/undefined = fara fundal. Randare pura —
   * nu participa la niciun gest.
   */
  fundal?: { url: string; opacitate: number } | null
  /**
   * Best Guess-ul AI (§9.2.2 pasul 1), desenat fantomatic PESTE straturi,
   * fara interactiune: operatorul vede estimarea si o preia/ajusteaza din
   * panoul editorului. Unealta echipei — nu ajunge niciodata la Admin.
   */
  overlayAI?: {
    structura: Element[]
    mese: Array<{ forma: string; x: number; y: number; latime: number; inaltime: number; capacitate: number }>
  } | null
  className?: string
}

type Gest = {
  pointerId: number
  strat: Strat
  /** id-ul mesei sau indicele elementului de structura. */
  cheie: string | number
  decalajX: number
  decalajY: number
  /**
   * Gest pornit pe o masa de cineva care nu are voie s-o mute (ospatarul).
   * Il tinem totusi, ca ridicarea pointerului sa poata deschide rezervarea:
   * altfel clicul pe masa n-ar mai face nimic pentru el.
   */
  blocat?: boolean
}

/** Tragerea unei REZERVARI de pe o masa pe alta (§28.4) — alt gest, alt scop. */
type GestRezervare = {
  pointerId: number
  rezervareId: string
  dePeMasa: string
  x: number
  y: number
}

export function EditorZona({
  zona,
  stratActiv,
  structura,
  mese,
  statusuri,
  masaSelectata,
  onDeschideMasa,
  poateMutaMese = true,
  rezervariPeMese,
  onMutaRezervare,
  onSelecteazaMasa,
  onMutaMasa,
  structuraSelectata,
  onSelecteazaStructura,
  onMutaStructura,
  modAdaugare = false,
  onAdauga,
  fundal = null,
  overlayAI = null,
  className,
}: Props) {
  // Zoom-ul (rotita + butoane) vine din hook; pan-ul NU ii folosim handler-ele:
  // pointerdown-ul e deja impartit intre tragerea meselor si a rezervarilor,
  // asa ca vederea se trage doar cand gestul porneste pe canvas gol.
  const { refSvg, vedere, mareste, micsoreaza, reseteaza, deplaseaza } = useZoomPan()
  const idGrid = useId()

  // Sursa de adevar a gestului e ref-ul, nu starea: la o tragere scurta, cu un
  // singur pointermove, setState nu e inca vizibil in handler si gestul ar fi
  // citit gresit ca un simplu clic. Starea exista doar pentru previzualizare.
  const refGest = useRef<Gest | null>(null)
  const refGestRezervare = useRef<GestRezervare | null>(null)
  /** Tragerea VEDERII, pornita pe canvas gol. `miscat` desparte pan de clic. */
  const refPan = useRef<{ pointerId: number; x: number; y: number; miscat: boolean } | null>(null)
  const [tragereRezervare, setTragereRezervare] = useState<{ x: number; y: number } | null>(null)
  const [previzualizare, setPrevizualizare] = useState<{
    strat: Strat
    cheie: string | number
    x: number
    y: number
  } | null>(null)

  /**
   * Conversia din coordonate de ecran in coordonatele viewBox-ului.
   * Aici clientX/clientY sunt CORECTE (spre deosebire de calendar, unde a
   * trebuit pageY): getScreenCTM() lucreaza tot in spatiul clientului, deci
   * derularea paginii se anuleaza de ambele parti ale transformarii.
   */
  function laViewBox(eveniment: { clientX: number; clientY: number }) {
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

  /**
   * Coordonatele CONTINUTULUI: viewBox minus transformarea de zoom/pan.
   * Toata aritmetica gesturilor (aliniere, limitare, decalaje) lucreaza aici —
   * altfel o masa trasa la zoom 2x ar sari la dublul distantei.
   */
  function laCanvas(eveniment: { clientX: number; clientY: number }) {
    const punct = laViewBox(eveniment)
    if (!punct) return null
    return {
      x: (punct.x - vedere.x) / vedere.scara,
      y: (punct.y - vedere.y) / vedere.scara,
    }
  }

  // Aritmetica de aliniere si limitare sta in lib/geometrie-plan.ts, ca sa fie
  // testabila fara DOM — vezi comentariul de acolo.
  const canvas = { latime: zona.canvas_latime, inaltime: zona.canvas_inaltime }

  function aliniaza(valoare: number): number {
    return aliniazaLaGrid(valoare, zona.grid_marime)
  }

  function inCanvas(latime: number, inaltime: number, x: number, y: number) {
    return limiteazaInCanvas({ latime, inaltime }, canvas, { x, y })
  }

  /**
   * O masa scoasa din uz ramane gri indiferent de ce spun rezervarile: e
   * informatia care conteaza pentru cine se uita la sala. Restul vine din
   * statusurile momentului, iar in lipsa lor (editorul echipei) e verde.
   */
  function statusMasa(masa: MasaHarta) {
    if (!masa.activa || masa.indisponibila) return 'inactiv' as const
    return statusuri?.[masa.id] ?? ('liber' as const)
  }

  /** Dimensiunile obiectului tras, indiferent de stratul din care vine. */
  function masuraGest(gest: Gest) {
    if (gest.strat === 'mese') {
      const masa = mese.find((m) => m.id === gest.cheie)
      return masa ? { latime: masa.latime, inaltime: masa.inaltime, x: masa.pozitie_x, y: masa.pozitie_y } : null
    }
    const element = structura[gest.cheie as number]
    return element ? { latime: element.latime, inaltime: element.inaltime, x: element.x, y: element.y } : null
  }

  function laPointerDown(eveniment: PointerEvent<SVGSVGElement>) {
    const punctRezervare = laCanvas(eveniment)
    const insigna = (eveniment.target as SVGElement).closest('[data-rezervare-id]')

    // Tragerea unei REZERVARI are prioritate: insigna sta deasupra mesei, iar
    // cine o apuca vrea sa mute clientul, nu mobila (§28.4).
    if (insigna && punctRezervare && onMutaRezervare) {
      refGestRezervare.current = {
        pointerId: eveniment.pointerId,
        rezervareId: insigna.getAttribute('data-rezervare-id')!,
        dePeMasa: insigna.getAttribute('data-de-pe-masa')!,
        x: punctRezervare.x,
        y: punctRezervare.y,
      }
      setTragereRezervare({ x: punctRezervare.x, y: punctRezervare.y })
      try {
        eveniment.currentTarget.setPointerCapture(eveniment.pointerId)
      } catch {
        // ignorat intentionat
      }
      return
    }

    const atribut = stratActiv === 'mese' ? 'data-masa-id' : 'data-structura-indice'
    const tinta = (eveniment.target as SVGElement).closest(`[${atribut}]`)
    const punct = laCanvas(eveniment)

    if (!tinta) {
      if (modAdaugare && punct && onAdauga) {
        onAdauga(aliniaza(punct.x), aliniaza(punct.y))
        return
      }
      // Canvas gol: gestul devine tragerea vederii. Deselectarea se muta pe
      // pointerup si se face doar daca vederea NU s-a miscat — un clic curat
      // ramane clic, o tragere ramane pan.
      const punctVedere = laViewBox(eveniment)
      if (punctVedere) {
        refPan.current = {
          pointerId: eveniment.pointerId,
          x: punctVedere.x,
          y: punctVedere.y,
          miscat: false,
        }
        try {
          eveniment.currentTarget.setPointerCapture(eveniment.pointerId)
        } catch {
          // ignorat intentionat
        }
      }
      return
    }
    if (!punct) return

    const brut = tinta.getAttribute(atribut)!
    const cheie: string | number = stratActiv === 'mese' ? brut : Number(brut)

    if (stratActiv === 'mese') onSelecteazaMasa(cheie as string)
    else onSelecteazaStructura(cheie as number)

    const gest: Gest = {
      pointerId: eveniment.pointerId,
      strat: stratActiv,
      cheie,
      decalajX: 0,
      decalajY: 0,
      blocat: stratActiv === 'mese' && !poateMutaMese,
    }
    const masura = masuraGest(gest)
    if (!masura) return

    gest.decalajX = punct.x - masura.x
    gest.decalajY = punct.y - masura.y
    refGest.current = gest

    // Captura pointerului: gestul supravietuieste iesirii de sub cursor.
    // Poate arunca daca pointerul nu mai e activ — nu e fatal, deci nu lasam
    // exceptia sa rupa inceputul gestului.
    try {
      eveniment.currentTarget.setPointerCapture(eveniment.pointerId)
    } catch {
      // ignorat intentionat
    }
  }

  function laPointerMove(eveniment: PointerEvent<SVGSVGElement>) {
    const pan = refPan.current
    if (pan && pan.pointerId === eveniment.pointerId) {
      const punct = laViewBox(eveniment)
      if (!punct) return
      // Delta in coordonatele viewBox-ului — acelasi spatiu in care hook-ul
      // isi tine translatia, deci pan-ul nu depinde de scara curenta.
      deplaseaza(punct.x - pan.x, punct.y - pan.y)
      refPan.current = { ...pan, x: punct.x, y: punct.y, miscat: true }
      return
    }

    const gestRez = refGestRezervare.current
    if (gestRez && gestRez.pointerId === eveniment.pointerId) {
      const punct = laCanvas(eveniment)
      if (punct) setTragereRezervare({ x: punct.x, y: punct.y })
      return
    }

    const gest = refGest.current
    // Cine nu poate muta mese nu vede nici previzualizarea mutarii.
    if (gest?.blocat) return
    // Legat de pointerId-ul care l-a inceput: altfel un pointerup ramas dintr-o
    // alta secventa (ex. dupa hot-reload cu butonul apasat) ar confirma mutarea.
    if (!gest || gest.pointerId !== eveniment.pointerId) return

    const punct = laCanvas(eveniment)
    const masura = masuraGest(gest)
    if (!punct || !masura) return

    const pozitie = inCanvas(
      masura.latime,
      masura.inaltime,
      punct.x - gest.decalajX,
      punct.y - gest.decalajY,
    )
    setPrevizualizare({ strat: gest.strat, cheie: gest.cheie, x: pozitie.x, y: pozitie.y })
  }

  function laPointerUp(eveniment: PointerEvent<SVGSVGElement>) {
    const pan = refPan.current
    if (pan && pan.pointerId === eveniment.pointerId) {
      refPan.current = null
      try {
        eveniment.currentTarget.releasePointerCapture(eveniment.pointerId)
      } catch {
        // deja eliberata
      }
      // Clic curat pe gol (fara pan): pastram comportamentul vechi.
      if (!pan.miscat) {
        onSelecteazaMasa(null)
        onSelecteazaStructura(null)
      }
      return
    }

    const gestRez = refGestRezervare.current
    if (gestRez && gestRez.pointerId === eveniment.pointerId) {
      refGestRezervare.current = null
      setTragereRezervare(null)
      try {
        eveniment.currentTarget.releasePointerCapture(eveniment.pointerId)
      } catch {
        // deja eliberata
      }

      /**
       * Masa de sub deget se afla din DOM, nu din aritmetica: elementFromPoint
       * raspunde exact la „ce e sub cursor acum", inclusiv cand mesele se
       * suprapun partial. O socoteala pe dreptunghiuri ar fi trebuit sa
       * reproduca ordinea de desenare ca sa dea acelasi raspuns.
       */
      const sub = document.elementFromPoint(eveniment.clientX, eveniment.clientY)
      const masaTinta = sub?.closest('[data-masa-id]')?.getAttribute('data-masa-id')

      // Pe aceeasi masa, sau in gol: nu s-a cerut nimic.
      if (masaTinta && masaTinta !== gestRez.dePeMasa) {
        onMutaRezervare?.(gestRez.rezervareId, masaTinta)
      }
      return
    }

    const gest = refGest.current
    if (!gest || gest.pointerId !== eveniment.pointerId) return

    if (gest.blocat) {
      refGest.current = null
      try {
        eveniment.currentTarget.releasePointerCapture(eveniment.pointerId)
      } catch {
        // deja eliberata
      }
      if (gest.strat === 'mese') onDeschideMasa?.(gest.cheie as string)
      return
    }

    // Curatam intai starea gestului, apoi eliberam captura. Ordinea conteaza:
    // releasePointerCapture ARUNCA daca pointerul nu mai e capturat — se
    // intampla la pointercancel, unde browserul a eliberat deja captura. Cand
    // apelul era inaintea comiterii, exceptia abandona mutarea si lasa obiectul
    // blocat in pozitia de previzualizare. (Gasit la testare.)
    refGest.current = null
    setPrevizualizare(null)

    try {
      eveniment.currentTarget.releasePointerCapture(eveniment.pointerId)
    } catch {
      // deja eliberata — nu schimba nimic pentru noi
    }

    const masura = masuraGest(gest)
    const punct = laCanvas(eveniment)
    if (!masura || !punct) return

    const final = pozitieFinala(
      { latime: masura.latime, inaltime: masura.inaltime },
      canvas,
      zona.grid_marime,
      { x: punct.x - gest.decalajX, y: punct.y - gest.decalajY },
    )

    // Un clic simplu (fara deplasare) nu trebuie sa produca o scriere inutila.
    // In panoul restaurantului insa, el are alt inteles: deschide rezervarea de
    // pe masa, sau walk-in-ul daca e libera.
    if (final.x === masura.x && final.y === masura.y) {
      if (gest.strat === 'mese') onDeschideMasa?.(gest.cheie as string)
      return
    }

    if (gest.strat === 'mese') onMutaMasa(gest.cheie as string, final.x, final.y)
    else onMutaStructura(gest.cheie as number, final.x, final.y)
  }

  /** Mutare de la tastatura: sageti = un pas de grid, cu Shift = un pixel. */
  function laTasta(
    eveniment: KeyboardEvent<SVGGElement>,
    obiect: { latime: number; inaltime: number; x: number; y: number },
    comita: (x: number, y: number) => void,
  ) {
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
    const pozitie = inCanvas(
      obiect.latime,
      obiect.inaltime,
      obiect.x + deplasare[0],
      obiect.y + deplasare[1],
    )
    if (pozitie.x === obiect.x && pozitie.y === obiect.y) return
    comita(pozitie.x, pozitie.y)
  }

  // Ordinea de desenare rămâne cea din viewer: grid → structura → mese.
  // Sortarea pe z se face pe o COPIE indexata, ca indicii din array-ul salvat
  // sa nu se schimbe — ei sunt identitatea elementelor la editare.
  const structuraDesen = structura
    .map((element, indice) => ({ element, indice }))
    .sort((a, b) => (a.element.z ?? 0) - (b.element.z ?? 0))

  const editezStructura = stratActiv === 'structura'

  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-border', className)}>
      <svg
        ref={refSvg}
        viewBox={`0 0 ${zona.canvas_latime} ${zona.canvas_inaltime}`}
        preserveAspectRatio="xMidYMid meet"
        role="application"
        aria-label={`Editor pentru zona ${zona.nume}, stratul ${editezStructura ? 'structură' : 'mese'}`}
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

        {/* Tot continutul sta sub transformarea de zoom/pan; gridul primeste
            dimensiunile canvasului explicit — "100%" ar insemna viewport-ul,
            nu canvasul, si la pan ar ramane lipit de ecran. */}
        <g transform={`translate(${vedere.x} ${vedere.y}) scale(${vedere.scara})`}>
        {/* §42.5 — schita originala, sub tot: urmareste zoom-ul si pan-ul. */}
        {fundal && fundal.opacitate > 0 && (
          <image
            href={fundal.url}
            x={0}
            y={0}
            width={zona.canvas_latime}
            height={zona.canvas_inaltime}
            opacity={fundal.opacitate}
            preserveAspectRatio="xMidYMid meet"
            className="pointer-events-none"
          />
        )}
        <rect
          width={zona.canvas_latime}
          height={zona.canvas_inaltime}
          fill={`url(#${idGrid})`}
        />

        {/* ── Layer 1 ── */}
        <g className={editezStructura ? undefined : 'pointer-events-none'}>
          {structuraDesen.map(({ element, indice }) => {
            const mutat =
              previzualizare?.strat === 'structura' && previzualizare.cheie === indice
                ? previzualizare
                : null
            const afisat = mutat ? { ...element, x: mutat.x, y: mutat.y } : element
            const selectat = structuraSelectata === indice

            if (!editezStructura) {
              return <ElementStructura key={indice} element={afisat} />
            }

            return (
              <g
                key={indice}
                data-structura-indice={indice}
                tabIndex={0}
                role="button"
                aria-label={`${element.tip}${element.eticheta ? ` „${element.eticheta}”` : ''}. Trage cu mouse-ul sau mută cu săgețile.`}
                aria-pressed={selectat}
                onKeyDown={(eveniment) =>
                  laTasta(
                    eveniment,
                    { latime: element.latime, inaltime: element.inaltime, x: element.x, y: element.y },
                    (x, y) => onMutaStructura(indice, x, y),
                  )
                }
                className={cn('outline-none', mutat ? 'cursor-grabbing opacity-80' : 'cursor-grab')}
              >
                <ElementStructura element={afisat} />
                {selectat && (
                  <rect
                    x={afisat.x - 2}
                    y={afisat.y - 2}
                    width={afisat.latime + 4}
                    height={afisat.inaltime + 4}
                    className="pointer-events-none fill-none stroke-canvas-selectie stroke-[3]"
                    rx={4}
                  />
                )}
              </g>
            )
          })}
        </g>

        {/* ── Layer 2 ── */}
        <g className={editezStructura ? 'pointer-events-none opacity-60' : undefined}>
          {mese.map((masa) => {
            const mutata =
              previzualizare?.strat === 'mese' && previzualizare.cheie === masa.id
                ? previzualizare
                : null
            const afisata = mutata ? { ...masa, pozitie_x: mutata.x, pozitie_y: mutata.y } : masa

            if (editezStructura) {
              return (
                <Masa
                  key={masa.id}
                  masa={afisata}
                  status={statusMasa(masa)}
                />
              )
            }

            return (
              <g
                key={masa.id}
                data-masa-id={masa.id}
                tabIndex={0}
                role="button"
                aria-label={`Masa ${masa.numar_masa}. Trage cu mouse-ul sau mută cu săgețile.`}
                aria-pressed={masaSelectata === masa.id}
                onKeyDown={(eveniment) =>
                  laTasta(
                    eveniment,
                    {
                      latime: masa.latime,
                      inaltime: masa.inaltime,
                      x: masa.pozitie_x,
                      y: masa.pozitie_y,
                    },
                    (x, y) => onMutaMasa(masa.id, x, y),
                  )
                }
                className={cn(
                  'outline-none',
                  mutata ? 'cursor-grabbing opacity-80' : 'cursor-grab',
                  'focus-visible:[&_.forma]:stroke-canvas-selectie focus-visible:[&_.forma]:stroke-[4]',
                )}
              >
                <Masa
                  masa={afisata}
                  status={statusMasa(masa)}
                  selectata={masaSelectata === masa.id}
                />

                {/* Manerul de re-alocare (§28.4). Exista doar cand masa are un
                    client la ora afisata: altfel n-ar avea ce muta. */}
                {rezervariPeMese?.[masa.id] && onMutaRezervare && (
                  <g
                    data-rezervare-id={rezervariPeMese[masa.id].id}
                    data-de-pe-masa={masa.id}
                    className="cursor-grab"
                    role="button"
                    aria-label={`Mută rezervarea ${rezervariPeMese[masa.id].eticheta} pe altă masă`}
                  >
                    <circle
                      cx={afisata.pozitie_x + afisata.latime - 8}
                      cy={afisata.pozitie_y + 8}
                      r={11}
                      className="fill-canvas-selectie stroke-background stroke-2"
                    />
                    <text
                      x={afisata.pozitie_x + afisata.latime - 8}
                      y={afisata.pozitie_y + 8}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="pointer-events-none fill-background text-[11px] font-semibold"
                    >
                      ⇄
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </g>

        {/* ── Best Guess-ul AI, fantomatic (§9.2.2 pasul 1) ── */}
        {overlayAI && (
          <g className="pointer-events-none" opacity={0.55}>
            {overlayAI.structura.map((element, indice) => (
              <ElementStructura key={`ai-s-${indice}`} element={element} />
            ))}
            {overlayAI.mese.map((masa, indice) =>
              masa.forma === 'rotunda' ? (
                <circle
                  key={`ai-m-${indice}`}
                  cx={masa.x + masa.latime / 2}
                  cy={masa.y + masa.inaltime / 2}
                  r={Math.min(masa.latime, masa.inaltime) / 2}
                  className="fill-none stroke-canvas-selectie"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                />
              ) : (
                <rect
                  key={`ai-m-${indice}`}
                  x={masa.x}
                  y={masa.y}
                  width={masa.latime}
                  height={masa.inaltime}
                  rx={6}
                  className="fill-none stroke-canvas-selectie"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                />
              ),
            )}
          </g>
        )}

        {/* Urma rezervarii trase. `pointer-events-none` e obligatoriu: altfel
            ea insasi ar fi elementul de sub deget la ridicare, iar masa-tinta
            n-ar fi gasita niciodata. */}
        {tragereRezervare && (
          <g className="pointer-events-none">
            <circle
              cx={tragereRezervare.x}
              cy={tragereRezervare.y}
              r={13}
              className="fill-canvas-selectie opacity-80"
            />
            <text
              x={tragereRezervare.x}
              y={tragereRezervare.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-background text-[12px] font-semibold"
            >
              ⇄
            </text>
          </g>
        )}
        </g>
      </svg>

      {/* Aceleasi comenzi de zoom ca pe viewer (HartaZona): rotita face
          acelasi lucru, butoanele raman pentru tableta (§32). */}
      <div className="absolute right-2 bottom-2 flex flex-col gap-1 rounded-lg border border-border bg-card/90 p-1 backdrop-blur">
        <Button variant="ghost" size="icon-sm" onClick={mareste} aria-label="Mărește">
          <PlusIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={micsoreaza} aria-label="Micșorează">
          <MinusIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={reseteaza} aria-label="Încadrează harta">
          <MaximizeIcon />
        </Button>
      </div>
    </div>
  )
}
