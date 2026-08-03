import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FileTextIcon,
  LayoutGridIcon,
  MailIcon,
  PhoneIcon,
  SearchIcon,
  SparklesIcon,
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
import { useNotificari } from '@/hooks/useNotificari'
import { RUTE } from '@/lib/rute'
import {
  CHEI_FP,
  getCereriNoi,
  getContacteAdmini,
  getProiecteCereri,
  preiaCerere,
  publicaCerere,
  respingeCerere,
  urlSchita,
  type CerereCuRestaurant,
  type ContactAdmin,
} from '@/services/floor-plan'
import { genereazaPlanAI } from '@/services/studio-ai'
import { CHEI_SA, getRestaurante } from '@/services/super-admin'

/**
 * Floor Plan Studio (§9.2.2) — cererile restaurantelor, in doua sectiuni care
 * raspund la doua intrebari diferite:
 *
 *   1. Queue: „ce a mai venit?" — DOAR cererile noi (pending). O cerere
 *      preluata dispare de aici, ca lista sa ramana scurta si scanabila; fara
 *      taietura asta, dupa cateva luni coada devine un arhivar in care cererea
 *      de azi se pierde intre cele rezolvate acum trei saptamani.
 *   2. Projects: „unde suntem cu ce am preluat?" — in lucru, publicate si
 *      respinse, cu datele si statusul platii.
 *   3. Builder Direct (§9.2.2 tab 2): intrare in planul oricarui restaurant,
 *      fara cerere — reconfigurari cerute la telefon.
 *
 * Desenatul propriu-zis (canvas, grid, snap, layere) traieste in
 * EditorPlanPage, pe ruta lui full-screen — aici e doar poarta spre el.
 */

function dataOra(iso: string): string {
  return new Date(iso).toLocaleString('ro-RO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
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
    return <span className="text-xs text-muted-foreground">Schița nu s-a putut deschide.</span>
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
          alt="Schița trimisă de restaurant"
          className="h-14 w-20 rounded-md border border-border object-cover"
        />
      ) : (
        <>
          <FileTextIcon className="size-4" />
          Deschide fișierul
        </>
      )}
    </a>
  )
}

/**
 * Datele Adminului care a trimis cererea, pe acelasi rand cu ea: cand schita nu
 * se intelege, drumul cel mai scurt e un telefon, nu inca un email. Stau discret
 * (text mic, tonul secundar) — sunt pentru momentul in care ceva se blocheaza,
 * nu informatia principala a randului.
 */
function ContactAdminCerere({ contact }: { contact: ContactAdmin | undefined }) {
  if (!contact) return null

  if (!contact.nume && !contact.email && !contact.telefon) {
    return (
      <div className="mt-1 text-xs text-muted-foreground">Fără date de contact pentru Admin.</div>
    )
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
      {contact.nume && <span>{contact.nume}</span>}
      {contact.email && (
        <a
          href={`mailto:${contact.email}`}
          className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
        >
          <MailIcon className="size-3" />
          {contact.email}
        </a>
      )}
      {contact.telefon && (
        <a
          href={`tel:${contact.telefon}`}
          className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
        >
          <PhoneIcon className="size-3" />
          {contact.telefon}
        </a>
      )}
    </div>
  )
}

/**
 * Contactele se cer o singura data pentru toata lista afisata. Daca fiecare
 * rand si-ar cere singur managerul, un tabel de 30 de cereri ar face 30 de
 * cereri in retea la fiecare randare.
 */
function useContacte(cereri: CerereCuRestaurant[] | undefined) {
  const idRestaurante = useMemo(
    () => [...new Set((cereri ?? []).map((cerere) => cerere.restaurant_id))],
    [cereri],
  )

  return useQuery({
    queryKey: CHEI_FP.contacte(idRestaurante),
    queryFn: () => getContacteAdmini(idRestaurante),
    enabled: idRestaurante.length > 0,
  })
}

/** Numele restaurantului duce in fisa lui (§43.2), deschisa prin ?detalii=<id>. */
function LinkRestaurant({ cerere }: { cerere: CerereCuRestaurant }) {
  if (!cerere.restaurant) {
    return <span className="font-medium text-muted-foreground">Restaurant șters</span>
  }

  return (
    <Link
      to={`${RUTE.superadminRestaurante}?detalii=${cerere.restaurant_id}`}
      className="font-medium hover:text-primary hover:underline"
    >
      {cerere.restaurant.nume}
    </Link>
  )
}

/**
 * Respingerea fara motiv nu e o respingere, e o tacere: Adminul primeste un
 * refuz si nu stie ce sa corecteze. De aceea butonul sta dezactivat pana cand
 * campul are text — iar daca cineva ocoleste formularul, trigger-ul din baza
 * refuza oricum (migratia 20260908090000).
 */
function DialogRespingere({
  cerere,
  onInchide,
  onConfirma,
  inLucru,
}: {
  cerere: CerereCuRestaurant
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
            Respinge cererea: {cerere.restaurant?.nume ?? 'Restaurant șters'} · {cerere.zone_nume}
          </DialogTitle>
          <DialogDescription>
            Motivul ajunge la Adminul care a trimis cererea. Scrie ce anume trebuie corectat ca să o
            poată retrimite.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5">
          <Label htmlFor="motiv-respingere">Motiv (obligatoriu)</Label>
          <Textarea
            id="motiv-respingere"
            rows={3}
            value={motiv}
            onChange={(e) => setMotiv(e.target.value)}
            placeholder="Ex: schița e prea neclară pentru a distinge pereții. Trimite o fotografie dreaptă, cu toată sala în cadru."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onInchide}>
            Renunță
          </Button>
          <Button
            variant="destructive"
            disabled={inLucru || motiv.trim().length === 0}
            onClick={() => onConfirma(motiv.trim())}
          >
            Respinge cererea
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Sectiunea 1: cererile noi, cele mai vechi primele (§41, §41.2). */
function Queue() {
  const notificari = useNotificari()
  const queryClient = useQueryClient()
  const navigheaza = useNavigate()
  const [respingere, setRespingere] = useState<CerereCuRestaurant | null>(null)

  const cereri = useQuery({ queryKey: CHEI_FP.queue, queryFn: getCereriNoi })
  const contacte = useContacte(cereri.data)

  /** Ambele liste se schimba la orice tranzitie: cererea trece dintr-una in alta. */
  const reincarcaListele = () => {
    void queryClient.invalidateQueries({ queryKey: CHEI_FP.queue })
    void queryClient.invalidateQueries({ queryKey: CHEI_FP.proiecte })
  }

  /**
   * §9.2.2 pasul 1 + §41.3 — Best Guess-ul AI. Acelasi buton si pentru
   * regenerare: rezultatul anterior se suprascrie complet. Rezultatul e
   * INTERN echipei; Adminul nu il vede niciodata.
   */
  const genereaza = useMutation({
    mutationFn: genereazaPlanAI,
    onSuccess: (rezultat) => {
      if (rezultat.ok) {
        notificari.succes(
          `Best Guess gata: ${rezultat.elemente} elemente de structură, ${rezultat.mese} mese.`,
          { descriere: 'Preia cererea în lucru și finisează peste schiță.' },
        )
      } else {
        notificari.atentie(rezultat.motiv)
      }
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  /**
   * §9.2.2 pasul 2 — preluarea si deschiderea builderului sunt un singur gest:
   * cine apasa vrea sa deseneze acum, nu sa marcheze ceva intr-un tabel.
   */
  const preia = useMutation({
    mutationFn: (cerere: CerereCuRestaurant) => preiaCerere(cerere.id),
    onSuccess: (_, cerere) => {
      reincarcaListele()
      navigheaza(RUTE.superadminEditor(cerere.restaurant_id))
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const respinge = useMutation({
    mutationFn: ({ id, motiv }: { id: string; motiv: string }) => respingeCerere(id, motiv),
    onSuccess: () => {
      // Nu „primește motivul": notificarea trimisa de trigger anunta doar
      // respingerea. Motivul il citeste pe cererea lui, in pagina Harta sălii.
      notificari.succes('Cererea a fost respinsă. Motivul apare la restaurant, pe cererea lui.')
      setRespingere(null)
      reincarcaListele()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  if (cereri.isLoading) return <Skeleton className="h-48 w-full" />

  if ((cereri.data ?? []).length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Nicio cerere nouă. Solicitările trimise din panoul restaurantelor apar aici, cele mai vechi
        primele; cele preluate se urmăresc în Projects.
      </p>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Primită</TableHead>
              <TableHead>Restaurant, zonă și contact</TableHead>
              <TableHead className="w-28">Schiță</TableHead>
              <TableHead className="w-72 text-right">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(cereri.data ?? []).map((cerere) => (
              <TableRow key={cerere.id}>
                <TableCell className="align-top text-xs text-muted-foreground tabular-nums">
                  {dataOra(cerere.created_at)}
                </TableCell>

                <TableCell>
                  <div>
                    <LinkRestaurant cerere={cerere} />
                    <span className="ml-1.5 text-sm text-muted-foreground">
                      · {cerere.zone_nume}
                    </span>
                  </div>
                  {cerere.descriere && (
                    <div className="max-w-md text-xs text-muted-foreground">{cerere.descriere}</div>
                  )}
                  <ContactAdminCerere contact={contacte.data?.[cerere.restaurant_id]} />
                </TableCell>

                <TableCell className="align-top">
                  {cerere.schita_image_url ? (
                    <Schita cale={cerere.schita_image_url} />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="align-top">
                  <div className="flex flex-wrap justify-end gap-1">
                    {cerere.schita_image_url && (
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={genereaza.isPending}
                        onClick={() => genereaza.mutate(cerere.id)}
                      >
                        <SparklesIcon />
                        {genereaza.isPending && genereaza.variables === cerere.id
                          ? 'Generează...'
                          : 'Generează AI'}
                      </Button>
                    )}
                    <Button
                      size="xs"
                      disabled={preia.isPending}
                      onClick={() => preia.mutate(cerere)}
                    >
                      <LayoutGridIcon />
                      Preia în lucru
                    </Button>
                    <Button
                      variant="destructive"
                      size="xs"
                      onClick={() => setRespingere(cerere)}
                    >
                      Respinge
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Preluarea mută cererea în Projects și deschide direct editorul. Fiecare schimbare de status
        notifică automat restaurantul.
      </p>

      {respingere && (
        <DialogRespingere
          cerere={respingere}
          inLucru={respinge.isPending}
          onInchide={() => setRespingere(null)}
          onConfirma={(motiv) => respinge.mutate({ id: respingere.id, motiv })}
        />
      )}
    </>
  )
}

/** Statusul platii tine de restaurant (taxa de setup), nu de cererea in sine. */
function StatusPlata({ platit }: { platit: boolean | undefined }) {
  if (platit === undefined) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
        platit ? 'bg-status-liber-soft text-foreground' : 'bg-status-expirare-soft text-foreground'
      }`}
    >
      {platit ? 'Plătit' : 'Neplătit'}
    </span>
  )
}

/** Sectiunea 2: cererile preluate — in lucru, publicate, respinse. */
function Projects() {
  const notificari = useNotificari()
  const queryClient = useQueryClient()

  const proiecte = useQuery({ queryKey: CHEI_FP.proiecte, queryFn: getProiecteCereri })
  const contacte = useContacte(proiecte.data)

  const publica = useMutation({
    mutationFn: publicaCerere,
    onSuccess: () => {
      notificari.succes('Cererea e marcată publicată. Restaurantul a fost notificat.')
      void queryClient.invalidateQueries({ queryKey: CHEI_FP.proiecte })
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  if (proiecte.isLoading) return <Skeleton className="h-48 w-full" />

  if ((proiecte.data ?? []).length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Niciun proiect încă. Cererile preluate din Queue apar aici, cu data solicitării, data
        preluării și starea lor.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Solicitată</TableHead>
            <TableHead className="w-28">Preluată</TableHead>
            <TableHead>Restaurant, zonă și contact</TableHead>
            <TableHead className="w-24">Plată</TableHead>
            <TableHead className="w-48">Status proiect</TableHead>
            <TableHead className="w-52 text-right">Editor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(proiecte.data ?? []).map((cerere) => (
            <TableRow key={cerere.id}>
              <TableCell className="align-top text-xs text-muted-foreground tabular-nums">
                {dataOra(cerere.created_at)}
              </TableCell>

              <TableCell className="align-top text-xs text-muted-foreground tabular-nums">
                {/* Respinsa direct din Queue: nu a fost niciodata preluata. */}
                {cerere.preluat_la ? dataOra(cerere.preluat_la) : '—'}
              </TableCell>

              <TableCell>
                <div>
                  <LinkRestaurant cerere={cerere} />
                  <span className="ml-1.5 text-sm text-muted-foreground">
                    · {cerere.zone_nume}
                  </span>
                </div>
                <ContactAdminCerere contact={contacte.data?.[cerere.restaurant_id]} />
              </TableCell>

              <TableCell className="align-top">
                <StatusPlata platit={cerere.restaurant?.setup_floor_plan_platit} />
              </TableCell>

              <TableCell className="align-top">
                {cerere.status === 'published' && (
                  <>
                    <span className="inline-flex rounded-md bg-status-liber-soft px-2 py-0.5 text-xs font-medium text-foreground">
                      Publicat
                    </span>
                    {cerere.publicat_la && (
                      <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                        {dataOra(cerere.publicat_la)}
                      </div>
                    )}
                  </>
                )}

                {cerere.status === 'in_progress' && (
                  <span className="inline-flex rounded-md bg-status-expirare-soft px-2 py-0.5 text-xs font-medium text-foreground">
                    În lucru
                  </span>
                )}

                {cerere.status === 'respins' && (
                  <>
                    <span className="inline-flex rounded-md bg-status-ocupat-soft px-2 py-0.5 text-xs font-medium text-foreground">
                      Respins
                    </span>
                    {cerere.motiv_respingere && (
                      <div className="mt-1 max-w-56 text-xs text-muted-foreground">
                        {cerere.motiv_respingere}
                      </div>
                    )}
                  </>
                )}
              </TableCell>

              <TableCell className="align-top">
                <div className="flex flex-wrap justify-end gap-1">
                  {/* Publicarea inchide bucla: fara ea cererea ar ramane vesnic
                      „în lucru", iar Adminul nu ar afla niciodata ca planul lui
                      e gata. Geometria se publica separat, din editor. */}
                  {cerere.status === 'in_progress' && (
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={publica.isPending}
                      onClick={() => publica.mutate(cerere.id)}
                    >
                      Marchează publicat
                    </Button>
                  )}
                  <Button variant="outline" size="xs" asChild>
                    <Link to={RUTE.superadminEditor(cerere.restaurant_id)}>
                      <LayoutGridIcon />
                      Editor
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** Tab 3 (§9.2.2): acces direct la planul oricarui restaurant, fara cerere. */
function BuilderDirect() {
  const [caut, setCaut] = useState('')
  const restaurante = useQuery({ queryKey: CHEI_SA.restaurante, queryFn: getRestaurante })

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

  if (restaurante.isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="grid gap-3">
      <div className="relative">
        <SearchIcon className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={caut}
          onChange={(e) => setCaut(e.target.value)}
          placeholder="Nume, adresă publică, oraș"
          className="h-8 w-64 pl-7"
          aria-label="Caut restaurante"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Restaurant</TableHead>
              <TableHead className="w-24">Plan</TableHead>
              <TableHead className="w-40 text-right">Editor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrate.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
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
                  </TableCell>
                  <TableCell className="text-sm">
                    {restaurant.plan === 'pro_floor' ? 'Pro' : 'Start'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="xs" asChild>
                      <Link to={RUTE.superadminEditor(restaurant.id)}>
                        <LayoutGridIcon />
                        Deschide planul
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function StudioPage() {
  const cereriNoi = useQuery({ queryKey: CHEI_FP.queue, queryFn: getCereriNoi })
  const proiecte = useQuery({ queryKey: CHEI_FP.proiecte, queryFn: getProiecteCereri })

  const inAsteptare = (cereriNoi.data ?? []).length
  const inLucru = (proiecte.data ?? []).filter((cerere) => cerere.status === 'in_progress').length

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <h1 className="mb-4 text-lg font-semibold tracking-tight">Floor Plan Studio</h1>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">
            Queue
            {inAsteptare > 0 && (
              <span className="ml-1.5 rounded-full bg-status-expirare px-1.5 text-[10px] font-semibold text-status-expirare-foreground tabular-nums">
                {inAsteptare}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="projects">
            Projects
            {inLucru > 0 && (
              <span className="ml-1.5 rounded-full bg-secondary px-1.5 text-[10px] font-semibold text-secondary-foreground tabular-nums">
                {inLucru}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="builder">Builder direct</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4">
          <Queue />
        </TabsContent>
        <TabsContent value="projects" className="mt-4">
          <Projects />
        </TabsContent>
        <TabsContent value="builder" className="mt-4">
          <BuilderDirect />
        </TabsContent>
      </Tabs>
    </div>
  )
}
