import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownIcon, ArrowUpIcon, ClockIcon, PlusIcon } from 'lucide-react'

import { DialogRezervare } from '@/components/rezervari/DialogRezervare'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useNotificari } from '@/hooks/useNotificari'
import { CHEI_MESE, getZone } from '@/services/mese'
import { CHEI_REZERVARI } from '@/services/rezervari'
import {
  CHEI_ASTEPTARE,
  adaugaInAsteptare,
  getListaAsteptare,
  schimbaPozitii,
  schimbaStatusAsteptare,
  type IntrareAsteptare,
} from '@/services/lista-asteptare'

const FARA_ZONA = 'fara-zona'

/** De cat timp asteapta, in minute, calculat la randare. */
function minuteDeAsteptare(creatLa: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(creatLa).getTime()) / 60000))
}

/**
 * Lista de asteptare (§25) — instrument de intrare, nu de planificare: aici
 * ajung oaspetii care au venit fara rezervare cand nu era masa libera.
 *
 * "Asaza" nu marcheaza doar intrarea ca rezolvata: deschide dialogul de
 * walk-in precompletat, fiindca oaspetele TREBUIE sa ajunga si in rezervari —
 * altfel masa lui apare libera pe harta si poate fi data altcuiva.
 */
export function ListaAsteptarePage() {
  const { profil } = useAuth()
  const notificari = useNotificari()
  const queryClient = useQueryClient()

  const restaurantId = profil?.tip === 'admin' ? profil.restaurant.id : ''
  const fus = profil?.tip === 'admin' ? profil.restaurant.fus_orar : 'Europe/Bucharest'

  const [nume, setNume] = useState('')
  const [telefon, setTelefon] = useState('')
  const [nrPersoane, setNrPersoane] = useState('2')
  const [zoneId, setZoneId] = useState(FARA_ZONA)
  const [timpEstimat, setTimpEstimat] = useState('')
  const [deAsezat, setDeAsezat] = useState<IntrareAsteptare | null>(null)

  const lista = useQuery({
    queryKey: CHEI_ASTEPTARE.lista(restaurantId),
    queryFn: () => getListaAsteptare(restaurantId),
    enabled: Boolean(restaurantId),
    // Cat asteapta fiecare se schimba singur; reimprospatam ca sa nu ramana
    // un "acum 3 min" inghetat pe ecranul de la intrare.
    refetchInterval: 60_000,
  })

  const zone = useQuery({
    queryKey: CHEI_MESE.zone(restaurantId),
    queryFn: () => getZone(restaurantId),
    enabled: Boolean(restaurantId),
  })

  function reincarca() {
    void queryClient.invalidateQueries({ queryKey: CHEI_ASTEPTARE.lista(restaurantId) })
  }

  const adauga = useMutation({
    mutationFn: adaugaInAsteptare,
    onSuccess: () => {
      notificari.succes('Adaugat in lista de asteptare.')
      setNume('')
      setTelefon('')
      setNrPersoane('2')
      setTimpEstimat('')
      reincarca()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const schimbaStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'asezat' | 'plecat' }) =>
      schimbaStatusAsteptare(id, status),
    onSuccess: reincarca,
    onError: (eroare) => notificari.eroare(eroare),
  })

  const reordoneaza = useMutation({
    mutationFn: ({ a, b }: { a: IntrareAsteptare; b: IntrareAsteptare }) =>
      schimbaPozitii({ id: a.id, pozitie: a.pozitie }, { id: b.id, pozitie: b.pozitie }),
    onSuccess: reincarca,
    onError: (eroare) => notificari.eroare(eroare),
  })

  const intrari = lista.data ?? []
  const potAdauga = nume.trim().length >= 2 && Number(nrPersoane) > 0 && !adauga.isPending

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Lista de asteptare</h1>
        <p className="text-sm text-muted-foreground">
          Oaspetii veniti fara rezervare, cand nu e masa libera.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adauga in lista</CardTitle>
          <CardDescription>
            Telefonul e optional — cine il lasa poate fi anuntat cand se elibereaza o masa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_10rem_6rem_10rem_auto] sm:items-end"
            onSubmit={(eveniment) => {
              eveniment.preventDefault()
              if (!potAdauga) return
              adauga.mutate({
                restaurantId,
                nume,
                telefon,
                nrPersoane: Number(nrPersoane),
                zoneId: zoneId === FARA_ZONA ? null : zoneId,
                timpEstimatMin: timpEstimat ? Number(timpEstimat) : null,
              })
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="asteptare-nume">Nume</Label>
              <Input
                id="asteptare-nume"
                value={nume}
                onChange={(e) => setNume(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="asteptare-telefon">Telefon</Label>
              <Input
                id="asteptare-telefon"
                type="tel"
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                placeholder="optional"
                className="h-9"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="asteptare-persoane">Persoane</Label>
              <Input
                id="asteptare-persoane"
                type="number"
                min={1}
                max={200}
                value={nrPersoane}
                onChange={(e) => setNrPersoane(e.target.value)}
                className="h-9 tabular-nums"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="asteptare-zona">Zona preferata</Label>
              <Select value={zoneId} onValueChange={setZoneId}>
                <SelectTrigger id="asteptare-zona" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FARA_ZONA}>Oricare</SelectItem>
                  {(zone.data ?? []).map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.nume}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={!potAdauga}>
              <PlusIcon />
              Adauga
            </Button>
          </form>
        </CardContent>
      </Card>

      {lista.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : intrari.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Nimeni in asteptare.
        </p>
      ) : (
        <ul className="grid gap-2">
          {intrari.map((intrare, indice) => {
            const asteapta = minuteDeAsteptare(intrare.created_at)
            const peste = intrare.timp_asteptare_estimat_min !== null &&
              asteapta > intrare.timp_asteptare_estimat_min

            return (
              <li
                key={intrare.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground tabular-nums">
                  {indice + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {intrare.nume}
                    <span className="ml-2 font-normal text-muted-foreground">
                      {intrare.nr_persoane} pers.
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {intrare.telefon ?? 'fara telefon'}
                    {' · '}
                    <span className={peste ? 'font-medium text-destructive' : undefined}>
                      asteapta de {asteapta} min
                    </span>
                    {intrare.timp_asteptare_estimat_min !== null &&
                      ` (estimat ${intrare.timp_asteptare_estimat_min} min)`}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Mut ${intrare.nume} mai sus`}
                    disabled={indice === 0 || reordoneaza.isPending}
                    onClick={() => reordoneaza.mutate({ a: intrare, b: intrari[indice - 1] })}
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Mut ${intrare.nume} mai jos`}
                    disabled={indice === intrari.length - 1 || reordoneaza.isPending}
                    onClick={() => reordoneaza.mutate({ a: intrare, b: intrari[indice + 1] })}
                  >
                    <ArrowDownIcon />
                  </Button>
                  <Button size="xs" onClick={() => setDeAsezat(intrare)}>
                    Asaza
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => schimbaStatus.mutate({ id: intrare.id, status: 'plecat' })}
                  >
                    A plecat
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ClockIcon className="size-3.5" />
        „Asaza" deschide walk-in-ul precompletat: oaspetele trebuie sa ajunga si in rezervari,
        altfel masa lui apare libera pe harta.
      </p>

      {deAsezat && (
        <DialogRezervare
          // key: dialogul se remonteaza pentru fiecare oaspete, deci
          // precompletarea e mereu a celui potrivit.
          key={deAsezat.id}
          deschis
          onDeschisChange={(deschis) => !deschis && setDeAsezat(null)}
          restaurantId={restaurantId}
          fus={fus}
          zone={zone.data ?? []}
          zi={new Date()}
          oraImplicita={new Date().toTimeString().slice(0, 5)}
          walkIn
          zoneIdImplicit={deAsezat.zone_id ?? undefined}
          clientImplicit={{
            nume: deAsezat.nume,
            telefon: deAsezat.telefon,
            nrPersoane: deAsezat.nr_persoane,
          }}
          onCreat={() => {
            // Abia dupa ce walk-in-ul chiar exista scoatem oaspetele din coada.
            schimbaStatus.mutate({ id: deAsezat.id, status: 'asezat' })
            setDeAsezat(null)
            void queryClient.invalidateQueries({ queryKey: CHEI_REZERVARI.toate(restaurantId) })
          }}
        />
      )}
    </div>
  )
}
