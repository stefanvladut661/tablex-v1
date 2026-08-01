import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { TimelineContent } from '@/components/ui/timeline-animation'
import { cn } from '@/lib/utils'

/**
 * Banda de chemare la actiune, chiar inainte de footer.
 *
 * E ultimul punct de conversie al paginii: cine a citit tot ajunge aici si nu
 * mai trebuie sa deruleze inapoi la hero ca sa gaseasca un buton.
 */

interface ActiuneBanda {
  text: string
  to: string
  variant?: 'default' | 'outline' | 'secondary'
  icoana?: LucideIcon
}

interface CtaBandProps {
  titlu: ReactNode
  subtitlu?: ReactNode
  actiuni: ActiuneBanda[]
  /** Randul mic de sub butoane, ex. conditii comerciale. */
  nota?: ReactNode
  className?: string
}

export function CtaBand({ titlu, subtitlu, actiuni, nota, className }: CtaBandProps) {
  const bandaRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={bandaRef}
      className={cn(
        'relative isolate overflow-hidden rounded-md border border-border bg-card px-6 py-12 text-center',
        className,
      )}
    >
      <div aria-hidden className="hero-grid pointer-events-none absolute inset-0 -z-10 opacity-60" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(70% 120% at 50% 0%, color-mix(in oklab, var(--primary) 16%, transparent) 0%, transparent 70%)',
        }}
      />

      <TimelineContent
        as="h2"
        animationNum={0}
        timelineRef={bandaRef}
        className="mx-auto max-w-2xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
      >
        {titlu}
      </TimelineContent>

      {subtitlu && (
        <TimelineContent
          as="p"
          animationNum={1}
          timelineRef={bandaRef}
          className="mx-auto mt-3 max-w-xl text-muted-foreground text-pretty"
        >
          {subtitlu}
        </TimelineContent>
      )}

      <TimelineContent
        animationNum={2}
        timelineRef={bandaRef}
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

      {nota && (
        <TimelineContent
          as="p"
          animationNum={3}
          timelineRef={bandaRef}
          className="mt-4 text-sm text-muted-foreground"
        >
          {nota}
        </TimelineContent>
      )}
    </div>
  )
}

export default CtaBand
