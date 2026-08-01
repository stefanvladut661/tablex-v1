import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRightIcon, ClockIcon } from 'lucide-react'

import { BadgeStatus } from '@/components/rezervari/BadgeStatus'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { RUTE } from '@/lib/rute'
import { ora } from '@/lib/timp'
import { CHEI_ACASA, getKpiZi, getUrmatoareleSosiri } from '@/services/acasa'

/**
 * Pagina Acasa (§24.4) — prima din sidebar, vizibila ambelor roluri.
 *
 * Raspunde la intrebarile pe care si le pune cineva care tocmai a intrat in
 * tura: cate rezervari am azi, cati oameni, cat de plina e sala ACUM, si —
 * cea mai importanta — am ceva netratat? O cerere pending uitata nu striga
 * dupa nimeni; aici o vede primul om care deschide aplicatia.
 */
export function AcasaPage() {
  const { profil } = useAuth()
  const restaurant = profil?.tip === 'admin' ? profil.restaurant : null
  const fus = restaurant?.fus_orar ?? 'Europe/Bucharest'

  const kpi = useQuery({
    queryKey: CHEI_ACASA.kpi(restaurant?.id ?? ''),
    queryFn: getKpiZi,
    enabled: Boolean(restaurant),
    // Cifrele imbatranesc singure: ocuparea „acum" nu mai e adevarata peste
    // cinci minute, iar ecranul asta sta deschis pe o tableta toata seara.
    refetchInterval: 60_000,
  })

  const sosiri = useQuery({
    queryKey: CHEI_ACASA.sosiri(restaurant?.id ?? ''),
    queryFn: () => getUrmatoareleSosiri(restaurant!.id),
    enabled: Boolean(restaurant),
    refetchInterval: 60_000,
  })

  if (!restaurant) return null

  const date = kpi.data
  const ocupare =
    date && date.mese_total > 0 ? Math.round((date.mese_ocupate / date.mese_total) * 100) : null

  return (
    <div className="grid gap-4 p-4 sm:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{restaurant.nume}</h1>
        <p className="text-sm text-muted-foreground">Cum arata ziua de azi.</p>
      </div>

      {kpi.isLoading ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CardKpi eticheta="Rezervari azi" valoare={date?.rezervari_azi ?? 0} />
          <CardKpi eticheta="Persoane asteptate" valoare={date?.persoane_azi ?? 0} />
          <CardKpi
            eticheta="Ocupare acum"
            valoare={ocupare === null ? '—' : `${ocupare}%`}
            detaliu={
              date && date.mese_total > 0
                ? `${date.mese_ocupate} din ${date.mese_total} mese`
                : 'Nicio masa configurata'
            }
          />
          <CardKpi
            eticheta="Neprezentari (7 zile)"
            valoare={date?.no_show_7_zile ?? 0}
            accent={Boolean(date?.no_show_7_zile)}
          />
        </div>
      )}

      {/* Cererile pending nu expira niciodata (§15.2), deci una uitata ramane
          uitata pana o vede cineva. De aceea are card propriu, cu drum direct
          spre lista filtrata. */}
      {date && date.pending_nerezolvate > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-expirare bg-status-expirare-soft p-4">
          <p className="text-sm">
            <span className="font-semibold tabular-nums">{date.pending_nerezolvate}</span>{' '}
            {date.pending_nerezolvate === 1 ? 'cerere asteapta' : 'cereri asteapta'} un raspuns.
          </p>
          <Button size="sm" variant="outline" asChild>
            <Link to={RUTE.appRezervari}>
              Vezi cererile
              <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClockIcon className="size-4 text-primary" />
            Urmatoarele sosiri
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sosiri.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (sosiri.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nicio rezervare care urmeaza. Un oaspete venit acum se inregistreaza cu Walk-in, din
              Calendar.
            </p>
          ) : (
            <ul className="grid gap-1.5">
              {(sosiri.data ?? []).map((rezervare) => (
                <li
                  key={rezervare.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-2.5 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums">
                      {ora(rezervare.data_ora, fus)}
                    </span>
                    <span className="font-medium">{rezervare.client_nume}</span>
                    <BadgeStatus status={rezervare.status} />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {rezervare.nr_persoane} pers.
                    {rezervare.masa ? ` · masa ${rezervare.masa.numar_masa}` : ' · fara masa'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CardKpi({
  eticheta,
  valoare,
  detaliu,
  accent = false,
}: {
  eticheta: string
  valoare: number | string
  detaliu?: string
  accent?: boolean
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{eticheta}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          accent ? 'text-status-ocupat' : ''
        }`}
      >
        {valoare}
      </p>
      {detaliu && <p className="mt-0.5 text-xs text-muted-foreground">{detaliu}</p>}
    </div>
  )
}
