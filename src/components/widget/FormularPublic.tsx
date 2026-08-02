import { useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { ClockIcon, Loader2Icon } from 'lucide-react'
import { z } from 'zod'

import { CampText } from '@/components/formular/CampText'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useNotificari } from '@/hooks/useNotificari'
import { programZilei } from '@/lib/program'
import { formatFus } from '@/lib/timp'
import { emailSchema, numeSchema, telefonSchema } from '@/lib/validari'
import {
  campuriProprii,
  trimiteCerereRezervare,
  type CampFormularPublic,
  type RestaurantPublic,
  type RezultatRezervare,
} from '@/services/widget'

/**
 * Formularul public de rezervare, folosit in DOUA locuri: pe pagina
 * /r/[slug] si in previzualizarea din Form Builder (§27.5).
 *
 * De ce e o singura componenta, si nu doua: un preview scris separat arata bine
 * in ziua in care il faci si minte doua saptamani mai tarziu, cand cineva
 * schimba doar formularul real. Aici, orice modificare se vede in amandoua
 * fiindca sunt acelasi cod.
 *
 * In modul `previzualizare` nu se trimite nimic: butonul e inert, iar cererea
 * catre baza nici nu pleaca. Managerul care se joaca in Setari nu are cum sa
 * creeze din greseala o rezervare adevarata.
 */
const schema = z.object({
  clientNume: numeSchema,
  telefon: telefonSchema,
  email: z.union([emailSchema, z.literal('')]).optional(),
  nrPersoane: z.number().int().min(1, 'Minim 1 persoană.').max(50, 'Pentru grupuri mai mari, sună-ne.'),
  data: z.string().min(1, 'Alege o zi.'),
  ora: z.string().regex(/^\d{2}:\d{2}$/, 'Alege o oră.'),
  noteClient: z.string().max(500).optional(),
  gdpr: z.boolean().refine((v) => v, { message: 'Avem nevoie de acordul tău pentru a rezerva.' }),
  // Cheile campurilor proprii se stiu abia dupa incarcare, deci schema le
  // accepta generic. Obligativitatea se verifica la trimitere — si, decisiv, in
  // baza, fiindca API-ul e public.
  campuriCustom: z.record(z.string(), z.string()).optional(),
})

export type FormWidget = z.infer<typeof schema>

export function aziISO(): string {
  const acum = new Date()
  return `${acum.getFullYear()}-${String(acum.getMonth() + 1).padStart(2, '0')}-${String(acum.getDate()).padStart(2, '0')}`
}

export function FormularPublic({
  restaurant,
  campuri,
  zoneId,
  slug,
  previzualizare = false,
  onTrimis,
}: {
  restaurant: RestaurantPublic
  campuri: CampFormularPublic[]
  zoneId?: string | null
  slug: string
  previzualizare?: boolean
  onTrimis?: (rezultat: RezultatRezervare) => void
}) {
  const notificari = useNotificari()
  const fus = restaurant.fus_orar ?? 'Europe/Bucharest'

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
      campuriCustom: {},
    },
  })

  const campuriRestaurant = useMemo(() => campuriProprii(campuri), [campuri])

  /**
   * Campul de sistem Email asculta de Form Builder (§27): vederea publica
   * filtreaza campurile inactive, iar creeaza_restaurant seamana randul
   * 'email' pentru fiecare restaurant — deci absenta lui aici inseamna exact
   * „dezactivat de manager", nu „nu a existat niciodata".
   */
  const campEmail = useMemo(() => campuri.find((c) => c.cheie === 'email'), [campuri])

  // useWatch, nu watch(): watch() intoarce o functie nememoizabila si
  // dezactiveaza compilarea componentei.
  const dataAleasa = useWatch({ control: form.control, name: 'data' })

  const program = useMemo(() => {
    // Ziua aleasa e o data calendaristica; o interpretam la pranz ca sa nu cada
    // in ziua vecina din cauza fusului.
    const zi = new Date(`${dataAleasa}T12:00:00`)
    if (Number.isNaN(zi.getTime())) return null
    return { zi, interval: programZilei(zi, restaurant.program_standard, fus) }
  }, [restaurant.program_standard, dataAleasa, fus])

  const trimite = useMutation({
    mutationFn: trimiteCerereRezervare,
    onSuccess: (date) => onTrimis?.(date),
    onError: (eroare) => notificari.eroare(eroare),
  })

  async function laTrimitere(valori: FormWidget) {
    if (previzualizare) return

    const dataOra = new Date(`${valori.data}T${valori.ora}:00`)
    if (Number.isNaN(dataOra.getTime())) {
      form.setError('ora', { message: 'Data sau ora nu sunt valide.' })
      return
    }

    // Emailul devine obligatoriu doar daca managerul l-a marcat asa in builder.
    if (campEmail?.obligatoriu && (valori.email ?? '').trim() === '') {
      form.setError('email', {
        message: `${campEmail.eticheta ?? 'Email'} este obligatoriu.`,
      })
      return
    }

    // Obligatoriile proprii ale restaurantului: baza le refuza oricum, dar
    // atunci omul ar afla-o abia dupa ce trimite tot formularul.
    for (const camp of campuriRestaurant) {
      if (!camp.obligatoriu || !camp.cheie) continue
      if ((valori.campuriCustom?.[camp.cheie] ?? '').trim() !== '') continue
      form.setError(`campuriCustom.${camp.cheie}`, {
        message: `${camp.eticheta ?? 'Câmpul'} este obligatoriu.`,
      })
      return
    }

    await trimite.mutateAsync({
      slug,
      clientNume: valori.clientNume,
      telefon: valori.telefon,
      nrPersoane: valori.nrPersoane,
      dataOra,
      zoneId: zoneId ?? null,
      email: valori.email || null,
      noteClient: valori.noteClient || null,
      gdpr: valori.gdpr,
      campuriCustom: valori.campuriCustom ?? {},
    })
  }

  return (
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
            ? `${formatFus(program.zi, 'EEEE', fus)}: deschis între ${String(
                Math.floor(program.interval.deLa),
              ).padStart(2, '0')}:00 și ${String(
                Math.floor(program.interval.panaLa) % 24,
              ).padStart(2, '0')}:00`
            : `${formatFus(program.zi, 'EEEE', fus)}: închis`}
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

      {campEmail && (
        <CampText
          eticheta={`${campEmail.eticheta ?? 'Email'}${campEmail.obligatoriu ? '' : ' (opțional)'}`}
          type="email"
          autoComplete="email"
          eroare={form.formState.errors.email?.message}
          {...form.register('email')}
        />
      )}

      {campuriRestaurant.map((camp) => (
        <CampProprii
          key={camp.cheie}
          camp={camp}
          form={form}
          eroare={camp.cheie ? form.formState.errors.campuriCustom?.[camp.cheie]?.message : undefined}
        />
      ))}

      <div className="grid gap-1.5">
        <Label htmlFor="noteClient">Preferințe (opțional)</Label>
        <Textarea
          id="noteClient"
          rows={2}
          placeholder="Masă la fereastră, scaun pentru copil, aniversare..."
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
            Accept ca datele mele să fie folosite pentru gestionarea rezervării.
          </Label>
        </div>
        {form.formState.errors.gdpr && (
          <p className="text-xs font-medium text-destructive">
            {form.formState.errors.gdpr.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={trimite.isPending || previzualizare}>
        {trimite.isPending && <Loader2Icon className="animate-spin" />}
        {previzualizare ? 'Trimite rezervarea (previzualizare)' : 'Trimite rezervarea'}
      </Button>
    </form>
  )
}

function CampProprii({
  camp,
  form,
  eroare,
}: {
  camp: CampFormularPublic
  form: ReturnType<typeof useForm<FormWidget>>
  eroare?: string
}) {
  if (!camp.cheie) return null
  const nume = `campuriCustom.${camp.cheie}` as const
  const id = `camp-${camp.cheie}`
  const eticheta = `${camp.eticheta ?? camp.cheie}${camp.obligatoriu ? '' : ' (opțional)'}`
  const optiuni = Array.isArray(camp.optiuni) ? (camp.optiuni as string[]) : []

  if (camp.tip === 'checkbox') {
    return (
      <div className="grid gap-1.5">
        <div className="flex items-start gap-2">
          <Controller
            control={form.control}
            name={nume}
            render={({ field }) => (
              <Checkbox
                id={id}
                checked={field.value === 'da'}
                onCheckedChange={(bifat) => field.onChange(bifat ? 'da' : '')}
              />
            )}
          />
          <Label htmlFor={id} className="text-sm leading-snug font-normal">
            {eticheta}
          </Label>
        </div>
        {eroare && <p className="text-xs text-destructive">{eroare}</p>}
      </div>
    )
  }

  if (camp.tip === 'dropdown') {
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={id}>{eticheta}</Label>
        <select
          id={id}
          className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          {...form.register(nume)}
        >
          <option value="">Alege...</option>
          {optiuni.map((optiune) => (
            <option key={optiune} value={optiune}>
              {optiune}
            </option>
          ))}
        </select>
        {eroare && <p className="text-xs text-destructive">{eroare}</p>}
      </div>
    )
  }

  return (
    <CampText
      eticheta={eticheta}
      type={camp.tip === 'numar' ? 'number' : 'text'}
      placeholder={camp.placeholder ?? undefined}
      eroare={eroare}
      {...form.register(nume)}
    />
  )
}
