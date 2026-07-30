import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle2Icon, ClockIcon, Loader2Icon, MapPinIcon } from 'lucide-react'
import { z } from 'zod'

import { EcranIncarcare } from '@/components/EcranIncarcare'
import { HartaZona } from '@/components/floor-plan/HartaZona'
import { CampText } from '@/components/formular/CampText'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNotificari } from '@/hooks/useNotificari'
import { programZilei } from '@/lib/program'
import { RUTE } from '@/lib/rute'
import { formatFus } from '@/lib/timp'
import { emailSchema, numeSchema, telefonSchema } from '@/lib/validari'
import {
  CHEI_WIDGET,
  getRestaurantPublic,
  getSalaPublica,
  trimiteCerereRezervare,
  type RezultatRezervare,
} from '@/services/widget'

const schema = z.object({
  clientNume: numeSchema,
  telefon: telefonSchema,
  email: z.union([emailSchema, z.literal('')]).optional(),
  nrPersoane: z.number().int().min(1, 'Minim 1 persoana.').max(50, 'Pentru grupuri mai mari, suna-ne.'),
  data: z.string().min(1, 'Alege o zi.'),
  ora: z.string().regex(/^\d{2}:\d{2}$/, 'Alege o ora.'),
  noteClient: z.string().max(500).optional(),
  gdpr: z.boolean().refine((v) => v, { message: 'Avem nevoie de acordul tau pentru a rezerva.' }),
})

type FormWidget = z.infer<typeof schema>

function aziISO(): string {
  const acum = new Date()
  return `${acum.getFullYear()}-${String(acum.getMonth() + 1).padStart(2, '0')}-${String(acum.getDate()).padStart(2, '0')}`
}

export function WidgetRezervarePage() {
  const { slug = '' } = useParams()
  const notificari = useNotificari()
  const [rezultat, setRezultat] = useState<RezultatRezervare | null>(null)
  const [zonaId, setZonaId] = useState<string | null>(null)

  const restaurant = useQuery({
    queryKey: CHEI_WIDGET.restaurant(slug),
    queryFn: () => getRestaurantPublic(slug),
    enabled: slug.length > 0,
  })

  const sala = useQuery({
    queryKey: CHEI_WIDGET.sala(restaurant.data?.id ?? ''),
    queryFn: () => getSalaPublica(restaurant.data!.id!),
    enabled: Boolean(restaurant.data?.id),
  })

  const form = useForm<FormWidget>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientNume: '',
      telefon: '',
      email: '',
      nrPersoane: 2,
      data: aziISO(),
      ora: '19:00',
      noteClient: '',
      gdpr: false,
    },
  })

  const trimite = useMutation({
    mutationFn: trimiteCerereRezervare,
    onSuccess: (date) => setRezultat(date),
    onError: (eroare) => notificari.eroare(eroare),
  })

  const fus = restaurant.data?.fus_orar ?? 'Europe/Bucharest'
  // useWatch, nu watch(): watch() returneaza o functie nememoizabila si
  // dezactiveaza compilarea componentei.
  const dataAleasa = useWatch({ control: form.control, name: 'data' })

  const program = useMemo(() => {
    if (!restaurant.data) return null
    // Ziua aleasa e o data calendaristica; o interpretam la pranz ca sa nu
    // cada in ziua vecina din cauza fusului.
    const zi = new Date(`${dataAleasa}T12:00:00`)
    if (Number.isNaN(zi.getTime())) return null
    return { zi, interval: programZilei(zi, restaurant.data.program_standard, fus) }
  }, [restaurant.data, dataAleasa, fus])

  if (restaurant.isLoading) return <EcranIncarcare />

  if (!restaurant.data) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Restaurantul nu a fost gasit</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Linkul e gresit sau restaurantul nu mai accepta rezervari online.
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

  async function laTrimitere(valori: FormWidget) {
    const dataOra = new Date(`${valori.data}T${valori.ora}:00`)
    if (Number.isNaN(dataOra.getTime())) {
      form.setError('ora', { message: 'Data sau ora nu sunt valide.' })
      return
    }
    await trimite.mutateAsync({
      slug,
      clientNume: valori.clientNume,
      telefon: valori.telefon,
      nrPersoane: valori.nrPersoane,
      dataOra,
      zoneId: zonaCurenta?.id ?? null,
      email: valori.email || null,
      noteClient: valori.noteClient || null,
      gdpr: valori.gdpr,
    })
  }

  return (
    <div
      className="min-h-svh bg-background"
      // Branding-ul restaurantului (§27.6): accentul lui devine culoarea
      // primara a widgetului, fara sa atingem restul design system-ului.
      style={{ ['--primary' as string]: restaurantData.culoare_accent ?? undefined }}
    >
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-4">
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
          <span className="text-xs text-muted-foreground">
            Rezervari prin Table<span className="text-primary">X</span>
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
                  ? 'Rezervarea ta e confirmata'
                  : 'Cererea ta a fost trimisa'}
              </CardTitle>
              <CardDescription>
                {rezultat.status === 'confirmata'
                  ? `Te asteptam la ${rezultat.restaurant}. Daca planurile se schimba, suna-ne.`
                  : `${rezultat.restaurant} confirma manual rezervarile. Primesti raspuns in scurt timp.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setRezultat(null)}>
                Trimite alta rezervare
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rezerva o masa</CardTitle>
              <CardDescription>
                {restaurantData.aprobare_automata
                  ? 'Rezervarea se confirma automat.'
                  : 'Restaurantul confirma manual fiecare rezervare.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(laTrimitere)} noValidate className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <CampText
                    eticheta="Zi"
                    type="date"
                    min={aziISO()}
                    eroare={form.formState.errors.data?.message}
                    {...form.register('data')}
                  />
                  <CampText
                    eticheta="Ora"
                    type="time"
                    eroare={form.formState.errors.ora?.message}
                    {...form.register('ora')}
                  />
                  <CampText
                    eticheta="Persoane"
                    type="number"
                    min={1}
                    max={50}
                    eroare={form.formState.errors.nrPersoane?.message}
                    {...form.register('nrPersoane', { valueAsNumber: true })}
                  />
                </div>

                {program && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ClockIcon className="size-3.5" />
                    {program.interval.deschis
                      ? `${formatFus(program.zi, 'EEEE', fus)}: deschis intre ${String(
                          Math.floor(program.interval.deLa),
                        ).padStart(2, '0')}:00 si ${String(
                          Math.floor(program.interval.panaLa) % 24,
                        ).padStart(2, '0')}:00`
                      : `${formatFus(program.zi, 'EEEE', fus)}: inchis`}
                  </p>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <CampText
                    eticheta="Nume"
                    autoComplete="name"
                    eroare={form.formState.errors.clientNume?.message}
                    {...form.register('clientNume')}
                  />
                  <CampText
                    eticheta="Telefon"
                    type="tel"
                    autoComplete="tel"
                    placeholder="0722123456"
                    eroare={form.formState.errors.telefon?.message}
                    {...form.register('telefon')}
                  />
                </div>

                <CampText
                  eticheta="Email (optional)"
                  type="email"
                  autoComplete="email"
                  eroare={form.formState.errors.email?.message}
                  {...form.register('email')}
                />

                <div className="grid gap-1.5">
                  <Label htmlFor="noteClient">Preferinte (optional)</Label>
                  <Textarea
                    id="noteClient"
                    rows={2}
                    placeholder="Masa la fereastra, scaun pentru copil, aniversare..."
                    {...form.register('noteClient')}
                  />
                </div>

                <div className="grid gap-1.5">
                  <div className="flex items-start gap-2">
                    <Controller
                      control={form.control}
                      name="gdpr"
                      render={({ field }) => (
                        <Checkbox
                          id="gdpr"
                          checked={field.value}
                          onBlur={field.onBlur}
                          onCheckedChange={(bifat) => field.onChange(bifat === true)}
                        />
                      )}
                    />
                    <Label htmlFor="gdpr" className="text-sm leading-snug font-normal">
                      Accept ca datele mele sa fie folosite pentru gestionarea rezervarii.
                    </Label>
                  </div>
                  {form.formState.errors.gdpr && (
                    <p className="text-xs font-medium text-destructive">
                      {form.formState.errors.gdpr.message}
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={trimite.isPending}>
                  {trimite.isPending && <Loader2Icon className="animate-spin" />}
                  Trimite rezervarea
                </Button>
              </form>
            </CardContent>
          </Card>
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
                  Masa se aloca de personal, in functie de numarul de persoane si de ora aleasa.
                </p>
              </>
            ) : (
              <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                Planul salii nu e disponibil public pentru acest restaurant.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
