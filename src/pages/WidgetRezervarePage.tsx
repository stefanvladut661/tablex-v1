import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2Icon, MapPinIcon } from 'lucide-react'

import { EcranIncarcare } from '@/components/EcranIncarcare'
import { MentenantaPage } from '@/pages/MentenantaPage'
import { HartaZona } from '@/components/floor-plan/HartaZona'
import { AnuntEveniment } from '@/components/widget/AnuntEveniment'
import { FormularPublic } from '@/components/widget/FormularPublic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSetariApp } from '@/hooks/useSetariApp'
import { RUTE } from '@/lib/rute'
import {
  CHEIE_CAMPURI,
  CHEI_WIDGET,
  esteIndisponibil,
  getCampuriFormular,
  getEvenimenteWidget,
  getRestaurantPublic,
  getSalaPublica,
  type RezultatRezervare,
} from '@/services/widget'

export function WidgetRezervarePage() {
  const { slug = '' } = useParams()
  const [rezultat, setRezultat] = useState<RezultatRezervare | null>(null)
  const [zonaId, setZonaId] = useState<string | null>(null)

  const setari = useSetariApp()

  const restaurant = useQuery({
    queryKey: CHEI_WIDGET.restaurant(slug),
    queryFn: () => getRestaurantPublic(slug),
    enabled: slug.length > 0,
  })

  /**
   * Anuntul de eveniment (§8.5). Nu filtram nimic aici: vederea publica arata
   * doar ce e publicat, cu anunt pornit, in fereastra configurata.
   */
  const evenimente = useQuery({
    queryKey: ['widget', 'evenimente', restaurant.data?.id ?? ''],
    queryFn: () => getEvenimenteWidget(restaurant.data!.id!),
    enabled: Boolean(restaurant.data?.id),
  })

  const sala = useQuery({
    queryKey: CHEI_WIDGET.sala(restaurant.data?.id ?? ''),
    queryFn: () => getSalaPublica(restaurant.data!.id!),
    enabled: Boolean(restaurant.data?.id),
  })

  const campuri = useQuery({
    queryKey: CHEIE_CAMPURI(restaurant.data?.id ?? ''),
    queryFn: () => getCampuriFormular(restaurant.data!.id!),
    enabled: Boolean(restaurant.data?.id),
  })

  // §16.4 — vederea publica ascunde restaurantele suspendate, deci „negasit"
  // poate insemna doua lucruri. Intrebam separat, DOAR cand n-am gasit nimic.
  const indisponibil = useQuery({
    queryKey: ['widget', 'indisponibil', slug],
    queryFn: () => esteIndisponibil(slug),
    enabled: slug.length > 0 && restaurant.isFetched && !restaurant.data,
  })

  const fus = restaurant.data?.fus_orar ?? 'Europe/Bucharest'
  if (restaurant.isLoading) return <EcranIncarcare />

  /**
   * Mentenanta (§47.2) opreste si widgetul public, deci si iframe-ul de pe
   * site-ul restaurantului. Verificarea sta INAINTE de „restaurantul nu a fost
   * gasit": in mentenanta nu vrem sa spunem clientului ca restaurantul nu
   * exista, daca de fapt platforma e cea oprita.
   *
   * `=== true` din acelasi motiv ca in garda de rute: cat timp setarile nu s-au
   * incarcat, widgetul functioneaza. Fail-open.
   */
  if (setari.data?.maintenance_mode === true) return <MentenantaPage />

  if (!restaurant.data) {
    if (indisponibil.isLoading) return <EcranIncarcare />

    // §16.4 — suspendat NU e totuna cu inexistent: mesaj dedicat, fara motiv
    // si fara detalii. Cererile existente raman in baza; doar cele noi sunt
    // blocate (rezerva_public cere oricum status activ).
    if (indisponibil.data) {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Acest restaurant nu este disponibil momentan
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Rezervările online sunt oprite temporar. Revino mai târziu sau contactează
            restaurantul telefonic.
          </p>
        </div>
      )
    }

    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Restaurantul nu a fost găsit</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Linkul e greșit sau restaurantul nu mai acceptă rezervări online.
        </p>
        <Button asChild variant="outline">
          <Link to={RUTE.acasa}>Mergi la TableX</Link>
        </Button>
      </div>
    )
  }

  const restaurantData = restaurant.data
  const zonaCurenta = sala.data?.zone.find((z) => z.id === zonaId) ?? sala.data?.zone[0] ?? null
  const meseZona = (sala.data?.mese ?? []).filter((m) => m.zone_id === zonaCurenta?.id)

  return (
    <div
      className="min-h-svh bg-background"
      // Branding-ul restaurantului (§27.6): accentul lui devine culoarea
      // primara a widgetului, fara sa atingem restul design system-ului.
      style={{ ['--primary' as string]: restaurantData.culoare_accent ?? undefined }}
    >
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-4">
          <div className="flex items-center gap-3">
            {/* Logoul din Form Builder (§27.6) — pana acum aparea doar in
                previzualizare; pagina publica il ignora. Alt gol, nu decor:
                clientul care da click dintr-un story trebuie sa recunoasca
                restaurantul din prima. */}
            {restaurantData.logo_url && (
              <img
                src={restaurantData.logo_url}
                alt=""
                className="size-10 rounded-lg object-contain"
              />
            )}
            <div>
              <h1 className="text-lg font-semibold tracking-tight">{restaurantData.nume}</h1>
              {restaurantData.oras && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPinIcon className="size-3" />
                  {restaurantData.oras}
                  {restaurantData.tip_locatie ? ` · ${restaurantData.tip_locatie}` : ''}
                </p>
              )}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            Rezervări prin Table<span className="text-primary">X</span>
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-2">
        {rezultat ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CheckCircle2Icon className="size-6 text-primary" />
              <CardTitle className="mt-2">
                {rezultat.status === 'confirmata'
                  ? 'Rezervarea ta e confirmată'
                  : 'Cererea ta a fost trimisă'}
              </CardTitle>
              <CardDescription>
                {rezultat.status === 'confirmata'
                  ? `Te așteptăm la ${rezultat.restaurant}. Dacă planurile se schimbă, sună-ne.`
                  : `${rezultat.restaurant} confirmă manual rezervările. Primești răspuns în scurt timp.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setRezultat(null)}>
                Trimite altă rezervare
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Anuntul de eveniment (§8.5), deasupra formularului: e motivul
                pentru care restaurantul plateste sa-l anunte. Aceeasi
                componenta ca in preview-ul din wizard (§29.4). */}
            {(evenimente.data ?? []).map((eveniment) => (
              <div key={eveniment.id} className="mb-4">
                <AnuntEveniment eveniment={eveniment} fus={fus} />
              </div>
            ))}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rezervă o masă</CardTitle>
              <CardDescription>
                {restaurantData.aprobare_automata
                  ? 'Rezervarea se confirmă automat.'
                  : 'Restaurantul confirmă manual fiecare rezervare.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormularPublic
                restaurant={restaurantData}
                campuri={campuri.data ?? []}
                zoneId={zonaCurenta?.id ?? null}
                slug={slug}
                onTrimis={setRezultat}
              />
            </CardContent>
          </Card>
          </>
        )}

        {/* Previzualizarea salii: informativa, fara alegere de masa — alocarea
            rămâne decizia personalului (§7.6). */}
        {sala.data && sala.data.zone.length > 0 && (
          <div className="grid content-start gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-medium">Sala</h2>
              {sala.data.zone.length > 1 && (
                <Tabs value={zonaCurenta?.id ?? ''} onValueChange={setZonaId}>
                  <TabsList>
                    {sala.data.zone.map((z) => (
                      <TabsTrigger key={z.id} value={z.id}>
                        {z.nume}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}
            </div>

            {zonaCurenta && meseZona.length > 0 ? (
              <>
                <HartaZona
                  zona={zonaCurenta}
                  mese={meseZona}
                  structura={sala.data.structura[zonaCurenta.id]}
                  arataGrid={false}
                  className="aspect-[3/2] w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Masa se alocă de personal, în funcție de numărul de persoane și de ora aleasă.
                </p>
              </>
            ) : (
              <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                Planul sălii nu e disponibil public pentru acest restaurant.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

/**
 * Un camp definit de restaurant. Cele patru tipuri din enum-ul
 * camp_formular_tip acopera tot ce se poate configura; nu inventam altele in
 * interfata, fiindca `rezerva_public` valideaza exact aceleasi tipuri.
 *
 * Valorile se tin ca TEXT, inclusiv pentru numar si checkbox: jsonb-ul din
 * `campuri_custom` e citit de oameni, nu de o schema — iar personalul vrea sa
 * vada "da", nu "true".
 */
