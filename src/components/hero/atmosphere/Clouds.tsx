import { motion } from 'motion/react'

import { EASE, TIMELINE } from '../motion.config'
import { useDelayScurs, useMiscareHero } from '../useParallax'

/**
 * Nori decorativi — SVG inline, patru forme organice distincte, un singur
 * fill (tokenul --cloud), opacitatea controlata per strat.
 *
 * Fiecare nor are alta durata de drift (55–95s): daca duratele se
 * sincronizeaza, ochiul prinde bucla.
 */

const FORME = [
  'M22 58 Q8 52 10 40 Q4 28 20 24 Q24 8 44 12 Q54 0 70 8 Q88 4 92 20 Q108 22 104 38 Q112 50 96 54 Q88 64 68 60 Q44 68 22 58 Z',
  'M14 50 Q2 44 8 34 Q6 20 24 20 Q30 6 50 10 Q66 2 76 14 Q94 12 92 30 Q102 40 88 46 Q76 56 54 52 Q32 58 14 50 Z',
  'M18 54 Q4 50 8 38 Q2 24 22 22 Q28 6 48 12 Q62 2 74 12 Q92 10 90 28 Q104 34 94 46 Q82 58 60 54 Q36 62 18 54 Z',
  'M16 52 Q4 46 10 36 Q8 22 26 22 Q34 8 52 14 Q68 6 78 16 Q94 16 92 32 Q100 42 86 48 Q70 58 48 54 Q30 60 16 52 Z',
] as const

interface NorProps {
  forma: number
  clasa: string
  opacitate: number
  intraLa: number
  /** Directia de intrare pe X (±60px). */
  dinX: number
  /** Amplitudinea driftului idle, in px. */
  driftPx: number
  driftDurata: number
  scale?: number
}

function Nor({ forma, clasa, opacitate, intraLa, dinX, driftPx, driftDurata, scale = 1 }: NorProps) {
  const { redus, inView } = useMiscareHero()
  const delayIdle = useDelayScurs(TIMELINE.idle)

  return (
    <motion.div
      aria-hidden
      className={clasa}
      initial={redus ? false : { opacity: 0, x: dinX }}
      animate={{ opacity: opacitate, x: 0 }}
      transition={{ duration: 1.2, delay: intraLa, ease: 'easeOut' }}
    >
      <motion.svg
        viewBox="0 0 116 72"
        className="h-auto w-full fill-cloud"
        animate={redus || !inView ? undefined : { x: [0, driftPx, 0] }}
        transition={{
          duration: driftDurata,
          delay: delayIdle,
          ease: 'linear',
          repeat: Infinity,
        }}
        style={{ scale }}
        focusable="false"
      >
        <path d={FORME[forma]} />
      </motion.svg>
    </motion.div>
  )
}

/** Strat 1 — 3 nori de departare: opacity .35, scale .7 (blur-ul e pe strat). */
export function NoriDepartare() {
  const t = TIMELINE.nori.departare
  return (
    <>
      <Nor forma={0} clasa="absolute top-[12%] left-[6%] w-40" opacitate={0.35} intraLa={t} dinX={-60} driftPx={26} driftDurata={72} scale={0.7} />
      <Nor forma={1} clasa="absolute top-[7%] right-[30%] w-32" opacitate={0.35} intraLa={t + 0.12} dinX={60} driftPx={-20} driftDurata={88} scale={0.7} />
      <Nor forma={2} clasa="absolute top-[34%] right-[6%] w-36" opacitate={0.35} intraLa={t + 0.24} dinX={60} driftPx={22} driftDurata={61} scale={0.7} />
    </>
  )
}

/** Strat 2 — 4 nori de mijloc: opacity .7. */
export function NoriMijloc() {
  const t = TIMELINE.nori.mijloc
  return (
    <>
      <Nor forma={3} clasa="absolute top-[18%] left-[24%] w-48" opacitate={0.7} intraLa={t} dinX={-60} driftPx={-30} driftDurata={57} />
      <Nor forma={2} clasa="absolute top-[6%] left-[52%] w-40" opacitate={0.7} intraLa={t + 0.1} dinX={60} driftPx={24} driftDurata={83} />
      <Nor forma={0} clasa="absolute top-[46%] left-[10%] w-44" opacitate={0.7} intraLa={t + 0.2} dinX={-60} driftPx={28} driftDurata={95} />
      <Nor forma={1} clasa="absolute top-[28%] right-[12%] w-52" opacitate={0.7} intraLa={t + 0.3} dinX={60} driftPx={-26} driftDurata={66} />
    </>
  )
}

/** Strat 7 — un singur nor foreground: opacity .5, scale 1.08 → 1. */
export function NorPrim() {
  const { redus, inView } = useMiscareHero()
  const delayIdle = useDelayScurs(TIMELINE.idle)

  return (
    <motion.div
      aria-hidden
      className="absolute bottom-[-6%] left-[-4%] w-[26rem] max-w-[60vw]"
      initial={redus ? false : { opacity: 0, scale: 1.08 }}
      animate={{ opacity: 0.5, scale: 1 }}
      transition={{ duration: 1.1, delay: TIMELINE.nori.prim, ease: EASE.expo }}
    >
      <motion.svg
        viewBox="0 0 116 72"
        className="h-auto w-full fill-cloud"
        animate={redus || !inView ? undefined : { x: [0, 34, 0] }}
        transition={{ duration: 78, delay: delayIdle, ease: 'linear', repeat: Infinity }}
        focusable="false"
      >
        <path d={FORME[1]} />
      </motion.svg>
    </motion.div>
  )
}
