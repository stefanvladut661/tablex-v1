import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { CopyIcon, ExternalLinkIcon, Loader2Icon, TriangleAlertIcon } from 'lucide-react'
import { z } from 'zod'

import { CampText } from '@/components/formular/CampText'
import { ExceptiiProgram } from '@/components/setari/ExceptiiProgram'
import { TabAbonament } from '@/components/setari/TabAbonament'
import { TabWhatsApp } from '@/components/setari/TabWhatsApp'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EchipaPage } from '@/pages/app/EchipaPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/hooks/useAuth'
import { useNotificari } from '@/hooks/useNotificari'
import { RUTE } from '@/lib/rute'
import {
  ZILE_PROGRAM,
  actualizeazaRestaurant,
  programDinJson,
  verificaConflicteBuffer,
  type ConflictBuffer,
} from '@/services/setari-restaurant'

const ORA = /^\d{2}:\d{2}$/

const schemaZi = z.object({
  deschis: z.boolean(),
  de_la: z.string().regex(ORA, 'HH:MM'),
  pana_la: z.string().regex(ORA, 'HH:MM'),
})

/**
 * Limitele de aici oglindesc exact constrangerile CHECK din migratia tenancy.
 * Daca se schimba in baza, trebuie schimbate si aici — altfel utilizatorul
 * primeste o eroare SQL in loc de un mesaj util.
 */
const schema = z.object({
  nume: z.string().trim().min(2, 'Introdu numele restaurantului.').max(120),
  oras: z.string().trim().max(120).optional(),
  adresa: z.string().trim().max(240).optional(),
  telefon_contact: z.string().trim().max(30).optional(),
  email_contact: z.union([z.email('Adresa de email nu pare valida.'), z.literal('')]).optional(),
  tip_locatie: z.string().trim().max(60).optional(),

  aprobare_automata: z.boolean(),
  durata_implicita_minute: z.number().int().min(90, 'Minim 90 de minute.').max(180, 'Maxim 180 de minute.'),
  buffer_minute: z.number().int().min(0).max(60, 'Maxim 60 de minute.'),
  max_scaune_masa: z.number().int().min(1).max(24, 'Maxim 24 de scaune.'),
  data_retentie_ani: z.number().int().min(1).max(10, 'Maxim 10 ani.'),
  culoare_accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Foloseste formatul #RRGGBB.'),

  program: z.object({
    luni: schemaZi,
    marti: schemaZi,
    miercuri: schemaZi,
    joi: schemaZi,
    sambata: schemaZi,
    vineri: schemaZi,
    duminica: schemaZi,
  }),
})

type FormSetari = z.infer<typeof schema>

export function SetariPage() {
  const { profil, reincarcaProfil } = useAuth()
  const notificari = useNotificari()
  const [conflicte, setConflicte] = useState<ConflictBuffer[] | null>(null)

  const restaurant = profil?.tip === 'admin' ? profil.restaurant : null

  const form = useForm<FormSetari>({
    resolver: zodResolver(schema),
    defaultValues: restaurant
      ? {
          nume: restaurant.nume,
          oras: restaurant.oras ?? '',
          adresa: restaurant.adresa ?? '',
          telefon_contact: restaurant.telefon_contact ?? '',
          email_contact: restaurant.email_contact ?? '',
          tip_locatie: restaurant.tip_locatie ?? '',
          aprobare_automata: restaurant.aprobare_automata,
          durata_implicita_minute: restaurant.durata_implicita_minute,
          buffer_minute: restaurant.buffer_minute,
          max_scaune_masa: restaurant.max_scaune_masa,
          data_retentie_ani: restaurant.data_retentie_ani,
          culoare_accent: restaurant.culoare_accent,
          program: programDinJson(restaurant.program_standard),
        }
      : undefined,
  })

  const salveaza = useMutation({
    mutationFn: (valori: FormSetari) =>
      actualizeazaRestaurant(restaurant!.id, {
        nume: valori.nume,
        oras: valori.oras || null,
        adresa: valori.adresa || null,
        telefon_contact: valori.telefon_contact || null,
        email_contact: valori.email_contact || null,
        tip_locatie: valori.tip_locatie || null,
        aprobare_automata: valori.aprobare_automata,
        durata_implicita_minute: valori.durata_implicita_minute,
        buffer_minute: valori.buffer_minute,
        max_scaune_masa: valori.max_scaune_masa,
        data_retentie_ani: valori.data_retentie_ani,
        culoare_accent: valori.culoare_accent,
        program_standard: valori.program,
      }),
    onSuccess: async () => {
      // Profilul tine si restaurantul, deci antetul si fusul orar trebuie
      // reimprospatate ca sa reflecte imediat noile setari.
      await reincarcaProfil()
      notificari.succes('Setarile au fost salvate.')
      setConflicte(null)
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const verificaBuffer = useMutation({
    mutationFn: () => verificaConflicteBuffer(restaurant!.id, form.getValues('buffer_minute')),
    onSuccess: (rezultat) => {
      setConflicte(rezultat)
      if (rezultat.length === 0) {
        notificari.succes('Nicio suprapunere cu noua valoare a buffer-ului.')
      }
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  if (!restaurant) return null

  const linkWidget = `${window.location.origin}${RUTE.widget(restaurant.slug)}`

  async function copiazaLink() {
    try {
      await navigator.clipboard.writeText(linkWidget)
      notificari.succes('Link copiat.', { descriere: 'Pune-l pe site sau in bio.' })
    } catch {
      notificari.info('Copiaza manual linkul', { descriere: linkWidget, durata: 15_000 })
    }
  }

  return (
    <div className="p-4 sm:p-6">
      {/* §30.1 — Setarile pe tab-uri. Echipa a fost pana acum pagina separata
          in sidebar; spec-ul o cere aici, langa celelalte configurari. */}
      <Tabs defaultValue="restaurant">
        <TabsList className="mx-auto flex max-w-3xl">
          <TabsTrigger value="restaurant">Restaurant</TabsTrigger>
          <TabsTrigger value="echipa">Echipa</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="abonament">Abonament</TabsTrigger>
        </TabsList>

        <TabsContent value="restaurant" className="mt-4 grid gap-4">
      <form
        onSubmit={form.handleSubmit((valori) => salveaza.mutate(valori))}
        noValidate
        className="mx-auto grid max-w-3xl gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Setari</h1>
          <Button type="submit" disabled={salveaza.isPending}>
            {salveaza.isPending && <Loader2Icon className="animate-spin" />}
            Salveaza
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identitate si contact</CardTitle>
            <CardDescription>Datele afisate clientilor in widgetul public.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <CampText
                eticheta="Nume restaurant"
                eroare={form.formState.errors.nume?.message}
                {...form.register('nume')}
              />
              <CampText
                eticheta="Tip locatie"
                eroare={form.formState.errors.tip_locatie?.message}
                {...form.register('tip_locatie')}
              />
              <CampText
                eticheta="Oras"
                eroare={form.formState.errors.oras?.message}
                {...form.register('oras')}
              />
              <CampText
                eticheta="Telefon de contact"
                type="tel"
                eroare={form.formState.errors.telefon_contact?.message}
                {...form.register('telefon_contact')}
              />
              <CampText
                eticheta="Email de contact"
                type="email"
                eroare={form.formState.errors.email_contact?.message}
                {...form.register('email_contact')}
              />
              <CampText
                eticheta="Adresa"
                eroare={form.formState.errors.adresa?.message}
                {...form.register('adresa')}
              />
            </div>

            <div className="grid gap-1.5 rounded-lg bg-muted p-3">
              <Label>Link public de rezervare</Label>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 truncate text-sm">{linkWidget}</code>
                <Button type="button" variant="outline" size="sm" onClick={() => void copiazaLink()}>
                  <CopyIcon />
                  Copiaza
                </Button>
                <Button type="button" variant="ghost" size="sm" asChild>
                  <a href={linkWidget} target="_blank" rel="noreferrer">
                    <ExternalLinkIcon />
                    Deschide
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Adresa se schimba doar de echipa TableX: linkurile deja distribuite ar deveni
                invalide.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reguli de rezervare</CardTitle>
            <CardDescription>
              Se aplica rezervarilor NOI. Cele existente isi pastreaza durata si buffer-ul cu care
              au fost create.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="aprobare">Aprobare automata</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Pornit: cererile din widget devin direct confirmate. Oprit: ajung „in asteptare"
                  si le confirmi tu.
                </p>
              </div>
              <Controller
                control={form.control}
                name="aprobare_automata"
                render={({ field }) => (
                  <Switch id="aprobare" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <CampText
                eticheta="Durata implicita (min)"
                type="number"
                min={90}
                max={180}
                step={15}
                ajutor="Intre 90 si 180."
                eroare={form.formState.errors.durata_implicita_minute?.message}
                {...form.register('durata_implicita_minute', { valueAsNumber: true })}
              />
              <CampText
                eticheta="Buffer intre rezervari (min)"
                type="number"
                min={0}
                max={60}
                step={5}
                ajutor="Timp de curatare."
                eroare={form.formState.errors.buffer_minute?.message}
                {...form.register('buffer_minute', { valueAsNumber: true })}
              />
              <CampText
                eticheta="Scaune maxim / masa"
                type="number"
                min={1}
                max={24}
                eroare={form.formState.errors.max_scaune_masa?.message}
                {...form.register('max_scaune_masa', { valueAsNumber: true })}
              />
            </div>

            <div className="grid gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-self-start"
                onClick={() => verificaBuffer.mutate()}
                disabled={verificaBuffer.isPending}
              >
                {verificaBuffer.isPending && <Loader2Icon className="animate-spin" />}
                Verifica impactul buffer-ului
              </Button>

              {conflicte !== null && conflicte.length > 0 && (
                <div className="grid gap-2 rounded-lg border border-status-expirare bg-status-expirare-soft p-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <TriangleAlertIcon className="size-4" />
                    {conflicte.length} suprapuneri ar apărea cu aceasta valoare
                  </p>
                  <p className="text-xs text-foreground/80">
                    Rezervarile existente NU se schimba — valoarea noua se aplica doar celor
                    viitoare. Lista arata unde ar fi fost conflicte daca s-ar fi aplicat retroactiv.
                  </p>
                  <ul className="grid gap-1 text-xs text-foreground/80">
                    {conflicte.slice(0, 5).map((conflict) => (
                      <li key={`${conflict.rezervare_a}-${conflict.rezervare_b}`}>
                        Masa {conflict.table_id.slice(0, 8)}… · suprapunere {conflict.suprapunere}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Program de functionare</CardTitle>
            <CardDescription>
              Widgetul refuza rezervarile in afara acestui program. Zilele speciale se adauga
              separat, ca excepții.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {ZILE_PROGRAM.map(({ cheie, eticheta }) => (
              <div
                key={cheie}
                className="grid grid-cols-[7rem_auto_1fr] items-center gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0"
              >
                <Label htmlFor={`zi-${cheie}`} className="font-normal">
                  {eticheta}
                </Label>
                <Controller
                  control={form.control}
                  name={`program.${cheie}.deschis`}
                  render={({ field }) => (
                    <Switch
                      id={`zi-${cheie}`}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label={`Deschis ${eticheta}`}
                    />
                  )}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    aria-label={`Ora de deschidere ${eticheta}`}
                    className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    {...form.register(`program.${cheie}.de_la`)}
                  />
                  <span className="text-muted-foreground">–</span>
                  <input
                    type="time"
                    aria-label={`Ora de inchidere ${eticheta}`}
                    className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    {...form.register(`program.${cheie}.pana_la`)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aspect si date</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="culoare">Culoare de accent</Label>
              <div className="flex items-center gap-2">
                <Controller
                  control={form.control}
                  name="culoare_accent"
                  render={({ field }) => (
                    <>
                      <input
                        type="color"
                        id="culoare"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="size-9 cursor-pointer rounded-lg border border-input bg-transparent p-1"
                      />
                      <input
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-9 w-28 rounded-lg border border-input bg-transparent px-2 text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        aria-label="Cod hexazecimal al culorii"
                      />
                    </>
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Se aplica in widgetul public, nu in panou.
              </p>
              {form.formState.errors.culoare_accent && (
                <p className="text-xs font-medium text-destructive">
                  {form.formState.errors.culoare_accent.message}
                </p>
              )}
            </div>

            <CampText
              eticheta="Retentie date clienti (ani)"
              type="number"
              min={1}
              max={10}
              ajutor="Dupa acest termen, datele clientilor pot fi sterse (GDPR)."
              eroare={form.formState.errors.data_retentie_ani?.message}
              {...form.register('data_retentie_ani', { valueAsNumber: true })}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={salveaza.isPending}>
            {salveaza.isPending && <Loader2Icon className="animate-spin" />}
            Salveaza setarile
          </Button>
        </div>
      </form>

      {/* In AFARA formularului, si nu doar fiindca <form> nu se poate imbrica:
          excepțiile se salveaza pe loc, nu la butonul global de mai sus. O
          lista in care adaugi un rand si nu se intampla nimic pana derulezi la
          capatul paginii ar fi derutanta. */}
      <ExceptiiProgram restaurantId={restaurant.id} fus={restaurant.fus_orar} />
        </TabsContent>

        <TabsContent value="echipa" className="mt-4">
          <EchipaPage />
        </TabsContent>

        <TabsContent value="whatsapp" className="mx-auto mt-4 max-w-3xl">
          <TabWhatsApp restaurantId={restaurant.id} />
        </TabsContent>

        <TabsContent value="abonament" className="mx-auto mt-4 max-w-3xl">
          <TabAbonament restaurant={restaurant} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
