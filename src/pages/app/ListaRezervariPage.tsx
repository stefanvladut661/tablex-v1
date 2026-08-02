import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  EyeIcon,
  SearchIcon,
  SettingsIcon,
} from 'lucide-react'

import { CardRezervare } from '@/components/rezervari/CardRezervare'
import { DialogEditareRezervare } from '@/components/rezervari/DialogEditareRezervare'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useNotificari } from '@/hooks/useNotificari'
import { useMutatiiRezervari, useRezervari } from '@/hooks/useRezervari'
import { construiesteCsv, descarcaCsv } from '@/lib/csv'
import { ETICHETE_STATUS_REZERVARE, ETICHETE_SURSA_REZERVARE } from '@/lib/etichete'
import { addDays, etichetaZi, formatFus, inceputZi, ora, sfarsitZi, toZonedTime } from '@/lib/timp'
import {
  CAMPURI_CARD,
  campuriAscunse,
  salveazaCampuriAscunse,
  type CampCard,
} from '@/services/preferinte'
import { trimiteEmail } from '@/services/email'
import type { Rezervare, StatusRezervare } from '@/services/rezervari'
import { trimiteWhatsAppSimulat } from '@/services/whatsapp'

/** Tab-urile din §26.7. „Toate" e in plus: la o zi plina, filtrul e util. */
type TabLista = { cheie: string; eticheta: string; statusuri: StatusRezervare[] | null }

const TABURI: TabLista[] = [
  { cheie: 'toate', eticheta: 'Toate', statusuri: null },
  { cheie: 'pending', eticheta: 'În așteptare', statusuri: ['pending'] },
  { cheie: 'confirmate', eticheta: 'Confirmate', statusuri: ['confirmata'] },
  { cheie: 'sosite', eticheta: 'Sosite', statusuri: ['sosita'] },
  { cheie: 'incheiate', eticheta: 'Anulate / No-show', statusuri: ['anulata', 'no_show', 'respinsa'] },
]

type Sortare = 'ora' | 'nume'

export function ListaRezervariPage() {
  const { profil } = useAuth()
  const queryClient = useQueryClient()
  const notificari = useNotificari()

  const restaurant = profil?.tip === 'admin' ? profil.restaurant : null
  const cont = profil?.tip === 'admin' ? profil.cont : null
  const fus = restaurant?.fus_orar ?? 'Europe/Bucharest'

  // §25.4 — Calendarul trimite aici cu ?data=YYYY-MM-DD; fara parametru, azi.
  const [parametri] = useSearchParams()
  const [zi, setZi] = useState(() => {
    const ceruta = parametri.get('data')
    if (ceruta && /^\d{4}-\d{2}-\d{2}$/.test(ceruta)) {
      const data = new Date(`${ceruta}T12:00:00`)
      if (!Number.isNaN(data.getTime())) return toZonedTime(data, fus)
    }
    return toZonedTime(new Date(), fus)
  })
  const [tab, setTab] = useState<string>('toate')
  const [sortare, setSortare] = useState<Sortare>('ora')
  const [caut, setCaut] = useState('')
  const [deEditat, setDeEditat] = useState<Rezervare | null>(null)
  const [deConfirmat, setDeConfirmat] = useState<{
    rezervare: Rezervare
    status: StatusRezervare
    mesaj: string
  } | null>(null)
  const [ascunseLocal, setAscunseLocal] = useState<Set<CampCard> | null>(null)

  const [deLa, panaLa] = useMemo(() => [inceputZi(zi, fus), sfarsitZi(zi, fus)], [zi, fus])
  const rezervari = useRezervari(restaurant?.id, deLa, panaLa)
  const { schimbaStatus, muta } = useMutatiiRezervari(restaurant?.id)

  /**
   * Read-only pe orice zi care nu e azi (§8.2, §25.4). Nu e o restrictie de
   * drepturi, ci de context: ziua de ieri e raportare, iar o confirmare data
   * din greseala pe ea nu mai ajuta pe nimeni.
   */
  const azi = formatFus(new Date(), 'yyyy-MM-dd', fus)
  const readOnly = formatFus(zi, 'yyyy-MM-dd', fus) !== azi

  const ascunse = ascunseLocal ?? campuriAscunse(cont?.list_view_columns_config)

  const salveazaPreferinta = useMutation({
    mutationFn: (noi: CampCard[]) => salveazaCampuriAscunse(cont!.id, noi),
    onError: (eroare) => notificari.eroare(eroare),
  })

  function comutaCamp(camp: CampCard) {
    const noi = new Set(ascunse)
    if (noi.has(camp)) noi.delete(camp)
    else noi.add(camp)
    // Optimist: preferinta e personala si fara consecinte asupra datelor, deci
    // interfata raspunde imediat, iar salvarea merge in urma.
    setAscunseLocal(noi)
    salveazaPreferinta.mutate([...noi])
  }

  const filtrate = useMemo(() => {
    const termen = caut.trim().toLowerCase()
    const statusuriTab = TABURI.find((t) => t.cheie === tab)?.statusuri
    const lista = (rezervari.data ?? []).filter((r) => {
      if (statusuriTab && !statusuriTab.includes(r.status)) return false
      if (!termen) return true
      return (
        r.client_nume.toLowerCase().includes(termen) ||
        (r.telefon ?? '').includes(termen) ||
        (r.masa?.numar_masa ?? '').toLowerCase().includes(termen)
      )
    })

    return [...lista].sort((a, b) =>
      sortare === 'nume'
        ? a.client_nume.localeCompare(b.client_nume, 'ro')
        : a.data_ora.localeCompare(b.data_ora),
    )
  }, [rezervari.data, tab, caut, sortare])

  function exporta() {
    const csv = construiesteCsv(filtrate, [
      { titlu: 'Ora', valoare: (r) => ora(r.data_ora, fus) },
      { titlu: 'Client', valoare: (r) => r.client_nume },
      { titlu: 'Telefon', valoare: (r) => r.telefon },
      { titlu: 'Persoane', valoare: (r) => r.nr_persoane },
      { titlu: 'Masa', valoare: (r) => r.masa?.numar_masa },
      { titlu: 'Zona', valoare: (r) => r.zona?.nume },
      { titlu: 'Status', valoare: (r) => ETICHETE_STATUS_REZERVARE[r.status] },
      { titlu: 'Sursa', valoare: (r) => ETICHETE_SURSA_REZERVARE[r.sursa] },
      { titlu: 'Note interne', valoare: (r) => r.note_interne },
    ])
    // Numele fisierului poarta filtrele: doua exporturi din aceeasi zi nu
    // trebuie sa se suprascrie in folderul Downloads.
    descarcaCsv(`rezervari-${formatFus(zi, 'yyyy-MM-dd', fus)}-${tab}.csv`, csv)
  }

  /**
   * §16.2: acceptarea si respingerea anunta clientul pe AMBELE canale — email
   * daca exista, WhatsApp pe credite — exact ca din SheetRezervare. Butoanele
   * rapide de pe carduri sunt calea principala de tratare a cererilor, deci
   * lipsa notificarii de aici era o gaura, nu un detaliu.
   */
  function executa(rezervare: Rezervare, status: StatusRezervare, mesaj: string) {
    schimbaStatus.mutate(
      { id: rezervare.id, status },
      {
        onSuccess: () => {
          notificari.succes(mesaj)
          if (status === 'confirmata') {
            if (rezervare.email) void trimiteEmail('rezervare_confirmata', rezervare.id)
            if (rezervare.telefon) {
              void trimiteWhatsAppSimulat(
                rezervare.telefon,
                'Confirmare Rezervare',
                undefined,
                rezervare.id,
              )
            }
          } else if (status === 'respinsa') {
            if (rezervare.email) void trimiteEmail('rezervare_respinsa', rezervare.id)
            if (rezervare.telefon) {
              void trimiteWhatsAppSimulat(
                rezervare.telefon,
                'Rezervare Respinsa',
                undefined,
                rezervare.id,
              )
            }
          }
        },
        onError: (eroare) => notificari.eroare(eroare),
      },
    )
  }

  /** §24.7 — respingerea si anularea sunt distructive: cer confirmare. */
  function schimba(rezervare: Rezervare, status: StatusRezervare, mesaj: string) {
    if (status === 'respinsa' || status === 'anulata') {
      setDeConfirmat({ rezervare, status, mesaj })
      return
    }
    executa(rezervare, status, mesaj)
  }

  function salveazaNote(rezervare: Rezervare, note: string | null) {
    muta.mutate(
      { id: rezervare.id, noteInterne: note },
      {
        onSuccess: () => notificari.succes('Nota internă a fost salvată.'),
        onError: (eroare) => notificari.eroare(eroare),
      },
    )
  }

  if (!restaurant || !cont) return null

  const inLucru = schimbaStatus.isPending || muta.isPending

  return (
    <div className="grid gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setZi((c) => addDays(c, -1))}
            aria-label="Ziua anterioară"
          >
            <ChevronLeftIcon />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZi(toZonedTime(new Date(), fus))}>
            Azi
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setZi((c) => addDays(c, 1))}
            aria-label="Ziua următoare"
          >
            <ChevronRightIcon />
          </Button>
          <h1 className="ml-1 text-lg font-semibold tracking-tight capitalize">
            {etichetaZi(zi, fus)}
          </h1>
          {readOnly && (
            <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <EyeIcon className="size-3" />
              doar citire
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <SearchIcon className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={caut}
              onChange={(e) => setCaut(e.target.value)}
              placeholder="Nume, telefon, masă"
              className="h-8 w-48 pl-7"
              aria-label="Caut în rezervări"
            />
          </div>

          <Select value={sortare} onValueChange={(v) => setSortare(v as Sortare)}>
            <SelectTrigger className="h-8 w-32" aria-label="Sortare">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ora">După oră</SelectItem>
              <SelectItem value="nume">După nume</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm" aria-label="Ce apare pe card">
                <SettingsIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Ce apare pe card</DropdownMenuLabel>
              <div className="grid gap-1.5 p-2">
                {CAMPURI_CARD.map((camp) => (
                  <Label
                    key={camp.cheie}
                    className="flex items-center gap-2 text-sm font-normal"
                    // Bifele nu inchid meniul: de obicei se schimba doua-trei
                    // deodata.
                    onSelect={(e) => e.preventDefault()}
                  >
                    <Checkbox
                      checked={!ascunse.has(camp.cheie)}
                      onCheckedChange={() => comutaCamp(camp.cheie)}
                    />
                    {camp.eticheta}
                  </Label>
                ))}
              </div>
              <p className="px-2 pb-2 text-xs text-muted-foreground">
                Preferința ta, nu a restaurantului.
              </p>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={exporta}
            disabled={filtrate.length === 0}
            title="Exportă ce e afișat acum, cu filtrele aplicate"
          >
            <DownloadIcon />
            Export CSV
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABURI.map((t) => {
            const cate = (rezervari.data ?? []).filter(
              (r) => !t.statusuri || t.statusuri.includes(r.status),
            ).length
            return (
              <TabsTrigger key={t.cheie} value={t.cheie}>
                {t.eticheta}
                {cate > 0 && <span className="ml-1.5 text-xs tabular-nums opacity-70">{cate}</span>}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      {rezervari.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : rezervari.isError ? (
        // Fara ramura asta, o cadere de retea arata identic cu o zi goala —
        // adica dezastru operational citit ca zi linistita.
        <div className="grid justify-items-start gap-2 rounded-lg border border-destructive/40 bg-card p-6">
          <p className="text-sm font-medium">Nu am putut încărca rezervările.</p>
          <p className="text-sm text-muted-foreground">
            Lista de mai jos ar fi goală din cauza erorii, nu fiindcă nu ai rezervări.
          </p>
          <Button variant="outline" size="sm" onClick={() => void rezervari.refetch()}>
            Reîncearcă
          </Button>
        </div>
      ) : filtrate.length === 0 ? (
        <div className="grid justify-items-start gap-2 rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            {caut || tab !== 'toate'
              ? 'Nicio rezervare pentru filtrele alese.'
              : 'Nicio rezervare în ziua asta.'}
          </p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {filtrate.map((rezervare) => (
            <CardRezervare
              key={rezervare.id}
              rezervare={rezervare}
              fus={fus}
              ascunse={ascunse}
              readOnly={readOnly}
              inLucru={inLucru}
              onSchimbaStatus={(status, mesaj) => schimba(rezervare, status, mesaj)}
              onEditeaza={() => setDeEditat(rezervare)}
              onSalveazaNote={(note) => salveazaNote(rezervare, note)}
            />
          ))}
        </ul>
      )}

      {deConfirmat && (
        <Dialog open onOpenChange={(deschis) => !deschis && setDeConfirmat(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {deConfirmat.status === 'respinsa' ? 'Respingi' : 'Anulezi'} rezervarea?
              </DialogTitle>
              <DialogDescription>
                {deConfirmat.rezervare.client_nume} · {deConfirmat.rezervare.nr_persoane} persoane ·{' '}
                {ora(deConfirmat.rezervare.data_ora, fus)}
                {deConfirmat.status === 'respinsa' &&
                  ' — clientul primește anunțul pe email și WhatsApp, dacă există.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeConfirmat(null)}>
                Renunță
              </Button>
              <Button
                variant="destructive"
                disabled={schimbaStatus.isPending}
                onClick={() => {
                  executa(deConfirmat.rezervare, deConfirmat.status, deConfirmat.mesaj)
                  setDeConfirmat(null)
                }}
              >
                {deConfirmat.status === 'respinsa' ? 'Respinge' : 'Anulează rezervarea'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {deEditat && (
        <DialogEditareRezervare
          rezervare={deEditat}
          fus={fus}
          restaurantId={restaurant.id}
          onInchide={() => {
            setDeEditat(null)
            void queryClient.invalidateQueries({ queryKey: ['mese-libere'] })
          }}
        />
      )}
    </div>
  )
}
