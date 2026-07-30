import { useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2Icon } from 'lucide-react'
import { z } from 'zod'

import { CampText } from '@/components/formular/CampText'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useDisponibilitate } from '@/hooks/useMese'
import { useNotificari } from '@/hooks/useNotificari'
import { useMutatiiRezervari } from '@/hooks/useRezervari'
import { formatFus, instantDinZiSiOra } from '@/lib/timp'
import { numeSchema, telefonSchema } from '@/lib/validari'
import type { Zona } from '@/services/mese'

const DURATE = [
  { valoare: '0', eticheta: 'Implicita (setarea restaurantului)' },
  { valoare: '90', eticheta: '1 h 30' },
  { valoare: '120', eticheta: '2 h' },
  { valoare: '150', eticheta: '2 h 30' },
  { valoare: '180', eticheta: '3 h' },
]

/**
 * Telefonul e obligatoriu peste tot, MAI PUTIN la walk-in (§25.6): oaspetele e
 * deja in sala, deci nu e nimic de anuntat. Regula e impusa si de baza, printr-un
 * CHECK — aici doar nu blocam formularul degeaba.
 *
 * Schema se construieste in functie de mod, nu se relaxeaza global: o rezervare
 * fara telefon ar fi refuzata oricum de baza, dar utilizatorul ar afla-o abia
 * dupa ce completeaza tot restul.
 */
function schemaPentru(walkIn: boolean) {
  return z.object({
    clientNume: numeSchema,
    telefon: walkIn
      ? z.string().refine(
          (valoare) => valoare.trim() === '' || telefonSchema.safeParse(valoare).success,
          'Numarul de telefon nu pare valid (ex: 0722123456).',
        )
      : telefonSchema,
    nrPersoane: z.number().int().min(1, 'Minim 1 persoana.').max(200),
    oraText: z.string().regex(/^\d{2}:\d{2}$/, 'Format ora: HH:MM'),
    durata: z.string(),
    zoneId: z.string(),
    tableId: z.string(),
    noteInterne: z.string().max(500).optional(),
  })
}

type FormRezervare = z.infer<ReturnType<typeof schemaPentru>>

const FARA_MASA = 'fara-masa'

type Props = {
  deschis: boolean
  onDeschisChange: (deschis: boolean) => void
  restaurantId: string
  fus: string
  zone: Zona[]
  /** Ziua (locala) pentru care se creeaza rezervarea. */
  zi: Date
  oraImplicita: string
  /** Walk-in: clientul e deja in local, deci rezervarea se creeaza "sosita". */
  walkIn?: boolean
  /** Preselectie venita din harta 2D: masa pe care a dat click personalul. */
  zoneIdImplicit?: string
  tableIdImplicit?: string
}

export function DialogRezervare({
  deschis,
  onDeschisChange,
  restaurantId,
  fus,
  zone,
  zi,
  oraImplicita,
  walkIn = false,
  zoneIdImplicit,
  tableIdImplicit,
}: Props) {
  const notificari = useNotificari()
  const { creeaza } = useMutatiiRezervari(restaurantId)

  const form = useForm<FormRezervare>({
    // walkIn nu se schimba cat timp dialogul e montat (parintele il remonteaza
    // cu key), deci schema poate fi construita o singura data.
    resolver: zodResolver(useMemo(() => schemaPentru(walkIn), [walkIn])),
    // Dialogul e montat doar cat e deschis (cu key din parinte), deci
    // defaultValues sunt mereu proaspete — fara efecte de resincronizare.
    defaultValues: {
      clientNume: '',
      telefon: '',
      nrPersoane: 2,
      oraText: oraImplicita,
      durata: '0',
      zoneId: zoneIdImplicit ?? zone[0]?.id ?? '',
      tableId: tableIdImplicit ?? FARA_MASA,
      noteInterne: '',
    },
  })

  const zoneId = useWatch({ control: form.control, name: 'zoneId' })
  const oraText = useWatch({ control: form.control, name: 'oraText' })
  const durata = useWatch({ control: form.control, name: 'durata' })

  const instant = useMemo(() => {
    if (!/^\d{2}:\d{2}$/.test(oraText ?? '')) return null
    return instantDinZiSiOra(zi, oraText, fus)
  }, [zi, oraText, fus])

  const disponibilitate = useDisponibilitate(
    deschis ? restaurantId : undefined,
    zoneId || null,
    instant,
    Number(durata) || undefined,
  )

  async function trimite(valori: FormRezervare) {
    if (!instant) return
    try {
      await creeaza.mutateAsync({
        clientNume: valori.clientNume,
        // Sirul gol devine null: altfel am scrie "" in loc de "fara telefon",
        // iar CHECK-ul din baza l-ar accepta ca valoare prezenta.
        telefon: valori.telefon.trim() || null,
        nrPersoane: valori.nrPersoane,
        dataOra: instant,
        zoneId: valori.zoneId || null,
        tableId: valori.tableId === FARA_MASA ? null : valori.tableId,
        durataMinute: Number(valori.durata) || null,
        status: walkIn ? 'sosita' : 'confirmata',
        sursa: walkIn ? 'walk_in' : 'manual',
        noteInterne: valori.noteInterne || null,
      })
      notificari.succes(walkIn ? 'Walk-in inregistrat.' : 'Rezervare creata.')
      form.reset()
      onDeschisChange(false)
    } catch (eroare) {
      notificari.eroare(eroare)
    }
  }

  return (
    <Dialog open={deschis} onOpenChange={onDeschisChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{walkIn ? 'Walk-in' : 'Rezervare noua'}</DialogTitle>
          <DialogDescription>
            {walkIn
              ? 'Client sosit fara rezervare. Se inregistreaza direct ca sosit.'
              : formatFus(zi, 'EEEE, d MMMM yyyy', fus)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(trimite)} noValidate className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <CampText
              eticheta="Nume client"
              autoComplete="off"
              eroare={form.formState.errors.clientNume?.message}
              {...form.register('clientNume')}
            />
            <CampText
              eticheta={walkIn ? 'Telefon (optional)' : 'Telefon'}
              type="tel"
              placeholder="0722123456"
              ajutor={
                walkIn
                  ? 'Fara numar, oaspetele nu intra in CRM — nu inventa unul.'
                  : 'Identifica unic clientul in CRM.'
              }
              eroare={form.formState.errors.telefon?.message}
              {...form.register('telefon')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <CampText
              eticheta="Persoane"
              type="number"
              min={1}
              max={200}
              eroare={form.formState.errors.nrPersoane?.message}
              {...form.register('nrPersoane', { valueAsNumber: true })}
            />
            <CampText
              eticheta="Ora"
              type="time"
              eroare={form.formState.errors.oraText?.message}
              {...form.register('oraText')}
            />
            <div className="grid gap-1.5">
              <Label htmlFor="durata">Durata</Label>
              <Controller
                control={form.control}
                name="durata"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="durata" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATE.map((d) => (
                        <SelectItem key={d.valoare} value={d.valoare}>
                          {d.eticheta}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="zona">Zona</Label>
              <Controller
                control={form.control}
                name="zoneId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(valoare) => {
                      field.onChange(valoare)
                      // Masa aleasa nu mai are sens intr-o alta zona.
                      form.setValue('tableId', FARA_MASA)
                    }}
                  >
                    <SelectTrigger id="zona" className="w-full">
                      <SelectValue placeholder="Alege zona" />
                    </SelectTrigger>
                    <SelectContent>
                      {zone.map((z) => (
                        <SelectItem key={z.id} value={z.id}>
                          {z.nume}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="masa">Masa</Label>
              <Controller
                control={form.control}
                name="tableId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="masa" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FARA_MASA}>Fara masa (se aloca ulterior)</SelectItem>
                      {(disponibilitate.data ?? []).map((masa) => (
                        <SelectItem key={masa.table_id} value={masa.table_id} disabled={!masa.libera}>
                          Masa {masa.numar_masa} · {masa.capacitate} loc.
                          {masa.libera ? '' : ' — ocupata'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                {disponibilitate.isFetching
                  ? 'Se verifica disponibilitatea...'
                  : `${(disponibilitate.data ?? []).filter((m) => m.libera).length} mese libere la ora aleasa`}
              </p>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="noteInterne">Note interne</Label>
            <Textarea
              id="noteInterne"
              rows={2}
              placeholder="Vizibile doar personalului."
              {...form.register('noteInterne')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onDeschisChange(false)}>
              Renunta
            </Button>
            <Button type="submit" disabled={creeaza.isPending}>
              {creeaza.isPending && <Loader2Icon className="animate-spin" />}
              {walkIn ? 'Inregistreaza walk-in' : 'Creeaza rezervarea'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
