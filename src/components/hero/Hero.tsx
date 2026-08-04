import { useEffect, useMemo, useRef } from 'react'
import {
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
} from 'motion/react'

import { ARC_MOUSE, STRATURI, TIMELINE } from './motion.config'
import { Birds } from './atmosphere/Birds'
import { NorPrim, NoriDepartare, NoriMijloc } from './atmosphere/Clouds'
import { Doodles } from './atmosphere/Doodles'
import { HandPhone } from './HandPhone'
import { HeroCopy } from './HeroCopy'
import { ParallaxLayer } from './ParallaxLayer'
import { MiscareHeroContext, type MiscareHero } from './useParallax'

/**
 * Orchestrarea hero-ului: detine sursele de miscare (cursor, scroll,
 * inaltime), gating-ul de interactivitate (parallax-ul de mouse porneste
 * abia la t = 2.0s, niciodata pe touch) si compune straturile din tabelul
 * STRATURI. Un singur requestAnimationFrame pentru mouse tracking, prin
 * MotionValue — React nu se re-randeaza pe mousemove.
 */

export function Hero() {
  const heroRef = useRef<HTMLElement>(null)
  const redus = !!useReducedMotion()
  const inView = useInView(heroRef, { amount: 0.1 })
  const mobil = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
    [],
  )

  // Cursor normalizat [-1, 1], cu un singur spring per axa pentru toate straturile.
  const dxBrut = useMotionValue(0)
  const dyBrut = useMotionValue(0)
  const dx = useSpring(dxBrut, ARC_MOUSE)
  const dy = useSpring(dyBrut, ARC_MOUSE)

  // Parallax-ul nu raspunde deloc inainte de 2.0s — nu concureaza cu intrarea.
  const interactiv = useRef(false)
  useEffect(() => {
    const timer = setTimeout(() => {
      interactiv.current = true
    }, TIMELINE.interactiveAt * 1000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const el = heroRef.current
    if (!el || redus || mobil) return
    // Pe touch parallax-ul de mouse e oprit complet; ramane doar scroll-ul.
    if (!window.matchMedia('(pointer: fine)').matches) return

    let cadru = 0
    let ultimul: PointerEvent | null = null

    const tick = () => {
      cadru = 0
      if (!ultimul || !interactiv.current) return
      const rect = el.getBoundingClientRect()
      dxBrut.set(Math.max(-1, Math.min(1, (ultimul.clientX - rect.left - rect.width / 2) / (rect.width / 2))))
      dyBrut.set(Math.max(-1, Math.min(1, (ultimul.clientY - rect.top - rect.height / 2) / (rect.height / 2))))
    }
    const laMiscare = (e: PointerEvent) => {
      ultimul = e
      if (!cadru) cadru = requestAnimationFrame(tick)
    }
    const laIesire = () => {
      // Anuleaza rAF-ul in curs si uita ultimul eveniment: altfel tick-ul
      // programat inaintea lui pointerleave ar suprascrie 0 cu pozitia de
      // langa margine si parallax-ul ar ramane blocat deplasat.
      if (cadru) {
        cancelAnimationFrame(cadru)
        cadru = 0
      }
      ultimul = null
      dxBrut.set(0)
      dyBrut.set(0)
    }

    el.addEventListener('pointermove', laMiscare)
    el.addEventListener('pointerleave', laIesire)
    return () => {
      el.removeEventListener('pointermove', laMiscare)
      el.removeEventListener('pointerleave', laIesire)
      if (cadru) cancelAnimationFrame(cadru)
    }
  }, [redus, mobil, dxBrut, dyBrut])

  // Scroll parallax: progresul iesirii hero-ului prin partea de sus.
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const inaltime = useMotionValue(720)
  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const observator = new ResizeObserver(() => inaltime.set(el.offsetHeight))
    observator.observe(el)
    return () => observator.disconnect()
  }, [inaltime])

  const context: MiscareHero = {
    dx,
    dy,
    scrollYProgress,
    inaltime,
    redus,
    inView,
    mobil,
    copyStart: mobil ? TIMELINE.copy.startMobil : TIMELINE.copy.start,
  }

  const S = STRATURI

  return (
    <MiscareHeroContext.Provider value={context}>
      <section
        ref={heroRef}
        aria-label="tableX — rezervări pe planul sălii"
        className="hero-wash relative isolate overflow-hidden"
      >
        {/* Strat 0 — grid-ul de 1px, semnal de software serios */}
        <ParallaxLayer
          {...S.fundal}
          className="hero-grid pointer-events-none absolute inset-0"
        />

        {/* Straturi 1–2 — atmosfera intra inaintea textului */}
        {!mobil && (
          <>
            <ParallaxLayer {...S.noriDepartare} className="pointer-events-none absolute inset-0">
              <NoriDepartare />
            </ParallaxLayer>
            <ParallaxLayer {...S.noriMijloc} className="pointer-events-none absolute inset-0">
              <NoriMijloc />
            </ParallaxLayer>
          </>
        )}

        {/* Strat 3 — pasarile, prin spatele headline-ului */}
        {!redus && (
          <ParallaxLayer {...S.pasari} className="pointer-events-none absolute inset-0">
            <Birds />
          </ParallaxLayer>
        )}

        {/* Straturile 4 si 6 — continutul, in flux, responsive */}
        {/* Inaltimea e sub un ecran plin (92svh → 76svh) ca banda de recenzii
            sa se vada de sub telefon inainte de orice derulare. */}
        <div className="wrap-landing relative grid items-center gap-8 pt-14 pb-10 md:pt-20 lg:min-h-[min(76svh,700px)] lg:grid-cols-[52%_48%] lg:gap-0 lg:py-0">
          <ParallaxLayer {...S.text} className="relative">
            <HeroCopy />
          </ParallaxLayer>
          <ParallaxLayer {...S.telefon} tilt className="relative lg:-ml-6">
            <HandPhone />
          </ParallaxLayer>
        </div>

        {/* Strat 5 — doodle-urile */}
        <ParallaxLayer {...S.doodles} className="pointer-events-none absolute inset-0">
          <Doodles />
        </ParallaxLayer>

        {/* Strat 7 — norul foreground */}
        <ParallaxLayer {...S.norPrim} className="pointer-events-none absolute inset-0">
          <NorPrim />
        </ParallaxLayer>
      </section>
    </MiscareHeroContext.Provider>
  )
}
