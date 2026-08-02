import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PencilIcon, PlusIcon, QrCodeIcon, TicketIcon } from 'lucide-react'

import { CodQR } from '@/components/evenimente/CodQR'
import { ScanerBilet } from '@/components/evenimente/ScanerBilet'
import { WizardEveniment } from '@/components/evenimente/WizardEveniment'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
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
  getMeseEveniment,
  schimbaPlataBilet,
  urcaAfis,
  type Bilet,
  type Eveniment,
} from '@/services/evenimente'
import type { MasaHarta } from '@/types/floor-plan'

const ETICHETE_STATUS: Record<string, string> = {
  draft: 'Ciornă',
  publicat: 'Publicat',
  anulat: 'Anulat',
  incheiat: 'Încheiat',
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
            Seri speciale cu bilet pe masă. Locul se blochează doar la plată.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setScaner(true)}>
            <QrCodeIcon />
            Scanează bilet
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
          <p className="text-sm font-medium">Niciun eveniment încă.</p>
          <p className="text-sm text-muted-foreground">
            Un eveniment îți lasă să vinzi mese pentru o seară anume, cu preț pe zonă și bilet cu
            cod la intrare.
          </p>
          <Button size="sm" onClick={() => setWizard(true)}>
            <PlusIcon />
            Creează primul eveniment
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
          fus={fus}
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
          mese={mese.data ?? []}
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
    <Card
      className="cursor-pointer overflow-hidden transition-colors hover:border-primary"
      onClick={onDeschide}
    >
      {/* §29.1 — cardul incepe cu afisul, cand exista. */}
      {eveniment.afis_url && (
        <img
          src={eveniment.afis_url}
          alt=""
          className="max-h-36 w-full object-cover"
        />
      )}
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
            {vandute} bilete plătite din {capacitate.data ?? 0} locuri
          </span>
        </p>
      </CardContent>
    </Card>
  )
}

/** Detaliul unui eveniment: publicare, editare, bilete vandute, emitere (§29.5). */
function PanouEveniment({
  eveniment,
  fus,
  restaurantId,
  mese,
  onInchide,
}: {
  eveniment: Eveniment
  fus: string
  restaurantId: string
  mese: MasaHarta[]
  onInchide: () => void
}) {
  const notificari = useNotificari()
  const queryClient = useQueryClient()
  const [nume, setNume] = useState('')
  const [pret, setPret] = useState('')
  const [masaAleasa, setMasaAleasa] = useState<string | null>(null)
  const [editare, setEditare] = useState(false)
  const [qrPentru, setQrPentru] = useState<Bilet | null>(null)

  const bilete = useQuery({
    queryKey: CHEI_EVENIMENTE.bilete(eveniment.id),
    queryFn: () => getBilete(eveniment.id),
  })

  // Mesele alocate evenimentului (pasul 2 din wizard): dintre ele se alege
  // masa biletului. Numerele vin din lista de mese a restaurantului.
  const meseEveniment = useQuery({
    queryKey: CHEI_EVENIMENTE.mese(eveniment.id),
    queryFn: () => getMeseEveniment(eveniment.id),
  })
  const numarMasa = (tableId: string | null) =>
    tableId ? (mese.find((m) => m.id === tableId)?.numar_masa ?? '?') : null

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
        // Masa biletului (§18.1): abia cu ea trigger-ul de blocare la plata
        // are ce bloca. Fara masa, biletul e doar o intrare.
        table_id: masaAleasa,
      }),
    onSuccess: (bilet) => {
      notificari.succes(`Bilet emis: ${bilet.cod}`, {
        descriere: 'Neplătit deocamdată — masa se blochează abia la plată.',
      })
      setNume('')
      setPret('')
      setMasaAleasa(null)
      reincarca()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const plateste = useMutation({
    mutationFn: (id: string) => schimbaPlataBilet(id, 'platit'),
    onSuccess: () => {
      notificari.succes('Bilet marcat ca plătit. Masa e acum blocată.')
      reincarca()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  return (
    <Sheet open onOpenChange={(deschis) => !deschis && onInchide()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between gap-2">
            {eveniment.nume}
            <Button variant="outline" size="xs" onClick={() => setEditare(true)}>
              <PencilIcon />
              Editează
            </Button>
          </SheetTitle>
          <SheetDescription>
            {formatFus(eveniment.data_ora, 'EEEE, d MMMM yyyy · HH:mm', fus)}
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-5 px-4 pb-6">
          {eveniment.afis_url && (
            <img
              src={eveniment.afis_url}
              alt={`Afișul evenimentului ${eveniment.nume}`}
              className="max-h-44 w-full rounded-lg border border-border object-cover"
            />
          )}
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">
                {eveniment.status === 'publicat' ? 'Publicat' : 'Ciornă'}
              </p>
              <p className="text-xs text-muted-foreground">
                {eveniment.status === 'publicat'
                  ? 'Apare pe pagina de rezervări, dacă anunțul e pornit.'
                  : 'Vizibil doar pentru personal.'}
              </p>
            </div>
            <Button
              size="xs"
              variant={eveniment.status === 'publicat' ? 'outline' : 'default'}
              disabled={publica.isPending}
              onClick={() => publica.mutate(eveniment.status === 'publicat' ? 'draft' : 'publicat')}
            >
              {eveniment.status === 'publicat' ? 'Retrage' : 'Publică'}
            </Button>
          </div>

          {/* §14: fara procesare reala. Biletul se emite si se marcheaza platit
              de mana, dar consecinta — blocarea mesei — e adevarata. */}
          <div className="grid gap-2 rounded-lg border border-dashed border-border p-3">
            <p className="text-sm font-medium">Emite un bilet</p>
            <p className="text-xs text-muted-foreground">
              Demonstrativ: plata online se activează mai târziu. Masa se blochează când marchezi
              biletul ca plătit.
            </p>
            <div className="grid gap-2 sm:grid-cols-[1fr_6rem_8rem_auto]">
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
                  Preț (EUR)
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
              <div className="grid gap-1">
                <Label htmlFor="bilet-masa" className="text-xs">
                  Masa
                </Label>
                <Select
                  value={masaAleasa ?? 'fara'}
                  onValueChange={(valoare) => setMasaAleasa(valoare === 'fara' ? null : valoare)}
                >
                  <SelectTrigger id="bilet-masa" className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fara">Fără masă</SelectItem>
                    {(meseEveniment.data ?? []).map((tableId) => (
                      <SelectItem key={tableId} value={tableId}>
                        Masa {numarMasa(tableId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <p className="text-sm text-muted-foreground">Niciun bilet emis încă.</p>
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
                      {bilet.table_id && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          masa {numarMasa(bilet.table_id)}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {bilet.pret_eur} EUR
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Codul QR al biletului ${bilet.cod}`}
                        onClick={() => setQrPentru(bilet)}
                      >
                        <QrCodeIcon />
                      </Button>
                      {bilet.scanat_la ? (
                        <Badge variant="secondary">Scanat</Badge>
                      ) : bilet.status_plata === 'platit' ? (
                        <Badge>Plătit</Badge>
                      ) : (
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={plateste.isPending}
                          onClick={() => plateste.mutate(bilet.id)}
                        >
                          Marchează plătit
                        </Button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* §29.5 — codul QR al biletului, mare, de aratat sau scanat direct
            de pe ecranul clientului. Scanerul citeste exact codul asta. */}
        {qrPentru && (
          <Dialog open onOpenChange={(deschis) => !deschis && setQrPentru(null)}>
            <DialogContent className="sm:max-w-xs">
              <DialogHeader>
                <DialogTitle>{qrPentru.client_nume}</DialogTitle>
                <DialogDescription className="font-mono tracking-wider">
                  {qrPentru.cod}
                </DialogDescription>
              </DialogHeader>
              <div className="justify-self-center rounded-lg border border-border p-3">
                <CodQR text={qrPentru.cod} />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {qrPentru.status_plata === 'platit'
                  ? 'Bilet plătit — valid la intrare.'
                  : 'Biletul NU e plătit încă: scanerul îl va respinge.'}
              </p>
            </DialogContent>
          </Dialog>
        )}

        {editare && (
          <DialogEditareEveniment
            eveniment={eveniment}
            restaurantId={restaurantId}
            fus={fus}
            onInchide={() => setEditare(false)}
            onSalvat={() => {
              setEditare(false)
              reincarca()
              onInchide()
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

/**
 * Editarea unui eveniment DUPA creare (§29.7 — si ospatarul poate): serviciul
 * exista de la inceput, dar nu-l expunea niciun ecran. Mesele si preturile se
 * schimba tot de aici in versiunile urmatoare; acum se editeaza detaliile.
 */
function DialogEditareEveniment({
  eveniment,
  restaurantId,
  fus,
  onInchide,
  onSalvat,
}: {
  eveniment: Eveniment
  restaurantId: string
  fus: string
  onInchide: () => void
  onSalvat: () => void
}) {
  const notificari = useNotificari()
  const [nume, setNume] = useState(eveniment.nume)
  const [descriere, setDescriere] = useState(eveniment.descriere ?? '')
  // Ziua si ora se arata in fusul restaurantului, nu in UTC-ul din baza —
  // un slice pe ISO ar muta evenimentul cu diferenta de fus la prima salvare.
  const [zi, setZi] = useState(() => formatFus(eveniment.data_ora, 'yyyy-MM-dd', fus))
  const [ora, setOra] = useState(() => formatFus(eveniment.data_ora, 'HH:mm', fus))
  const [afisNou, setAfisNou] = useState<File | null>(null)

  const salveaza = useMutation({
    mutationFn: async () => {
      const dataOra = new Date(`${zi}T${ora}:00`)
      if (Number.isNaN(dataOra.getTime())) throw new Error('Data sau ora nu sunt valide.')

      const afisUrl = afisNou ? await urcaAfis(restaurantId, afisNou) : undefined
      await actualizeazaEveniment(eveniment.id, {
        nume: nume.trim(),
        descriere: descriere.trim() || null,
        data_ora: dataOra.toISOString(),
        ...(afisUrl ? { afis_url: afisUrl } : {}),
      })
    },
    onSuccess: () => {
      notificari.succes('Evenimentul a fost actualizat.')
      onSalvat()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  return (
    <Dialog open onOpenChange={(deschis) => !deschis && onInchide()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editeaza evenimentul</DialogTitle>
          <DialogDescription>
            Schimbarile se vad imediat pe card si, daca e publicat, pe widget.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-nume">Nume</Label>
            <Input id="edit-nume" value={nume} onChange={(e) => setNume(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-zi">Ziua</Label>
              <Input id="edit-zi" type="date" value={zi} onChange={(e) => setZi(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-ora">Ora</Label>
              <Input
                id="edit-ora"
                type="time"
                value={ora}
                onChange={(e) => setOra(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-descriere">Descriere</Label>
            <Textarea
              id="edit-descriere"
              rows={3}
              value={descriere}
              onChange={(e) => setDescriere(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-afis">Afis nou (optional)</Label>
            <Input
              id="edit-afis"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="h-9"
              onChange={(e) => setAfisNou(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onInchide}>
            Renunta
          </Button>
          <Button
            disabled={salveaza.isPending || nume.trim().length < 2}
            onClick={() => salveaza.mutate()}
          >
            Salveaza
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
