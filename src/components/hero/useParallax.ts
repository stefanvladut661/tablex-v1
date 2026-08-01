import { createContext, useContext, useEffect, useState } from 'react'
import { useTransform, type MotionValue } from 'motion/react'

import { PARALLAX } from './motion.config'

/**
 * Contextul de miscare al hero-ului.
 *
 * Hero.tsx detine sursele (cursor normalizat, progres de scroll, inaltimea
 * sectiunii), straturile doar le consuma. `dx`/`dy` sunt DEJA trecute prin
 * spring — scalarea unui spring e echivalenta cu spring-ul pe valoarea
 * scalata, deci platim un singur spring pentru toate straturile.
 */
export interface MiscareHero {
  /** Cursor normalizat la [-1, 1] fata de centrul hero-ului, cu spring. */
  dx: MotionValue<number>
  dy: MotionValue<number>
  /** 0 → 1 pe masura ce hero-ul iese prin partea de sus a viewportului. */
  scrollYProgress: MotionValue<number>
  /** Inaltimea masurata a sectiunii, pentru scroll parallax in px. */
  inaltime: MotionValue<number>
  /** prefers-reduced-motion: totul static, zero parallax, zero bucle. */
  redus: boolean
  /** Hero-ul e in viewport — cand nu e, buclele infinite se opresc. */
  inView: boolean
  /** Sub 768px: coregrafie taiata, nu comprimata (spec §6). */
  mobil: boolean
  /** Momentul de start al fazei de text (2.15s desktop / 1.4s mobil). */
  copyStart: number
}

export const MiscareHeroContext = createContext<MiscareHero | null>(null)

export function useMiscareHero(): MiscareHero {
  const ctx = useContext(MiscareHeroContext)
  if (!ctx) throw new Error('useMiscareHero se foloseste doar in interiorul <Hero>')
  return ctx
}

/**
 * Deplasarea unui strat: mouse (dx/dy * depth) + scroll (progres * inaltime
 * * factor). Ambele in px, insumate intr-un singur MotionValue pe axa Y.
 */
/**
 * Un delay care "curge" o singura data, de la mount-ul paginii. Buclele de
 * idle isi iau delay-ul de aici: cand hero-ul iese si reintra in viewport,
 * animatia reporneste, iar fara asta ar astepta din nou intregul delay al
 * coregrafiei (3.8s+) desi intro-ul a trecut demult.
 */
export function useDelayScurs(secunde: number): number {
  const [scurs, setScurs] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setScurs(true), secunde * 1000)
    return () => clearTimeout(timer)
  }, [secunde])
  return scurs ? 0 : secunde
}

export function useParallax(depth: number, scrollFactor: number) {
  const { dx, dy, scrollYProgress, inaltime } = useMiscareHero()

  const x = useTransform(() => dx.get() * depth * PARALLAX.ampX)
  const y = useTransform(
    () =>
      dy.get() * depth * PARALLAX.ampY -
      scrollYProgress.get() * inaltime.get() * scrollFactor,
  )

  return { x, y }
}
