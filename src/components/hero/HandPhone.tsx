import { useRef } from 'react'
import { motion } from 'motion/react'

import { ASSETS, EASE, ECRAN_RECT, MANA_PX, TIMELINE } from './motion.config'
import { PhoneScreen } from './PhoneScreen'
import { useMiscareHero } from './useParallax'

/**
 * Mana cu telefonul — fotografia reala (mana umana alba, telefon cu ecranul
 * gol) peste care interfata TableX se suprapune in DOM, prin ECRAN_RECT
 * (calibrat pe pixelii fotografiei, vezi motion.config.ts).
 *
 * Intrarea vine din TIMELINE.mana: blur → clar, scale si rotate; la final
 * un singur balans din incheietura, apoi nemiscare completa. Animatia
 * ecranului (PhoneScreen, faza 1b) ruleaza pe propriul timeline si se
 * suprapune peste intrarea mainii. Parallax-ul de mouse (depth 0.075) se
 * aplica pe containerul din Hero.tsx, nu aici.
 */

export function HandPhone() {
  const { redus, mobil } = useMiscareHero()
  const intrareRef = useRef<HTMLDivElement>(null)

  // Pe mobil intrarea e simpla: doar y + fade, fara rotate/blur (spec §6).
  const intrareInitial = mobil
    ? { opacity: 0, y: 120 }
    : { opacity: 0, y: 260, x: 90, scale: 1.14, rotate: 9, filter: 'blur(14px)' }
  const intrareFinal = mobil
    ? { opacity: 1, y: 0 }
    : { opacity: 1, y: 0, x: 0, scale: 1, rotate: 0, filter: 'blur(0px)' }

  return (
    <motion.div
      ref={intrareRef}
      // Cadrul include si mana, nu doar telefonul — latimea e mai mare
      // ca telefonul din compozitie sa ramana la dimensiune de erou.
      // Reducerea de dimensiune se face pe LATIME, nu pe scale: scale e
      // transform, nu schimba cutia de layout, deci ar fi lasat o rama goala
      // de zeci de px in jurul mainii — chiar spatiul care parea "gol" sub ea.
      className="relative mx-auto w-[min(74vw,317px)] scale-[0.8] lg:w-[378px] lg:scale-[0.88] xl:scale-100"
      initial={redus ? false : intrareInitial}
      animate={intrareFinal}
      transition={{ duration: mobil ? 1 : 1.4, delay: TIMELINE.mana.delay, ease: EASE.expo }}
      onAnimationComplete={() => {
        // will-change doar cat dureaza intrarea (spec §7).
        if (intrareRef.current) intrareRef.current.style.willChange = 'auto'
      }}
      style={redus ? undefined : { willChange: 'transform, opacity, filter' }}
    >
      {/* Balans unic dupa intrare: mana penduleaza usor stanga-dreapta din
          incheietura (pivotul e jos, spre dreapta), o singura data, apoi
          ramane complet nemiscata — fara nicio bucla de idle. */}
      <motion.div
        className="relative"
        style={{ transformOrigin: '58% 96%' }}
        animate={redus ? undefined : { rotate: [0, -2.4, 1.8, -0.9, 0] }}
        transition={{
          duration: TIMELINE.mana.swing.durata,
          delay: mobil ? TIMELINE.mana.swing.delayMobil : TIMELINE.mana.swing.delay,
          ease: 'easeInOut',
          times: [0, 0.28, 0.58, 0.82, 1],
        }}
      >
        {/* width/height intrinseci: browserul rezerva cutia inainte de
            incarcare — zero layout shift (CLS-ul interzis de spec). */}
        {/* Masca de jos stinge taietura incheieturii in fundal. Sta pe IMAGINE,
            nu pe sectiunea urmatoare: asa urca odata cu stratul de parallax si
            marginea ramane ascunsa la orice pozitie de scroll. Ecranul DOM se
            termina la 76.6% (ECRAN_RECT), deci stingerea de la 82% nu-l atinge.
            #000 e canal alfa aici, nu culoare — acelasi idiom ca .hero-grid. */}
        <img
          src={ASSETS.mana}
          alt=""
          width={MANA_PX.latime}
          height={MANA_PX.inaltime}
          fetchPriority="high"
          decoding="async"
          className="h-auto w-full [mask-image:linear-gradient(to_bottom,#000_82%,transparent_99%)]"
        />

        {/* Ecranul DOM, asezat exact peste ecranul alb din fotografie.
            Mockup-ul e continut fictiv, pur decorativ — nu are ce citi un
            screen reader din "Tonight's covers" cu date inventate. */}
        <div
          aria-hidden
          className="pointer-events-none absolute overflow-hidden"
          style={{
            top: ECRAN_RECT.top,
            left: ECRAN_RECT.left,
            width: ECRAN_RECT.width,
            height: ECRAN_RECT.height,
            borderRadius: ECRAN_RECT.raza,
          }}
        >
          <PhoneScreen />
        </div>
      </motion.div>
    </motion.div>
  )
}
