import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, Trash2Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { useNotificari } from '@/hooks/useNotificari'
import {
  BUGET_LUNAR_META_SIMULAT,
  CHEI_WHATSAPP,
  creeazaSablonWhatsApp,
  getJurnalMesaje,
  getSabloaneWhatsApp,
  mesajeTrimiseLunaAsta,
  stergeSablonWhatsApp,
} from '@/services/whatsapp'
import type { Enums } from '@/types/database'

/**
 * Communications — WhatsApp & Communications Gateway (§9.2.5, §45).
 *
 * Trimiterea reala prin Meta Cloud API ramane interzisa in v1 (§14): balanta
 * Meta e simulata si spune asta cu subiect si predicat; jurnalul insa e cel
 * REAL — randurile scrise de consuma_credit, cu erorile lor cu tot (§45.3).
 */

const ETICHETE_STATUS_MESAJ: Record<Enums<'wa_mesaj_status'>, string> = {
  trimis: 'Trimis',
  esuat: 'Esuat',
  fara_credite: 'Fara credite',
  simulat: 'Simulat',
}

const CLASE_STATUS_MESAJ: Record<Enums<'wa_mesaj_status'>, string> = {
  trimis: 'bg-status-liber-soft text-foreground',
  esuat: 'bg-status-ocupat-soft text-foreground',
  fara_credite: 'bg-status-expirare-soft text-foreground',
  simulat: 'bg-secondary text-secondary-foreground',
}

function dataOra(iso: string): string {
  return new Date(iso).toLocaleString('ro-RO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Balanta Meta (§45.1): grafic simplu — procent ramas din bugetul lunar. */
function BalantaMeta() {
  const jurnal = useQuery({ queryKey: CHEI_WHATSAPP.jurnal, queryFn: () => getJurnalMesaje() })

  const consumate = mesajeTrimiseLunaAsta(jurnal.data ?? [])
  const ramase = Math.max(0, BUGET_LUNAR_META_SIMULAT - consumate)
  const procent = Math.round((ramase / BUGET_LUNAR_META_SIMULAT) * 100)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Balanta Meta</CardTitle>
        <CardDescription>
          Buget lunar simulat (§14) — consumul e cel real din jurnalul de mai jos.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {jurnal.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold tabular-nums">
                {ramase}
                <span className="text-sm font-normal text-muted-foreground">
                  {' '}
                  / {BUGET_LUNAR_META_SIMULAT} mesaje
                </span>
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">{procent}% ramas</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${
                  procent > 30
                    ? 'bg-status-liber'
                    : procent > 10
                      ? 'bg-status-expirare'
                      : 'bg-status-ocupat'
                }`}
                style={{ width: `${procent}%` }}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

/** Template Manager (§45.2): nume + continut, fara variabile, fara aprobare. */
function TemplateManager() {
  const { utilizator } = useAuth()
  const notificari = useNotificari()
  const queryClient = useQueryClient()
  const [nume, setNume] = useState('')
  const [continut, setContinut] = useState('')

  const sabloane = useQuery({ queryKey: CHEI_WHATSAPP.sabloane, queryFn: getSabloaneWhatsApp })

  const invalideaza = () =>
    queryClient.invalidateQueries({ queryKey: CHEI_WHATSAPP.sabloane })

  const creeaza = useMutation({
    mutationFn: () => creeazaSablonWhatsApp(nume.trim(), continut.trim(), utilizator?.id ?? ''),
    onSuccess: () => {
      notificari.succes('Sablon salvat.')
      setNume('')
      setContinut('')
      void invalideaza()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const sterge = useMutation({
    mutationFn: stergeSablonWhatsApp,
    onSuccess: () => void invalideaza(),
    onError: (eroare) => notificari.eroare(eroare),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Template Manager</CardTitle>
        <CardDescription>
          Lista de referinta pentru sabloanele oficiale — se trimit spre aprobare Meta cand se
          conecteaza integrarea.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (nume.trim() && continut.trim()) creeaza.mutate()
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="nume-sablon">Nume sablon</Label>
            <Input
              id="nume-sablon"
              value={nume}
              onChange={(e) => setNume(e.target.value)}
              placeholder="Ex: Confirmare Rezervare"
              className="h-9"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="continut-sablon">Continut mesaj</Label>
            <Textarea
              id="continut-sablon"
              rows={3}
              value={continut}
              onChange={(e) => setContinut(e.target.value)}
              placeholder="Ex: Rezervarea ta la restaurant a fost confirmata. Te asteptam!"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="justify-self-start"
            disabled={creeaza.isPending || !nume.trim() || !continut.trim()}
          >
            <PlusIcon />
            Salveaza sablonul
          </Button>
        </form>

        {sabloane.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (sabloane.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Niciun sablon inca.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {(sabloane.data ?? []).map((sablon) => (
              <li key={sablon.id} className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{sablon.nume}</p>
                  <p className="text-xs text-muted-foreground">{sablon.continut}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Sterge sablonul ${sablon.nume}`}
                  onClick={() => sterge.mutate(sablon.id)}
                  disabled={sterge.isPending}
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

/** System Logs (§45.3): jurnalul REAL al mesajelor, cu erori cu tot. */
function SystemLogs() {
  const jurnal = useQuery({ queryKey: CHEI_WHATSAPP.jurnal, queryFn: () => getJurnalMesaje() })

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">System Logs</CardTitle>
        <CardDescription>
          Starea tuturor mesajelor din retea, cu erorile lor. In v1 niciun mesaj nu pleaca real
          (§14) — randurile arata ce S-AR fi trimis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {jurnal.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (jurnal.data ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Niciun mesaj in jurnal. Randurile apar cand restaurantele trimit notificari WhatsApp.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Cand</TableHead>
                  <TableHead>Restaurant</TableHead>
                  <TableHead>Sablon</TableHead>
                  <TableHead className="w-32">Telefon</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead>Eroare</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(jurnal.data ?? []).map((mesaj) => (
                  <TableRow key={mesaj.id}>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {dataOra(mesaj.created_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {mesaj.restaurant?.nume ?? 'Restaurant sters'}
                    </TableCell>
                    <TableCell className="text-sm">{mesaj.sablon}</TableCell>
                    <TableCell className="text-xs tabular-nums">{mesaj.telefon}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${CLASE_STATUS_MESAJ[mesaj.status]}`}
                      >
                        {ETICHETE_STATUS_MESAJ[mesaj.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-destructive">{mesaj.eroare ?? ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ComunicariPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <h1 className="mb-4 text-lg font-semibold tracking-tight">Communications</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <BalantaMeta />
        <TemplateManager />
        <SystemLogs />
      </div>
    </div>
  )
}
