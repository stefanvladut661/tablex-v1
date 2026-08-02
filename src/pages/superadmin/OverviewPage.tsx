import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import {
  CHEI_OVERVIEW,
  getFeedRezervari,
  getKpiGlobal,
  type Perioada,
} from '@/services/super-admin'
import type { Enums } from '@/types/database'

/**
 * Overview / Dashboard Global (§9.2.1, §39).
 *
 * KPI-urile sunt DOAR informative (§39.3): niciun card nu e link si nu duce
 * nicaieri. Selectorul de perioada (§39.2) le recalculeaza pe toate — MRR-ul
 * si defalcarea Start/Pro sunt stare curenta, deci raman constante intre
 * perioade; fluxurile (credite, bilete) se taie pe interval.
 *
 * „Harta Live" (§39.1) nu e o harta geografica: e un flux animat al
 * rezervarilor din toata reteaua, abonat Realtime la INSERT-uri.
 */

const PERIOADE: Array<{ cheie: Perioada; eticheta: string }> = [
  { cheie: 'azi', eticheta: 'Azi' },
  { cheie: 'saptamana', eticheta: 'Săptămâna' },
  { cheie: 'luna', eticheta: 'Luna' },
  { cheie: 'an', eticheta: 'An' },
]

const ETICHETE_STATUS_REZERVARE: Record<Enums<'rezervare_status'>, string> = {
  pending: 'în așteptare',
  confirmata: 'confirmată',
  sosita: 'sosită',
  anulata: 'anulată',
  no_show: 'neprezentare',
  respinsa: 'respinsă',
}

function euro(valoare: number): string {
  return `${valoare.toFixed(2)} €`
}

function oraScurta(iso: string): string {
  return new Date(iso).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
}

function dataOraRezervare(iso: string): string {
  return new Date(iso).toLocaleString('ro-RO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function CardKpi({
  titlu,
  valoare,
  detaliu,
  incarcare,
}: {
  titlu: string
  valoare: string
  detaliu?: string
  incarcare: boolean
}) {
  return (
    // §39.3: card static, fara link si fara onClick.
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
          {titlu}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {incarcare ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{valoare}</p>
            {detaliu && <p className="mt-0.5 text-xs text-muted-foreground">{detaliu}</p>}
          </>
        )}
      </CardContent>
    </Card>
  )
}

/** Fluxul global de rezervari, live (§39.1). */
function HartaLive() {
  const queryClient = useQueryClient()
  const feed = useQuery({
    queryKey: CHEI_OVERVIEW.feed,
    queryFn: () => getFeedRezervari(),
    refetchInterval: 5 * 60_000,
  })

  useEffect(() => {
    const canal = supabase
      .channel('feed-global-rezervari')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reservations' },
        () => {
          void queryClient.invalidateQueries({ queryKey: CHEI_OVERVIEW.feed })
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(canal)
    }
  }, [queryClient])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Harta live a rezervărilor</CardTitle>
      </CardHeader>
      <CardContent>
        {feed.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (feed.data ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nicio rezervare încă. Cele noi apar aici pe măsură ce sunt create, din toată rețeaua.
          </p>
        ) : (
          <ol className="relative max-h-96 space-y-0 overflow-y-auto">
            {(feed.data ?? []).map((intrare, index) => (
              <li
                key={intrare.id}
                className={`relative flex gap-3 border-l-2 py-2 pl-4 ${
                  index === 0 ? 'border-primary' : 'border-border'
                }`}
              >
                <span
                  className={`absolute top-4 -left-[5px] size-2 rounded-full ${
                    index === 0 ? 'bg-primary' : 'bg-border'
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-medium">{intrare.restaurant_nume}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      · {intrare.client_nume} · {intrare.nr_persoane}{' '}
                      {intrare.nr_persoane === 1 ? 'persoană' : 'persoane'}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    pentru {dataOraRezervare(intrare.data_ora)} ·{' '}
                    {ETICHETE_STATUS_REZERVARE[intrare.status]}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {oraScurta(intrare.created_at)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

export function OverviewPage() {
  const [perioada, setPerioada] = useState<Perioada>('luna')

  const kpi = useQuery({
    queryKey: CHEI_OVERVIEW.kpi(perioada),
    queryFn: () => getKpiGlobal(perioada),
    refetchInterval: 60_000,
  })

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Overview</h1>

        {/* Selectorul de perioada (§39.2). */}
        <div className="flex rounded-lg border border-border bg-card p-0.5">
          {PERIOADE.map(({ cheie, eticheta }) => (
            <Button
              key={cheie}
              variant={perioada === cheie ? 'secondary' : 'ghost'}
              size="xs"
              onClick={() => setPerioada(cheie)}
            >
              {eticheta}
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CardKpi
          titlu="MRR total"
          valoare={euro(kpi.data?.mrrTotal ?? 0)}
          detaliu="Abonamente active, cu discounturi aplicate"
          incarcare={kpi.isLoading}
        />
        <CardKpi
          titlu="Încasări credite WhatsApp"
          valoare={euro(kpi.data?.incasariCredite ?? 0)}
          detaliu="Pachete vândute în perioadă (demonstrativ, §14)"
          incarcare={kpi.isLoading}
        />
        <CardKpi
          titlu="Volum & comisioane evenimente"
          valoare={euro(kpi.data?.volumEvenimente ?? 0)}
          detaliu={`din care comision TableX: ${euro(kpi.data?.comisioaneEvenimente ?? 0)}`}
          incarcare={kpi.isLoading}
        />
        <CardKpi
          titlu="Restaurante active"
          valoare={String(
            (kpi.data?.restauranteStart ?? 0) + (kpi.data?.restaurantePro ?? 0),
          )}
          detaliu={`${kpi.data?.restauranteStart ?? 0} Start · ${kpi.data?.restaurantePro ?? 0} Pro`}
          incarcare={kpi.isLoading}
        />
      </div>

      <HartaLive />
    </div>
  )
}
