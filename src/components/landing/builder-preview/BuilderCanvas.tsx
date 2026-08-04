/**
 * SVG-ul cu masa A (statică), masa B (animată), paleta de drag, și cursor.
 * Copiază structura vizuală din HartaZona (dark wrapper, grid, fundal)
 * dar cu compoziție completă sub controlul componentei.
 */

import { useMemo } from 'react'
import { Masa } from '@/components/floor-plan/Masa'
import { cn } from '@/lib/utils'
import type { MasaHarta } from '@/types/floor-plan'
import { CANVAS, PALETTE } from './motion.config'
import { BuilderCursor } from './BuilderCursor'

type Props = {
  masaA: MasaHarta
  masaB: MasaHarta
  cursorX: number
  cursorY: number
  cursorVisible: boolean
  cursorClicking?: boolean
  capacitate: number
  showCapacityChip?: boolean
  showJoinChip?: boolean
  joiningAnim?: boolean
}

export function BuilderCanvas({
  masaA,
  masaB,
  cursorX,
  cursorY,
  cursorVisible,
  cursorClicking,
  capacitate,
  showCapacityChip,
  showJoinChip,
  joiningAnim,
}: Props) {
  const idGrid = useMemo(() => `grid-${Math.random().toString(36).slice(2)}`, [])

  return (
    <div className={cn('dark relative aspect-[3/2] w-full overflow-hidden rounded-lg border border-border')}>
      <svg
        viewBox={`0 0 ${CANVAS.latime} ${CANVAS.inaltime}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full select-none bg-canvas-fundal"
      >
        <defs>
          <pattern
            id={idGrid}
            width={CANVAS.grid_marime}
            height={CANVAS.grid_marime}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${CANVAS.grid_marime} 0 L 0 0 0 ${CANVAS.grid_marime}`}
              className="fill-none stroke-canvas-grid"
              strokeWidth={0.5}
            />
          </pattern>
        </defs>

        {/* Grid */}
        <rect
          width={CANVAS.latime}
          height={CANVAS.inaltime}
          fill={`url(#${idGrid})`}
        />

        {/* Paleta: masa-fantomă de tras (dashed) */}
        <g
          className="opacity-50"
          aria-hidden
        >
          <circle
            cx={PALETTE.x + PALETTE.latime / 2}
            cy={PALETTE.y + PALETTE.inaltime / 2}
            r={PALETTE.latime / 2}
            className="fill-none stroke-canvas-scaun stroke-2"
            strokeDasharray="4 3"
          />
          <text
            x={PALETTE.x + PALETTE.latime / 2}
            y={PALETTE.y + PALETTE.inaltime / 2 + 20}
            textAnchor="middle"
            className="fill-canvas-scaun text-[12px] font-medium"
          >
            +
          </text>
        </g>

        {/* Masa A: statică pe tot parcursul */}
        <Masa
          masa={masaA}
          status="liber"
        />

        {/* Masa B: animată, cu toate transformările */}
        <Masa
          masa={masaB}
          status={masaB.grup_unire_id ? 'eveniment' : 'liber'}
        />

        {/* Cip de capacitate: apare lângă masa B în faza 2 */}
        {showCapacityChip && (
          <g
            className="pointer-events-none"
            opacity={showCapacityChip ? 1 : 0}
          >
            <rect
              x={masaB.pozitie_x + masaB.latime - 25}
              y={masaB.pozitie_y - 30}
              width={50}
              height={24}
              rx={4}
              className="fill-canvas-selectie"
            />
            <text
              x={masaB.pozitie_x + masaB.latime - 2}
              y={masaB.pozitie_y - 10}
              textAnchor="end"
              className="fill-background text-[12px] font-semibold"
            >
              {capacitate} loc.
            </text>
          </g>
        )}

        {/* Cip „Unește": apare între mese în faza 4, înainte de click */}
        {showJoinChip && (
          <g
            className="pointer-events-none"
            opacity={showJoinChip ? 1 : 0}
          >
            {/* Poziția: mijlocul dintre mese */}
            <g transform={`translate(${(masaA.pozitie_x + masaB.pozitie_x) / 2 + 40} ${(masaA.pozitie_y + masaB.pozitie_y) / 2})`}>
              <rect
                x={-25}
                y={-12}
                width={50}
                height={24}
                rx={4}
                className={`fill-canvas-selectie ${joiningAnim ? 'animate-pulse' : ''}`}
              />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                className="fill-background text-[10px] font-semibold"
              >
                Unește
              </text>
            </g>
          </g>
        )}

        {/* Cursor animat */}
        <BuilderCursor
          x={cursorX}
          y={cursorY}
          visible={cursorVisible}
          clicking={cursorClicking}
        />
      </svg>
    </div>
  )
}
