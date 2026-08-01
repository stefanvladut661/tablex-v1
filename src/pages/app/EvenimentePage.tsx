import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, QrCodeIcon, TicketIcon } from 'lucide-react'

import { ScanerBilet } from '@/components/evenimente/ScanerBilet'
import { WizardEveniment } from '@/components/evenimente/WizardEveniment'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useMese, useZone } from '@/hooks/useMese'
import { useNotificari } from '@/hooks/useNotificari'
import { formatFus } from '@/lib/timp'
import {
  CHEI_EVENIMENTE,
  actualizeazaEveniment,
  emiteBilet,
  getBilete,
  getCapacitate,
  getEvenimente,
  schimbaPlataBilet,
  type Eveniment,
} from '@/services/evenimente'

const ETICHETE_STATUS: Record<string, string> = {
  draft: 'Ciorna',
  publicat: 'Publicat',
  anulat: 'Anulat',
  incheiat: 'Incheiat',
}

/**
 * Evenimente & Bilete (§8.5, §29).
 *
 * Accesibila ospatarului la fel ca managerului (§29.7 — exceptie explicita de
 * la matricea de permisiuni): el vinde biletele la usa si le scaneaza.
 *
 * Plata ramane demonstrativa (§14): butonul „Marcheaza platit" tine locul
 * incasarii reale. Consecinta e insa adevarata — abia atunci se blocheaza masa.
 */
export function EvenimentePage() {
  const { profil } = useAuth()
  const restaurant = profil?.tip === 'admin' ? profil.restaurant : null
  const fus = restaurant?.fus_orar ?? 'Europe/Bucharest'

  const [wizard, setWizard] = useState(false)
  const [selectat, setSelectat] = useState<Eveniment | null>(null)
  const [scaner, setScaner] = useState(false)

  const evenimente = useQuery({
    queryKey: CHEI_EVENIMENTE.lista(restaurant?.id ?? ''),
    queryFn: () => getEvenimente(restaurant!.id),
    enabled: Boolean(restaurant),
  })

  const zone = useZone(restaurant?.id)
  const mese = useMese(restaurant?.id)

  if (!restaurant) return null

  return (
    <div className="grid gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Evenimente</h1>
          <p className="text-sm text-muted-foreground">
            Seri speciale cu bilet pe masa. Locul se blocheaza doar la plata.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setScaner(true)}>
            <QrCodeIcon />
            Scaneaza bilet
          </Button>
          <Button size="sm" onClick={() => setWizard(true)}>
            <PlusIcon />
            Eveniment nou
          </Button>
        </div>
      </div>

      {evenimente.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (evenimente.data ?? []).length === 0 ? (
        <div className="grid justify-items-start gap-2 rounded-lg border border-border bg-card p-6">
          <p className="text-sm font-medium">Niciun eveniment inca.</p>
          <p className="text-sm text-muted-foreground">
            Un eveniment iti lasa sa vinzi mese pentru o seara anume, cu pret pe zona si bilet cu
            cod la intrare.
          </p>
          <Button size="sm" onClick={() => setWizard(true)}>
            <PlusIcon />
            Creeaza primul eveniment
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(evenimente.data ?? []).map((eveniment) => (
            <CardEveniment
              key={eveniment.id}
              eveniment={eveniment}
              fus={fus}
              onDeschide={() => setSelectat(eveniment)}
            />
          ))}
        </div>
      )}

      {wizard && (
        <WizardEveniment
          restaurantId={restaurant.id}
          zone={zone.data ?? []}
          mese={mese.data ?? []}
          onInchide={() => setWizard(false)}
        />
      )}

      {scaner && <ScanerBilet onInchide={() => setScaner(false)} />}

      {selectat && (
        <PanouEveniment
          eveniment={selectat}
          fus={fus}
          restaurantId={restaurant.id}
          onInchide={() => setSelectat(null)}
        />
      )}
    </div>
  )
}

function CardEveniment({
  eveniment,
  fus,
  onDeschide,
}: {
  eveniment: Eveniment
  fus: string
  onDeschide: () => void
}) {
  const bilete = useQuery({
    queryKey: CHEI_EVENIMENTE.bilete(eveniment.id),
    queryFn: () => getBilete(eveniment.id),
  })
  const capacitate = useQuery({
    queryKey: ['capacitate', eveniment.id],
    queryFn: () => getCapacitate(eveniment.id),
  })

  const vandute = (bilete.data ?? []).filter((b) => b.status_plata === 'platit').length

  return (
    <Card className="cursor-pointer transition-colors hover:border-primary" onClick={onDeschide}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-start justify-between gap-2 text-base">
          <span className="min-w-0 truncate">{eveniment.nume}</span>
          <Badge variant={eveniment.status === 'publicat' ? 'default' : 'secondary'}>
            {ETICHETE_STATUS[eveniment.status]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-1">
        <p className="text-sm tabular-nums">
          {formatFus(eveniment.data_ora, 'EEEE, d MMMM yyyy · HH:mm', fus)}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <TicketIcon className="size-3.5" />
          <span className="tabular-nums">
            {vandute} bilete platite din {capacitate.data ?? 0} locuri
          </span>
        </p>
      </CardContent>
    </Card>
  )
}

/** Detaliul unui eveniment: publicare, bilete vandute, emitere (§29.5). */
function PanouEveniment({
  eveniment,
  fus,
  restaurantId,
  onInchide,
}: {
  eveniment: Eveniment
  fus: string
  restaurantId: string
  onInchide: () => void
}) {
  const notificari = useNotificari()
  const queryClient = useQueryClient()
  const [nume, setNume] = useState('')
  const [pret, setPret] = useState('')

  const bilete = useQuery({
    queryKey: CHEI_EVENIMENTE.bilete(eveniment.id),
    queryFn: () => getBilete(eveniment.id),
  })

  const reincarca = () => {
    void queryClient.invalidateQueries({ queryKey: CHEI_EVENIMENTE.bilete(eveniment.id) })
    void queryClient.invalidateQueries({ queryKey: CHEI_EVENIMENTE.lista(restaurantId) })
  }

  const publica = useMutation({
    mutationFn: (status: 'draft' | 'publicat') => actualizeazaEveniment(eveniment.id, { status }),
    onSuccess: () => {
      notificari.succes('Statusul evenimentului a fost schimbat.')
      reincarca()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const adaugaBilet = useMutation({
    mutationFn: () =>
      emiteBilet({
        restaurant_id: restaurantId,
        event_id: eveniment.id,
        client_nume: nume.trim(),
        pret_eur: Number(pret) || 0,
      }),
    onSuccess: (bilet) => {
      notificari.succes(`Bilet emis: ${bilet.cod}`, {
        descriere: 'Neplatit deocamdata — masa se blocheaza abia la plata.',
      })
      setNume('')
      setPret('')
      reincarca()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const plateste = useMutation({
    mutationFn: (id: string) => schimbaPlataBilet(id, 'platit'),
    onSuccess: () => {
      notificari.succes('Bilet marcat ca platit. Masa e acum blocata.')
      reincarca()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  return (
    <Sheet open onOpenChange={(deschis) => !deschis && onInchide()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{eveniment.nume}</SheetTitle>
          <SheetDescription>
            {formatFus(eveniment.data_ora, 'EEEE, d MMMM yyyy · HH:mm', fus)}
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-5 px-4 pb-6">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">
                {eveniment.status === 'publicat' ? 'Publicat' : 'Ciorna'}
              </p>
              <p className="text-xs text-muted-foreground">
                {eveniment.status === 'publicat'
                  ? 'Apare pe pagina de rezervari, daca anuntul e pornit.'
                  : 'Vizibil doar pentru personal.'}
              </p>
            </div>
            <Button
              size="xs"
              variant={eveniment.status === 'publicat' ? 'outline' : 'default'}
              disabled={publica.isPending}
              onClick={() => publica.mutate(eveniment.status === 'publicat' ? 'draft' : 'publicat')}
            >
              {eveniment.status === 'publicat' ? 'Retrage' : 'Publica'}
            </Button>
          </div>

          {/* §14: fara procesare reala. Biletul se emite si se marcheaza platit
              de mana, dar consecinta — blocarea mesei — e adevarata. */}
          <div className="grid gap-2 rounded-lg border border-dashed border-border p-3">
            <p className="text-sm font-medium">Emite un bilet</p>
            <p className="text-xs text-muted-foreground">
              Demonstrativ: plata online se activeaza mai tarziu. Masa se blocheaza cand marchezi
              biletul ca platit.
            </p>
            <div className="grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
              <div className="grid gap-1">
                <Label htmlFor="bilet-nume" className="text-xs">
                  Client
                </Label>
                <Input
                  id="bilet-nume"
                  value={nume}
                  onChange={(e) => setNume(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="bilet-pret" className="text-xs">
                  Pret (EUR)
                </Label>
                <Input
                  id="bilet-pret"
                  type="number"
                  min={0}
                  value={pret}
                  onChange={(e) => setPret(e.target.value)}
                  className="h-8"
                />
              </div>
              <Button
                size="sm"
                className="self-end"
                disabled={nume.trim().length < 2 || adaugaBilet.isPending}
                onClick={() => adaugaBilet.mutate()}
              >
                Emite
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <p className="text-sm font-medium">Bilete</p>
            {bilete.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (bilete.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Niciun bilet emis inca.</p>
            ) : (
              <ul className="grid gap-1.5">
                {(bilete.data ?? []).map((bilet) => (
                  <li
                    key={bilet.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-2.5 py-2 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{bilet.client_nume}</span>
                      <span className="ml-2 font-mono text-xs tracking-wider text-muted-foreground">
                        {bilet.cod}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {bilet.pret_eur} EUR
                      </span>
                      {bilet.scanat_la ? (
                        <Badge variant="secondary">Scanat</Badge>
                      ) : bilet.status_plata === 'platit' ? (
                        <Badge>Platit</Badge>
                      ) : (
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={plateste.isPending}
                          onClick={() => plateste.mutate(bilet.id)}
                        >
                          Marcheaza platit
                        </Button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
