import { useMemo } from 'react'
import { encode } from 'uqr'

/**
 * Codul QR al biletului (§29.5, §29.6), desenat ca SVG din matricea uqr —
 * fara innerHTML si fara librarii de canvas. Scanerul existent (ScanerBilet)
 * citeste exact continutul codificat aici: codul biletului, atat.
 */
export function CodQR({ text, marime = 192 }: { text: string; marime?: number }) {
  const qr = useMemo(() => encode(text, { ecc: 'M', border: 2 }), [text])
  const celula = marime / qr.size

  return (
    <svg
      width={marime}
      height={marime}
      viewBox={`0 0 ${marime} ${marime}`}
      role="img"
      aria-label={`Cod QR pentru biletul ${text}`}
      // QR-ul are nevoie de contrast dur, nu de tokenii temei: un cod „tematic"
      // in dark mode ar fi alb pe negru inversat si nescanabil pe unele camere.
      style={{ background: '#ffffff' }}
    >
      {qr.data.flatMap((rand, y) =>
        rand.map((aprins, x) =>
          aprins ? (
            <rect
              key={`${x}-${y}`}
              x={x * celula}
              y={y * celula}
              width={celula}
              height={celula}
              fill="#000000"
            />
          ) : null,
        ),
      )}
    </svg>
  )
}
