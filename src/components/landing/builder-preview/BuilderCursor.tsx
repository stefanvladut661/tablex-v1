/**
 * Cursorul animat — o simplă săgeată SVG care urmează x/y și se vede/ascunde.
 */

type Props = {
  x: number
  y: number
  visible: boolean
  clicking?: boolean
}

export function BuilderCursor({ x, y, visible, clicking }: Props) {
  if (!visible) return null

  return (
    <g
      transform={`translate(${x} ${y})`}
      className="pointer-events-none"
      aria-hidden
    >
      {/* Săgeata clasică, ~16 unități */}
      <path
        d="M 0 0 L 4 8 L 2 8 L 2 14 L -2 14 L -2 8 L -4 8 Z"
        className="fill-canvas-selectie"
      />

      {/* Inelul de puls la click */}
      {clicking && (
        <circle
          r={20}
          className="fill-none stroke-canvas-selectie stroke-2 opacity-60"
        />
      )}
    </g>
  )
}
