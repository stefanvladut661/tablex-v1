import { useMemo, useState } from 'react'
import { motion } from 'motion/react'

import { TIMELINE } from '../motion.config'
import { useDelayScurs, useMiscareHero } from '../useParallax'

/**
 * Doua stoluri de cate 3 pasari, traversand diagonal prin spatele
 * headline-ului.
 *
 * Implementarea primara e CSS motion path (offset-path); fallback-ul anima
 * x/y pe 5 puncte esantionate din aceeasi curba Bezier, pentru browserele
 * fara suport. Stolurile perfect sincronizate arata fals, deci fiecare
 * pasare are alt scale, alta viteza si alta faza a batailor din aripi.
 */

interface Curba {
  path: string
  /** Esantioane la t = 0, .25, .5, .75, 1 din aceeasi curba (fallback). */
  x: number[]
  y: number[]
}

const CURBE: { primul: Curba; alDoilea: Curba } = {
  // Capetele curbelor stau dincolo de orice viewport uzual (2600/2700px),
  // iar pasarea face fade-out inainte de capat: in timpul repeatDelay
  // valoarea ramane pe ultimul keyframe si altfel ar "parca" in aer,
  // dand din aripi, pe monitoarele late.
  primul: {
    path: 'M -100 140 C 500 30, 1200 260, 2600 80',
    x: [-100, 378, 950, 1672, 2600],
    y: [140, 110, 136, 150, 80],
  },
  alDoilea: {
    path: 'M -100 300 C 600 210, 1300 400, 2700 230',
    x: [-100, 436, 1038, 1770, 2700],
    y: [300, 275, 295, 304, 230],
  },
}

const SCALE_STOL = [0.7, 1, 0.85] as const
const VITEZE_STOL = [1, 0.94, 1.07] as const
const DURATA_BAZA = 11

function Pasare({
  curba,
  delay,
  scale,
  durata,
  suportaOffsetPath,
}: {
  curba: Curba
  delay: number
  scale: number
  durata: number
  suportaOffsetPath: boolean
}) {
  const { inView } = useMiscareHero()
  // Faza batailor din aripi e aleatoare per pasare — in oglinda arata fals.
  const [fazaAripi] = useState(() => Math.random() * 0.3)
  // Dupa prima traversare, revenirile in viewport nu mai asteapta delay-ul
  // coregrafiei (3.6s / 8.5s), altfel scena pare goala la scroll inapoi.
  const delayEfectiv = useDelayScurs(delay)

  const zbor = inView
    ? suportaOffsetPath
      ? { offsetDistance: ['0%', '100%'], opacity: [0, 1, 1, 0] }
      : { x: curba.x, y: curba.y, opacity: [0, 1, 1, 0] }
    : undefined

  const tranzitie = {
    duration: durata,
    delay: delayEfectiv,
    ease: 'linear' as const,
    repeat: Infinity,
    repeatDelay: 6,
  }

  return (
    <motion.div
      aria-hidden
      className="absolute top-0 left-0"
      style={
        suportaOffsetPath
          ? { offsetPath: `path("${curba.path}")`, offsetRotate: 'auto' }
          : undefined
      }
      animate={zbor}
      transition={{
        ...tranzitie,
        // Fade-out inainte de capatul curbei: parcarea din repeatDelay
        // nu se vede nici pe viewporturile mai late decat curba.
        opacity: { ...tranzitie, times: [0, 0.06, 0.86, 1] },
      }}
      initial={
        suportaOffsetPath
          ? { offsetDistance: '0%', opacity: 0 }
          : { x: curba.x[0], y: curba.y[0], opacity: 0 }
      }
    >
      <svg
        viewBox="0 0 32 20"
        className="h-auto w-7 fill-foreground/60"
        style={{ scale }}
        focusable="false"
      >
        {/* Corpul */}
        <path d="M9 12 Q16 10 25 11 Q19 14 12 14 Z" />
        {/* Aripile — path-uri separate, animabile independent, cu
            transform-box: fill-box ca originea sa fie pe corp. */}
        <motion.path
          d="M14 11 Q9 2 3 4 Q9 8 13 12 Z"
          style={{ transformBox: 'fill-box', originX: 0.9, originY: 1 }}
          animate={inView ? { scaleY: [1, 0.35, 1] } : undefined}
          transition={{
            duration: 0.42,
            delay: fazaAripi,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.path
          d="M17 11 Q22 2 29 3 Q23 8 18 12 Z"
          style={{ transformBox: 'fill-box', originX: 0.1, originY: 1 }}
          animate={inView ? { scaleY: [1, 0.35, 1] } : undefined}
          transition={{
            duration: 0.42,
            delay: fazaAripi + 0.05,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </svg>
    </motion.div>
  )
}

function Stol({ curba, start }: { curba: Curba; start: number }) {
  const { redus } = useMiscareHero()
  const suportaOffsetPath = useMemo(
    () =>
      typeof CSS !== 'undefined' &&
      CSS.supports('offset-path', `path("M0 0 L10 10")`),
    [],
  )

  if (redus) return null

  return (
    <>
      {SCALE_STOL.map((scale, i) => (
        <Pasare
          key={i}
          curba={curba}
          delay={start + i * 0.7}
          scale={scale}
          durata={DURATA_BAZA * VITEZE_STOL[i]}
          suportaOffsetPath={suportaOffsetPath}
        />
      ))}
    </>
  )
}

export function Birds() {
  const { mobil } = useMiscareHero()

  return (
    <>
      <Stol curba={CURBE.primul} start={TIMELINE.pasari.primul} />
      {/* Pe mobil ramane un singur stol (spec §6). */}
      {!mobil && <Stol curba={CURBE.alDoilea} start={TIMELINE.pasari.alDoilea} />}
    </>
  )
}
