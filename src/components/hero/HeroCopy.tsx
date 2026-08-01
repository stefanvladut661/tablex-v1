import { useRef } from 'react'
import { Link } from 'react-router'
import { ArrowRightIcon } from 'lucide-react'
import { motion, useInView } from 'motion/react'

import { RUTE } from '@/lib/rute'
import { EASE, TIMELINE } from './motion.config'
import { useDelayScurs, useMiscareHero } from './useParallax'

/**
 * Coloana de text: H1 cu mask reveal pe linii, underline-ul --signal desenat
 * (semnatura vizuala a paginii), subtitlu si cele doua CTA-uri.
 *
 * Mask reveal = overflow hidden + translate, NU clip-path animat — clip-path
 * cade pe Safari la fonturi variabile.
 */

const LINII = ['Mesele tale, rezervate', 'inainte ca usile'] as const
const LINIE_SUBLINIATA = 'sa se deschida.'

function LinieH1({ text, la, redus }: { text: string; la: number; redus: boolean }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        className="block"
        initial={redus ? false : { y: '110%', rotate: 2 }}
        animate={{ y: '0%', rotate: 0 }}
        transition={{ duration: 0.75, delay: la, ease: EASE.expo }}
      >
        {text}
      </motion.span>
    </span>
  )
}

export function HeroCopy() {
  const { redus, copyStart } = useMiscareHero()
  const ctaRef = useRef<HTMLSpanElement>(null)
  const ctaInView = useInView(ctaRef)
  const delayIdle = useDelayScurs(TIMELINE.idle)

  // Toate momentele fazei de text sunt exprimate fata de 2.15 in spec;
  // pe mobil intreaga faza aluneca la 1.4s.
  const t = (v: number) => v - TIMELINE.copy.start + copyStart

  return (
    <div className="relative">
      <h1 className="font-display text-[clamp(2.2rem,9vw,2.9rem)] leading-[1.04] font-extrabold tracking-[-0.035em] text-balance text-foreground md:text-[clamp(2.9rem,5.6vw,4.75rem)]">
        {LINII.map((linie, i) => (
          <LinieH1
            key={linie}
            text={linie}
            la={t(2.35 + i * TIMELINE.copy.lineStagger)}
            redus={redus}
          />
        ))}
        {/* Linia 3, cu underline-ul desenat dedesubt */}
        <span className="block overflow-visible">
          <span className="relative inline-block overflow-hidden pb-[0.08em] align-top">
            <motion.span
              className="block"
              initial={redus ? false : { y: '110%', rotate: 2 }}
              animate={{ y: '0%', rotate: 0 }}
              transition={{ duration: 0.75, delay: t(2.59), ease: EASE.expo }}
            >
              {LINIE_SUBLINIATA}
            </motion.span>
            <svg
              aria-hidden
              focusable="false"
              viewBox="0 0 260 24"
              preserveAspectRatio="none"
              className="absolute -bottom-[0.06em] left-0 h-[0.22em] w-full text-signal"
              fill="none"
            >
              {/* Doua treceri usor decalate — pare trasat cu markerul. */}
              <motion.path
                d="M6 14 C 60 20, 120 6, 254 12"
                stroke="currentColor"
                strokeWidth={7}
                strokeLinecap="round"
                initial={redus ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.55, delay: t(TIMELINE.underline), ease: EASE.inOut }}
              />
              <motion.path
                d="M6 17 C 60 23, 120 9, 254 15"
                stroke="currentColor"
                strokeWidth={7}
                strokeLinecap="round"
                opacity={0.45}
                initial={redus ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 0.55,
                  delay: t(TIMELINE.underline) + 0.06,
                  ease: EASE.inOut,
                }}
              />
            </svg>
          </span>
        </span>
      </h1>

      <motion.p
        className="mt-6 max-w-md text-lg leading-[1.65] text-muted-foreground"
        initial={redus ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: t(TIMELINE.subtitlu), ease: 'easeOut' }}
      >
        Disponibilitate live, zero rezervari duble si un plan al salii pe care
        echipa ta chiar il intelege.
      </motion.p>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        {/* CTA primar — accent plin, cu shine sweep in idle */}
        <motion.span
          ref={ctaRef}
          className="inline-block"
          // visibility: pana la aparitie, CTA-ul nu e atins de Tab —
          // altfel focusul ar ateriza pe un buton invizibil (opacity 0).
          initial={redus ? false : { opacity: 0, scale: 0.92, visibility: 'hidden' }}
          animate={{ opacity: 1, scale: 1, visibility: 'visible' }}
          transition={{
            type: 'spring',
            stiffness: 220,
            damping: 18,
            delay: t(TIMELINE.ctaPrimar),
          }}
        >
          <Link
            to={RUTE.demoHarta}
            className="relative inline-flex h-12 items-center overflow-hidden rounded-full bg-primary px-7 text-[15px] font-medium tracking-[-0.01em] text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary"
          >
            Cere un demo
            {!redus && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3"
                style={{
                  background:
                    'linear-gradient(100deg, transparent, color-mix(in oklab, var(--primary-foreground) 14%, transparent), transparent)',
                }}
                initial={{ x: '-150%' }}
                animate={ctaInView ? { x: ['-150%', '450%'] } : undefined}
                transition={{
                  duration: 0.9,
                  delay: delayIdle,
                  repeat: Infinity,
                  repeatDelay: 5.1,
                  ease: 'easeInOut',
                }}
              />
            )}
          </Link>
        </motion.span>

        {/* CTA secundar — text + sageata, fara fill */}
        <motion.span
          className="inline-block"
          initial={redus ? false : { opacity: 0, x: -8, visibility: 'hidden' }}
          animate={{ opacity: 1, x: 0, visibility: 'visible' }}
          transition={{ duration: 0.5, delay: t(TIMELINE.ctaSecundar), ease: 'easeOut' }}
        >
          <a
            href="#cum-functioneaza"
            className="group inline-flex items-center gap-2 text-[15px] font-medium tracking-[-0.01em] text-foreground focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary"
          >
            Vezi cum functioneaza
            <ArrowRightIcon
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </a>
        </motion.span>
      </div>
    </div>
  )
}
