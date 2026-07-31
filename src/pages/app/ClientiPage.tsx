import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangleIcon, MergeIcon, SearchIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { useNotificari } from '@/hooks/useNotificari'
import { ETICHETE_STATUS_REZERVARE, ETICHETE_SURSA_REZERVARE } from '@/lib/etichete'
import { formatFus } from '@/lib/timp'
import {
  CHEI_CLIENTI,
  actualizeazaClient,
  contopesteClienti,
  getClienti,
  getRezervariClient,
  stergeDateleClientului,
  type Client,
} from '@/services/clienti'

/**
 * CRM-ul (§16). Fisele nu se creeaza de aici: apar singure din RPC-ul de
 * rezervare, cu telefonul drept cheie, iar nr_vizite / nr_no_show le intretine
 * un trigger la tranzitia de status. Pagina le arata si permite exact doua
 * lucruri pe care personalul le stie si baza nu: note si etichete.
 */
export function ClientiPage() {
  const { profil, esteManager } = useAuth()
  const notificari = useNotificari()
  const queryClient = useQueryClient()

  const restaurantId = profil?.tip === 'admin' ? profil.restaurant.id : ''
  const fus = profil?.tip === 'admin' ? profil.restaurant.fus_orar : 'Europe/Bucharest'

  const [caut, setCaut] = useState('')
  const [selectat, setSelectat] = useState<Client | null>(null)
  const [confirmStergere, setConfirmStergere] = useState<Client | null>(null)
  const [contopireIn, setContopireIn] = useState<Client | null>(null)

  const clienti = useQuery({
    queryKey: CHEI_CLIENTI.lista(restaurantId),
    queryFn: () => getClienti(restaurantId),
    enabled: Boolean(restaurantId),
  })

  const salveaza = useMutation({
    mutationFn: ({ id, modificari }: { id: string; modificari: Parameters<typeof actualizeazaClient>[1] }) =>
      actualizeazaClient(id, modificari),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CHEI_CLIENTI.lista(restaurantId) })
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const stergeDate = useMutation({
    mutationFn: stergeDateleClientului,
    onSuccess: (rezervariCuratate) => {
      notificari.succes('Datele personale au fost sterse.', {
        descriere:
          rezervariCuratate > 0
            ? `${rezervariCuratate} rezervari au fost anonimizate; raman in statistici, fara date personale.`
            : 'Clientul nu avea rezervari.',
      })
      setConfirmStergere(null)
      setSelectat(null)
      void queryClient.invalidateQueries({ queryKey: CHEI_CLIENTI.lista(restaurantId) })
    },
    onError: (eroare) => {
      setConfirmStergere(null)
      notificari.eroare(eroare)
    },
  })

  const contopeste = useMutation({
    mutationFn: ({ principalId, duplicatId }: { principalId: string; duplicatId: string }) =>
      contopesteClienti(principalId, duplicatId),
    onSuccess: (rezervariMutate) => {
      notificari.succes('Fisele au fost contopite.', {
        descriere:
          rezervariMutate > 0
            ? `${rezervariMutate} rezervari au trecut la fisa pastrata. Numarul celeilalte fise ramane legat de ea.`
            : 'Fisa absorbita nu avea rezervari. Numarul ei ramane legat de fisa pastrata.',
      })
      setContopireIn(null)
      // Fisa deschisa are alte cifre acum; o inchidem in loc s-o aratam veche.
      setSelectat(null)
      void queryClient.invalidateQueries({ queryKey: CHEI_CLIENTI.lista(restaurantId) })
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const filtrati = useMemo(() => {
    const termen = caut.trim().toLowerCase()
    if (!termen) return clienti.data ?? []
    return (clienti.data ?? []).filter(
      (client) =>
        (client.nume ?? '').toLowerCase().includes(termen) ||
        client.telefon.includes(termen) ||
        (client.email ?? '').toLowerCase().includes(termen),
    )
  }, [clienti.data, caut])

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Clienti</h1>
          <p className="text-sm text-muted-foreground">
            Fisele apar singure din rezervari, cu telefonul drept cheie.
          </p>
        </div>
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={caut}
            onChange={(e) => setCaut(e.target.value)}
            placeholder="Nume, telefon, email"
            className="h-9 w-64 pl-7"
            aria-label="Caut clienti"
          />
        </div>
      </div>

      {clienti.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : filtrati.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          {caut
            ? 'Niciun client pentru acest filtru.'
            : 'Inca niciun client. Prima rezervare cu telefon creeaza automat o fisa.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="w-32">Telefon</TableHead>
                <TableHead className="w-20 text-right">Vizite</TableHead>
                <TableHead className="w-24 text-right">Neprezentat</TableHead>
                <TableHead className="w-36">Ultima vizita</TableHead>
                <TableHead className="w-40">Etichete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrati.map((client) => (
                <TableRow
                  key={client.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Deschide fisa ${client.nume ?? client.telefon}`}
                  className="cursor-pointer"
                  onClick={() => setSelectat(client)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return
                    e.preventDefault()
                    setSelectat(client)
                  }}
                >
                  <TableCell>
                    <div className="font-medium">{client.nume ?? 'Fara nume'}</div>
                    {client.email && (
                      <div className="text-xs text-muted-foreground">{client.email}</div>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{client.telefon}</TableCell>
                  <TableCell className="text-right tabular-nums">{client.nr_vizite}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {client.nr_no_show > 0 ? (
                      // Semnal, nu judecata: personalul decide ce face cu el.
                      <span className="rounded-md bg-status-ocupat-soft px-1.5 py-0.5 text-foreground">
                        {client.nr_no_show}
                      </span>
                    ) : (
                      client.nr_no_show
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {client.data_ultima_vizita
                      ? formatFus(client.data_ultima_vizita, 'd MMM yyyy', fus)
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {client.taguri.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectat && (
        <FisaClient
          client={selectat}
          fus={fus}
          esteManager={esteManager}
          onInchide={() => setSelectat(null)}
          onSalveaza={(modificari) => salveaza.mutate({ id: selectat.id, modificari })}
          onCereStergere={() => setConfirmStergere(selectat)}
          onCereContopire={() => setContopireIn(selectat)}
        />
      )}

      {contopireIn && (
        <DialogContopire
          pastrat={contopireIn}
          candidati={(clienti.data ?? []).filter((client) => client.id !== contopireIn.id)}
          fus={fus}
          inLucru={contopeste.isPending}
          onInchide={() => setContopireIn(null)}
          onConfirma={(duplicat) =>
            contopeste.mutate({ principalId: contopireIn.id, duplicatId: duplicat.id })
          }
        />
      )}

      {confirmStergere && (
        <DialogStergereDate
          client={confirmStergere}
          inLucru={stergeDate.isPending}
          onInchide={() => setConfirmStergere(null)}
          onConfirma={() => stergeDate.mutate(confirmStergere.id)}
        />
      )}
    </div>
  )
}

function FisaClient({
  client,
  fus,
  esteManager,
  onInchide,
  onSalveaza,
  onCereStergere,
  onCereContopire,
}: {
  client: Client
  fus: string
  esteManager: boolean
  onInchide: () => void
  onSalveaza: (modificari: Parameters<typeof actualizeazaClient>[1]) => void
  onCereStergere: () => void
  onCereContopire: () => void
}) {
  const rezervari = useQuery({
    queryKey: CHEI_CLIENTI.rezervari(client.id),
    queryFn: () => getRezervariClient(client.id),
  })

  return (
    <Sheet open onOpenChange={(deschis) => !deschis && onInchide()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{client.nume ?? 'Client fara nume'}</SheetTitle>
          <SheetDescription>
            {client.telefon}
            {client.email ? ` · ${client.email}` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-5 px-4 pb-6">
          <dl className="grid grid-cols-3 gap-2 text-sm">
            {(
              [
                ['Vizite', String(client.nr_vizite)],
                ['Neprezentat', String(client.nr_no_show)],
                [
                  'Ultima',
                  client.data_ultima_vizita
                    ? formatFus(client.data_ultima_vizita, 'd MMM', fus)
                    : '—',
                ],
              ] as const
            ).map(([eticheta, valoare]) => (
              <div key={eticheta} className="rounded-lg border border-border p-2.5">
                <dt className="text-xs text-muted-foreground">{eticheta}</dt>
                <dd className="font-medium tabular-nums">{valoare}</dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-1.5">
            <Label htmlFor="note-client">Note interne</Label>
            <Textarea
              id="note-client"
              rows={3}
              key={`note-${client.id}`}
              defaultValue={client.note ?? ''}
              placeholder="Preferinte, alergii, masa preferata..."
              onBlur={(e) => {
                const note = e.target.value.trim()
                if (note === (client.note ?? '')) return
                onSalveaza({ note: note || null })
              }}
            />
            <p className="text-xs text-muted-foreground">
              Vizibile doar personalului. Nu scrie aici date de sanatate fara acordul clientului.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="taguri-client">Etichete</Label>
            <Input
              id="taguri-client"
              key={`taguri-${client.id}`}
              defaultValue={client.taguri.join(', ')}
              placeholder="fidel, vegetarian, aniversare"
              className="h-9"
              onBlur={(e) => {
                const taguri = e.target.value
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean)
                if (taguri.join(',') === client.taguri.join(',')) return
                onSalveaza({ taguri })
              }}
            />
            <p className="text-xs text-muted-foreground">Separate prin virgula.</p>
          </div>

          <div className="grid gap-2">
            <p className="text-sm font-medium">Istoric</p>
            {rezervari.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (rezervari.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nicio rezervare inregistrata.</p>
            ) : (
              <ul className="grid gap-1.5">
                {(rezervari.data ?? []).map((rezervare) => (
                  <li
                    key={rezervare.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm"
                  >
                    <span className="tabular-nums">
                      {formatFus(rezervare.data_ora, 'd MMM yyyy, HH:mm', fus)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {rezervare.nr_persoane} pers · {ETICHETE_STATUS_REZERVARE[rezervare.status]} ·{' '}
                      {ETICHETE_SURSA_REZERVARE[rezervare.sursa]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {esteManager && (
            <div className="grid gap-2 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Acelasi om, doua fise?</p>
              <p className="text-xs text-muted-foreground">
                Fisa are drept cheie telefonul, deci acelasi client sunat de pe alt numar
                primeste o fisa noua. Contopirea aduce vizitele si istoricul aici.
              </p>
              <Button
                variant="outline"
                size="xs"
                className="justify-self-start"
                onClick={onCereContopire}
              >
                <MergeIcon className="size-3.5" />
                Contopeste o alta fisa in aceasta
              </Button>
            </div>
          )}

          <div className="grid gap-2 rounded-lg border border-destructive/40 p-3">
            <p className="text-sm font-medium">Stergerea datelor la cerere</p>
            <p className="text-xs text-muted-foreground">
              {client.gdpr_consimtamant
                ? 'Clientul si-a dat consimtamantul la prelucrarea datelor.'
                : 'Clientul NU si-a dat consimtamantul explicit.'}
            </p>
            <Button
              variant="destructive"
              size="xs"
              className="justify-self-start"
              disabled={!esteManager}
              onClick={onCereStergere}
            >
              Sterge datele personale
            </Button>
            {!esteManager && (
              <p className="text-xs text-muted-foreground">
                Doar managerul poate face asta. Regula e impusa si de baza de date.
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/**
 * Contopirea (§16.3). Fisa deschisa e cea PASTRATA — te uiti la ea, deci tu ai
 * decis ca e cea buna —, iar aici alegi fisa care intra in ea. Directia e
 * scrisa explicit: operatia nu are buton de anulare.
 */
function DialogContopire({
  pastrat,
  candidati,
  fus,
  inLucru,
  onInchide,
  onConfirma,
}: {
  pastrat: Client
  candidati: Client[]
  fus: string
  inLucru: boolean
  onInchide: () => void
  onConfirma: (duplicat: Client) => void
}) {
  const [caut, setCaut] = useState('')
  const [ales, setAles] = useState<Client | null>(null)

  const rezultate = useMemo(() => {
    const termen = caut.trim().toLowerCase()
    const potrivite = termen
      ? candidati.filter(
          (client) =>
            (client.nume ?? '').toLowerCase().includes(termen) ||
            client.telefon.includes(termen) ||
            (client.email ?? '').toLowerCase().includes(termen),
        )
      : candidati
    // Lista poate fi lunga: fara cautare aratam un capat, nu tot CRM-ul.
    return potrivite.slice(0, 30)
  }, [candidati, caut])

  return (
    <Dialog open onOpenChange={(deschis) => !deschis && onInchide()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Contopeste o fisa in {pastrat.nume ?? pastrat.telefon}</DialogTitle>
          <DialogDescription>
            Alege fisa duplicata. Vizitele, neprezentarile, etichetele, notele si toate
            rezervarile ei trec la fisa de mai sus, iar numarul ei ramane legat de ea:
            rezervarile viitoare de pe acel numar ajung tot aici.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <div className="relative">
            <SearchIcon className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={caut}
              onChange={(e) => {
                setCaut(e.target.value)
                setAles(null)
              }}
              placeholder="Nume, telefon, email"
              className="h-9 pl-7"
              aria-label="Caut fisa de contopit"
              autoFocus
            />
          </div>

          {rezultate.length === 0 ? (
            <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
              {candidati.length === 0
                ? 'Nu mai exista alta fisa de client.'
                : 'Nicio fisa pentru acest filtru.'}
            </p>
          ) : (
            <ul className="max-h-64 overflow-y-auto rounded-md border border-border">
              {rezultate.map((client) => {
                const selectat = ales?.id === client.id
                return (
                  <li key={client.id}>
                    <button
                      type="button"
                      aria-pressed={selectat}
                      onClick={() => setAles(selectat ? null : client)}
                      className={`flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left text-sm last:border-b-0 ${
                        selectat ? 'bg-accent' : 'hover:bg-muted/60'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {client.nume ?? 'Fara nume'}
                        </span>
                        <span className="block text-xs text-muted-foreground tabular-nums">
                          {client.telefon}
                          {client.data_ultima_vizita
                            ? ` · ultima ${formatFus(client.data_ultima_vizita, 'd MMM yyyy', fus)}`
                            : ' · nicio vizita'}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {client.nr_vizite} vizite
                        {client.nr_no_show > 0 ? ` · ${client.nr_no_show} neprez.` : ''}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {ales && (
            <p className="rounded-md border border-destructive/40 p-3 text-sm">
              <strong>{ales.nume ?? ales.telefon}</strong> ({ales.telefon}) dispare din lista, iar{' '}
              <strong>{pastrat.nume ?? pastrat.telefon}</strong> va avea{' '}
              <span className="tabular-nums">{pastrat.nr_vizite + ales.nr_vizite}</span> vizite si{' '}
              <span className="tabular-nums">{pastrat.nr_no_show + ales.nr_no_show}</span>{' '}
              neprezentari. Operatia nu poate fi anulata.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onInchide}>
            Renunta
          </Button>
          <Button disabled={!ales || inLucru} onClick={() => ales && onConfirma(ales)}>
            Contopeste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DialogStergereDate({
  client,
  inLucru,
  onInchide,
  onConfirma,
}: {
  client: Client
  inLucru: boolean
  onInchide: () => void
  onConfirma: () => void
}) {
  return (
    <Dialog open onOpenChange={(deschis) => !deschis && onInchide()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="size-4 text-destructive" />
            Stergi datele lui {client.nume ?? client.telefon}?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <p>
                Fisa de client dispare, iar numele, telefonul, emailul si notele clientului se sterg
                din TOATE rezervarile lui.
              </p>
              <p>
                Rezervarile raman in statistici — data, numarul de persoane si masa —, dar fara
                nimic care sa identifice persoana. Operatia nu poate fi anulata.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onInchide}>
            Renunta
          </Button>
          <Button variant="destructive" disabled={inLucru} onClick={onConfirma}>
            Sterge definitiv
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
