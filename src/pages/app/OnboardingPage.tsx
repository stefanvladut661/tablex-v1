import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  CheckIcon,
  CreditCardIcon,
  Loader2Icon,
  XCircleIcon,
} from 'lucide-react'
import { z } from 'zod'

import { CampText } from '@/components/formular/CampText'
import { EcranIncarcare } from '@/components/EcranIncarcare'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import { useNotificari } from '@/hooks/useNotificari'
import { useSetariApp } from '@/hooks/useSetariApp'
import { RUTE, ruteDupaLogin } from '@/lib/rute'
import { genereazaSlug, slugValid } from '@/lib/slug'
import { numeSchema, telefonSchema } from '@/lib/validari'
import { creeazaRestaurant, slugDisponibil } from '@/services/onboarding'

const TIPURI_LOCATIE = ['Restaurant', 'Bar', 'Cafenea', 'Club', 'Terasa', 'Altul'] as const

const schema = z.object({
  nume: numeSchema,
  slug: z
    .string()
    .trim()
    .refine(slugValid, 'Adresa poate avea 3–50 caractere: litere mici, cifre și cratime.'),
  tipLocatie: z.string().min(1, 'Alege tipul locației.'),
  oras: z.string().trim().max(120).optional(),
  adresa: z.string().trim().max(240).optional(),
  telefon: telefonSchema,
  numeFirma: z.string().trim().max(160).optional(),
  cui: z.string().trim().max(20).optional(),
  plan: z.enum(['start', 'pro_floor']),
})

type FormOnboarding = z.infer<typeof schema>

/** Campurile care trebuie sa fie valide ca sa poti trece de primul pas. */
const CAMPURI_PAS_1 = ['nume', 'slug', 'tipLocatie', 'oras', 'adresa', 'telefon', 'numeFirma', 'cui'] as const

const PASI = ['Datele locației', 'Planul', 'Activare'] as const

function euro(valoare: number | string | null | undefined): string {
  const numar = Number(valoare ?? 0)
  return Number.isInteger(numar) ? `${numar} €` : `${numar.toFixed(2)} €`
}

/**
 * Onboarding in trei pasi (§5).
 *
 * Ordinea nu e cosmetica: intai TOATE datele locatiei, validate, si abia la
 * final planul si plata. Cerinta clientului, si e cea corecta comercial — omul
 * care si-a scris deja numele restaurantului, adresa publica si datele de firma
 * a investit ceva in ecranul asta; unul caruia i se cere cardul din primul pas
 * pleaca inainte sa vada ce cumpara.
 *
 * Restaurantul se creeaza abia la ULTIMUL pas. Asa, un onboarding abandonat nu
 * lasa in urma nici restaurant fantoma, nici o adresa publica ocupata de cineva
 * care n-a terminat niciodata.
 *
 * Plata ramane placeholder, cum cere §14: fara Stripe si fara procesare reala
 * in v1. UI-ul si structura de date sunt gata de conectat.
 */
export function OnboardingPage() {
  const { utilizator, profil, incarcare, reincarcaProfil } = useAuth()
  const notificari = useNotificari()
  const navigate = useNavigate()
  const setari = useSetariApp()

  const [pas, setPas] = useState(0)
  const [slugEditatManual, setSlugEditatManual] = useState(false)
  // Estimarea de mese e doar pentru calculatorul de setup (§10.2): nu se
  // salveaza nicaieri, fiindca numarul real iese abia din planul desenat.
  const [meseEstimate, setMeseEstimate] = useState('30')

  const metadate = (utilizator?.user_metadata ?? {}) as {
    nume?: string
    nume_restaurant?: string
    telefon?: string
    /** §52 — CUI-ul cerut la signup; aici doar il preluam, nu-l recerem. */
    cui?: string
  }

  const form = useForm<FormOnboarding>({
    resolver: zodResolver(schema),
    defaultValues: {
      nume: metadate.nume_restaurant ?? '',
      slug: metadate.nume_restaurant ? genereazaSlug(metadate.nume_restaurant) : '',
      tipLocatie: 'Restaurant',
      oras: '',
      adresa: '',
      telefon: metadate.telefon ?? '',
      numeFirma: '',
      cui: metadate.cui ?? '',
      plan: 'start',
    },
  })

  const slugCurent = useWatch({ control: form.control, name: 'slug' })
  const planAles = useWatch({ control: form.control, name: 'plan' })
  const slugVerificat = useDebounce(slugCurent, 400)

  const verificare = useQuery({
    queryKey: ['slug-disponibil', slugVerificat],
    queryFn: () => slugDisponibil(slugVerificat),
    enabled: slugValid(slugVerificat ?? ''),
    staleTime: 30_000,
  })

  if (incarcare) return <EcranIncarcare />

  // Cine are deja un profil nu are ce cauta in onboarding.
  if (profil) return <Navigate to={ruteDupaLogin(profil.tip)} replace />

  async function mergiLaPlan() {
    const valid = await form.trigger([...CAMPURI_PAS_1])
    if (!valid) return
    if (verificare.data === false) {
      form.setError('slug', { message: 'Adresa este deja folosită. Alege alta.' })
      return
    }
    setPas(1)
  }

  async function trimite(valori: FormOnboarding) {
    try {
      await creeazaRestaurant({
        nume: valori.nume,
        slug: valori.slug,
        numePersoana: metadate.nume,
        plan: valori.plan,
        numeFirma: valori.numeFirma || undefined,
        cui: valori.cui || undefined,
        oras: valori.oras || undefined,
        adresa: valori.adresa || undefined,
        telefon: valori.telefon,
        tipLocatie: valori.tipLocatie,
      })
      await reincarcaProfil()
      notificari.succes('Restaurantul a fost creat.', {
        descriere: 'Poți invita personalul din secțiunea Echipa.',
      })
      navigate(RUTE.app, { replace: true })
    } catch (eroare) {
      // Adresa publica se putea ocupa intre pasul 1 si acum: intoarcem omul
      // acolo, cu campul marcat, in loc sa-i lasam eroarea pe ecranul de plata.
      const mesaj = eroare instanceof Error ? eroare.message : ''
      if (mesaj.includes('nu este disponibila')) {
        setPas(0)
        form.setError('slug', { message: 'Adresa tocmai a fost ocupată. Alege alta.' })
      }
      notificari.eroare(eroare)
    }
  }

  const stareSlug = !slugValid(slugCurent ?? '')
    ? null
    : verificare.isFetching
      ? 'verifica'
      : verificare.data === true
        ? 'liber'
        : verificare.data === false
          ? 'ocupat'
          : null

  const pretStart = setari.data?.pret_plan_start ?? 5
  const pretPro = setari.data?.pret_plan_pro ?? 10
  const pretSetup = Number(setari.data?.setup_floor_plan_pret ?? 100)
  const pragMese = setari.data?.setup_prag_mese ?? 50
  const pretMasaExtra = Number(setari.data?.setup_pret_masa_extra ?? 2)

  const mese = Math.max(0, Number(meseEstimate) || 0)
  const setupTotal = pretSetup + Math.max(0, mese - pragMese) * pretMasaExtra

  return (
    <div className="min-h-svh bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <span className="text-lg font-semibold tracking-tight">
            Table<span className="text-primary">X</span>
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Configurează restaurantul</h1>
          <ol className="mt-4 flex items-center justify-center gap-2 text-xs">
            {PASI.map((eticheta, i) => (
              <li key={eticheta} className="flex items-center gap-2">
                <span
                  aria-current={i === pas ? 'step' : undefined}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                    i === pas
                      ? 'bg-primary text-primary-foreground'
                      : i < pas
                        ? 'bg-status-liber-soft text-foreground'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i < pas ? <CheckIcon className="size-3" /> : <span>{i + 1}</span>}
                  {eticheta}
                </span>
                {i < PASI.length - 1 && <span className="text-muted-foreground">›</span>}
              </li>
            ))}
          </ol>
        </div>

        <form onSubmit={form.handleSubmit(trimite)} noValidate className="grid gap-4">
          {/* ── Pasul 1: datele locatiei ─────────────────────────────────── */}
          {pas === 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Identitate</CardTitle>
                  <CardDescription>
                    Numele și adresa publică la care clienții pot rezerva.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <CampText
                    eticheta="Numele restaurantului"
                    autoComplete="organization"
                    eroare={form.formState.errors.nume?.message}
                    {...form.register('nume', {
                      onBlur: (eveniment) => {
                        if (slugEditatManual) return
                        const generat = genereazaSlug(eveniment.target.value)
                        if (generat) form.setValue('slug', generat, { shouldValidate: true })
                      },
                    })}
                  />

                  <div className="grid gap-1.5">
                    <Label htmlFor="slug">Adresa publică</Label>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-sm text-muted-foreground">tablex.ro/r/</span>
                      <div className="relative flex-1">
                        <input
                          id="slug"
                          aria-invalid={Boolean(form.formState.errors.slug)}
                          className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 pr-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
                          {...form.register('slug', {
                            onChange: () => setSlugEditatManual(true),
                          })}
                        />
                        <span className="absolute top-1/2 right-2.5 -translate-y-1/2">
                          {stareSlug === 'verifica' && (
                            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                          )}
                          {stareSlug === 'liber' && (
                            <CheckCircle2Icon className="size-4 text-status-liber" />
                          )}
                          {stareSlug === 'ocupat' && (
                            <XCircleIcon className="size-4 text-destructive" />
                          )}
                        </span>
                      </div>
                    </div>
                    {form.formState.errors.slug ? (
                      <p className="text-xs font-medium text-destructive">
                        {form.formState.errors.slug.message}
                      </p>
                    ) : stareSlug === 'ocupat' ? (
                      <p className="text-xs font-medium text-destructive">
                        Adresa este deja folosită sau rezervată de sistem.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Litere mici, cifre și cratime. Se generează automat din nume.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="tipLocatie">Tip locație</Label>
                    <Controller
                      control={form.control}
                      name="tipLocatie"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="tipLocatie" className="w-full">
                            <SelectValue placeholder="Alege" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPURI_LOCATIE.map((tip) => (
                              <SelectItem key={tip} value={tip}>
                                {tip}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <CampText
                      eticheta="Oraș"
                      eroare={form.formState.errors.oras?.message}
                      {...form.register('oras')}
                    />
                    <CampText
                      eticheta="Telefon de contact"
                      type="tel"
                      placeholder="0722123456"
                      eroare={form.formState.errors.telefon?.message}
                      {...form.register('telefon')}
                    />
                  </div>

                  <CampText
                    eticheta="Adresa"
                    ajutor="Opțional. Apare în widgetul public."
                    eroare={form.formState.errors.adresa?.message}
                    {...form.register('adresa')}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Date de facturare</CardTitle>
                  <CardDescription>Apar pe factură, când se activează plata.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <CampText
                    eticheta="Denumire firmă"
                    eroare={form.formState.errors.numeFirma?.message}
                    {...form.register('numeFirma')}
                  />
                  <CampText
                    eticheta="CUI"
                    eroare={form.formState.errors.cui?.message}
                    {...form.register('cui')}
                  />
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Ai primit o invitație de la un restaurant? Deschide linkul din email în loc să
                  creezi un cont nou.
                </p>
                {/* type=button: pasul 1 nu trimite formularul, doar valideaza. */}
                <Button type="button" onClick={() => void mergiLaPlan()}>
                  Continuă
                </Button>
              </div>
            </>
          )}

          {/* ── Pasul 2: planul ──────────────────────────────────────────── */}
          {pas === 1 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Alege planul</CardTitle>
                  <CardDescription>
                    Îl poți schimba oricând din Setări, fără penalizare și fără contract.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Controller
                    control={form.control}
                    name="plan"
                    render={({ field }) => (
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="gap-3"
                      >
                        <Label
                          htmlFor="plan-start"
                          className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 font-normal has-[[data-state=checked]]:border-primary"
                        >
                          <RadioGroupItem value="start" id="plan-start" className="mt-0.5" />
                          <span className="grid flex-1 gap-1">
                            <span className="flex items-center justify-between gap-3">
                              <span className="font-medium">Start</span>
                              <span className="font-semibold tabular-nums">
                                {euro(pretStart)}/luna
                              </span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Registru de rezervări, calendar, widget public, walk-in, lista de
                              așteptare și CRM. Rezervări și utilizatori nelimitați.
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Fără harta 2D a sălii.
                            </span>
                          </span>
                        </Label>
                        <Label
                          htmlFor="plan-pro"
                          className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 font-normal has-[[data-state=checked]]:border-primary"
                        >
                          <RadioGroupItem value="pro_floor" id="plan-pro" className="mt-0.5" />
                          <span className="grid flex-1 gap-1">
                            <span className="flex items-center justify-between gap-3">
                              <span className="font-medium">Pro Floor</span>
                              <span className="font-semibold tabular-nums">
                                {euro(pretPro)}/luna
                              </span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Tot din Start, plus harta 2D interactivă a sălii: status live pe
                              mese, mutarea rezervărilor între mese, unirea meselor pentru grupuri.
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Plus o taxă unică de configurare a planului, desenat de echipa
                              noastră din schița ta.
                            </span>
                          </span>
                        </Label>
                      </RadioGroup>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex items-center justify-between gap-3">
                <Button type="button" variant="ghost" onClick={() => setPas(0)}>
                  <ArrowLeftIcon />
                  Înapoi
                </Button>
                <Button type="button" onClick={() => setPas(2)}>
                  Continuă
                </Button>
              </div>
            </>
          )}

          {/* ── Pasul 3: activarea (plata) ───────────────────────────────── */}
          {pas === 2 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ce vei plăti</CardTitle>
                  <CardDescription>
                    {form.getValues('nume')} · tablex.ro/r/{form.getValues('slug')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      Abonament {planAles === 'pro_floor' ? 'Pro Floor' : 'Start'}
                    </span>
                    <span className="font-medium tabular-nums">
                      {euro(planAles === 'pro_floor' ? pretPro : pretStart)}/luna
                    </span>
                  </div>

                  {/* §10.2 — calculatorul de setup, afisat in checkout. */}
                  {planAles === 'pro_floor' && (
                    <div className="grid gap-2 rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span>Configurare hartă 2D (o singură dată)</span>
                        <span className="font-medium tabular-nums">{euro(setupTotal)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="mese-estimate" className="text-xs text-muted-foreground">
                          Câte mese ai, aproximativ?
                        </Label>
                        <Input
                          id="mese-estimate"
                          type="number"
                          min={1}
                          max={500}
                          value={meseEstimate}
                          onChange={(e) => setMeseEstimate(e.target.value)}
                          className="h-8 w-20"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {euro(pretSetup)} acoperă până la {pragMese} de mese, indiferent de câte
                        zone ai. Peste, {euro(pretMasaExtra)} pentru fiecare masă în plus. Numărul
                        exact se stabilește după ce vedem planul sălii — estimarea de aici nu se
                        salvează nicăieri.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCardIcon className="size-4 text-muted-foreground" />
                    Plata
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-center">
                    <p className="text-sm font-medium">Plata online se activează în curând</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Deocamdată contul se deschide fără card. Te contactăm pentru facturare
                      înainte de prima plată; până atunci ai acces complet la planul ales.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fără contract pe termen lung și fără comision pe rezervare. Poți schimba planul
                    sau renunța oricând.
                  </p>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between gap-3">
                <Button type="button" variant="ghost" onClick={() => setPas(1)}>
                  <ArrowLeftIcon />
                  Înapoi
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2Icon className="animate-spin" />}
                  Activează contul
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
