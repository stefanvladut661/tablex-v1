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
  /**
   * Zoom-ul interactiv (rotita, pinch, butoane) e OPRIT implicit.
   *
   * Incadrarea nu se mai negociaza nicaieri: planul se vede exact cat e
   * canvasul zonei, fixat de echipa TableX in Canvas Builder. Doi ospatari care
   * se uita la aceeasi sala vad acelasi lucru, iar ce a desenat echipa in
   * chenar e ce ajunge in sala si in widget.
   */
  permiteZoom?: boolean
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
  permiteZoom = false,
  className,
}: Props) {
  const { refSvg, vedere, mareste, micsoreaza, reseteaza, handlers } = useZoomPan(1, permiteZoom)
  const idGrid = useId()
  /**
   * Decuparea la marginea canvasului. Id-ul vine din useId fiindca aceeasi
   * pagina poate avea doua harti odata (dialogul de walk-in peste harta salii):
   * cu un id fix, a doua ar fi decupata pe canvasul primei zone.
   */
  const idDecupaj = useId()

  const interactiva = Boolean(onSelecteazaMasa)

  // Ordinea de desenare: grid → structura (Layer 1) → mese (Layer 2).
  // In interiorul structurii respectam z, ca sa poata sta o planta peste bar.
  const structuraSortata = [...structura].sort((a, b) => (a.z ?? 0) - (b.z ?? 0))

  return (
    /**
     * Harta ramane pe tema inchisa indiferent de tema aplicatiei: clasa `dark`
     * de aici rescrie variabilele din index.css doar pentru ce e inauntru, deci
     * nicio culoare nu se scrie de mana (regula 2).
     *
     * Motivul e ca planul se citeste dintr-o privire, de la distanta, in sala:
     * pe fundal inchis mesele colorate ies in fata, iar tableta nu mai arunca
     * lumina alba in ochii clientilor la o masa de seara. Restul interfetei isi
     * pastreaza tema aleasa de utilizator.
     */
    <div
      className={cn('dark relative overflow-hidden rounded-lg border border-border', className)}
      /**
       * Canvasul umple 100% din spatiul disponibil, pastrand raportul: pentru
       * asta containerul primeste chiar raportul canvasului, iar viewBox-ul e
       * canvasul intreg. Stil in linie, nu clasa: `aspect-[${w}/${h}]` nu se
       * genereaza la executie, iar dimensiunile vin din baza.
       */
      style={{ aspectRatio: `${zona.canvas_latime} / ${zona.canvas_inaltime}` }}
    >
      <svg
        ref={refSvg}
        /**
         * viewBox-ul E canvasul zonei, mereu. Pana acum se strangea pe
         * dreptunghiul continutului, iar peste el se mai aplica o scara salvata
         * (`zones.zoom_implicit`) ancorata in coltul stanga-sus — doua incadrari
         * suprapuse, care impingeau planul in colt si il aratau altfel decat
         * arata in builder. Acum e o singura regula: se publica exact canvasul.
         */
        viewBox={`0 0 ${zona.canvas_latime} ${zona.canvas_inaltime}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label={`Harta zonei ${zona.nume}`}
        className="h-full w-full touch-none bg-canvas-exterior select-none"
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
              vectorEffect="non-scaling-stroke"
            />
          </pattern>
          <clipPath id={idDecupaj}>
            <rect width={zona.canvas_latime} height={zona.canvas_inaltime} />
          </clipPath>
        </defs>

        <g transform={`translate(${vedere.x} ${vedere.y}) scale(${vedere.scara})`}>
          {/* Decupajul sta INAUNTRUL transformarii, ca dreptunghiul lui sa fie
              in coordonate de canvas. Ce a ramas in afara chenarului la
              desenare nu se vede aici — asta e regula publicarii. */}
          <g clipPath={`url(#${idDecupaj})`}>
            <rect
              width={zona.canvas_latime}
              height={zona.canvas_inaltime}
              className="fill-canvas-fundal"
            />
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
        </g>
      </svg>

      {/* Comenzile de zoom apar doar unde zoom-ul e permis — altfel ar fi
          butoane care nu fac nimic, mai rele decat cele care lipsesc. */}
      {permiteZoom && (
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
      )}
    </div>
  )
}
