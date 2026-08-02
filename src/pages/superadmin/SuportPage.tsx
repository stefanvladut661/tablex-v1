import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LockIcon, PlusIcon, SendIcon, Trash2Icon, ZapIcon } from 'lucide-react'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { useNotificari } from '@/hooks/useNotificari'
import {
  CHEI_SUPORT,
  creeazaSablon,
  getFir,
  getInbox,
  getSabloane,
  raspunde,
  schimbaTicket,
  stergeSablon,
  type Ticket,
} from '@/services/suport'
import type { Enums } from '@/types/database'

/**
 * Support & Ticketing (§9.2.6, §46): inbox stil Gmail/Helpdesk — lista de
 * tichete in stanga, conversatia deschisa in dreapta (§46.1). Sortarea o face
 * baza (§46.3: prioritate, apoi vechime); Realtime-ul e canalul echipei din
 * LayoutSuperAdmin, care invalideaza prefixul ['sa', 'suport'].
 *
 * Notele interne (§46.4) sunt galbene si marcate cu lacat — dar separarea de
 * restaurant o face RLS-ul, nu culoarea.
 */

const ETICHETE_STATUS: Record<Enums<'support_status'>, string> = {
  nou: 'Nou',
  deschis: 'Deschis',
  in_lucru: 'În lucru',
  rezolvat: 'Rezolvat',
  inchis: 'Închis',
}

const ETICHETE_PRIORITATE: Record<Enums<'support_prioritate'>, string> = {
  nou: 'Nou',
  urgent: 'Urgent',
  normal: 'Normal',
}

const CLASE_PRIORITATE: Record<Enums<'support_prioritate'>, string> = {
  urgent: 'bg-status-ocupat-soft text-foreground',
  nou: 'bg-primary/15 text-foreground',
  normal: 'bg-secondary text-secondary-foreground',
}

function dataOra(iso: string): string {
  return new Date(iso).toLocaleString('ro-RO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Sabloanele de raspuns rapid (§46.2): gestionare + inserare 1-click. */
function DialogSabloane({
  onInchide,
  onFoloseste,
}: {
  onInchide: () => void
  onFoloseste: (continut: string) => void
}) {
  const { utilizator, profil } = useAuth()
  const notificari = useNotificari()
  const queryClient = useQueryClient()
  const [titlu, setTitlu] = useState('')
  const [continut, setContinut] = useState('')
  const [global, setGlobal] = useState(false)

  const esteDeplin = profil?.tip === 'super_admin' && profil.cont.rol === 'super_admin'
  const sabloane = useQuery({ queryKey: CHEI_SUPORT.sabloane, queryFn: getSabloane })

  const invalideaza = () => queryClient.invalidateQueries({ queryKey: CHEI_SUPORT.sabloane })

  const creeaza = useMutation({
    mutationFn: () =>
      creeazaSablon(titlu.trim(), continut.trim(), global ? null : (utilizator?.id ?? '')),
    onSuccess: () => {
      notificari.succes('Șablon salvat.')
      setTitlu('')
      setContinut('')
      void invalideaza()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const sterge = useMutation({
    mutationFn: stergeSablon,
    onSuccess: () => void invalideaza(),
    onError: (eroare) => notificari.eroare(eroare),
  })

  return (
    <Dialog open onOpenChange={(deschis) => !deschis && onInchide()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Șabloane de răspuns rapid</DialogTitle>
          <DialogDescription>
            Personale sau globale pentru toată echipa. Un click le pune în răspuns.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {sabloane.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (sabloane.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Niciun șablon încă.</p>
          ) : (
            <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {(sabloane.data ?? []).map((sablon) => (
                <li key={sablon.id} className="flex items-start gap-2 p-2.5">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onFoloseste(sablon.continut)}
                  >
                    <p className="text-sm font-medium">
                      {sablon.titlu}
                      {sablon.super_admin_user_id === null && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          · global
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{sablon.continut}</p>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Șterge șablonul ${sablon.titlu}`}
                    onClick={() => sterge.mutate(sablon.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <form
            className="grid gap-3 rounded-lg border border-border p-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (titlu.trim() && continut.trim()) creeaza.mutate()
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="titlu-sablon">Titlu</Label>
              <Input
                id="titlu-sablon"
                value={titlu}
                onChange={(e) => setTitlu(e.target.value)}
                placeholder="Ex: Resetare parolă ospătar"
                className="h-9"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="continut-sablon-suport">Conținut</Label>
              <Textarea
                id="continut-sablon-suport"
                rows={2}
                value={continut}
                onChange={(e) => setContinut(e.target.value)}
              />
            </div>
            {esteDeplin && (
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="sablon-global" className="text-sm font-normal">
                  Global, pentru toată echipa
                </Label>
                <Switch id="sablon-global" checked={global} onCheckedChange={setGlobal} />
              </div>
            )}
            <Button
              type="submit"
              size="sm"
              className="justify-self-start"
              disabled={creeaza.isPending || !titlu.trim() || !continut.trim()}
            >
              <PlusIcon />
              Salvează
            </Button>
          </form>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onInchide}>
            Închide
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Conversatie({ ticket }: { ticket: Ticket }) {
  const { utilizator } = useAuth()
  const notificari = useNotificari()
  const queryClient = useQueryClient()
  const [mesaj, setMesaj] = useState('')
  const [notaInterna, setNotaInterna] = useState(false)
  const [sabloaneDeschise, setSabloaneDeschise] = useState(false)
  const capatFir = useRef<HTMLDivElement>(null)

  const fir = useQuery({
    queryKey: CHEI_SUPORT.fir(ticket.id),
    queryFn: () => getFir(ticket.id),
  })

  useEffect(() => {
    capatFir.current?.scrollIntoView({ block: 'end' })
  }, [fir.data])

  const invalideaza = () => {
    void queryClient.invalidateQueries({ queryKey: CHEI_SUPORT.fir(ticket.id) })
    void queryClient.invalidateQueries({ queryKey: CHEI_SUPORT.inbox })
  }

  const trimite = useMutation({
    mutationFn: () => raspunde(ticket.id, utilizator?.id ?? '', mesaj.trim(), notaInterna),
    onSuccess: () => {
      setMesaj('')
      setNotaInterna(false)
      invalideaza()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const schimba = useMutation({
    mutationFn: (modificari: Parameters<typeof schimbaTicket>[1]) =>
      schimbaTicket(ticket.id, modificari),
    onSuccess: invalideaza,
    onError: (eroare) => notificari.eroare(eroare),
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{ticket.subiect}</p>
          <p className="text-xs text-muted-foreground">
            {ticket.restaurant?.nume ?? 'Restaurant șters'} · deschis {dataOra(ticket.created_at)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={ticket.prioritate}
            onValueChange={(prioritate) =>
              schimba.mutate({ prioritate: prioritate as Enums<'support_prioritate'> })
            }
          >
            <SelectTrigger className="h-8 w-28" aria-label="Prioritate">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ETICHETE_PRIORITATE) as Array<Enums<'support_prioritate'>>).map(
                (prioritate) => (
                  <SelectItem key={prioritate} value={prioritate}>
                    {ETICHETE_PRIORITATE[prioritate]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>

          <Select
            value={ticket.status}
            onValueChange={(status) =>
              schimba.mutate({ status: status as Enums<'support_status'> })
            }
          >
            <SelectTrigger className="h-8 w-28" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ETICHETE_STATUS) as Array<Enums<'support_status'>>).map((status) => (
                <SelectItem key={status} value={status}>
                  {ETICHETE_STATUS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {fir.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <ol className="grid gap-2">
            {(fir.data ?? []).map((intrare) => (
              <li
                key={intrare.id}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  intrare.nota_interna
                    ? 'justify-self-end border border-status-expirare bg-status-expirare-soft'
                    : intrare.de_la_echipa
                      ? 'justify-self-end bg-primary text-primary-foreground'
                      : 'justify-self-start bg-secondary text-secondary-foreground'
                }`}
              >
                {intrare.nota_interna && (
                  <p className="mb-0.5 flex items-center gap-1 text-xs font-medium">
                    <LockIcon className="size-3" aria-hidden="true" />
                    Notă internă — doar echipa TableX
                  </p>
                )}
                <p className="whitespace-pre-wrap">{intrare.continut}</p>
                <p
                  className={`mt-1 text-right text-[10px] tabular-nums ${
                    intrare.de_la_echipa && !intrare.nota_interna
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
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
        className="grid gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (mesaj.trim()) trimite.mutate()
        }}
      >
        <Textarea
          rows={2}
          value={mesaj}
          onChange={(e) => setMesaj(e.target.value)}
          placeholder={
            notaInterna ? 'Notă internă — restaurantul nu o vede...' : 'Răspunde restaurantului...'
          }
          aria-label="Mesaj"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Switch checked={notaInterna} onCheckedChange={setNotaInterna} />
              Notă internă (§46.4)
            </label>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setSabloaneDeschise(true)}
            >
              <ZapIcon />
              Șabloane
            </Button>
          </div>
          <Button type="submit" size="sm" disabled={trimite.isPending || !mesaj.trim()}>
            <SendIcon />
            {notaInterna ? 'Salvează nota' : 'Trimite'}
          </Button>
        </div>
      </form>

      {sabloaneDeschise && (
        <DialogSabloane
          onInchide={() => setSabloaneDeschise(false)}
          onFoloseste={(continut) => {
            setMesaj((existent) => (existent.trim() ? `${existent}\n${continut}` : continut))
            setSabloaneDeschise(false)
          }}
        />
      )}
    </div>
  )
}

export function SuportPage() {
  const [ticketAles, setTicketAles] = useState<string | null>(null)

  const inbox = useQuery({ queryKey: CHEI_SUPORT.inbox, queryFn: getInbox })
  const tichete = inbox.data ?? []
  const ticket = tichete.find((t) => t.id === ticketAles) ?? tichete[0] ?? null

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <h1 className="mb-4 text-lg font-semibold tracking-tight">Support & Ticketing</h1>

      {inbox.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : tichete.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Niciun tichet. Managerii deschid tichete din panoul lor (Setări → Ajutor & suport), iar
          conversațiile apar aici, cele urgente primele.
        </p>
      ) : (
        // Inbox stil Gmail (§46.1): lista in stanga, threadul in dreapta.
        <div className="grid min-h-[28rem] overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-[20rem_1fr]">
          <ol className="max-h-[36rem] divide-y divide-border overflow-y-auto border-b border-border lg:border-r lg:border-b-0">
            {tichete.map((intrare) => (
              <li key={intrare.id}>
                <button
                  type="button"
                  onClick={() => setTicketAles(intrare.id)}
                  className={`grid w-full gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-accent/50 ${
                    ticket?.id === intrare.id ? 'bg-accent/70' : ''
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {intrare.restaurant?.nume ?? 'Restaurant șters'}
                    </span>
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${CLASE_PRIORITATE[intrare.prioritate]}`}
                    >
                      {ETICHETE_PRIORITATE[intrare.prioritate]}
                    </span>
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{intrare.subiect}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {ETICHETE_STATUS[intrare.status]} · {dataOra(intrare.created_at)}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          {ticket ? (
            <Conversatie key={ticket.id} ticket={ticket} />
          ) : (
            <p className="p-6 text-sm text-muted-foreground">Alege un tichet din listă.</p>
          )}
        </div>
      )}
    </div>
  )
}
