import { useId } from 'react'
import { MaximizeIcon, MinusIcon, PlusIcon } from 'lucide-react'

import { ElementStructura } from '@/components/floor-plan/ElementStructura'
import { Masa } from '@/components/floor-plan/Masa'
import { useZoomPan } from '@/components/floor-plan/useZoomPan'
import { Button } from '@/components/ui/button'
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
  className,
}: Props) {
  const { refSvg, vedere, mareste, micsoreaza, reseteaza, handlers } = useZoomPan()
  const idGrid = useId()

  const interactiva = Boolean(onSelecteazaMasa)

  // Ordinea de desenare: grid → structura (Layer 1) → mese (Layer 2).
  // In interiorul structurii respectam z, ca sa poata sta o planta peste bar.
  const structuraSortata = [...structura].sort((a, b) => (a.z ?? 0) - (b.z ?? 0))

  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-border', className)}>
      <svg
        ref={refSvg}
        viewBox={`0 0 ${zona.canvas_latime} ${zona.canvas_inaltime}`}
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
        <Button variant="ghost" size="icon-sm" onClick={mareste} aria-label="Mareste">
          <PlusIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={micsoreaza} aria-label="Micsoreaza">
          <MinusIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={reseteaza} aria-label="Incadreaza harta">
          <MaximizeIcon />
        </Button>
      </div>
    </div>
  )
}
