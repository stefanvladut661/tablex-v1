import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import { CheckIcon, type LucideIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TimelineContent } from '@/components/ui/timeline-animation'
import { cn } from '@/lib/utils'

/**
 * Sectiunea de preturi a landing page-ului.
 *
 * Componenta e pur vizuala: nu stie de unde vin preturile. Cine o foloseste ii
 * da planurile deja calculate, ca sa poata fi montata si intr-un demo, si peste
 * datele reale din app_settings.
 *
 * Model de facturare: exclusiv lunar. Nu exista plata anuala si nici servicii
 * facturate separat — configurarea planului 2D intra in abonamentul Pro.
 */

export interface PlanPreturi {
  id: string
  nume: string
  descriere: string
  /** Pretul lunar. `undefined` cat timp datele se incarca. */
  pretLunar?: number
  recomandat?: boolean
  buton: { text: string; to: string; variant?: 'default' | 'outline' }
  /** Randurile care fac diferenta intre planuri, fiecare cu iconita proprie. */
  evidentiate?: { text: string; icoana: LucideIcon }[]
  /** Restul, ca lista bifata sub o linie de separare. */
  include?: { titlu: string; linii: string[] }
}

function Pret({ valoare, moneda }: { valoare?: number; moneda: string }) {
  if (valoare === undefined) {
    return (
      <div className="flex items-baseline gap-2">
        <Skeleton className="h-9 w-24" />
        <span className="text-sm text-muted-foreground">/ luna</span>
      </div>
    )
  }

  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-3xl font-semibold tracking-tight tabular-nums">
        {valoare.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} {moneda}
      </span>
      <span className="text-sm text-muted-foreground">/ luna</span>
    </div>
  )
}

interface PricingSectionProps {
  planuri: PlanPreturi[]
  /** Simbolul monedei. Preturile din baza de date sunt numere goale. */
  moneda: string
  titlu?: ReactNode
  subtitlu?: ReactNode
  className?: string
}

export function PricingSection({
  planuri,
  moneda,
  titlu,
  subtitlu,
  className,
}: PricingSectionProps) {
  const sectiuneRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={sectiuneRef} className={cn('relative isolate', className)}>
      {/* Halou discret in culoarea de accent — se recalculeaza singur pe tema inchisa. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-72"
        style={{
          backgroundImage:
            'radial-gradient(55% 100% at 50% 0%, color-mix(in oklab, var(--primary) 18%, transparent) 0%, transparent 72%)',
        }}
      />

      {(titlu || subtitlu) && (
        <div className="mb-6">
          {titlu && (
            <TimelineContent
              as="h2"
              animationNum={0}
              timelineRef={sectiuneRef}
              className="text-2xl font-semibold tracking-tight"
            >
              {titlu}
            </TimelineContent>
          )}
          {subtitlu && (
            <TimelineContent
              as="p"
              animationNum={1}
              timelineRef={sectiuneRef}
              className="mt-1 text-sm text-muted-foreground"
            >
              {subtitlu}
            </TimelineContent>
          )}
        </div>
      )}

      {/* Doua planuri: le tinem intr-o coloana mai ingusta, ca sa nu se lateasca. */}
      <div className="grid max-w-4xl items-start gap-4 sm:grid-cols-2">
        {planuri.map((plan, indice) => (
          <TimelineContent
            key={plan.id}
            animationNum={2 + indice}
            timelineRef={sectiuneRef}
            className="h-full"
          >
            <Card className={cn('h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg', plan.recomandat && 'bg-accent/40 ring-2 ring-primary')}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{plan.nume}</CardTitle>
                  {plan.recomandat && <Badge>Recomandat</Badge>}
                </div>
                <CardDescription>{plan.descriere}</CardDescription>
              </CardHeader>

              <CardContent className="grid gap-4">
                <Pret valoare={plan.pretLunar} moneda={moneda} />

                <Button
                  asChild
                  variant={plan.buton.variant ?? (plan.recomandat ? 'default' : 'outline')}
                  className="w-full"
                >
                  <Link to={plan.buton.to}>{plan.buton.text}</Link>
                </Button>

                {plan.evidentiate && plan.evidentiate.length > 0 && (
                  <ul className="grid gap-2.5 text-sm">
                    {plan.evidentiate.map(({ text, icoana: Icoana }) => (
                      <li key={text} className="flex items-center gap-2.5">
                        <Icoana className="size-4 shrink-0 text-primary" />
                        {text}
                      </li>
                    ))}
                  </ul>
                )}

                {plan.include && plan.include.linii.length > 0 && (
                  <div className="grid gap-2 border-t border-border pt-4">
                    <p className="text-sm font-medium">{plan.include.titlu}</p>
                    <ul className="grid gap-2 text-sm text-muted-foreground">
                      {plan.include.linii.map((linie) => (
                        <li key={linie} className="flex gap-2">
                          <span className="mt-0.5 grid size-4 shrink-0 place-content-center rounded-full bg-accent">
                            <CheckIcon className="size-3 text-primary" />
                          </span>
                          {linie}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TimelineContent>
        ))}
      </div>
    </div>
  )
}

export default PricingSection
