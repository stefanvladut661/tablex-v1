import type { ReactNode } from 'react'
import { motion, useTransform } from 'motion/react'

import { useMiscareHero, useParallax } from './useParallax'

interface ParallaxLayerProps {
  depth: number
  scroll: number
  z: number
  /** Blur static de adancime (straturile 1 si 7). */
  blur?: number
  /**
   * Doar stratul telefonului primeste rotatie 3D — daca rotesti tot,
   * se rupe iluzia de adancime (spec §2).
   */
  tilt?: boolean
  className?: string
  children?: ReactNode
}

/**
 * Wrapper generic pentru un strat de parallax. Fiecare strat e compus
 * independent pe GPU: animam exclusiv transform/opacity/filter.
 */
export function ParallaxLayer({
  depth,
  scroll,
  z,
  blur,
  tilt = false,
  className,
  children,
}: ParallaxLayerProps) {
  const { dx, dy, redus } = useMiscareHero()
  const { x, y } = useParallax(depth, scroll)

  // Bonus-ul de volum al telefonului: rotateY = dx * -4°, rotateX = dy * 2.5°.
  const rotateY = useTransform(dx, (v) => v * -4)
  const rotateX = useTransform(dy, (v) => v * 2.5)

  const filtru = blur ? `blur(${blur}px)` : undefined

  if (redus) {
    return (
      <div className={className} style={{ zIndex: z, filter: filtru }}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      className={className}
      style={{
        zIndex: z,
        x,
        y,
        filter: filtru,
        willChange: 'transform',
        ...(tilt ? { rotateX, rotateY, transformPerspective: 1400 } : {}),
      }}
    >
      {children}
    </motion.div>
  )
}
