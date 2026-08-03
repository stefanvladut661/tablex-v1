import type { ElementStructura as Element, TipStructura } from '@/types/floor-plan'

/** Culorile vin exclusiv din tokenii --canvas-* (§3): niciun hex aici. */
const CLASE: Record<TipStructura, string> = {
  perete: 'fill-canvas-perete',
  usa: 'fill-canvas-usa',
  bar: 'fill-canvas-bar',
  dj: 'fill-canvas-zona-speciala',
  vip: 'fill-canvas-zona-speciala',
  intrare: 'fill-canvas-usa',
  bucatarie: 'fill-canvas-zona-speciala',
  planta: 'fill-canvas-planta',
  piscina: 'fill-canvas-piscina',
}

/**
 * Planta, vazuta de sus: cinci petale in jurul unui miez, ca in modelul de la
 * proprietar. Un cerc simplu (ce se desena inainte) se confunda de la distanta
 * cu o masa rotunda mica — exact confuzia pe care o rezolva silueta asta.
 *
 * Raportele sunt fata de raza exterioara: petala se termina fix pe ea, deci
 * floarea incape in dreptunghiul primit, oricat de mare ar fi elementul.
 */
const PETALE = 5
const PETALA_DISTANTA = 0.68
const PETALA_LUNGIME = 0.32
const PETALA_LATIME = 0.22
const MIEZ = 0.24

/** Etichetele se scriu pe elementele mari; pe un perete ar fi ilizibile. */
const CU_ETICHETA: TipStructura[] = ['bar', 'dj', 'vip', 'intrare', 'bucatarie', 'piscina']

// Barul e singurul umplut cu o culoare inchisa in tema light (si deschisa in
// dark) — exact inversul perechii foreground/background, deci textul lui
// foloseste --background, iar restul --foreground. Asa contrastul tine in
// ambele teme fara nicio culoare hardcodata.
const CLASA_TEXT: Partial<Record<TipStructura, string>> = { bar: 'fill-background' }

// Zonele mari primesc eticheta sus, nu in centru: mesele din Layer 2 se
// deseneaza peste structura si ar acoperi un text centrat.
const ETICHETA_SUS: TipStructura[] = ['vip', 'bucatarie', 'piscina']

export function ElementStructura({ element }: { element: Element }) {
  const { tip, x, y, latime, inaltime, rotatie = 0, puncte, eticheta } = element
  const clasa = CLASE[tip]

  // Perete in linie franta: coordonate absolute, deci fara translate.
  if (puncte && puncte.length > 1) {
    return (
      <polyline
        points={puncte.map(([px, py]) => `${px},${py}`).join(' ')}
        className="fill-none stroke-canvas-perete"
        strokeWidth={Math.max(4, inaltime || 8)}
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    )
  }

  const centruX = latime / 2
  const centruY = inaltime / 2
  const raza = Math.min(latime, inaltime) / 2

  return (
    <g transform={`translate(${x} ${y}) rotate(${rotatie} ${centruX} ${centruY})`}>
      {tip === 'planta' ? (
        <g transform={`translate(${centruX} ${centruY})`} className={clasa} opacity={0.85}>
          {Array.from({ length: PETALE }, (_, indice) => (
            <ellipse
              key={indice}
              rx={raza * PETALA_LATIME}
              ry={raza * PETALA_LUNGIME}
              // Petala se deseneaza in origine, urca pe raza si abia apoi se
              // roteste: asa axa ei lunga ramane mereu radiala.
              transform={`rotate(${(indice * 360) / PETALE}) translate(0 ${-raza * PETALA_DISTANTA})`}
            />
          ))}
          <circle r={raza * MIEZ} />
        </g>
      ) : (
        <rect
          width={latime}
          height={inaltime}
          rx={tip === 'piscina' ? Math.min(latime, inaltime) / 4 : tip === 'perete' ? 0 : 4}
          className={clasa}
          opacity={tip === 'perete' || tip === 'bar' ? 1 : 0.85}
        />
      )}

      {eticheta && CU_ETICHETA.includes(tip) && (
        <text
          x={centruX}
          y={ETICHETA_SUS.includes(tip) ? Math.min(20, inaltime / 2) : centruY}
          textAnchor="middle"
          dominantBaseline="central"
          className={`pointer-events-none text-[13px] font-medium tracking-wide select-none ${
            CLASA_TEXT[tip] ?? 'fill-foreground'
          }`}
        >
          {eticheta}
        </text>
      )}
    </g>
  )
}
