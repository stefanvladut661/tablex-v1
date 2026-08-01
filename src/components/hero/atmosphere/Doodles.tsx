import { motion } from 'motion/react'

import { TIMELINE } from '../motion.config'
import { useMiscareHero } from '../useParallax'

/**
 * Doodle-urile: un squiggle desenat (pathLength) langa coloana de text si
 * un arc punctat langa telefon. Arcul NU se deseneaza cu pathLength —
 * animatia pathLength suprascrie strokeDasharray si punctele ar disparea —
 * deci intra prin fade + rotatie usoara.
 */

export function Doodles() {
  const { redus, copyStart } = useMiscareHero()
  // Faza de text se poate muta (mobil incepe la 1.4s); doodle-urile o urmeaza.
  const t = (v: number) => v - TIMELINE.copy.start + copyStart

  return (
    <>
      {/* Squiggle — sub zona de subtitlu, stroke pe accent. */}
      <svg
        aria-hidden
        focusable="false"
        viewBox="0 0 80 20"
        className="absolute top-[64%] left-[5%] w-20 text-primary"
        fill="none"
      >
        <motion.path
          d="M3 12 Q13 4 23 12 T43 12 T63 12 T77 10"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          initial={redus ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, delay: t(TIMELINE.squiggle), ease: 'easeOut' }}
        />
      </svg>

      {/* Arc punctat — deasupra telefonului, in dreapta. */}
      <motion.svg
        aria-hidden
        focusable="false"
        viewBox="0 0 100 50"
        className="absolute top-[10%] right-[7%] w-24 text-primary"
        fill="none"
        initial={redus ? false : { opacity: 0, rotate: -8 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={{ duration: 0.5, delay: t(TIMELINE.squiggle) + 0.1, ease: 'easeOut' }}
      >
        <path
          d="M6 44 Q42 4 94 16"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="1 10"
        />
      </motion.svg>
    </>
  )
}
