import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BanIcon,
  EyeIcon,
  LayoutGridIcon,
  MoreHorizontalIcon,
  PlayIcon,
  SearchIcon,
  TagIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
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
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { useNotificari } from '@/hooks/useNotificari'
import { useSetariApp } from '@/hooks/useSetariApp'
import { RUTE } from '@/lib/rute'
import {
  CHEI_SA,
  getAudit,
  getRestaurante,
  intervine,
  type Restaurant,
} from '@/services/super-admin'
import type { Enums } from '@/types/database'

/**
 * Restaurant Management (§9.2.3, §43).
 *
 * Filtrele rapide, coloanele si meniul cu 3 puncte urmeaza exact §43.1;
 * View Details (§43.2) e read-only si se deschide si din Tenant Switcher
 * (Cmd+K), prin query param — de-asta modalul citeste ?detalii=<id>.
 *
 * Rolul support ajunge aici doar pentru datele de contact (§47.4): vede
 * tabelul si View Details, dar nu si interventiile — pe care baza i le-ar
 * refuza oricum (migratia roluri_echipa_interna).
 */

const ETICHETE_STATUS: Record<Enums<'restaurant_status'>, string> = {
  activ: 'Activ',
  suspendat: 'Suspendat',
  banat: 'Banat',
}

const CLASE_STATUS: Record<Enums<'restaurant_status'>, string> = {
  activ: 'bg-status-liber-soft text-foreground',
  suspendat: 'bg-status-expirare-soft text-foreground',
  banat: 'bg-status-ocupat-soft text-foreground',
}

const ETICHETE_AUDIT: Record<Enums<'audit_actiune'>, string> = {
  suspend: 'Suspendare',
  unsuspend: 'Reactivare',
  ban: 'Banare',
  extend_trial: 'Prelungire trial',
  discount: 'Discount',
  manual_floor_plan_unlock: 'Deblocare floor plan',
  schimbare_plan: 'Schimbare plan',
  nota: 'Nota',
  schimbare_preturi: 'Schimbare preturi',
  maintenance_toggle: 'Mentenanta',
}

type Filtru = 'toate' | 'start' | 'pro' | 'suspendate'

const FILTRE: Array<{ cheie: Filtru; eticheta: string }> = [
  { cheie: 'toate', eticheta: 'Toate' },
  { cheie: 'start', eticheta: 'Numai Start' },
  { cheie: 'pro', eticheta: 'Numai Pro' },
  { cheie: 'suspendate', eticheta: 'Suspendate' },
]

function dataScurta(zi: string): string {
  return new Date(zi).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function dataOra(iso: string): string {
  return new Date(iso).toLocaleString('ro-RO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * MRR-ul generat de un restaurant (§43.1): pretul lunar al planului lui, cu
 * discountul aplicat; zero cand contul nu e activ. Nu e o coloana in baza —
 * ar diverge de preturile globale la prima schimbare a lor.
 */
function mrrRestaurant(
  restaurant: Restaurant,
  preturi: { pret_plan_start: number; pret_plan_pro: number } | undefined,
): number {
  if (!preturi || restaurant.status !== 'activ') return 0
  const baza =
    restaurant.plan === 'pro_floor' ? preturi.pret_plan_pro : preturi.pret_plan_start
  return baza * (1 - (restaurant.discount_procent ?? 0) / 100)
}

/**
 * Trialul si discountul sunt coloane privilegiate (migratia 13): trigger-ul le
 * refuza oricui nu are rolul super_admin, iar auditul se scrie singur. Aici e
 * doar interfata — de aceea limitele oglindesc exact CHECK-ul din schema.
 */
function DialogComercial({
  restaurant,
  onInchide,
  onSalveaza,
  inLucru,
}: {
  restaurant: Restaurant
  onInchide: () => void
  onSalveaza: (valori: { trial: string | null; discount: number | null }) => void
  inLucru: boolean
}) {
  const [trial, setTrial] = useState(restaurant.trial_extins_pana_la ?? '')
  const [discount, setDiscount] = useState(
    restaurant.discount_procent === null ? '' : String(restaurant.discount_procent),
  )

  const discountNumeric = discount.trim() === '' ? null : Number(discount)
  const discountValid =
    discountNumeric === null ||
    (Number.isFinite(discountNumeric) && discountNumeric >= 0 && discountNumeric <= 100)

  const azi = new Date().toISOString().slice(0, 10)
  const trialInTrecut = trial !== '' && trial < azi

  return (
    <Dialog open onOpenChange={(deschis) => !deschis && onInchide()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Trial si discount: {restaurant.nume}</DialogTitle>
          <DialogDescription>
            Ambele intra automat in registrul de audit, cu valorile dinainte si de dupa.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="trial">Perioada de proba, prelungita pana la</Label>
            <Input
              id="trial"
              type="date"
              value={trial}
              className="h-9 w-48"
              onChange={(e) => setTrial(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {trialInTrecut
                ? 'Data e in trecut: trialul apare ca expirat.'
                : 'Lasa gol ca sa revii la perioada standard.'}
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="discount">Discount permanent (%)</Label>
            <Input
              id="discount"
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={discount}
              className="h-9 w-32 tabular-nums"
              onChange={(e) => setDiscount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {discountValid
                ? 'Intre 0 si 100. Lasa gol ca sa scoti discountul.'
                : 'Baza accepta doar valori intre 0 si 100.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onInchide}>
            Renunta
          </Button>
          <Button
            disabled={inLucru || !discountValid}
            onClick={() =>
              onSalveaza({ trial: trial === '' ? null : trial, discount: discountNumeric })
            }
          >
            Salveaza
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Suspendarea si banarea cer un motiv — impus si de trigger (§43.5). */
function DialogSuspendare({
  restaurant,
  actiune,
  onInchide,
  onConfirma,
  inLucru,
}: {
  restaurant: Restaurant
  actiune: 'suspendat' | 'banat'
  onInchide: () => void
  onConfirma: (motiv: string) => void
  inLucru: boolean
}) {
  const [motiv, setMotiv] = useState('')

  return (
    <Dialog open onOpenChange={(deschis) => !deschis && onInchide()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {actiune === 'banat' ? 'Banare' : 'Suspendare'}: {restaurant.nume}
          </DialogTitle>
          <DialogDescription>
            {actiune === 'banat'
              ? 'Contul devine inaccesibil definitiv. Rezervarile rămân in baza de date.'
              : 'Personalul nu mai poate intra in panou pana la reactivare.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5">
          <Label htmlFor="motiv">Motiv (obligatoriu)</Label>
          <Textarea
            id="motiv"
            rows={3}
            value={motiv}
            onChange={(e) => setMotiv(e.target.value)}
            placeholder="Ex: neplata abonamentului de 60 de zile."
          />
          <p className="text-xs text-muted-foreground">
            Motivul e afisat restaurantului si rămâne in registrul de audit.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onInchide}>
            Renunta
          </Button>
          <Button
            variant="destructive"
            disabled={inLucru || motiv.trim().length < 3}
            onClick={() => onConfirma(motiv.trim())}
          >
            {actiune === 'banat' ? 'Baneaza' : 'Suspenda'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * View Details (§43.2): modal read-only cu datele de firma + tab-ul Audit Log
 * al restaurantului. Nicio actiune aici — interventiile stau in meniul cu
 * 3 puncte al tabelului.
 */
function DialogDetalii({
  restaurant,
  onInchide,
}: {
  restaurant: Restaurant
  onInchide: () => void
}) {
  const audit = useQuery({
    queryKey: CHEI_SA.audit(restaurant.id),
    queryFn: () => getAudit(restaurant.id),
  })

  const randDate: Array<[string, string | null]> = [
    ['Nume firma', restaurant.nume_firma],
    ['CUI', restaurant.cui],
    ['Adresa', restaurant.adresa],
    ['Persoana de contact', restaurant.persoana_contact],
    ['Telefon', restaurant.telefon_contact],
    ['Email', restaurant.email_contact],
    ['Oras', restaurant.oras],
    ['Adresa publica', `/r/${restaurant.slug}`],
    ['Inregistrat la', dataScurta(restaurant.created_at)],
  ]

  return (
    <Dialog open onOpenChange={(deschis) => !deschis && onInchide()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{restaurant.nume}</DialogTitle>
          <DialogDescription>
            Date de firma si istoricul intervențiilor echipei. Totul e doar de citit.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="firma">
          <TabsList>
            <TabsTrigger value="firma">Date firma</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="firma" className="mt-3">
            <dl className="grid gap-2 text-sm">
              {randDate.map(([eticheta, valoare]) => (
                <div key={eticheta} className="grid grid-cols-[10rem_1fr] gap-2">
                  <dt className="text-muted-foreground">{eticheta}</dt>
                  <dd className="min-w-0 truncate font-medium">{valoare ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </TabsContent>

          <TabsContent value="audit" className="mt-3">
            {audit.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (audit.data ?? []).length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Nicio intervenție asupra acestui restaurant.
              </p>
            ) : (
              <ul className="max-h-64 divide-y divide-border overflow-y-auto text-sm">
                {(audit.data ?? []).map((intrare) => (
                  <li key={intrare.id} className="grid gap-0.5 py-2">
                    <span className="font-medium">{ETICHETE_AUDIT[intrare.actiune]}</span>
                    <span className="text-xs text-muted-foreground">
                      {dataOra(intrare.created_at)} · {intrare.email_autor ?? 'autor necunoscut'}
                    </span>
                    {Object.keys(intrare.detalii as object).length > 0 && (
                      <span className="truncate text-xs text-muted-foreground">
                        {JSON.stringify(intrare.detalii)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export function RestaurantePage() {
  const { profil } = useAuth()
  const notificari = useNotificari()
  const queryClient = useQueryClient()
  const [parametri, setParametri] = useSearchParams()

  const [caut, setCaut] = useState('')
  const [filtru, setFiltru] = useState<Filtru>('toate')
  const [suspendare, setSuspendare] = useState<{
    restaurant: Restaurant
    actiune: 'suspendat' | 'banat'
  } | null>(null)
  const [comercial, setComercial] = useState<Restaurant | null>(null)

  const restaurante = useQuery({ queryKey: CHEI_SA.restaurante, queryFn: getRestaurante })
  const setari = useSetariApp()

  // §47.4: doar rolul super_admin intervine; suportul doar priveste.
  const poateInterveni =
    profil?.tip === 'super_admin' && profil.cont.rol === 'super_admin'

  const interventie = useMutation({
    mutationFn: ({ id, modificari }: { id: string; modificari: Parameters<typeof intervine>[1] }) =>
      intervine(id, modificari),
    onSuccess: () => {
      notificari.succes('Intervenție aplicata.')
      setSuspendare(null)
      setComercial(null)
      void queryClient.invalidateQueries({ queryKey: CHEI_SA.restaurante })
      void queryClient.invalidateQueries({ queryKey: CHEI_SA.audit() })
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const filtrate = useMemo(() => {
    const termen = caut.trim().toLowerCase()
    return (restaurante.data ?? [])
      .filter((r) => {
        if (filtru === 'start') return r.plan === 'start'
        if (filtru === 'pro') return r.plan === 'pro_floor'
        if (filtru === 'suspendate') return r.status !== 'activ'
        return true
      })
      .filter(
        (r) =>
          !termen ||
          r.nume.toLowerCase().includes(termen) ||
          r.slug.includes(termen) ||
          (r.oras ?? '').toLowerCase().includes(termen),
      )
  }, [restaurante.data, caut, filtru])

  // View Details se deschide si din Cmd+K, prin ?detalii=<id> (§38.1).
  const detaliiId = parametri.get('detalii')
  const detalii = (restaurante.data ?? []).find((r) => r.id === detaliiId) ?? null
  const inchideDetalii = () => {
    parametri.delete('detalii')
    setParametri(parametri, { replace: true })
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <h1 className="mb-4 text-lg font-semibold tracking-tight">Restaurant Management</h1>

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtrele rapide din §43.1. */}
            <div className="flex rounded-lg border border-border bg-card p-0.5">
              {FILTRE.map(({ cheie, eticheta }) => (
                <Button
                  key={cheie}
                  variant={filtru === cheie ? 'secondary' : 'ghost'}
                  size="xs"
                  onClick={() => setFiltru(cheie)}
                >
                  {eticheta}
                </Button>
              ))}
            </div>

            <div className="relative">
              <SearchIcon className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={caut}
                onChange={(e) => setCaut(e.target.value)}
                placeholder="Nume, adresa publica, oras"
                className="h-8 w-64 pl-7"
                aria-label="Caut restaurante"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground tabular-nums">
            {restaurante.isLoading ? 'Se incarca...' : `${filtrate.length} restaurante`}
          </p>
        </div>

        {restaurante.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Restaurant</TableHead>
                  <TableHead className="w-20">Plan</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-28">Inregistrat</TableHead>
                  <TableHead className="w-24 text-right">MRR</TableHead>
                  <TableHead className="w-40">Trial / discount</TableHead>
                  <TableHead className="w-16 text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrate.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Niciun restaurant pentru acest filtru.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtrate.map((restaurant) => (
                    <TableRow key={restaurant.id}>
                      <TableCell>
                        <div className="font-medium">{restaurant.nume}</div>
                        <div className="text-xs text-muted-foreground">
                          /r/{restaurant.slug}
                          {restaurant.oras ? ` · ${restaurant.oras}` : ''}
                        </div>
                        {restaurant.motiv_suspendare && restaurant.status !== 'activ' && (
                          <div className="mt-1 text-xs text-destructive">
                            {restaurant.motiv_suspendare}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-sm">
                        {restaurant.plan === 'pro_floor' ? 'Pro' : 'Start'}
                      </TableCell>

                      <TableCell>
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${CLASE_STATUS[restaurant.status]}`}
                        >
                          {ETICHETE_STATUS[restaurant.status]}
                        </span>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {dataScurta(restaurant.created_at)}
                      </TableCell>

                      <TableCell className="text-right text-sm tabular-nums">
                        {mrrRestaurant(restaurant, setari.data).toFixed(2)} €
                      </TableCell>

                      <TableCell>
                        <div className="text-xs">
                          {restaurant.trial_extins_pana_la
                            ? `Trial pana la ${dataScurta(restaurant.trial_extins_pana_la)}`
                            : 'Trial standard'}
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {restaurant.discount_procent
                            ? `${restaurant.discount_procent}% discount`
                            : 'Fara discount'}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        {/* Meniul cu 3 puncte din §43.1 — fara Impersonate (§38.2). */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Acțiuni pentru ${restaurant.nume}`}
                            >
                              <MoreHorizontalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => {
                                parametri.set('detalii', restaurant.id)
                                setParametri(parametri, { replace: true })
                              }}
                            >
                              <EyeIcon />
                              View Details
                            </DropdownMenuItem>

                            {poateInterveni && (
                              <>
                                <DropdownMenuItem asChild>
                                  <Link to={RUTE.superadminEditor(restaurant.id)}>
                                    <LayoutGridIcon />
                                    Deschide planul
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setComercial(restaurant)}>
                                  <TagIcon />
                                  Trial / discount
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() =>
                                    interventie.mutate({
                                      id: restaurant.id,
                                      modificari: {
                                        plan:
                                          restaurant.plan === 'pro_floor' ? 'start' : 'pro_floor',
                                      },
                                    })
                                  }
                                >
                                  Treci pe {restaurant.plan === 'pro_floor' ? 'Start' : 'Pro'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() =>
                                    interventie.mutate({
                                      id: restaurant.id,
                                      modificari: {
                                        floor_plan_deblocat_manual:
                                          !restaurant.floor_plan_deblocat_manual,
                                      },
                                    })
                                  }
                                >
                                  {restaurant.floor_plan_deblocat_manual
                                    ? 'Blocheaza floor plan'
                                    : 'Manual Floor Plan Unlock'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {restaurant.status === 'activ' ? (
                                  <>
                                    <DropdownMenuItem
                                      onSelect={() =>
                                        setSuspendare({ restaurant, actiune: 'suspendat' })
                                      }
                                    >
                                      Suspenda
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onSelect={() =>
                                        setSuspendare({ restaurant, actiune: 'banat' })
                                      }
                                    >
                                      <BanIcon />
                                      Baneaza
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <DropdownMenuItem
                                    onSelect={() =>
                                      interventie.mutate({
                                        id: restaurant.id,
                                        modificari: { status: 'activ' },
                                      })
                                    }
                                  >
                                    <PlayIcon />
                                    Reactiveaza
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Fiecare intervenție intra automat in registru, cu autor si valori inainte/dupa.
          Suspendarea si banarea cer un motiv, impus si de baza de date.
        </p>
      </div>

      {detalii && <DialogDetalii restaurant={detalii} onInchide={inchideDetalii} />}

      {suspendare && (
        <DialogSuspendare
          restaurant={suspendare.restaurant}
          actiune={suspendare.actiune}
          inLucru={interventie.isPending}
          onInchide={() => setSuspendare(null)}
          onConfirma={(motiv) =>
            interventie.mutate({
              id: suspendare.restaurant.id,
              modificari: { status: suspendare.actiune, motiv_suspendare: motiv },
            })
          }
        />
      )}

      {comercial && (
        <DialogComercial
          restaurant={comercial}
          inLucru={interventie.isPending}
          onInchide={() => setComercial(null)}
          onSalveaza={({ trial, discount }) =>
            interventie.mutate({
              id: comercial.id,
              modificari: { trial_extins_pana_la: trial, discount_procent: discount },
            })
          }
        />
      )}
    </div>
  )
}
