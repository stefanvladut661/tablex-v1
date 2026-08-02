import { useMemo, useState } from 'react'
import { ClockIcon } from 'lucide-react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ZapIcon } from 'lucide-react'

import { BlocajPlan } from '@/components/BlocajPlan'
import { BaraOrara } from '@/components/floor-plan/BaraOrara'
import { DialogWalkInHarta } from '@/components/rezervari/DialogWalkInHarta'
import { CereriPlan } from '@/components/floor-plan/CereriPlan'
import { EditorZona } from '@/components/floor-plan/EditorZona'
import { PanouMeseAdmin } from '@/components/floor-plan/PanouMeseAdmin'
import { HartaZona } from '@/components/floor-plan/HartaZona'
import { LegendaStatus } from '@/components/floor-plan/LegendaStatus'
import { DialogRezervare } from '@/components/rezervari/DialogRezervare'
import { SheetRezervare } from '@/components/rezervari/SheetRezervare'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { useMese, useStructura, useZone } from '@/hooks/useMese'
import { useNotificari } from '@/hooks/useNotificari'
import { useMutatiiRezervari } from '@/hooks/useRezervari'
import { useRezervari } from '@/hooks/useRezervari'
import { MESE_DEMO, STRUCTURA_DEMO, ZONE_DEMO, statusuriLaOra } from '@/lib/harta-demo'
import { programZilei } from '@/lib/program'
import {
  inceputZi,
  ora,
  oraZecimala,
  sfarsitZi,
  toZonedTime,
} from '@/lib/timp'
import { PanouAsteptare } from '@/components/floor-plan/PanouAsteptare'
import { actualizeazaMasa } from '@/services/editor-plan'
import {
  CHEI_ASTEPTARE,
  schimbaStatusAsteptare,
  type IntrareAsteptare,
} from '@/services/lista-asteptare'
import { CHEI_MESE } from '@/services/mese'
import { getEvenimenteCuMese } from '@/services/evenimente'
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
  const { profil, areFloorPlan, esteManager } = useAuth()
  const notificari = useNotificari()
  const queryClient = useQueryClient()
  const [masaDeEditat, setMasaDeEditat] = useState<string | null>(null)
  const [walkInDeschis, setWalkInDeschis] = useState(false)

  /**
   * Mutarea unei mese e o scriere ca oricare alta: verificam numarul de randuri
   * (un UPDATE respins de RLS raspunde 200 cu zero randuri) si reincarcam, ca
   * doua tablete din sala sa nu ajunga sa arate planuri diferite.
   */
  const mutaMasa = useMutation({
    mutationFn: ({ id, x, y }: { id: string; x: number; y: number }) =>
      actualizeazaMasa(id, { pozitie_x: x, pozitie_y: y }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: CHEI_MESE.mese(profil?.tip === 'admin' ? profil.restaurant.id : ''),
      })
    },
    onError: (eroare) => notificari.eroare(eroare),
  })
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
  const [deMutat, setDeMutat] = useState<{ rezervare: Rezervare; masa: MasaHarta } | null>(null)
  const [deAsezat, setDeAsezat] = useState<{
    intrare: IntrareAsteptare
    tableId: string | null
  } | null>(null)

  const { muta } = useMutatiiRezervari(restaurant?.id)

  /** Scoaterea din coada, dupa ce walk-in-ul chiar exista. */
  const asazaDinCoada = useMutation({
    mutationFn: (id: string) => schimbaStatusAsteptare(id, 'asezat'),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: CHEI_ASTEPTARE.lista(profil?.tip === 'admin' ? profil.restaurant.id : ''),
      })
    },
    onError: (eroare) => notificari.eroare(eroare),
  })
  const zone = useZone(restaurant?.id)
  const mese = useMese(restaurant?.id)
  const structura = useStructura(restaurant?.id)
  const rezervari = useRezervari(
    restaurant?.id,
    inceputZi(zi, fus),
    sfarsitZi(zi, fus),
  )

  const zonaCurenta = zone.data?.find((z) => z.id === zonaId) ?? zone.data?.[0] ?? null

  /**
   * Mod Eveniment (§8.5): evenimentele PUBLICATE ale zilei, cu mesele lor.
   * Mesele alocate se coloreaza violet cat timp evenimentul acopera ora
   * afisata — daca nu sunt deja ocupate de o rezervare, care are prioritate.
   */
  const evenimenteZi = useQuery({
    queryKey: ['evenimente-harta', restaurant?.id ?? '', inceputZi(zi, fus).toISOString()],
    queryFn: () => getEvenimenteCuMese(restaurant!.id, inceputZi(zi, fus), sfarsitZi(zi, fus)),
    enabled: Boolean(restaurant),
    staleTime: 60_000,
  })

  const { statusuri, rezervarePeMasa } = useMemo(() => {
    const rezultat = statusuriLaMoment(rezervari.data ?? [], oraAfisata, fus)

    for (const eveniment of evenimenteZi.data ?? []) {
      const start = oraZecimala(eveniment.data_ora, fus)
      const sfarsitBrut = start + eveniment.durata_minute / 60
      if (oraAfisata < start || oraAfisata >= Math.min(sfarsitBrut, 24)) continue
      for (const { table_id } of eveniment.event_tables) {
        // Rezervarea de pe masa (biletul platit, prin alocarea lui) castiga:
        // violet inseamna „pastrata pentru eveniment", nu „cineva sta aici".
        if (!rezultat.statusuri[table_id]) rezultat.statusuri[table_id] = 'eveniment'
      }
    }

    return rezultat
  }, [rezervari.data, oraAfisata, fus, evenimenteZi.data])

  /** Ce arata canvasul ca fiind „de mutat": clientul de pe fiecare masa ocupata. */
  const rezervariPeMese = useMemo(() => {
    const rezultat: Record<string, { id: string; eticheta: string }> = {}
    for (const [tableId, rezervare] of rezervarePeMasa) {
      rezultat[tableId] = { id: rezervare.id, eticheta: rezervare.client_nume }
    }
    return rezultat
  }, [rezervarePeMasa])

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

  // Planul Start nu are Harta 2D (§10.1). Pagina ramane in navigatie, dar
  // aratam sala DEMO neclara, nu sala goala a restaurantului: cine cumpara
  // trebuie sa vada ce cumpara. Regula e impusa oricum de RLS (migratia 26).
  if (!areFloorPlan) {
    return (
      <div className="grid gap-3 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Harta sălii</h1>
          <LegendaStatus />
        </div>
        <BlocajPlan>
          <HartaZona
            zona={ZONE_DEMO[0]}
            structura={STRUCTURA_DEMO[ZONE_DEMO[0].id]}
            mese={MESE_DEMO[ZONE_DEMO[0].id]}
            statusuri={statusuriLaOra(20, ZONE_DEMO[0].id)}
            className="aspect-[3/2] w-full"
          />
        </BlocajPlan>
      </div>
    )
  }

  return (
    <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_16rem]">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Harta sălii</h1>
          <LegendaStatus />
        </div>

        {/* §28.12 — bara de sloturi, pe toata latimea, deasupra canvasului. */}
        <BaraOrara
          program={program}
          fus={fus}
          oraAfisata={oraAfisata}
          onSchimba={setOraAfisata}
        />

        {seIncarca ? (
          <Skeleton className="aspect-[3/2] w-full" />
        ) : !zone.data?.length ? (
          <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            Nu există nicio zonă configurată.
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

            {zonaCurenta && meseZona.length === 0 && !esteManager ? (
              <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                Zona „{zonaCurenta.nume}" nu are încă mese. Managerul le poate adăuga, sau planul
                2D se configurează de echipa TableX, din schița trimisă de tine.
              </p>
            ) : (
              zonaCurenta &&
              /**
               * Acelasi canvas pentru ambele roluri, cu gesturi diferite:
               *
               *   clic pe masa            → rezervarea, sau walk-in-ul (toti)
               *   tragerea insignei ⇄     → mut CLIENTUL pe alta masa (toti)
               *   tragerea mesei          → mut MOBILA (doar managerul)
               *
               * Ospatarul are nevoie de primele doua — sunt operatii de sala,
               * nu de plan (§31). A treia i-o refuza oricum RLS pe `tables`,
               * deci nici nu i-o aratam: butoanele care esueaza tacut sunt mai
               * rele decat cele care lipsesc.
               */
              (
                <EditorZona
                  zona={zonaCurenta}
                  stratActiv="mese"
                  poateMutaMese={esteManager}
                  rezervariPeMese={rezervariPeMese}
                  onMutaRezervare={(rezervareId, peMasa) => {
                    const rezervare = (rezervari.data ?? []).find((r) => r.id === rezervareId)
                    const masa = meseZona.find((m) => m.id === peMasa)
                    if (rezervare && masa) setDeMutat({ rezervare, masa })
                  }}
                  // Layer 1 publicat de echipa TableX (§8.4): pereti, usi,
                  // bar. Vine prin aceeasi vedere ca widgetul public, deci
                  // panoul nu vede niciodata lucrul in curs al echipei, iar
                  // publicarea apare live — realtime pe floor_plan_layers.
                  structura={structura.data?.[zonaCurenta.id] ?? []}
                  mese={meseZona}
                  statusuri={statusuri}
                  masaSelectata={masaDeEditat}
                  onSelecteazaMasa={setMasaDeEditat}
                  onDeschideMasa={laClickMasa}
                  onMutaMasa={(id, x, y) => mutaMasa.mutate({ id, x, y })}
                  structuraSelectata={null}
                  onSelecteazaStructura={() => {}}
                  onMutaStructura={() => {}}
                  className="aspect-[3/2] w-full"
                />
              )
            )}
          </>
        )}

        <CereriPlan restaurantId={restaurant.id} />
      </div>

      <aside className="grid content-start gap-4">
        <PanouAsteptare
          restaurantId={restaurant.id}
          onAsaza={(intrare) => setDeAsezat({ intrare, tableId: null })}
          onAsazaPeMasa={(intrare, tableId) => setDeAsezat({ intrare, tableId })}
        />

        {esteManager && zonaCurenta && (
          <PanouMeseAdmin
            restaurantId={restaurant.id}
            zona={zonaCurenta}
            masa={meseZona.find((m) => m.id === masaDeEditat) ?? null}
            mese={meseZona}
            onSelecteaza={setMasaDeEditat}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClockIcon className="size-4 text-primary" />
              Ora afișată
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {/* Ora se alege din bara de deasupra hartii (§28.12); aici ramane
                doar valoarea, mare, pentru cine se uita de la distanta. */}
            <div className="text-2xl font-semibold tabular-nums">{formateazaOra(oraAfisata)}</div>
            <p className="text-xs text-muted-foreground">
              Click pe o masă liberă deschide un walk-in pe ea; pe una ocupată, rezervarea.
              {esteManager && ' Trage o masă ca s-o muți pe plan.'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acum în zonă</CardTitle>
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

      {/* Asezarea unui oaspete din coada (§28.7). Trece prin acelasi walk-in
          precompletat ca din pagina Asteptare: coada si sala trebuie sa spuna
          acelasi lucru, deci iese din coada abia dupa ce rezervarea exista. */}
      {deAsezat && (
        <DialogRezervare
          key={deAsezat.intrare.id}
          deschis
          onDeschisChange={(deschis) => !deschis && setDeAsezat(null)}
          restaurantId={restaurant.id}
          fus={fus}
          zone={zone.data ?? []}
          zi={zi}
          oraImplicita={formateazaOra(oraAfisata)}
          walkIn
          zoneIdImplicit={deAsezat.intrare.zone_id ?? zonaCurenta?.id}
          tableIdImplicit={deAsezat.tableId ?? undefined}
          clientImplicit={{
            nume: deAsezat.intrare.nume,
            telefon: deAsezat.intrare.telefon,
            nrPersoane: deAsezat.intrare.nr_persoane,
          }}
          onCreat={() => {
            asazaDinCoada.mutate(deAsezat.intrare.id)
            setDeAsezat(null)
          }}
        />
      )}

      {/* §32.2 — Walk-In-ul master, fix jos pe mobil/tableta: harta e ecranul
          pe care traieste ospatarul, iar clientul care intra pe usa nu
          asteapta cautarea unui buton in toolbar. */}
      <Button
        size="lg"
        className="fixed right-4 bottom-4 z-40 shadow-lg lg:hidden"
        onClick={() => setWalkInDeschis(true)}
      >
        <ZapIcon />
        Walk-in
      </Button>

      {walkInDeschis && (
        <DialogWalkInHarta restaurantId={restaurant.id} onInchide={() => setWalkInDeschis(false)} />
      )}

      {/* §28.4 cere confirmare inainte de a finaliza mutarea. Nu e prudenta
          exagerata: pe o tableta, in sala plina, un deget alunecat peste doua
          mese ar muta clientul fara ca nimeni sa observe. */}
      {deMutat && (
        <Dialog open onOpenChange={(deschis) => !deschis && setDeMutat(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Muti rezervarea pe masa {deMutat.masa.numar_masa}?</DialogTitle>
              <DialogDescription>
                {deMutat.rezervare.client_nume} · {deMutat.rezervare.nr_persoane} persoane ·{' '}
                {ora(deMutat.rezervare.data_ora, fus)}
                {deMutat.masa.capacitate < deMutat.rezervare.nr_persoane &&
                  ` — atenție, masa are doar ${deMutat.masa.capacitate} locuri.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeMutat(null)}>
                Renunță
              </Button>
              <Button
                disabled={muta.isPending}
                onClick={() =>
                  muta.mutate(
                    { id: deMutat.rezervare.id, tableId: deMutat.masa.id },
                    {
                      onSuccess: () => {
                        notificari.succes(`Rezervarea a trecut pe masa ${deMutat.masa.numar_masa}.`)
                        setDeMutat(null)
                      },
                      // Masa ocupata in interval → 23P01, tradus in lib/erori.ts.
                      // Nu exista fortare (§15.3): dialogul ramane deschis, ca
                      // omul sa poata alege alta masa.
                      onError: (eroare) => notificari.eroare(eroare),
                    },
                  )
                }
              >
                Mută rezervarea
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
