import { useRef, useState } from 'react'
import { motion } from 'motion/react'

import { cn } from '@/lib/utils'
import { ASPECT_CADRU, ASSETS, EASE, ECRAN_RECT, TIMELINE } from './motion.config'
import { PhoneScreen } from './PhoneScreen'
import { useDelayScurs, useMiscareHero } from './useParallax'

/**
 * Mana cu telefonul — singurul element care se misca in primele 2 secunde.
 *
 * Cat timp asset-ul WebP (ASSETS.mana) nu exista, componenta cade automat
 * pe o silueta desenata din CSS (telefon + mana pe tokenul --secondary).
 * Cand pui fisierul in /public/hero/, imaginea preia rolul iar ecranul DOM
 * se pozitioneaza peste ea prin ECRAN_RECT (de calibrat pe asset-ul real).
 */

export function HandPhone() {
  const { redus, inView, mobil } = useMiscareHero()
  // Se incearca pe rand candidatii din ASSETS.mana (WebP, apoi PNG);
  // cand lista se epuizeaza, ramane silueta CSS.
  const [candidat, setCandidat] = useState(0)
  const areAsset = candidat < ASSETS.mana.length
  const [asetIncarcat, setAsetIncarcat] = useState(false)
  const intrareRef = useRef<HTMLDivElement>(null)
  const delayIdle = useDelayScurs(TIMELINE.idle)

  // Pe mobil intrarea e simpla: doar y + fade, fara rotate/blur (spec §6).
  const intrareInitial = mobil
    ? { opacity: 0, y: 120 }
    : { opacity: 0, y: 260, x: 90, scale: 1.14, rotate: 9, filter: 'blur(14px)' }
  const intrareFinal = mobil
    ? { opacity: 1, y: 0 }
    : { opacity: 1, y: 0, x: 0, scale: 1, rotate: 0, filter: 'blur(0px)' }

  const ecran = (
    // Mockup-ul e continut fictiv, pur decorativ — nu are ce citi un
    // screen reader din "Tonight's covers" cu date inventate.
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute overflow-hidden"
        style={
          areAsset && asetIncarcat
            ? {
                top: ECRAN_RECT.top,
                left: ECRAN_RECT.left,
                width: ECRAN_RECT.width,
                aspectRatio: '9 / 19',
                // Raza vine din config, ca procent eliptic — se scaleaza
                // cu ecranul, spre deosebire de un radius fix in px.
                borderRadius: ECRAN_RECT.raza,
                rotate: `${ECRAN_RECT.rotate}deg`,
              }
            : // Silueta: ecranul umple rama telefonului desenat in CSS.
              { inset: '10px', borderRadius: '32px' }
        }
      >
        <PhoneScreen />
      </div>
    </div>
  )

  return (
    <motion.div
      ref={intrareRef}
      // Cadrul 3:4 include si mana, nu doar telefonul — latimea e mai mare
      // ca telefonul din compozitie sa ramana la dimensiune de erou.
      className="relative mx-auto w-[min(84vw,360px)] scale-[0.8] lg:w-[430px] lg:scale-[0.88] xl:scale-100"
      initial={redus ? false : intrareInitial}
      animate={intrareFinal}
      transition={{ duration: mobil ? 1 : 1.4, delay: TIMELINE.mana.delay, ease: EASE.expo }}
      onAnimationComplete={() => {
        // will-change doar cat dureaza intrarea (spec §7).
        if (intrareRef.current) intrareRef.current.style.willChange = 'auto'
      }}
      style={redus ? undefined : { willChange: 'transform, opacity, filter' }}
    >
      {/* Idle: telefonul respira usor, din 3.8s, doar cat e in viewport. */}
      <motion.div
        className="relative"
        animate={redus || !inView ? undefined : { y: [0, -9, 0] }}
        transition={{ duration: 5.5, delay: delayIdle, ease: 'easeInOut', repeat: Infinity }}
      >
        {/* Cutia rezervata are ACELASI aspect (3:4, ca imaginea generata) in
            ambele ramuri — altfel swap-ul pe silueta ar produce layout shift,
            adica exact CLS-ul pe care spec-ul il interzice. */}
        <div className="relative" style={{ aspectRatio: ASPECT_CADRU }}>
          {areAsset ? (
            <>
              <img
                src={ASSETS.mana[candidat]}
                alt=""
                fetchPriority="high"
                decoding="async"
                className={cn(
                  'absolute inset-0 h-full w-full object-contain',
                  !asetIncarcat && 'opacity-0',
                )}
                onLoad={() => setAsetIncarcat(true)}
                onError={() => setCandidat((c) => c + 1)}
              />
              {asetIncarcat && ecran}
            </>
          ) : (
            // Silueta e mai zvelta decat cadrul 3:4 — o centram si o
            // scalam pe inaltime, cutia ramane identica.
            <div className="absolute inset-0 flex items-center justify-center">
              <SiluetaTelefon>{ecran}</SiluetaTelefon>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

/** Rezerva: telefon desenat in DOM + mana-silueta pe tokenul --secondary. */
function SiluetaTelefon({ children }: { children: React.ReactNode }) {
  const parte = 'bg-secondary ring-1 ring-foreground/10'

  return (
    <div className="relative h-full">
      {/* Antebratul, urcand din coltul din dreapta-jos */}
      <div
        aria-hidden
        className={cn('absolute -right-12 -bottom-24 h-56 w-24 rotate-[24deg] rounded-[3rem]', parte)}
      />
      {/* Degetele, peste muchia stanga */}
      {[24, 37, 50, 63].map((sus) => (
        <div
          key={sus}
          aria-hidden
          style={{ top: `${sus}%` }}
          className={cn('absolute -left-3 z-20 h-11 w-7 rounded-full', parte)}
        />
      ))}
      {/* Policele, peste coltul din dreapta-jos al ramei */}
      <div
        aria-hidden
        className={cn('absolute -right-4 bottom-12 z-20 h-24 w-9 -rotate-[24deg] rounded-full', parte)}
      />

      {/* Rama telefonului — umbra neutra, fara culoare (spec §1).
          Inaltimea vine din cadrul 3:4, latimea din aspectul ramei. */}
      <div
        className="relative z-10 h-full rounded-[42px] bg-sidebar p-2.5 ring-1 ring-foreground/15"
        style={{ aspectRatio: '9 / 18.2', boxShadow: '0 24px 60px -20px rgba(11,18,32,0.25)' }}
      >
        <div
          aria-hidden
          className="absolute top-4 left-1/2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-sidebar-accent"
        />
        {children}
      </div>
    </div>
  )
}
