import type { CSSProperties, ReactNode, RefObject } from 'react'
import { motion, useInView, useReducedMotion, type Variants } from 'motion/react'

import { cn } from '@/lib/utils'

/**
 * Reveal la scroll, sincronizat pe un singur container.
 *
 * Toate elementele privesc acelasi `timelineRef`, deci intra in scena impreuna,
 * decalate de `animationNum`. Asa se evita situatia in care fiecare card isi
 * porneste propriul observer si sectiunea pare ca "clipeste" pe bucati.
 */

/** Tag-urile pe care le putem anima. Lista scurta, cat sa acopere o sectiune. */
type TagAnimat = 'div' | 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'li' | 'section'

/** Decalajul dintre doua elemente consecutive, in secunde (§50.5 — animatii scurte). */
const DECALAJ = 0.09

const VARIANTE_REVEAL: Variants = {
  hidden: { opacity: 0, y: -16, filter: 'blur(8px)' },
  visible: (indice: number) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { delay: indice * DECALAJ, duration: 0.45, ease: 'easeOut' },
  }),
}

interface TimelineContentProps {
  children: ReactNode
  /** Pozitia in secventa: 0 intra primul, 1 al doilea si asa mai departe. */
  animationNum: number
  /** Containerul urmarit. Cand intra in viewport, porneste toata secventa. */
  timelineRef: RefObject<HTMLElement | null>
  customVariants?: Variants
  as?: TagAnimat
  className?: string
  style?: CSSProperties
  /** Implicit ruleaza o singura data; pune `false` daca vrei reluare la fiecare scroll. */
  once?: boolean
}

export function TimelineContent({
  children,
  animationNum,
  timelineRef,
  customVariants,
  as = 'div',
  className,
  style,
  once = true,
}: TimelineContentProps) {
  const preferaMiscareRedusa = useReducedMotion()
  const esteVizibil = useInView(timelineRef, { once, amount: 0.15 })

  // Accesibilitate: cine a cerut mai putina miscare primeste continutul direct,
  // fara blur si fara translatie. Nu ascundem nimic, doar nu animam.
  if (preferaMiscareRedusa) {
    const Tag = as
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    )
  }

  const Element = motion[as] as typeof motion.div

  return (
    <Element
      initial="hidden"
      animate={esteVizibil ? 'visible' : 'hidden'}
      custom={animationNum}
      variants={customVariants ?? VARIANTE_REVEAL}
      className={cn(className)}
      style={style}
    >
      {children}
    </Element>
  )
}
