import { useRef, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { TimelineContent } from '@/components/ui/timeline-animation'
import { cn } from '@/lib/utils'

/**
 * "Cum functioneaza" — trei pasi numerotati, pe orizontala.
 *
 * Rolul sectiunii e sa raspunda la obiectia principala a unui restaurant:
 * "cat de complicat e sa pornesc?". De aceea pasii sunt numerotati vizibil,
 * iar textele descriu efort, nu functionalitati.
 */

export interface PasFlux {
  titlu: string
  text: string
  icoana: LucideIcon
}

interface StepsSectionProps {
  titlu: ReactNode
  subtitlu?: ReactNode
  pasi: PasFlux[]
  className?: string
}

export function StepsSection({ titlu, subtitlu, pasi, className }: StepsSectionProps) {
  const sectiuneRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={sectiuneRef} className={cn('relative', className)}>
      <TimelineContent
        as="h2"
        animationNum={0}
        timelineRef={sectiuneRef}
        className="text-2xl font-semibold tracking-tight"
      >
        {titlu}
      </TimelineContent>

      {subtitlu && (
        <TimelineContent
          as="p"
          animationNum={1}
          timelineRef={sectiuneRef}
          className="mt-1 max-w-2xl text-sm text-muted-foreground"
        >
          {subtitlu}
        </TimelineContent>
      )}

      <ol className="mt-8 grid gap-8 md:grid-cols-3">
        {pasi.map(({ titlu: titluPas, text, icoana: Icoana }, indice) => (
          <TimelineContent
            key={titluPas}
            as="li"
            animationNum={2 + indice}
            timelineRef={sectiuneRef}
            className="relative"
          >
            {/* Linia care leaga pasii, doar pe ecrane late. Ultimul pas nu o are. */}
            {indice < pasi.length - 1 && (
              <span
                aria-hidden
                className="absolute top-5 left-[calc(2.5rem+0.75rem)] hidden h-px w-[calc(100%-2.5rem)] bg-border md:block"
              />
            )}

            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-content-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                {indice + 1}
              </span>
              <Icoana className="size-5 text-primary" />
            </div>

            <h3 className="mt-4 font-medium">{titluPas}</h3>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">{text}</p>
          </TimelineContent>
        ))}
      </ol>
    </div>
  )
}

export default StepsSection
