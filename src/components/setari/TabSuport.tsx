import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, SendIcon } from 'lucide-react'

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
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { useNotificari } from '@/hooks/useNotificari'
import { supabase } from '@/lib/supabase'
import {
  CHEI_SUPORT,
  deschideTicket,
  getFir,
  getTicketeRestaurant,
  raspundeCaRestaurant,
  type TicketRestaurant,
} from '@/services/suport'
import type { Enums } from '@/types/database'

/**
 * Ajutor & suport in portalul Admin (§46.1: „tichete generate din
 * dashboard-ul Admin-ilor"). Managerul deschide un tichet si converseaza cu
 * echipa TableX; notele interne ale echipei nu ajung aici — le opreste RLS-ul
 * (migratia support_ticketing), nu interfata.
 */

const ETICHETE_STATUS: Record<Enums<'support_status'>, string> = {
  nou: 'Trimis',
  deschis: 'Deschis',
  in_lucru: 'In lucru',
  rezolvat: 'Rezolvat',
  inchis: 'Inchis',
}

function dataOra(iso: string): string {
  return new Date(iso).toLocaleString('ro-RO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DialogTicketNou({
  restaurantId,
  onInchide,
}: {
  restaurantId: string
  onInchide: () => void
}) {
  const { utilizator } = useAuth()
  const notificari = useNotificari()
  const queryClient = useQueryClient()
  const [subiect, setSubiect] = useState('')
  const [mesaj, setMesaj] = useState('')

  const deschide = useMutation({
    mutationFn: () =>
      deschideTicket(restaurantId, utilizator?.id ?? '', subiect.trim(), mesaj.trim()),
    onSuccess: () => {
      notificari.succes('Tichetul a fost trimis. Echipa TableX raspunde aici, in conversatie.')
      void queryClient.invalidateQueries({
        queryKey: CHEI_SUPORT.aleRestaurantului(restaurantId),
      })
      onInchide()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  return (
    <Dialog open onOpenChange={(deschis) => !deschis && onInchide()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tichet nou catre echipa TableX</DialogTitle>
          <DialogDescription>
            Descrie problema; echipa primeste tichetul imediat si raspunde in conversatie.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="subiect">Subiect</Label>
            <Input
              id="subiect"
              value={subiect}
              onChange={(e) => setSubiect(e.target.value)}
              placeholder="Ex: Nu pot muta masa 12 pe terasa"
              className="h-9"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mesaj-ticket">Mesaj</Label>
            <Textarea
              id="mesaj-ticket"
              rows={4}
              value={mesaj}
              onChange={(e) => setMesaj(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onInchide}>
            Renunta
          </Button>
          <Button
            disabled={deschide.isPending || !subiect.trim() || !mesaj.trim()}
            onClick={() => deschide.mutate()}
          >
            Trimite tichetul
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Conversatie({ ticket }: { ticket: TicketRestaurant }) {
  const { utilizator } = useAuth()
  const notificari = useNotificari()
  const queryClient = useQueryClient()
  const [mesaj, setMesaj] = useState('')
  const capatFir = useRef<HTMLDivElement>(null)

  const fir = useQuery({
    queryKey: CHEI_SUPORT.firRestaurant(ticket.id),
    queryFn: () => getFir(ticket.id),
  })

  useEffect(() => {
    capatFir.current?.scrollIntoView({ block: 'end' })
  }, [fir.data])

  // Chat realtime (§46.1): raspunsurile echipei apar fara reload.
  useEffect(() => {
    const canal = supabase
      .channel(`ticket-${ticket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_mesaje',
          filter: `ticket_id=eq.${ticket.id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: CHEI_SUPORT.firRestaurant(ticket.id) })
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(canal)
    }
  }, [ticket.id, queryClient])

  const trimite = useMutation({
    mutationFn: () => raspundeCaRestaurant(ticket.id, utilizator?.id ?? '', mesaj.trim()),
    onSuccess: () => {
      setMesaj('')
      void queryClient.invalidateQueries({ queryKey: CHEI_SUPORT.firRestaurant(ticket.id) })
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  return (
    <div className="grid gap-3">
      <div className="max-h-72 overflow-y-auto rounded-lg border border-border p-3">
        {fir.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <ol className="grid gap-2">
            {(fir.data ?? []).map((intrare) => (
              <li
                key={intrare.id}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  intrare.de_la_echipa
                    ? 'justify-self-start bg-secondary text-secondary-foreground'
                    : 'justify-self-end bg-primary text-primary-foreground'
                }`}
              >
                {intrare.de_la_echipa && (
                  <p className="mb-0.5 text-xs font-medium">Echipa TableX</p>
                )}
                <p className="whitespace-pre-wrap">{intrare.continut}</p>
                <p
                  className={`mt-1 text-right text-[10px] tabular-nums ${
                    intrare.de_la_echipa ? 'text-muted-foreground' : 'text-primary-foreground/70'
                  }`}
                >
                  {dataOra(intrare.created_at)}
                </p>
              </li>
            ))}
          </ol>
        )}
        <div ref={capatFir} />
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (mesaj.trim()) trimite.mutate()
        }}
      >
        <Input
          value={mesaj}
          onChange={(e) => setMesaj(e.target.value)}
          placeholder="Scrie un mesaj..."
          aria-label="Mesaj"
          className="h-9"
        />
        <Button type="submit" size="sm" disabled={trimite.isPending || !mesaj.trim()}>
          <SendIcon />
          Trimite
        </Button>
      </form>
    </div>
  )
}

export function TabSuport({ restaurantId }: { restaurantId: string }) {
  const [ticketNou, setTicketNou] = useState(false)
  const [ticketAles, setTicketAles] = useState<string | null>(null)

  const tichete = useQuery({
    queryKey: CHEI_SUPORT.aleRestaurantului(restaurantId),
    queryFn: () => getTicketeRestaurant(restaurantId),
  })

  const ticket =
    (tichete.data ?? []).find((t) => t.id === ticketAles) ?? (tichete.data ?? [])[0] ?? null

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Ajutor & suport</CardTitle>
          <CardDescription>
            Conversatii directe cu echipa TableX. Raspunsurile apar aici si in clopotelul de
            notificari.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setTicketNou(true)}>
          <PlusIcon />
          Tichet nou
        </Button>
      </CardHeader>

      <CardContent className="grid gap-4">
        {tichete.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (tichete.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Niciun tichet inca. Daca ceva nu merge sau ai o intrebare, deschide un tichet — echipa
            TableX il vede imediat.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {(tichete.data ?? []).map((intrare) => (
                <button
                  key={intrare.id}
                  type="button"
                  onClick={() => setTicketAles(intrare.id)}
                  className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors ${
                    ticket?.id === intrare.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-accent/50'
                  }`}
                >
                  <span className="block max-w-48 truncate font-medium">{intrare.subiect}</span>
                  <span className="text-muted-foreground">
                    {ETICHETE_STATUS[intrare.status]} · {dataOra(intrare.created_at)}
                  </span>
                </button>
              ))}
            </div>

            {ticket && <Conversatie key={ticket.id} ticket={ticket} />}
          </>
        )}
      </CardContent>

      {ticketNou && (
        <DialogTicketNou restaurantId={restaurantId} onInchide={() => setTicketNou(false)} />
      )}
    </Card>
  )
}
