import { useId, useRef } from 'react'

import { ElementStructura } from '@/components/floor-plan/ElementStructura'
import { Masa } from '@/components/floor-plan/Masa'
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

/**
 * Viewer-ul NU are zoom si NU are pan. Deloc, nicaieri.
 *
 * Planul publicat arata exact canvasul zonei, incadrat de echipa TableX in
 * Canvas Builder — doi ospatari care se uita la aceeasi sala vad acelasi lucru,
 * iar ce a desenat echipa in chenar e ce ajunge in sala, pe landing si in
 * widget. Zoom-ul a existat aici o vreme si a fost scos dupa ce s-a vazut in
 * uz: harta e o vitrina si un tablou de bord, nu o unealta de desen. Cine o
 * apuca din greseala o trage din cadru si ramane cu sala pe jumatate iesita din
 * ecran, fara sa stie ca exista un buton de revenire — pentru ca nu exista.
 *
 * Gesturile raman doar cele care inseamna ceva: clic pe o masa, Tab si Enter.
 * Editorul echipei (`EditorZona`) e singurul loc cu zoom si pan.
 */
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
  const refSvg = useRef<SVGSVGElement | null>(null)
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
        className="h-full w-full bg-canvas-exterior select-none"
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

        {/* Fara transformare de vedere: viewBox-ul e chiar canvasul, deci
            continutul se deseneaza in coordonatele lui. Decupajul taie ce a
            ramas in afara chenarului la desenare — asta e regula publicarii. */}
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
      </svg>
    </div>
  )
}
