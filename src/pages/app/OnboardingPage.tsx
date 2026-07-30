import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from 'lucide-react'
import { z } from 'zod'

import { CampText } from '@/components/formular/CampText'
import { EcranIncarcare } from '@/components/EcranIncarcare'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    .refine(slugValid, 'Adresa poate avea 3–50 caractere: litere mici, cifre si cratime.'),
  tipLocatie: z.string().min(1, 'Alege tipul locatiei.'),
  oras: z.string().trim().max(120).optional(),
  adresa: z.string().trim().max(240).optional(),
  telefon: telefonSchema,
  numeFirma: z.string().trim().max(160).optional(),
  cui: z.string().trim().max(20).optional(),
  plan: z.enum(['start', 'pro_floor']),
})

type FormOnboarding = z.infer<typeof schema>

export function OnboardingPage() {
  const { utilizator, profil, incarcare, reincarcaProfil } = useAuth()
  const notificari = useNotificari()
  const navigate = useNavigate()
  const [slugEditatManual, setSlugEditatManual] = useState(false)

  const metadate = (utilizator?.user_metadata ?? {}) as {
    nume?: string
    nume_restaurant?: string
    telefon?: string
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
      cui: '',
      plan: 'start',
    },
  })

  const slugCurent = useWatch({ control: form.control, name: 'slug' })
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

  async function trimite(valori: FormOnboarding) {
    if (verificare.data === false) {
      form.setError('slug', { message: 'Adresa este deja folosita. Alege alta.' })
      return
    }

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
        descriere: 'Poti invita personalul din secțiunea Echipa.',
      })
      navigate(RUTE.app, { replace: true })
    } catch (eroare) {
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

  return (
    <div className="min-h-svh bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <span className="text-lg font-semibold tracking-tight">
            Table<span className="text-primary">X</span>
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Configureaza restaurantul</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Un singur pas. Restul setarilor le poti schimba oricand din panou.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(trimite)} noValidate className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identitate</CardTitle>
              <CardDescription>
                Numele si adresa publica la care clientii pot rezerva.
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
                <Label htmlFor="slug">Adresa publica</Label>
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
                    Adresa este deja folosita sau rezervata de sistem.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Litere mici, cifre si cratime. Se genereaza automat din nume.
                  </p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="tipLocatie">Tip locatie</Label>
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
                  eticheta="Oras"
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
                ajutor="Optional. Apare in widgetul public."
                eroare={form.formState.errors.adresa?.message}
                {...form.register('adresa')}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plan</CardTitle>
              <CardDescription>Poti schimba planul oricand, fara penalizare.</CardDescription>
            </CardHeader>
            <CardContent>
              <Controller
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-3">
                    <Label
                      htmlFor="plan-start"
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 font-normal has-[[data-state=checked]]:border-primary"
                    >
                      <RadioGroupItem value="start" id="plan-start" className="mt-0.5" />
                      <span className="grid gap-0.5">
                        <span className="font-medium">Start</span>
                        <span className="text-xs text-muted-foreground">
                          Rezervari, calendar, walk-in si CRM. Fara harta 2D.
                        </span>
                      </span>
                    </Label>
                    <Label
                      htmlFor="plan-pro"
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 font-normal has-[[data-state=checked]]:border-primary"
                    >
                      <RadioGroupItem value="pro_floor" id="plan-pro" className="mt-0.5" />
                      <span className="grid gap-0.5">
                        <span className="font-medium">Pro</span>
                        <span className="text-xs text-muted-foreground">
                          Include harta 2D interactiva a salii, cu alocare pe mese.
                        </span>
                      </span>
                    </Label>
                  </RadioGroup>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Date de facturare</CardTitle>
              <CardDescription>Optional acum; necesare la prima plata.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <CampText
                eticheta="Denumire firma"
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
              Ai primit o invitatie de la un restaurant? Deschide linkul din email in loc sa creezi
              un cont nou.
            </p>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2Icon className="animate-spin" />}
              Creeaza restaurantul
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
