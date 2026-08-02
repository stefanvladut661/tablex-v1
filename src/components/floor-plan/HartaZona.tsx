import { useId, useMemo } from 'react'
import { MaximizeIcon, MinusIcon, PlusIcon } from 'lucide-react'

import { ElementStructura } from '@/components/floor-plan/ElementStructura'
import { Masa } from '@/components/floor-plan/Masa'
import { useZoomPan } from '@/components/floor-plan/useZoomPan'
import { Button } from '@/components/ui/button'
import { incadrareContinut, type Dreptunghi } from '@/lib/geometrie-plan'
import { cn } from '@/lib/utils'
import type {
  ElementStructura as Element,
  MasaHarta,
  StatusuriMese,
  ZonaHarta,
} from '@/types/floor-plan'

type Props = {
  zona: ZonaHarta
  /** Layer 1 — geometrie pura, din floor_plan_layers.continut. */
  structura?: Element[]
  /** Layer 2 — randurile din tables. */
  mese: MasaHarta[]
  /** Statusurile pentru momentul afisat; ce lipseste e considerat liber. */
  statusuri?: StatusuriMese
  masaSelectata?: string | null
  onSelecteazaMasa?: (id: string) => void
  arataGrid?: boolean
  /** Strange vederea pe continut, ca o sala cu putine mese sa nu para goala. */
  incadrareAutomata?: boolean
  className?: string
}

export function HartaZona({
  zona,
  structura = [],
  mese,
  statusuri = {},
  masaSelectata = null,
  onSelecteazaMasa,
  arataGrid = true,
  incadrareAutomata = true,
  className,
}: Props) {
  const { refSvg, vedere, mareste, micsoreaza, reseteaza, handlers } = useZoomPan()
  const idGrid = useId()

  const interactiva = Boolean(onSelecteazaMasa)

  // Ordinea de desenare: grid → structura (Layer 1) → mese (Layer 2).
  // In interiorul structurii respectam z, ca sa poata sta o planta peste bar.
  const structuraSortata = [...structura].sort((a, b) => (a.z ?? 0) - (b.z ?? 0))

  /**
   * Canvasul e 1200x800 implicit, dar o sala cu putine mese le poate avea pe
   * toate intr-un colt — restul ecranului ramanea gol (§6quater.5). Incadram pe
   * continut, pastrand raportul canvasului.
   *
   * useMemo pentru ca viewBox-ul e o STRINGA recalculata la fiecare randare:
   * harta live se re-randeaza la fiecare tic al barei orare, iar o incadrare
   * care sare de la un tic la altul ar fi mai deranjanta decat spatiul gol.
   */
  const incadrare = useMemo(() => {
    if (!incadrareAutomata) {
      return { x: 0, y: 0, latime: zona.canvas_latime, inaltime: zona.canvas_inaltime }
    }
    const dreptunghiuri: Dreptunghi[] = [
      ...mese.map((m) => ({
        x: m.pozitie_x,
        y: m.pozitie_y,
        latime: m.latime,
        inaltime: m.inaltime,
      })),
      ...structura.map((element) => {
        // Peretii in linie franta se descriu prin puncte, nu prin latime.
        if (element.puncte?.length) {
          const xs = element.puncte.map(([px]) => px)
          const ys = element.puncte.map(([, py]) => py)
          return {
            x: Math.min(...xs),
            y: Math.min(...ys),
            latime: Math.max(...xs) - Math.min(...xs),
            inaltime: Math.max(...ys) - Math.min(...ys),
          }
        }
        return {
          x: element.x,
          y: element.y,
          latime: element.latime,
          inaltime: element.inaltime,
        }
      }),
    ]
    return incadrareContinut(dreptunghiuri, {
      latime: zona.canvas_latime,
      inaltime: zona.canvas_inaltime,
    })
  }, [incadrareAutomata, mese, structura, zona.canvas_latime, zona.canvas_inaltime])

  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-border', className)}>
      <svg
        ref={refSvg}
        viewBox={`${incadrare.x} ${incadrare.y} ${incadrare.latime} ${incadrare.inaltime}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label={`Harta zonei ${zona.nume}`}
        className="h-full w-full touch-none bg-canvas-fundal select-none"
        {...handlers}
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

        <g transform={`translate(${vedere.x} ${vedere.y}) scale(${vedere.scara})`}>
          {arataGrid && (
            <rect
              width={zona.canvas_latime}
              height={zona.canvas_inaltime}
              fill={`url(#${idGrid})`}
            />
          )}

          {structuraSortata.map((element, index) => (
            <ElementStructura key={`${element.tip}-${index}`} element={element} />
          ))}

          {mese
            .filter((masa) => masa.activa)
            .map((masa) => (
              <Masa
                key={masa.id}
                masa={masa}
                status={masa.indisponibila ? 'inactiv' : (statusuri[masa.id] ?? 'liber')}
                selectata={masa.id === masaSelectata}
                interactiva={interactiva}
                onSelecteaza={onSelecteazaMasa}
              />
            ))}
        </g>
      </svg>

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
