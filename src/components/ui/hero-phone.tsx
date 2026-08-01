import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { BellIcon, CheckIcon, type LucideIcon } from 'lucide-react'
import { motion, useReducedMotion, type Variants } from 'motion/react'

import { Button } from '@/components/ui/button'
import { PILULA } from '@/components/ui/landing-blocks'
import { cn } from '@/lib/utils'

/**
 * Hero cu telefon "prezentat" spre privitor.
 *
 * Coregrafia are doua faze, orchestrate cu motion (succesorul framer-motion,
 * acelasi API de variants):
 *   1. Mana cu telefonul intra din dreapta, cu un gest de prezentare
 *      (alunecare + rotatie usoara), pe un arc de spring.
 *   2. Abia dupa ce telefonul s-a asezat, textul din stanga se dezvaluie
 *      in cascada (staggerChildren), ca o secventa de incarcare premium.
 * Dupa aterizare, mana respira usor (y: 0 → -8 → 0), ca sectiunea sa nu para
 * inghetata.
 *
 * Mana e desenata ca silueta, din forme pe tokenul --secondary: nu incearca
 * sa para fotografie, deci nu are ce sa para gresit — si urmeaza singura tema.
 * Ecranul telefonului nu e o imagine, ci interfata TableX in miniatura,
 * construita pe aceleasi tokenuri (--primary, --status-liber).
 */

const VARIANTE_CONTAINER: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
}

const VARIANTE_ELEMENT: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

/* ─────────────────────── Ecranul telefonului, in miniatura ─────────────── */

function EcranTableX({ anima }: { anima: boolean }) {
  return (
    <div className="grid gap-2.5 p-3 pt-8">
      {/* Bara aplicatiei */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold tracking-tight">
          Table<span className="text-primary">X</span>
        </span>
        <span className="relative">
          <BellIcon className="size-3.5 text-muted-foreground" />
          <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-status-ocupat" />
        </span>
      </div>

      {/* Rezervarea confirmata, cu insigna care pulseaza */}
      <div className="rounded-lg bg-card p-2.5 ring-1 ring-foreground/10">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold">Masa 12 · 19:30</span>
          <span className="relative">
            {anima && (
              <motion.span
                aria-hidden
                animate={{ opacity: [0.2, 0.7, 0.2] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-status-liber blur-[6px]"
              />
            )}
            <span className="relative inline-flex items-center gap-1 rounded-full bg-status-liber px-2 py-0.5 text-[10px] font-semibold text-status-liber-foreground">
              <CheckIcon className="size-2.5" />
              Confirmata
            </span>
          </span>
        </div>
        <span className="mt-0.5 block text-[10px] text-muted-foreground">4 persoane · Salon</span>
      </div>

      {/* Statusul meselor, in doua celule */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-status-liber-soft p-2">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-foreground">
            <span className="size-1.5 rounded-full bg-status-liber" />
            Masa 4
          </span>
          <span className="mt-0.5 block text-[9px] text-muted-foreground">Libera</span>
        </div>
        <div className="rounded-lg bg-status-ocupat-soft p-2">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-foreground">
            <span className="size-1.5 rounded-full bg-status-ocupat" />
            Masa 9
          </span>
          <span className="mt-0.5 block text-[9px] text-muted-foreground">Ocupata</span>
        </div>
      </div>

      {/* Widgetul de rezervare */}
      <div className="rounded-lg bg-card p-2.5 ring-1 ring-foreground/10">
        <span className="text-[10px] font-medium text-muted-foreground">Cate persoane?</span>
        <div className="mt-1.5 flex gap-1.5">
          {[1, 2, 3, 4].map((numar) => (
            <span
              key={numar}
              className={cn(
                'grid size-7 place-content-center rounded-full text-[10px] font-medium',
                numar === 2
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {numar}
            </span>
          ))}
        </div>
      </div>

      <span className="block rounded-md bg-primary py-2 text-center text-[11px] font-semibold text-primary-foreground">
        Confirma rezervarea
      </span>
    </div>
  )
}

/* ────────────────────── Telefonul tinut in mana-silueta ───────────────── */

function TelefonInMana({ anima }: { anima: boolean }) {
  const partiMana = 'bg-secondary ring-1 ring-foreground/10'

  return (
    <div className="relative mx-auto w-[250px] sm:w-[290px]">
      {/* Antebratul, urcand din coltul din dreapta-jos */}
      <div
        aria-hidden
        className={cn('absolute -right-12 -bottom-28 h-64 w-24 rotate-[24deg] rounded-[3rem]', partiMana)}
      />

      {/* Degetele, curbate peste muchia stanga */}
      {[24, 37, 50, 63].map((sus) => (
        <div
          key={sus}
          aria-hidden
          style={{ top: `${sus}%` }}
          className={cn('absolute -left-3 z-20 h-11 w-7 rounded-full', partiMana)}
        />
      ))}

      {/* Policele, peste coltul din dreapta-jos al ramei */}
      <div
        aria-hidden
        className={cn('absolute -right-4 bottom-14 z-20 h-24 w-9 -rotate-[24deg] rounded-full', partiMana)}
      />

      {/* Telefonul propriu-zis */}
      <div className="relative z-10 rounded-[2.2rem] bg-sidebar p-2.5 shadow-2xl ring-1 ring-foreground/15">
        <div
          aria-hidden
          className="absolute top-4 left-1/2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-sidebar-accent"
        />
        <div className="aspect-[9/19] overflow-hidden rounded-[1.7rem] bg-background">
          <EcranTableX anima={anima} />
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────────────── Hero ───────────────────────────────── */

interface ActiuneHero {
  text: string
  to: string
  variant?: 'default' | 'outline' | 'secondary'
  icoana?: LucideIcon
}

interface AncoraHero {
  text: string
  href: string
  icoana?: LucideIcon
}

interface HeroPhoneProps {
  eticheta?: { text: string; icoana?: LucideIcon }
  titlu: ReactNode
  subtitlu: ReactNode
  actiuni?: ActiuneHero[]
  /** Pastilele cu bifa de sub butoane (garantii scurte). */
  garantii?: string[]
  /** Scurtaturi catre sectiunile paginii. */
  ancore?: AncoraHero[]
  className?: string
}

export function HeroPhone({
  eticheta,
  titlu,
  subtitlu,
  actiuni = [],
  garantii = [],
  ancore = [],
  className,
}: HeroPhoneProps) {
  const preferaMiscareRedusa = useReducedMotion()
  const [aAterizat, setAAterizat] = useState(false)

  // Cu miscare redusa nu exista faza 1, deci continutul e vizibil imediat.
  const pornit = preferaMiscareRedusa || aAterizat
  const IcoanaEticheta = eticheta?.icoana

  const continutStanga = (
    <>
      {eticheta && (
        <motion.div variants={VARIANTE_ELEMENT}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
            {IcoanaEticheta && <IcoanaEticheta className="size-3.5" />}
            {eticheta.text}
          </span>
        </motion.div>
      )}

      <motion.h1
        variants={VARIANTE_ELEMENT}
        className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
      >
        {titlu}
      </motion.h1>

      <motion.p
        variants={VARIANTE_ELEMENT}
        className="mt-4 max-w-lg text-muted-foreground text-pretty"
      >
        {subtitlu}
      </motion.p>

      {actiuni.length > 0 && (
        <motion.div variants={VARIANTE_ELEMENT} className="mt-8 flex flex-wrap gap-3">
          {actiuni.map(({ text, to, variant = 'default', icoana: Icoana }) => (
            <Button key={text} asChild size="lg" variant={variant} className={PILULA}>
              <Link to={to}>
                {text}
                {Icoana && <Icoana className="size-4" />}
              </Link>
            </Button>
          ))}
        </motion.div>
      )}

      {garantii.length > 0 && (
        <motion.ul variants={VARIANTE_ELEMENT} className="mt-8 flex flex-wrap gap-2">
          {garantii.map((text) => (
            <li
              key={text}
              className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-medium tracking-wide uppercase"
            >
              <span className="grid size-4 shrink-0 place-content-center rounded-full bg-status-liber">
                <CheckIcon className="size-3 text-status-liber-foreground" />
              </span>
              {text}
            </li>
          ))}
        </motion.ul>
      )}

      {ancore.length > 0 && (
        <motion.div variants={VARIANTE_ELEMENT} className="mt-8 flex flex-wrap gap-2">
          {ancore.map(({ text, href, icoana: Icoana }) => (
            <a
              key={href}
              href={href}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground',
                'transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
              )}
            >
              {Icoana && <Icoana className="size-4 text-primary" />}
              {text}
            </a>
          ))}
        </motion.div>
      )}
    </>
  )

  return (
    <div className={cn('relative isolate', className)}>
      {/* Halou in culoarea de accent, in spatele telefonului */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-2/3"
        style={{
          backgroundImage:
            'radial-gradient(60% 60% at 70% 45%, color-mix(in oklab, var(--primary) 18%, transparent) 0%, transparent 72%)',
        }}
      />

      <div className="grid items-center gap-12 lg:grid-cols-2">
        {/* Stanga: continutul, dezvaluit dupa aterizarea telefonului */}
        {preferaMiscareRedusa ? (
          <div>{continutStanga}</div>
        ) : (
          <motion.div
            variants={VARIANTE_CONTAINER}
            initial="hidden"
            animate={pornit ? 'visible' : 'hidden'}
          >
            {continutStanga}
          </motion.div>
        )}

        {/* Dreapta: mana cu telefonul */}
        {preferaMiscareRedusa ? (
          <div className="py-6">
            <TelefonInMana anima={false} />
          </div>
        ) : (
          <motion.div
            className="py-6"
            initial={{ x: '55%', rotate: 10, scale: 0.92, opacity: 0 }}
            animate={{ x: 0, rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 60, damping: 14, mass: 1.1, delay: 0.15 }}
            onAnimationComplete={() => setAAterizat(true)}
          >
            <motion.div
              animate={aAterizat ? { y: [0, -8, 0] } : undefined}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <TelefonInMana anima />
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default HeroPhone
