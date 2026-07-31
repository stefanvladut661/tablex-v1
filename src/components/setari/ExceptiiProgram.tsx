import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, Trash2Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useNotificari } from '@/hooks/useNotificari'
import { formatFus } from '@/lib/timp'
import {
  CHEI_EXCEPTII,
  getExceptii,
  salveazaExceptie,
  stergeExceptie,
} from '@/services/exceptii-program'

/**
 * Excepțiile de program (§30.2) — zile in care restaurantul e inchis sau are
 * alt orar decat cel saptamanal.
 *
 * Sectiunea are queries si mutatii PROPRII, separate de formularul paginii de
 * setari: o lista in care adaugi un rand si nu se intampla nimic pana apesi
 * "Salveaza" jos, la capatul paginii, e derutanta. Aici fiecare operatie se
 * aplica imediat.
 *
 * Regula nu se aplica in interfata: `este_deschis` din baza verifica intai
 * exceptia zilei, iar `rezerva_public` o apeleaza inainte sa accepte orice
 * cerere. Widgetul doar reflecta ce baza refuza oricum.
 */
export function ExceptiiProgram({ restaurantId, fus }: { restaurantId: string; fus: string }) {
  const notificari = useNotificari()
  const queryClient = useQueryClient()

  const [data, setData] = useState('')
  const [inchis, setInchis] = useState(true)
  const [deLa, setDeLa] = useState('10:00')
  const [panaLa, setPanaLa] = useState('23:00')
  const [motiv, setMotiv] = useState('')

  const exceptii = useQuery({
    queryKey: CHEI_EXCEPTII.lista(restaurantId),
    queryFn: () => getExceptii(restaurantId),
    enabled: Boolean(restaurantId),
  })

  function reincarca() {
    void queryClient.invalidateQueries({ queryKey: CHEI_EXCEPTII.lista(restaurantId) })
  }

  const salveaza = useMutation({
    mutationFn: salveazaExceptie,
    onSuccess: () => {
      notificari.succes('Excepție salvata.')
      setData('')
      setMotiv('')
      reincarca()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const sterge = useMutation({
    mutationFn: stergeExceptie,
    onSuccess: () => {
      notificari.succes('Excepție stearsa.')
      reincarca()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const azi = new Date().toISOString().slice(0, 10)

  // Trecutul nu mai poate fi schimbat, dar il aratam separat: personalul vrea
  // sa vada de ce n-au existat rezervari intr-o zi anume.
  const { viitoare, trecute } = useMemo(() => {
    const toate = exceptii.data ?? []
    return {
      viitoare: toate.filter((e) => e.data >= azi),
      trecute: toate.filter((e) => e.data < azi),
    }
  }, [exceptii.data, azi])

  const oreValide = inchis || (deLa < panaLa)
  const potSalva = data !== '' && oreValide && !salveaza.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Zile speciale</CardTitle>
        <CardDescription>
          Sarbatori, vacanta sau un orar diferit intr-o zi anume. Au prioritate fata de programul
          saptamanal, iar widgetul refuza rezervarile pe baza lor.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        <form
          className="grid gap-3 rounded-lg border border-border p-3"
          onSubmit={(eveniment) => {
            eveniment.preventDefault()
            if (!potSalva) return
            salveaza.mutate({
              restaurantId,
              data,
              inchis,
              oraDeschidere: deLa,
              oraInchidere: panaLa,
              motiv,
            })
          }}
        >
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <div className="grid gap-1.5">
              <Label htmlFor="exceptie-data">Data</Label>
              <Input
                id="exceptie-data"
                type="date"
                value={data}
                min={azi}
                onChange={(e) => setData(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="exceptie-motiv">Motiv (optional)</Label>
              <Input
                id="exceptie-motiv"
                value={motiv}
                onChange={(e) => setMotiv(e.target.value)}
                placeholder="Craciun, inventar, eveniment privat..."
                className="h-9"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <Label htmlFor="exceptie-inchis" className="font-normal">
                Inchis toata ziua
              </Label>
              <Switch id="exceptie-inchis" checked={inchis} onCheckedChange={setInchis} />
            </div>

            {!inchis && (
              <div className="flex items-end gap-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="exceptie-de-la">De la</Label>
                  <Input
                    id="exceptie-de-la"
                    type="time"
                    value={deLa}
                    onChange={(e) => setDeLa(e.target.value)}
                    className="h-9 w-28"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="exceptie-pana-la">Pana la</Label>
                  <Input
                    id="exceptie-pana-la"
                    type="time"
                    value={panaLa}
                    onChange={(e) => setPanaLa(e.target.value)}
                    className="h-9 w-28"
                  />
                </div>
              </div>
            )}

            <Button type="submit" size="sm" disabled={!potSalva}>
              <PlusIcon />
              Adauga
            </Button>
          </div>

          {!oreValide && (
            <p className="text-xs text-destructive">
              Ora de inchidere trebuie sa fie dupa cea de deschidere.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            O a doua excepție pentru aceeasi zi o inlocuieste pe prima.
          </p>
        </form>

        {exceptii.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : viitoare.length === 0 && trecute.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nicio zi speciala. Programul saptamanal se aplica in fiecare zi.
          </p>
        ) : (
          <div className="grid gap-3">
            {viitoare.length > 0 && (
              <ListaExceptii
                titlu="Urmeaza"
                exceptii={viitoare}
                fus={fus}
                onSterge={(id) => sterge.mutate(id)}
              />
            )}
            {trecute.length > 0 && (
              <ListaExceptii
                titlu="Trecute"
                exceptii={trecute.slice(-5).reverse()}
                fus={fus}
                estompat
                onSterge={(id) => sterge.mutate(id)}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ListaExceptii({
  titlu,
  exceptii,
  fus,
  estompat = false,
  onSterge,
}: {
  titlu: string
  exceptii: Array<{
    id: string
    data: string
    inchis: boolean
    ora_deschidere: string | null
    ora_inchidere: string | null
    motiv: string | null
  }>
  fus: string
  estompat?: boolean
  onSterge: (id: string) => void
}) {
  return (
    <div className="grid gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">{titlu}</p>
      <ul className={`grid gap-1.5 ${estompat ? 'opacity-60' : ''}`}>
        {exceptii.map((exceptie) => (
          <li
            key={exceptie.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <span className="font-medium tabular-nums">
                {/* Data e o zi calendaristica (coloana `date`), nu un instant:
                    o formatam la pranz ca sa nu alunece intr-o alta zi. */}
                {formatFus(`${exceptie.data}T12:00:00`, 'EEEE, d MMMM yyyy', fus)}
              </span>
              <span className="ml-2 text-muted-foreground">
                {exceptie.inchis
                  ? 'Inchis'
                  : `${exceptie.ora_deschidere?.slice(0, 5)}–${exceptie.ora_inchidere?.slice(0, 5)}`}
              </span>
              {exceptie.motiv && (
                <div className="truncate text-xs text-muted-foreground">{exceptie.motiv}</div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Sterge excepția din ${exceptie.data}`}
              onClick={() => onSterge(exceptie.id)}
            >
              <Trash2Icon />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
