import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { TimelineContent } from '@/components/ui/timeline-animation'
import { cn } from '@/lib/utils'

/**
 * Hero-ul landing page-ului.
 *
 * Pur vizual, ca si PricingSection: primeste textele si tintele prin props.
 * Culorile vin exclusiv din tokenii din index.css, deci urmeaza automat tema.
 */

interface ActiuneHero {
  text: string
  to: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  icoana?: LucideIcon
}

interface AncoraHero {
  text: string
  /** Ancora catre o sectiune din aceeasi pagina, ex. "#preturi". */
  href: string
  icoana?: LucideIcon
}

interface HeroSectionProps {
  eticheta?: { text: string; icoana?: LucideIcon }
  titlu: ReactNode
  subtitlu: ReactNode
  actiuni?: ActiuneHero[]
  /** Scurtaturi catre sectiunile paginii, sub butoanele principale. */
  ancore?: AncoraHero[]
  className?: string
}

export function HeroSection({
  eticheta,
  titlu,
  subtitlu,
  actiuni = [],
  ancore = [],
  className,
}: HeroSectionProps) {
  const heroRef = useRef<HTMLDivElement>(null)
  const IcoanaEticheta = eticheta?.icoana

  return (
    <div ref={heroRef} className={cn('relative isolate text-center', className)}>
      {/* Halou in culoarea de accent, coborand din antet. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[28rem]"
        style={{
          backgroundImage:
            'radial-gradient(50% 100% at 50% 0%, color-mix(in oklab, var(--primary) 20%, transparent) 0%, transparent 70%)',
        }}
      />

      {eticheta && (
        <TimelineContent animationNum={0} timelineRef={heroRef}>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
            {IcoanaEticheta && <IcoanaEticheta className="size-3.5" />}
            {eticheta.text}
          </span>
        </TimelineContent>
      )}

      <TimelineContent
        as="h1"
        animationNum={1}
        timelineRef={heroRef}
        className="mx-auto mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
      >
        {titlu}
      </TimelineContent>

      <TimelineContent
        as="p"
        animationNum={2}
        timelineRef={heroRef}
        className="mx-auto mt-4 max-w-2xl text-muted-foreground text-pretty"
      >
        {subtitlu}
      </TimelineContent>

      {actiuni.length > 0 && (
        <TimelineContent
          animationNum={3}
          timelineRef={heroRef}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          {actiuni.map(({ text, to, variant = 'default', icoana: Icoana }) => (
            <Button key={text} asChild size="lg" variant={variant}>
              <Link to={to}>
                {text}
                {Icoana && <Icoana className="size-4" />}
              </Link>
            </Button>
          ))}
        </TimelineContent>
      )}

      {ancore.length > 0 && (
        <TimelineContent
          animationNum={4}
          timelineRef={heroRef}
          className="mt-10 flex flex-wrap justify-center gap-2"
        >
          {ancore.map(({ text, href, icoana: Icoana }) => (
            <a
              key={href}
              href={href}
              className={cn(
                'inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground',
                'transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              )}
            >
              {Icoana && <Icoana className="size-4 text-primary" />}
              {text}
            </a>
          ))}
        </TimelineContent>
      )}
    </div>
  )
}

export default HeroSection
