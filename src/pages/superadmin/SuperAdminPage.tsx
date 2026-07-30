import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BanIcon,
  FileTextIcon,
  LayoutGridIcon,
  LogOutIcon,
  MoonIcon,
  PlayIcon,
  SearchIcon,
  SunIcon,
  TagIcon,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
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
import { useTema } from '@/hooks/useTema'
import { ETICHETE_STATUS_CERERE_FP } from '@/lib/etichete'
import { RUTE } from '@/lib/rute'
import {
  CHEI_FP,
  getCoadaCereri,
  schimbaStatusCerere,
  urlSchita,
  type StatusCerere,
} from '@/services/floor-plan'
import {
  CHEI_SA,
  actualizeazaSetariGlobale,
  getAudit,
  getRestaurante,
  getSetariGlobale,
  intervine,
  type Restaurant,
} from '@/services/super-admin'
import type { Enums } from '@/types/database'

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

function dataOra(iso: string): string {
  return new Date(iso).toLocaleString('ro-RO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dataScurta(zi: string): string {
  return new Date(zi).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Extensiile pe care browserul le poate randa direct ca imagine. */
const ESTE_IMAGINE = /\.(png|jpe?g|webp|heic|heif)$/i

/**
 * Bucket-ul "schite" e privat, deci nu exista URL permanent: se semneaza la
 * afisare, pentru o ora. Reimprospatam la 50 de minute, ca linkul afisat sa nu
 * expire sub degetul cuiva care tine coada deschisa.
 */
function Schita({ cale }: { cale: string }) {
  const semnat = useQuery({
    queryKey: CHEI_FP.schita(cale),
    queryFn: () => urlSchita(cale),
    staleTime: 50 * 60 * 1000,
    refetchInterval: 50 * 60 * 1000,
  })

  if (semnat.isLoading) return <Skeleton className="h-14 w-20" />

  if (!semnat.data) {
    return <span className="text-xs text-muted-foreground">Schita nu s-a putut deschide.</span>
  }

  return (
    <a
      href={semnat.data}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
    >
      {ESTE_IMAGINE.test(cale) ? (
        <img
          src={semnat.data}
          alt="Schita trimisa de restaurant"
          className="h-14 w-20 rounded-md border border-border object-cover"
        />
      ) : (
        <>
          <FileTextIcon className="size-4" />
          Deschide fisierul
        </>
      )}
    </a>
  )
}

/**
 * Trialul si discountul sunt coloane privilegiate (migratia 13): trigger-ul le
 * refuza oricui nu e in echipa, iar auditul se scrie singur. Aici e doar
 * interfata — de aceea limitele oglindesc exact CHECK-ul din schema (0–100).
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

export function SuperAdminPage() {
  const { profil, utilizator, deconectare } = useAuth()
  const { temaEfectiva, comutaTema } = useTema()
  const notificari = useNotificari()
  const queryClient = useQueryClient()

  const [caut, setCaut] = useState('')
  const [suspendare, setSuspendare] = useState<{
    restaurant: Restaurant
    actiune: 'suspendat' | 'banat'
  } | null>(null)
  const [comercial, setComercial] = useState<Restaurant | null>(null)

  const restaurante = useQuery({ queryKey: CHEI_SA.restaurante, queryFn: getRestaurante })
  const audit = useQuery({ queryKey: CHEI_SA.audit, queryFn: () => getAudit() })
  const setari = useQuery({ queryKey: CHEI_SA.setari, queryFn: getSetariGlobale })
  const cereri = useQuery({ queryKey: CHEI_FP.coada, queryFn: getCoadaCereri })

  const statusCerere = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusCerere }) =>
      schimbaStatusCerere(id, status),
    onSuccess: () => {
      notificari.succes('Status actualizat. Restaurantul a fost notificat.')
      void queryClient.invalidateQueries({ queryKey: CHEI_FP.coada })
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const reincarca = () => {
    void queryClient.invalidateQueries({ queryKey: CHEI_SA.restaurante })
    void queryClient.invalidateQueries({ queryKey: CHEI_SA.audit })
    void queryClient.invalidateQueries({ queryKey: CHEI_SA.setari })
  }

  const interventie = useMutation({
    mutationFn: ({ id, modificari }: { id: string; modificari: Parameters<typeof intervine>[1] }) =>
      intervine(id, modificari),
    onSuccess: () => {
      notificari.succes('Intervenție aplicata.')
      setSuspendare(null)
      setComercial(null)
      reincarca()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const salveazaSetari = useMutation({
    mutationFn: actualizeazaSetariGlobale,
    onSuccess: () => {
      notificari.succes('Setarile globale au fost salvate.')
      reincarca()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const filtrate = useMemo(() => {
    const termen = caut.trim().toLowerCase()
    if (!termen) return restaurante.data ?? []
    return (restaurante.data ?? []).filter(
      (r) =>
        r.nume.toLowerCase().includes(termen) ||
        r.slug.includes(termen) ||
        (r.oras ?? '').toLowerCase().includes(termen),
    )
  }, [restaurante.data, caut])

  if (!profil || profil.tip !== 'super_admin') return null

  // Doar rolul super_admin propriu-zis schimba preturi si mentenanta (§9.2.7);
  // support si designer_architect au acces doar de citire aici.
  const poateSchimbaGlobal = profil.cont.rol === 'super_admin'

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold tracking-tight">
              Table<span className="text-primary">X</span> · echipa
            </span>
            <Badge variant="secondary">{profil.cont.rol}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {profil.cont.nume ?? utilizator?.email}
            </span>
            <Button variant="ghost" size="icon-sm" onClick={comutaTema} aria-label="Comuta tema">
              {temaEfectiva === 'dark' ? <SunIcon /> : <MoonIcon />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void deconectare().catch((eroare) => notificari.eroare(eroare))
              }}
            >
              <LogOutIcon />
              Iesi
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <Tabs defaultValue="restaurante">
          <TabsList>
            <TabsTrigger value="restaurante">Restaurante</TabsTrigger>
            <TabsTrigger value="cereri">
              Cereri plan
              {(cereri.data ?? []).some((c) => c.status === 'pending') && (
                <span className="ml-1.5 rounded-full bg-status-expirare px-1.5 text-[10px] font-semibold text-status-expirare-foreground tabular-nums">
                  {(cereri.data ?? []).filter((c) => c.status === 'pending').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="setari">Setari globale</TabsTrigger>
            <TabsTrigger value="audit">Registru</TabsTrigger>
          </TabsList>

          {/* ── Restaurante ── */}
          <TabsContent value="restaurante" className="mt-4 grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                      <TableHead className="w-32">Plan</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                      <TableHead className="w-24">Floor plan</TableHead>
                      <TableHead className="w-40">Trial / discount</TableHead>
                      <TableHead className="w-64 text-right">Intervenții</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrate.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
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

                          <TableCell>
                            <Select
                              value={restaurant.plan}
                              onValueChange={(plan) =>
                                interventie.mutate({
                                  id: restaurant.id,
                                  modificari: { plan: plan as Enums<'plan_tip'> },
                                })
                              }
                            >
                              <SelectTrigger className="h-8 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="start">Start</SelectItem>
                                <SelectItem value="pro_floor">Pro</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell>
                            <span
                              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${CLASE_STATUS[restaurant.status]}`}
                            >
                              {ETICHETE_STATUS[restaurant.status]}
                            </span>
                          </TableCell>

                          <TableCell>
                            <Switch
                              checked={restaurant.floor_plan_deblocat_manual}
                              aria-label={`Deblocare floor plan pentru ${restaurant.nume}`}
                              onCheckedChange={(deblocat) =>
                                interventie.mutate({
                                  id: restaurant.id,
                                  modificari: { floor_plan_deblocat_manual: deblocat },
                                })
                              }
                            />
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

                          <TableCell>
                            <div className="flex flex-wrap justify-end gap-1">
                              <Button variant="outline" size="xs" asChild>
                                <Link to={RUTE.superadminEditor(restaurant.id)}>
                                  <LayoutGridIcon />
                                  Plan
                                </Link>
                              </Button>
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => setComercial(restaurant)}
                              >
                                <TagIcon />
                                Comercial
                              </Button>
                              {restaurant.status === 'activ' ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() =>
                                      setSuspendare({ restaurant, actiune: 'suspendat' })
                                    }
                                  >
                                    Suspenda
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="xs"
                                    onClick={() => setSuspendare({ restaurant, actiune: 'banat' })}
                                  >
                                    <BanIcon />
                                    Baneaza
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() =>
                                    interventie.mutate({
                                      id: restaurant.id,
                                      modificari: { status: 'activ' },
                                    })
                                  }
                                >
                                  <PlayIcon />
                                  Reactiveaza
                                </Button>
                              )}
                            </div>
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
          </TabsContent>

          {/* ── Coada de cereri floor plan (§41) ── */}
          <TabsContent value="cereri" className="mt-4">
            {cereri.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (cereri.data ?? []).length === 0 ? (
              <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                Nicio cerere de plan 2D. Cererile trimise din panoul restaurantelor apar aici, cele
                mai vechi primele.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Primita</TableHead>
                      <TableHead>Restaurant, zona si descriere</TableHead>
                      <TableHead className="w-28">Schita</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                      <TableHead className="w-72 text-right">Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(cereri.data ?? []).map((cerere) => (
                      <TableRow key={cerere.id}>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {dataOra(cerere.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {cerere.restaurant?.nume ?? 'Restaurant sters'}
                            <span className="ml-1.5 font-normal text-muted-foreground">
                              · {cerere.zone_nume}
                            </span>
                          </div>
                          {cerere.descriere && (
                            <div className="max-w-md text-xs text-muted-foreground">
                              {cerere.descriere}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {cerere.schita_image_url ? (
                            <Schita cale={cerere.schita_image_url} />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                            {ETICHETE_STATUS_CERERE_FP[cerere.status]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button variant="outline" size="xs" asChild>
                              <Link to={RUTE.superadminEditor(cerere.restaurant_id)}>
                                <LayoutGridIcon />
                                Deseneaza
                              </Link>
                            </Button>
                            {cerere.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() =>
                                  statusCerere.mutate({ id: cerere.id, status: 'in_progress' })
                                }
                              >
                                Preia in lucru
                              </Button>
                            )}
                            {cerere.status === 'in_progress' && (
                              <Button
                                size="xs"
                                onClick={() =>
                                  statusCerere.mutate({ id: cerere.id, status: 'published' })
                                }
                              >
                                Marcheaza publicat
                              </Button>
                            )}
                            {cerere.status !== 'published' && cerere.status !== 'respins' && (
                              <Button
                                variant="destructive"
                                size="xs"
                                onClick={() =>
                                  statusCerere.mutate({ id: cerere.id, status: 'respins' })
                                }
                              >
                                Respinge
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Fiecare schimbare de status notifica automat restaurantul. Publicarea propriu-zisa a
              geometriei (zone si mese) se face in editorul de floor plan, separat.
            </p>
          </TabsContent>

          {/* ── Setari globale ── */}
          <TabsContent value="setari" className="mt-4">
            {setari.isLoading || !setari.data ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Preturi</CardTitle>
                    <CardDescription>
                      Se afiseaza imediat pe pagina publica de prezentare.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {(
                      [
                        ['pret_plan_start', 'Plan Start (lunar)'],
                        ['pret_plan_pro', 'Plan Pro (lunar)'],
                        ['setup_floor_plan_pret', 'Configurare floor plan'],
                        ['setup_prag_mese', 'Mese incluse in configurare'],
                        ['setup_pret_masa_extra', 'Pret pe masa suplimentara'],
                        ['comision_bilete_procent', 'Comision bilete (%)'],
                      ] as const
                    ).map(([cheie, eticheta]) => (
                      <div key={cheie} className="grid gap-1.5">
                        <Label htmlFor={cheie}>{eticheta}</Label>
                        <Input
                          id={cheie}
                          type="number"
                          step="0.01"
                          min={0}
                          disabled={!poateSchimbaGlobal}
                          defaultValue={String(setari.data[cheie])}
                          className="h-8 tabular-nums"
                          onBlur={(e) => {
                            const valoare = Number(e.target.value)
                            if (!Number.isFinite(valoare) || valoare === setari.data![cheie]) return
                            salveazaSetari.mutate({ [cheie]: valoare })
                          }}
                        />
                      </div>
                    ))}
                    {!poateSchimbaGlobal && (
                      <p className="text-xs text-muted-foreground">
                        Doar rolul super_admin poate schimba preturile.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Mentenanta</CardTitle>
                    <CardDescription>
                      Cand e pornita, panourile arata mesajul de mai jos in loc de aplicatie.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                      <Label htmlFor="mentenanta">Mod mentenanta</Label>
                      <Switch
                        id="mentenanta"
                        disabled={!poateSchimbaGlobal}
                        checked={setari.data.maintenance_mode}
                        onCheckedChange={(activ) =>
                          salveazaSetari.mutate({ maintenance_mode: activ })
                        }
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="mesaj">Mesaj afisat</Label>
                      <Textarea
                        id="mesaj"
                        rows={3}
                        disabled={!poateSchimbaGlobal}
                        defaultValue={setari.data.mesaj_mentenanta}
                        onBlur={(e) => {
                          if (e.target.value === setari.data!.mesaj_mentenanta) return
                          salveazaSetari.mutate({ mesaj_mentenanta: e.target.value })
                        }}
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="retentie">Retentie implicita (ani)</Label>
                      <Input
                        id="retentie"
                        type="number"
                        min={1}
                        max={10}
                        disabled={!poateSchimbaGlobal}
                        defaultValue={String(setari.data.retentie_ani_default)}
                        className="h-8 w-24 tabular-nums"
                        onBlur={(e) => {
                          const valoare = Number(e.target.value)
                          if (valoare === setari.data!.retentie_ani_default) return
                          salveazaSetari.mutate({ retentie_ani_default: valoare })
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Se aplica restaurantelor noi; cele existente isi pastreaza setarea.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ── Registru de audit ── */}
          <TabsContent value="audit" className="mt-4">
            {audit.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (audit.data ?? []).length === 0 ? (
              <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                Nicio intervenție inregistrata.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-36">Cand</TableHead>
                      <TableHead className="w-44">Acțiune</TableHead>
                      <TableHead>Restaurant</TableHead>
                      <TableHead>Autor</TableHead>
                      <TableHead>Detalii</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(audit.data ?? []).map((intrare) => (
                      <TableRow key={intrare.id}>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {dataOra(intrare.created_at)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {ETICHETE_AUDIT[intrare.actiune]}
                        </TableCell>
                        <TableCell>{intrare.restaurant_nume ?? '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {intrare.email_autor ?? '—'}
                        </TableCell>
                        <TableCell className="max-w-64 truncate text-xs text-muted-foreground">
                          {JSON.stringify(intrare.detalii)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

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
