import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileTextIcon, LayoutGridIcon, SearchIcon, SparklesIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { genereazaPlanAI } from '@/services/studio-ai'
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
import { useNotificari } from '@/hooks/useNotificari'
import { ETICHETE_STATUS_CERERE_FP } from '@/lib/etichete'
import { RUTE } from '@/lib/rute'
import {
  CHEI_FP,
  getCoadaCereri,
  schimbaStatusCerere,
  urlSchita,
  type StatusCerere,
} from '@/services/floor-plan'
import { CHEI_SA, getRestaurante } from '@/services/super-admin'

/**
 * Floor Plan Studio (§9.2.2) — cele doua tab-uri din spec:
 *   1. Queue (§41): solicitarile restaurantelor, cele mai vechi primele,
 *      fara atribuire formala (§41.2 — oricine din echipa preia orice).
 *   2. Builder Direct: selector rapid peste toate restaurantele, intrare
 *      directa in editorul de plan — reconfigurari la cererea clientilor.
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

function CoadaCereri() {
  const notificari = useNotificari()
  const queryClient = useQueryClient()
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
          `Best Guess gata: ${rezultat.elemente} elemente de structura, ${rezultat.mese} mese.`,
          { descriere: 'Deschide editorul si finiseaza peste schita.' },
        )
      } else {
        notificari.atentie(rezultat.motiv)
      }
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  if (cereri.isLoading) return <Skeleton className="h-48 w-full" />

  if ((cereri.data ?? []).length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Nicio cerere de plan 2D. Cererile trimise din panoul restaurantelor apar aici, cele mai
        vechi primele.
      </p>
    )
  }

  return (
    <>
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
                    <div className="max-w-md text-xs text-muted-foreground">{cerere.descriere}</div>
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
                    {cerere.schita_image_url && (
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={genereaza.isPending}
                        onClick={() => genereaza.mutate(cerere.id)}
                      >
                        <SparklesIcon />
                        {genereaza.isPending && genereaza.variables === cerere.id
                          ? 'Genereaza...'
                          : 'Genereaza AI'}
                      </Button>
                    )}
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
                        onClick={() => statusCerere.mutate({ id: cerere.id, status: 'in_progress' })}
                      >
                        Preia in lucru
                      </Button>
                    )}
                    {cerere.status === 'in_progress' && (
                      <Button
                        size="xs"
                        onClick={() => statusCerere.mutate({ id: cerere.id, status: 'published' })}
                      >
                        Marcheaza publicat
                      </Button>
                    )}
                    {cerere.status !== 'published' && cerere.status !== 'respins' && (
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => statusCerere.mutate({ id: cerere.id, status: 'respins' })}
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
      <p className="mt-2 text-xs text-muted-foreground">
        Fiecare schimbare de status notifica automat restaurantul. Publicarea propriu-zisa a
        geometriei (zone si mese) se face in editorul de floor plan, separat.
      </p>
    </>
  )
}

/** Tab 2 (§9.2.2): acces direct la planul oricarui restaurant, fara cerere. */
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
          placeholder="Nume, adresa publica, oras"
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
  const cereri = useQuery({ queryKey: CHEI_FP.coada, queryFn: getCoadaCereri })
  const inAsteptare = (cereri.data ?? []).filter((c) => c.status === 'pending').length

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <h1 className="mb-4 text-lg font-semibold tracking-tight">Floor Plan Studio</h1>

      <Tabs defaultValue="coada">
        <TabsList>
          <TabsTrigger value="coada">
            Queue
            {inAsteptare > 0 && (
              <span className="ml-1.5 rounded-full bg-status-expirare px-1.5 text-[10px] font-semibold text-status-expirare-foreground tabular-nums">
                {inAsteptare}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="builder">Builder direct</TabsTrigger>
        </TabsList>

        <TabsContent value="coada" className="mt-4">
          <CoadaCereri />
        </TabsContent>
        <TabsContent value="builder" className="mt-4">
          <BuilderDirect />
        </TabsContent>
      </Tabs>
    </div>
  )
}
