import { motion } from 'motion/react'
import {
  CalendarDaysIcon,
  LayoutGridIcon,
  MenuIcon,
  SettingsIcon,
  UsersIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { TIMELINE } from './motion.config'
import { useMiscareHero } from './useParallax'

/**
 * UI-ul tableX in miniatura — DOM, nu imagine: se anima intern in Faza 1b,
 * ramane crisp pe retina si se schimba fara reexport de asset.
 *
 * Micro-datele (ore, numar de persoane) sunt in mono, uppercase — intr-un
 * produs de rezervari astea sunt date, nu proza (spec §1).
 */

const REZERVARI = [
  { nume: 'Marin', ora: '19:00', pax: '2P', libera: true },
  { nume: 'Ionescu', ora: '19:30', pax: '4P', libera: true },
  { nume: 'Vlaicu', ora: '20:15', pax: '6P', libera: false },
] as const

function Aparitie({
  la,
  className,
  children,
  scale = false,
}: {
  la: number
  className?: string
  children: React.ReactNode
  scale?: boolean
}) {
  const { redus } = useMiscareHero()
  return (
    <motion.div
      className={className}
      initial={redus ? false : { opacity: 0, y: scale ? 20 : 12, scale: scale ? 0.96 : 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: la, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

export function PhoneScreen() {
  const { redus } = useMiscareHero()
  const e = TIMELINE.ecran

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background">
      {/* Faza 1b — screen wash: ecranul se trezeste peste intrarea mainii. */}
      <motion.div
        aria-hidden
        className="hero-wash absolute inset-0"
        initial={redus ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: e.wash }}
      />

      <div className="relative flex h-full flex-col gap-2.5 p-3 pt-8">
        {/* Header in-app: avatar + hamburger */}
        <Aparitie la={e.antet} className="flex items-center justify-between px-1">
          <span className="grid size-6 place-content-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
            TX
          </span>
          <MenuIcon className="size-4 text-muted-foreground" aria-hidden />
        </Aparitie>

        {/* Titlul */}
        <Aparitie la={e.titlu} className="px-1">
          <p className="text-[13px] font-semibold text-foreground">Rezervarile de diseara</p>
          <p className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground uppercase">
            18 mese · 46 locuri
          </p>
        </Aparitie>

        {/* Cardurile de rezervari, cu stagger propriu */}
        <div className="grid gap-1.5">
          {REZERVARI.map(({ nume, ora, pax, libera }, i) => (
            <Aparitie key={nume} la={e.carduri + i * e.cardStagger} scale>
              <div className="flex items-center justify-between rounded-lg bg-card px-2.5 py-2 ring-1 ring-foreground/10">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      libera ? 'bg-status-liber' : 'bg-status-expirare',
                    )}
                  />
                  {nume}
                </span>
                <span className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground uppercase">
                  {ora} · {pax}
                </span>
              </div>
            </Aparitie>
          ))}
        </div>

        {/* Randul "Upcoming" + pill de status */}
        <Aparitie la={e.upcoming} className="flex items-center justify-between px-1">
          <span className="text-[11px] font-medium text-muted-foreground">Urmeaza</span>
          <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[9px] font-medium tracking-[0.06em] text-accent-foreground uppercase">
            In grafic
          </span>
        </Aparitie>

        {/* Tab bar-ul de jos; tabul activ intra pe spring */}
        <Aparitie la={e.taburi} className="mt-auto">
          <div className="flex items-center justify-around rounded-xl bg-card px-2 py-2 ring-1 ring-foreground/10">
            <motion.span
              initial={redus ? false : { scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 22,
                delay: e.taburi,
              }}
              className="grid size-6 place-content-center rounded-md bg-primary text-primary-foreground"
            >
              <LayoutGridIcon className="size-3.5" aria-hidden />
            </motion.span>
            <CalendarDaysIcon className="size-4 text-muted-foreground" aria-hidden />
            <UsersIcon className="size-4 text-muted-foreground" aria-hidden />
            <SettingsIcon className="size-4 text-muted-foreground" aria-hidden />
          </div>
        </Aparitie>
      </div>
    </div>
  )
}
