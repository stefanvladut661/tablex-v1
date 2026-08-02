import { useState } from 'react'
import { Link } from 'react-router'
import { MoonIcon, SunIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useTema } from '@/hooks/useTema'
import { RUTE, ruteDupaLogin } from '@/lib/rute'
import { TIMELINE } from './motion.config'
import { useDelayScurs } from './useParallax'

/**
 * Navigatia — parte din coregrafia hero-ului (intra la 2.10–2.30s), dar
 * montata la nivel de pagina ca sticky-ul sa functioneze pe toata lungimea
 * (position: sticky moare intr-un stramos cu overflow: hidden).
 *
 * Linkurile sunt in romana, ca tot site-ul; "Blog" nu exista ca pagina.
 */

const LINKURI = [
  { text: 'Produs', href: '#functionalitati' },
  { text: 'Planul sălii', href: '#harta' },
  { text: 'Prețuri', href: '#preturi' },
  { text: 'Clienți', href: '#clienti' },
] as const


export function Navbar() {
  const { esteAutentificat, profil } = useAuth()
  const { temaEfectiva, comutaTema } = useTema()
  const redus = !!useReducedMotion()
  const [mobil] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  )

  // Pe mobil textul incepe la 1.4s, deci si nav-ul aluneca mai devreme.
  const baza = mobil ? TIMELINE.copy.startMobil - 0.05 : 0
  // Dupa ce intro-ul a trecut, delay-urile devin 0: cand starea de
  // autentificare se rezolva asincron si CTA-urile se remonteaza, un delay
  // absolut le-ar tine invizibile inca ~2.4s desi coregrafia s-a terminat.
  const introTrecut = useDelayScurs(TIMELINE.idle) === 0
  const t = (v: number) => (introTrecut ? 0 : mobil ? baza + (v - TIMELINE.nav.logo) : v)

  // visibility intra in animatie ca elementele sa nu fie focusabile cu
  // tastatura cat timp sunt la opacity 0 (focus ring invizibil = WCAG picat).
  const aparitie = (la: number, y = 8) =>
    redus
      ? {}
      : {
          initial: { opacity: 0, y, visibility: 'hidden' as const },
          animate: { opacity: 1, y: 0, visibility: 'visible' as const },
          transition: { duration: 0.45, delay: t(la), ease: 'easeOut' as const },
        }

  // Actiunile din dreapta intra pe spring, nu pe ease (spec: 300/24).
  const aparitieSpring = (la: number) =>
    redus
      ? {}
      : {
          initial: { opacity: 0, y: 8, visibility: 'hidden' as const },
          animate: { opacity: 1, y: 0, visibility: 'visible' as const },
          transition: {
            type: 'spring' as const,
            stiffness: 300,
            damping: 24,
            delay: t(la),
          },
        }

  return (
    <header className="sticky top-0 z-[80] border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <motion.span
          className="text-lg font-semibold tracking-tight"
          {...aparitie(TIMELINE.nav.logo, 10)}
        >
          <Link to={RUTE.acasa} className="focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary">
            Table<span className="text-primary">X</span>
          </Link>
        </motion.span>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Principală">
          {LINKURI.map(({ text, href }, i) => (
            <motion.a
              key={href}
              href={href}
              className="text-[15px] font-medium tracking-[-0.01em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary"
              {...aparitie(TIMELINE.nav.linkuri + i * 0.05)}
            >
              {text}
            </motion.a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <motion.span {...aparitieSpring(TIMELINE.nav.actiuni)}>
            <Button variant="ghost" size="icon-sm" onClick={comutaTema} aria-label="Comută tema">
              {temaEfectiva === 'dark' ? <SunIcon /> : <MoonIcon />}
            </Button>
          </motion.span>

          {esteAutentificat ? (
            <motion.span {...aparitieSpring(TIMELINE.nav.actiuni + 0.06)}>
              <Link
                to={ruteDupaLogin(profil?.tip ?? null)}
                className="inline-flex h-9 items-center rounded-full bg-foreground px-4 text-[15px] font-medium tracking-[-0.01em] text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary"
              >
                Deschide panoul
              </Link>
            </motion.span>
          ) : (
            <>
              <motion.span className="hidden sm:inline-block" {...aparitieSpring(TIMELINE.nav.actiuni)}>
                <Link
                  to={RUTE.login}
                  className="px-2 text-[15px] font-medium tracking-[-0.01em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary"
                >
                  Autentificare
                </Link>
              </motion.span>
              <motion.span {...aparitieSpring(TIMELINE.nav.actiuni + 0.06)}>
                <Link
                  to={RUTE.signup}
                  className="inline-flex h-9 items-center rounded-full bg-foreground px-4 text-[15px] font-medium tracking-[-0.01em] text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary"
                >
                  Începe acum
                </Link>
              </motion.span>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
