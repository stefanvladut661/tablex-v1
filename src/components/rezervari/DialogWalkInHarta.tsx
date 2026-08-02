import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'

import { HartaZona } from '@/components/floor-plan/HartaZona'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDisponibilitate, useMese, useStructura, useZone } from '@/hooks/useMese'
import { useNotificari } from '@/hooks/useNotificari'
import { CHEI_REZERVARI, creeazaRezervare } from '@/services/rezervari'
import type { MasaHarta, StatusuriMese } from '@/types/floor-plan'

/**
 * Walk-In-ul din Calendar (§25.6): modal cu Harta 2D live in miniatura —
 * personalul pune numarul de persoane si da click DIRECT pe masa, nu alege
 * dintr-un dropdown text (spec-ul il interzice explicit aici).
 *
 * „Libera acum" vine din RPC-ul disponibilitate_mese — aceeasi socoteala cu
 * buffer si suprapuneri ca peste tot; clientul nu reimplementeaza regula.
 * Blocarea instant pe harta principala si pe widget (§25.6) e Realtime-ul
 * existent: INSERT-ul in reservations invalideaza ambele.
 */
export function DialogWalkInHarta({
  restaurantId,
  onInchide,
}: {
  restaurantId: string
  onInchide: () => void
}) {
  const notificari = useNotificari()
  const queryClient = useQueryClient()

  const [nume, setNume] = useState('')
  const [nrPersoane, setNrPersoane] = useState(2)
  const [zonaId, setZonaId] = useState<string | null>(null)

  // Momentul e „acum", inghetat la deschiderea modalului: altfel fiecare
  // re-randare ar cere alta disponibilitate si lista ar tremura.
  const [acum] = useState(() => new Date())

  const zone = useZone(restaurantId)
  const mese = useMese(restaurantId)
  const structura = useStructura(restaurantId)

  const zonaCurenta = zone.data?.find((z) => z.id === zonaId) ?? zone.data?.[0] ?? null
  const disponibilitate = useDisponibilitate(restaurantId, zonaCurenta?.id ?? null, acum)

  const meseZona: MasaHarta[] = useMemo(
    () => (mese.data ?? []).filter((masa) => masa.zone_id === zonaCurenta?.id),
    [mese.data, zonaCurenta?.id],
  )

  const libere = useMemo(() => {
    const set = new Set<string>()
    for (const masa of disponibilitate.data ?? []) {
      if (masa.libera) set.add(masa.table_id)
    }
    return set
  }, [disponibilitate.data])

  /** Ce NU e liber acum se coloreaza ocupat — restul raman verzi, clickabile. */
  const statusuri: StatusuriMese = useMemo(() => {
    const rezultat: StatusuriMese = {}
    for (const masa of meseZona) {
      if (!libere.has(masa.id)) rezultat[masa.id] = 'ocupat'
    }
    return rezultat
  }, [meseZona, libere])

  const nicioLibera =
    !disponibilitate.isLoading && meseZona.length > 0 && meseZona.every((m) => !libere.has(m.id))

  const creeaza = useMutation({
    mutationFn: (tableId: string) =>
      creeazaRezervare({
        // §25.6 cere doar numarul de persoane; numele ramane optional.
        clientNume: nume.trim() || 'Walk-in',
        telefon: null,
        nrPersoane,
        dataOra: new Date(),
        tableId,
        zoneId: zonaCurenta?.id ?? null,
        status: 'sosita',
        sursa: 'walk_in',
      }),
    onSuccess: () => {
      notificari.succes('Walk-in asezat. Masa s-a blocat pe harta.')
      void queryClient.invalidateQueries({ queryKey: CHEI_REZERVARI.toate(restaurantId) })
      onInchide()
    },
    // Masa ocupata intre timp → 23P01, tradus in lib/erori.ts. Modalul ramane
    // deschis, iar disponibilitatea se reciteste ca omul sa aleaga alta masa.
    onError: (eroare) => {
      notificari.eroare(eroare)
      void disponibilitate.refetch()
    },
  })

  function laClickMasa(tableId: string) {
    if (creeaza.isPending) return
    if (!libere.has(tableId)) {
      notificari.info('Masa e ocupata acum. Alege una verde.')
      return
    }
    creeaza.mutate(tableId)
  }

  const seIncarca = zone.isLoading || mese.isLoading || disponibilitate.isLoading

  return (
    <Dialog open onOpenChange={(deschis) => !deschis && onInchide()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Walk-in</DialogTitle>
          <DialogDescription>
            Pune numarul de persoane, apoi da click pe masa dorita. Masa se blocheaza instant,
            inclusiv pe widgetul public.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="walkin-persoane">Persoane</Label>
              <Input
                id="walkin-persoane"
                type="number"
                min={1}
                max={50}
                value={nrPersoane}
                onChange={(e) => setNrPersoane(Math.max(1, Number(e.target.value) || 1))}
                className="h-9 w-24 tabular-nums"
              />
            </div>
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="walkin-nume">Nume (optional)</Label>
              <Input
                id="walkin-nume"
                value={nume}
                onChange={(e) => setNume(e.target.value)}
                placeholder="Walk-in"
                className="h-9"
              />
            </div>
          </div>

          {seIncarca ? (
            <Skeleton className="aspect-[3/2] w-full" />
          ) : !zone.data?.length || meseZona.length === 0 ? (
            <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
              Nu exista mese configurate pe harta. Walk-in-ul se poate inregistra si fara masa,
              din butonul Rezervare.
            </p>
          ) : (
            <>
              {(zone.data?.length ?? 0) > 1 && (
                <Tabs value={zonaCurenta?.id ?? ''} onValueChange={setZonaId}>
                  <TabsList>
                    {zone.data!.map((z) => (
                      <TabsTrigger key={z.id} value={z.id}>
                        {z.nume}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}

              {/* §25.7 — fara mese libere: mesaj simplu, fara auto-Waitlist. */}
              {nicioLibera && (
                <p className="rounded-lg border border-status-expirare bg-status-expirare-soft p-3 text-sm">
                  Nu exista mese libere momentan. Poti adauga clientul in lista de asteptare, din
                  Harta salii.
                </p>
              )}

              {zonaCurenta && (
                <div className="relative">
                  <HartaZona
                    zona={zonaCurenta}
                    structura={structura.data?.[zonaCurenta.id] ?? []}
                    mese={meseZona}
                    statusuri={statusuri}
                    onSelecteazaMasa={laClickMasa}
                    className="aspect-[3/2] w-full"
                  />
                  {creeaza.isPending && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                      <Loader2Icon className="size-6 animate-spin" aria-label="Se aseaza" />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={onInchide}>
              Renunta
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
