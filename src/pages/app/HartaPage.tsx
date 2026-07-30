import { useMemo, useState } from 'react'
import { ClockIcon } from 'lucide-react'

import { HartaZona } from '@/components/floor-plan/HartaZona'
import { LegendaStatus } from '@/components/floor-plan/LegendaStatus'
import { DialogRezervare } from '@/components/rezervari/DialogRezervare'
import { SheetRezervare } from '@/components/rezervari/SheetRezervare'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useMese, useZone } from '@/hooks/useMese'
import { useRezervari } from '@/hooks/useRezervari'
import { programZilei } from '@/lib/program'
import {
  inceputZi,
  oraZecimala,
  sfarsitZi,
  toZonedTime,
} from '@/lib/timp'
import type { Rezervare } from '@/services/rezervari'
import type { MasaHarta, StatusuriMese } from '@/types/floor-plan'

/** §7.4 — "se elibereaza in curand" incepe cu 20 de minute inainte. */
const PRAG_EXPIRARE_ORE = 20 / 60

function formateazaOra(oraZecim: number): string {
  const h = Math.floor(oraZecim)
  const m = Math.round((oraZecim - h) * 60)
  return `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Statusul fiecarei mese pentru momentul afisat. Se calculeaza din rezervari,
 * nu se citeste din baza: nu exista coloana "status" pe tables, exact pentru ca
 * ar fi corecta doar pentru "acum" (vezi migratia floor_plan).
 */
function statusuriLaMoment(
  rezervari: Rezervare[],
  oraAfisata: number,
  fus: string,
): { statusuri: StatusuriMese; rezervarePeMasa: Map<string, Rezervare> } {
  const statusuri: StatusuriMese = {}
  const rezervarePeMasa = new Map<string, Rezervare>()

  for (const rezervare of rezervari) {
    if (!rezervare.table_id) continue
    if (!['pending', 'confirmata', 'sosita'].includes(rezervare.status)) continue

    const start = oraZecimala(rezervare.data_ora, fus)
    const sfarsitBrut = oraZecimala(rezervare.blocat_pana_la, fus)
    const sfarsit = sfarsitBrut > start ? sfarsitBrut : 24
    if (oraAfisata < start || oraAfisata >= sfarsit) continue

    const terminareBruta = oraZecimala(rezervare.se_termina_la, fus)
    const terminare = terminareBruta > start ? terminareBruta : 24

    statusuri[rezervare.table_id] =
      rezervare.status === 'pending'
        ? 'expirare'
        : terminare - oraAfisata <= PRAG_EXPIRARE_ORE
          ? 'expirare'
          : 'ocupat'

    rezervarePeMasa.set(rezervare.table_id, rezervare)
  }

  return { statusuri, rezervarePeMasa }
}

export function HartaPage() {
  const { profil } = useAuth()
  const restaurant = profil?.tip === 'admin' ? profil.restaurant : null
  const fus = restaurant?.fus_orar ?? 'Europe/Bucharest'

  const zi = useMemo(() => toZonedTime(new Date(), fus), [fus])
  const program = useMemo(
    () => programZilei(zi, restaurant?.program_standard ?? null, fus),
    [zi, restaurant?.program_standard, fus],
  )

  const [oraAfisata, setOraAfisata] = useState(() => {
    const acum = oraZecimala(new Date(), fus)
    return Math.min(Math.max(acum, program.deLa), program.panaLa)
  })
  const [zonaId, setZonaId] = useState<string | null>(null)
  const [selectata, setSelectata] = useState<Rezervare | null>(null)
  const [masaLibera, setMasaLibera] = useState<{ zoneId: string; tableId: string } | null>(null)

  const zone = useZone(restaurant?.id)
  const mese = useMese(restaurant?.id)
  const rezervari = useRezervari(
    restaurant?.id,
    inceputZi(zi, fus),
    sfarsitZi(zi, fus),
  )

  const zonaCurenta = zone.data?.find((z) => z.id === zonaId) ?? zone.data?.[0] ?? null

  const { statusuri, rezervarePeMasa } = useMemo(
    () => statusuriLaMoment(rezervari.data ?? [], oraAfisata, fus),
    [rezervari.data, oraAfisata, fus],
  )

  const meseZona: MasaHarta[] = useMemo(
    () => (mese.data ?? []).filter((masa) => masa.zone_id === zonaCurenta?.id),
    [mese.data, zonaCurenta?.id],
  )

  if (!restaurant) return null

  const seIncarca = zone.isLoading || mese.isLoading || rezervari.isLoading

  function laClickMasa(tableId: string) {
    const rezervare = rezervarePeMasa.get(tableId)
    if (rezervare) {
      setSelectata(rezervare)
      return
    }
    // Masa libera: cel mai probabil personalul vrea sa aseze un walk-in.
    if (zonaCurenta) setMasaLibera({ zoneId: zonaCurenta.id, tableId })
  }

  return (
    <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_16rem]">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Harta salii</h1>
          <LegendaStatus />
        </div>

        {seIncarca ? (
          <Skeleton className="aspect-[3/2] w-full" />
        ) : !zone.data?.length ? (
          <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            Nu exista nicio zona configurata.
          </p>
        ) : (
          <>
            {zone.data.length > 1 && (
              <Tabs value={zonaCurenta?.id ?? ''} onValueChange={setZonaId}>
                <TabsList>
                  {zone.data.map((z) => (
                    <TabsTrigger key={z.id} value={z.id}>
                      {z.nume}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

            {zonaCurenta && meseZona.length === 0 ? (
              <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                Zona „{zonaCurenta.nume}" nu are inca mese. Planul 2D se configureaza de echipa
                TableX, din schita trimisa de tine.
              </p>
            ) : (
              zonaCurenta && (
                <HartaZona
                  zona={zonaCurenta}
                  mese={meseZona}
                  statusuri={statusuri}
                  onSelecteazaMasa={laClickMasa}
                  className="aspect-[3/2] w-full"
                />
              )
            )}
          </>
        )}
      </div>

      <aside className="grid content-start gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClockIcon className="size-4 text-primary" />
              Ora afisata
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="text-2xl font-semibold tabular-nums">{formateazaOra(oraAfisata)}</div>
            <input
              type="range"
              min={program.deLa}
              max={program.panaLa}
              step={0.25}
              value={oraAfisata}
              onChange={(e) => setOraAfisata(Number(e.target.value))}
              aria-label="Ora afisata pe harta"
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>{formateazaOra(program.deLa)}</span>
              <span>{formateazaOra(program.panaLa)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Click pe o masa libera deschide un walk-in pe ea; pe una ocupata, rezervarea.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acum in zona</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Mese</dt>
                <dd className="text-lg font-semibold tabular-nums">{meseZona.length}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ocupate</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {meseZona.filter((m) => statusuri[m.id]).length}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </aside>

      <SheetRezervare
        rezervare={selectata}
        onInchide={() => setSelectata(null)}
        restaurantId={restaurant.id}
        fus={fus}
      />

      {masaLibera && (
        <DialogRezervare
          key={`${masaLibera.tableId}-${oraAfisata}`}
          deschis
          onDeschisChange={(deschis) => !deschis && setMasaLibera(null)}
          restaurantId={restaurant.id}
          fus={fus}
          zone={zone.data ?? []}
          zi={zi}
          oraImplicita={formateazaOra(oraAfisata)}
          walkIn
          zoneIdImplicit={masaLibera.zoneId}
          tableIdImplicit={masaLibera.tableId}
        />
      )}
    </div>
  )
}
