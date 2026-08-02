import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, ZapIcon } from 'lucide-react'

import { VedereLuna } from '@/components/calendar/VedereLuna'
import { VedereSaptamana } from '@/components/calendar/VedereSaptamana'
import { VedereZi } from '@/components/calendar/VedereZi'
import { DialogRezervare } from '@/components/rezervari/DialogRezervare'
import { DialogWalkInHarta } from '@/components/rezervari/DialogWalkInHarta'
import { SheetRezervare } from '@/components/rezervari/SheetRezervare'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useNotificari } from '@/hooks/useNotificari'
import { useZone } from '@/hooks/useMese'
import { useMutatiiRezervari, useRezervari } from '@/hooks/useRezervari'
import { programZilei } from '@/lib/program'
import { RUTE } from '@/lib/rute'
import {
  addDays,
  addMonths,
  etichetaLuna,
  etichetaZi,
  formatFus,
  grilaLunii,
  inceputLuna,
  inceputSaptamana,
  inceputZi,
  instantDinZiSiOra,
  sfarsitLuna,
  sfarsitSaptamana,
  sfarsitZi,
  toZonedTime,
  zileleSaptamanii,
} from '@/lib/timp'
import type { Rezervare } from '@/services/rezervari'

type Vedere = 'zi' | 'saptamana' | 'luna'

type CerereDialog = {
  zi: Date
  ora: string
  walkIn: boolean
}

/** Ora curenta rotunjita la jumatatea de ora urmatoare, ca implicit in formular. */
function oraImplicita(fus: string): string {
  const local = toZonedTime(new Date(), fus)
  const minute = local.getMinutes() < 30 ? 30 : 0
  const ore = local.getMinutes() < 30 ? local.getHours() : local.getHours() + 1
  return `${String(ore % 24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function CalendarPage() {
  const { profil } = useAuth()
  const notificari = useNotificari()
  const restaurant = profil?.tip === 'admin' ? profil.restaurant : null
  const fus = restaurant?.fus_orar ?? 'Europe/Bucharest'

  const navigheaza = useNavigate()
  const [vedere, setVedere] = useState<Vedere>('zi')
  const [zi, setZi] = useState(() => toZonedTime(new Date(), fus))
  const [selectata, setSelectata] = useState<Rezervare | null>(null)
  const [dialog, setDialog] = useState<CerereDialog | null>(null)
  const [walkInDeschis, setWalkInDeschis] = useState(false)
  /** §25.5 — filtrul rapid pe zona, comun celor 3 vederi. null = toate. */
  const [zonaFiltru, setZonaFiltru] = useState<string | null>(null)

  const zone = useZone(restaurant?.id)
  const { muta } = useMutatiiRezervari(restaurant?.id)

  // Intervalul interogat depinde de vedere: o zi, o saptamana sau o luna.
  const [deLa, panaLa] = useMemo(() => {
    if (vedere === 'zi') return [inceputZi(zi, fus), sfarsitZi(zi, fus)]
    if (vedere === 'saptamana') return [inceputSaptamana(zi, fus), sfarsitSaptamana(zi, fus)]
    return [inceputLuna(zi, fus), sfarsitLuna(zi, fus)]
  }, [vedere, zi, fus])

  const rezervari = useRezervari(restaurant?.id, deLa, panaLa)
  const program = useMemo(
    () => programZilei(zi, restaurant?.program_standard ?? null, fus),
    [zi, restaurant?.program_standard, fus],
  )

  // §25.5: filtrul pe zona taie lista O SINGURA data, inaintea tuturor
  // vederilor si a contoarelor — altfel numerele si blocurile ar diverge.
  const listate = useMemo(() => {
    const toate = rezervari.data ?? []
    if (!zonaFiltru) return toate
    return toate.filter((r) => r.zone_id === zonaFiltru)
  }, [rezervari.data, zonaFiltru])

  if (!restaurant) return null

  const pas = vedere === 'zi' ? 1 : vedere === 'saptamana' ? 7 : 0
  const inapoi = () => setZi((curent) => (pas ? addDays(curent, -pas) : addMonths(curent, -1)))
  const inainte = () => setZi((curent) => (pas ? addDays(curent, pas) : addMonths(curent, 1)))
  const azi = () => setZi(toZonedTime(new Date(), fus))

  const titlu =
    vedere === 'luna'
      ? etichetaLuna(zi, fus)
      : vedere === 'saptamana'
        ? `${formatFus(zileleSaptamanii(zi, fus)[0], 'd MMM', fus)} – ${formatFus(
            zileleSaptamanii(zi, fus)[6],
            'd MMM yyyy',
            fus,
          )}`
        : etichetaZi(zi, fus)

  const total = listate.filter(
    (r) => r.status === 'pending' || r.status === 'confirmata' || r.status === 'sosita',
  )
  const persoane = total.reduce((suma, r) => suma + r.nr_persoane, 0)

  /** §25.4 — clicul pe o zi din Lunar/Saptamanal duce in List View, pe data ei. */
  function catreListaZilei(ziAleasa: Date) {
    navigheaza(`${RUTE.appRezervari}?data=${formatFus(ziAleasa, 'yyyy-MM-dd', fus)}`)
  }

  /**
   * Mutarea trece prin acelasi UPDATE ca restul: trigger-ul recalculeaza
   * intervalul, iar constrangerea EXCLUDE respinge suprapunerile. Daca masa e
   * ocupata la ora noua, primim 23P01 si mesajul tradus — blocul revine singur
   * la loc, fiindca lista se reinterogheaza din baza.
   */
  function mutaLaOra(rezervare: Rezervare, oraNoua: number) {
    const ore = Math.floor(oraNoua)
    const minute = Math.round((oraNoua - ore) * 60)
    const oraText = `${String(ore % 24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

    muta.mutate(
      { id: rezervare.id, dataOra: instantDinZiSiOra(zi, oraText, fus) },
      {
        onSuccess: () => notificari.succes(`Rezervare mutata la ${oraText}.`),
        onError: (eroare) => notificari.eroare(eroare),
      },
    )
  }

  function deschideDialog(oraText: string, ziDialog: Date = zi, walkIn = false) {
    setDialog({ zi: ziDialog, ora: oraText, walkIn })
  }

  return (
    <div className="grid gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={inapoi} aria-label="Perioada anterioara">
            <ChevronLeftIcon />
          </Button>
          <Button variant="outline" size="sm" onClick={azi}>
            Azi
          </Button>
          <Button variant="outline" size="icon-sm" onClick={inainte} aria-label="Perioada urmatoare">
            <ChevronRightIcon />
          </Button>
          <h1 className="ml-1 text-lg font-semibold tracking-tight capitalize">{titlu}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* §25.5 — filtrul pe zona, vizibil in toate cele 3 vederi (doar
              cand exista mai multe zone; cu una singura ar fi zgomot). */}
          {(zone.data?.length ?? 0) > 1 && (
            <Select
              value={zonaFiltru ?? 'toate'}
              onValueChange={(valoare) => setZonaFiltru(valoare === 'toate' ? null : valoare)}
            >
              <SelectTrigger className="h-8 w-36" aria-label="Filtru pe zona">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toate">Toate zonele</SelectItem>
                {zone.data!.map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.nume}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Tabs value={vedere} onValueChange={(valoare) => setVedere(valoare as Vedere)}>
            <TabsList>
              <TabsTrigger value="zi">Zi</TabsTrigger>
              <TabsTrigger value="saptamana">Saptamana</TabsTrigger>
              <TabsTrigger value="luna">Luna</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* §25.6 — butonul master de Walk-In deschide harta in miniatura,
              nu formularul cu dropdown de mese. */}
          <Button variant="secondary" size="sm" onClick={() => setWalkInDeschis(true)}>
            <ZapIcon />
            Walk-in
          </Button>
          <Button size="sm" onClick={() => deschideDialog(oraImplicita(fus))}>
            <PlusIcon />
            Rezervare
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground tabular-nums">
        {rezervari.isLoading
          ? 'Se incarca rezervarile...'
          : `${total.length} rezervari active · ${persoane} persoane`}
        {vedere === 'zi' && !program.deschis && ' · restaurantul e inchis in aceasta zi'}
      </p>

      {rezervari.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : rezervari.isError ? (
        <p className="text-sm text-destructive">
          Nu am putut incarca rezervarile. Reincarca pagina.
        </p>
      ) : vedere === 'zi' ? (
        <VedereZi
          rezervari={listate}
          fus={fus}
          program={program}
          onSelecteaza={setSelectata}
          onCreeazaLaOra={(oraGrila) =>
            deschideDialog(`${String(Math.floor(oraGrila) % 24).padStart(2, '0')}:00`)
          }
          onMutaLaOra={mutaLaOra}
        />
      ) : vedere === 'saptamana' ? (
        <VedereSaptamana
          zile={zileleSaptamanii(zi, fus)}
          rezervari={listate}
          fus={fus}
          onSelecteaza={setSelectata}
          // §25.4: clicul pe zi duce in List View, pe data aleasa.
          onAlegeZi={catreListaZilei}
          onCreeazaInZi={(ziAleasa) => deschideDialog('19:00', ziAleasa)}
        />
      ) : (
        <VedereLuna
          zile={grilaLunii(zi, fus)}
          luna={zi}
          rezervari={listate}
          fus={fus}
          onAlegeZi={catreListaZilei}
        />
      )}

      <SheetRezervare
        rezervare={selectata}
        onInchide={() => setSelectata(null)}
        restaurantId={restaurant.id}
        fus={fus}
      />

      {/* Montat doar cat e deschis, cu key: asa ora si ziua implicite sunt
          mereu cele cerute, fara efecte de resincronizare a formularului. */}
      {dialog && (
        <DialogRezervare
          key={`${dialog.zi.toISOString()}-${dialog.ora}-${dialog.walkIn}`}
          deschis
          onDeschisChange={(deschis) => !deschis && setDialog(null)}
          restaurantId={restaurant.id}
          fus={fus}
          zone={zone.data ?? []}
          zi={dialog.zi}
          oraImplicita={dialog.ora}
          walkIn={dialog.walkIn}
        />
      )}

      {walkInDeschis && (
        <DialogWalkInHarta restaurantId={restaurant.id} onInchide={() => setWalkInDeschis(false)} />
      )}
    </div>
  )
}
