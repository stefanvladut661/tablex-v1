import type { KeyboardEvent } from 'react'

import { ETICHETE_STATUS, type MasaHarta, type StatusMasa } from '@/types/floor-plan'

/** Traffic Light System (§3, §7.4): umplere soft + contur saturat. */
const CLASE_STATUS: Record<StatusMasa, string> = {
  liber: 'fill-status-liber-soft stroke-status-liber',
  ocupat: 'fill-status-ocupat-soft stroke-status-ocupat',
  expirare: 'fill-status-expirare-soft stroke-status-expirare',
  eveniment: 'fill-status-eveniment-soft stroke-status-eveniment',
  inactiv: 'fill-status-inactiv-soft stroke-status-inactiv',
}

type Props = {
  masa: MasaHarta
  status: StatusMasa
  selectata?: boolean
  interactiva?: boolean
  onSelecteaza?: (id: string) => void
}

export function Masa({ masa, status, selectata = false, interactiva = false, onSelecteaza }: Props) {
  const { pozitie_x: x, pozitie_y: y, latime: w, inaltime: h, rotatie, forma } = masa
  const centruX = w / 2
  const centruY = h / 2
  const rotunda = forma === 'rotunda'

  const selectabila = interactiva && status !== 'inactiv'

  function alege() {
    if (selectabila) onSelecteaza?.(masa.id)
  }

  function laTasta(eveniment: KeyboardEvent<SVGGElement>) {
    if (eveniment.key !== 'Enter' && eveniment.key !== ' ') return
    eveniment.preventDefault()
    alege()
  }

  return (
    <g
      transform={`translate(${x} ${y}) rotate(${rotatie} ${centruX} ${centruY})`}
      role={selectabila ? 'button' : 'img'}
      tabIndex={selectabila ? 0 : -1}
      aria-pressed={selectabila ? selectata : undefined}
      aria-label={`Masa ${masa.numar_masa}, ${masa.capacitate} locuri, ${ETICHETE_STATUS[status]}`}
      onClick={alege}
      onKeyDown={laTasta}
      className={[
        'outline-none',
        selectabila ? 'cursor-pointer' : 'cursor-default',
        // Inelul de focus e desenat pe forma, nu ca outline CSS: pe SVG
        // outline-ul nu urmareste geometria rotita.
        'focus-visible:[&>.forma]:stroke-canvas-selectie focus-visible:[&>.forma]:stroke-[4]',
        selectabila ? 'hover:[&>.forma]:stroke-[3]' : '',
      ].join(' ')}
    >
      {rotunda ? (
        <ellipse
          className={`forma transition-[stroke-width] ${CLASE_STATUS[status]} ${
            selectata ? 'stroke-canvas-selectie stroke-[4]' : 'stroke-2'
          }`}
          cx={centruX}
          cy={centruY}
          rx={centruX}
          ry={centruY}
        />
      ) : (
        <rect
          className={`forma transition-[stroke-width] ${CLASE_STATUS[status]} ${
            selectata ? 'stroke-canvas-selectie stroke-[4]' : 'stroke-2'
          }`}
          width={w}
          height={h}
          rx={6}
        />
      )}

      {/* Mesele unite (§28.6) primesc un semn discret, ca sa se vada grupul. */}
      {masa.grup_unire_id && (
        <line
          x1={centruX - 8}
          y1={h - 6}
          x2={centruX + 8}
          y2={h - 6}
          className="stroke-canvas-selectie stroke-2"
        />
      )}

      {/* Rotatia inversa, in jurul aceluiasi centru: masa se roteste, textul
          ramane orizontal. Altfel numarul unei mese la 90° s-ar citi vertical. */}
      <g transform={`rotate(${-rotatie} ${centruX} ${centruY})`}>
        <text
          x={centruX}
          y={centruY - 5}
          textAnchor="middle"
          dominantBaseline="central"
          className="pointer-events-none fill-foreground text-[15px] font-semibold select-none"
        >
          {masa.numar_masa}
        </text>
        <text
          x={centruX}
          y={centruY + 12}
          textAnchor="middle"
          dominantBaseline="central"
          className="pointer-events-none fill-foreground/70 text-[11px] select-none"
        >
          {masa.capacitate} loc.
        </text>
      </g>
    </g>
  )
}
