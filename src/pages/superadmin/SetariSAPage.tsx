import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { EchipaTableX } from '@/components/superadmin/EchipaTableX'
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
import {
  CHEI_SA,
  actualizeazaSetariGlobale,
  getAudit,
  getSetariGlobale,
  type SetariGlobale,
} from '@/services/super-admin'
import type { Enums } from '@/types/database'

/**
 * Setari & roluri interne (§9.2.7, §47): echipa TableX, setarile globale si
 * registrul de audit. Sectiunea e vizibila doar rolului super_admin — §47.4
 * nu lasa nici designerului, nici suportului setarile de sistem.
 */

const ETICHETE_AUDIT: Record<Enums<'audit_actiune'>, string> = {
  suspend: 'Suspendare',
  unsuspend: 'Reactivare',
  ban: 'Banare',
  extend_trial: 'Prelungire trial',
  discount: 'Discount',
  manual_floor_plan_unlock: 'Deblocare floor plan',
  schimbare_plan: 'Schimbare plan',
  nota: 'Notă',
  schimbare_preturi: 'Schimbare prețuri',
  maintenance_toggle: 'Mentenanță',
}

const ETICHETE_PRET: Record<string, string> = {
  pret_plan_start: 'Plan Start (lunar)',
  pret_plan_pro: 'Plan Pro (lunar)',
  setup_floor_plan_pret: 'Configurare floor plan',
  setup_prag_mese: 'Mese incluse în configurare',
  setup_pret_masa_extra: 'Preț pe masă suplimentară',
  comision_bilete_procent: 'Comision bilete (%)',
}

type CheiePret = keyof typeof ETICHETE_PRET & keyof SetariGlobale

function dataOra(iso: string): string {
  return new Date(iso).toLocaleString('ro-RO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TabSetariGlobale() {
  const notificari = useNotificari()
  const queryClient = useQueryClient()
  const setari = useQuery({ queryKey: CHEI_SA.setari, queryFn: getSetariGlobale })

  /**
   * §47.3: schimbarea preturilor cere un popup de confirmare standard
   * (pattern §24.7) — fara flow intarit. Valoarea sta in asteptare pana la
   * confirmare; Renunta readuce campul la valoarea din baza.
   */
  const [confirmare, setConfirmare] = useState<{
    cheie: CheiePret
    valoare: number
  } | null>(null)

  const salveaza = useMutation({
    mutationFn: actualizeazaSetariGlobale,
    onSuccess: () => {
      notificari.succes('Setările globale au fost salvate.')
      setConfirmare(null)
      void queryClient.invalidateQueries({ queryKey: CHEI_SA.setari })
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  if (setari.isLoading || !setari.data) return <Skeleton className="h-64 w-full" />

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prețuri</CardTitle>
          <CardDescription>Se afișează imediat pe pagina publică de prezentare.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {(Object.keys(ETICHETE_PRET) as CheiePret[]).map((cheie) => (
            <div key={cheie} className="grid gap-1.5">
              <Label htmlFor={cheie}>{ETICHETE_PRET[cheie]}</Label>
              <Input
                id={cheie}
                type="number"
                step="0.01"
                min={0}
                // key: dupa Renunta, defaultValue se reaseaza la valoarea din baza.
                key={`${cheie}-${String(setari.data![cheie])}`}
                defaultValue={String(setari.data![cheie])}
                className="h-8 tabular-nums"
                onBlur={(e) => {
                  const valoare = Number(e.target.value)
                  if (!Number.isFinite(valoare) || valoare === setari.data![cheie]) return
                  setConfirmare({ cheie, valoare })
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mentenanță</CardTitle>
          <CardDescription>
            Când e pornită, panourile arată mesajul de mai jos în loc de aplicație.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
            <Label htmlFor="mentenanta">Mod mentenanță</Label>
            <Switch
              id="mentenanta"
              checked={setari.data.maintenance_mode}
              onCheckedChange={(activ) => salveaza.mutate({ maintenance_mode: activ })}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="mesaj">Mesaj afișat</Label>
            <Textarea
              id="mesaj"
              rows={3}
              defaultValue={setari.data.mesaj_mentenanta}
              onBlur={(e) => {
                if (e.target.value === setari.data!.mesaj_mentenanta) return
                salveaza.mutate({ mesaj_mentenanta: e.target.value })
              }}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="retentie">Retenție implicită (ani)</Label>
            <Input
              id="retentie"
              type="number"
              min={1}
              max={10}
              defaultValue={String(setari.data.retentie_ani_default)}
              className="h-8 w-24 tabular-nums"
              onBlur={(e) => {
                const valoare = Number(e.target.value)
                if (valoare === setari.data!.retentie_ani_default) return
                salveaza.mutate({ retentie_ani_default: valoare })
              }}
            />
            <p className="text-xs text-muted-foreground">
              Se aplică restaurantelor noi; cele existente își păstrează setarea.
            </p>
          </div>
        </CardContent>
      </Card>

      {confirmare && (
        <Dialog open onOpenChange={(deschis) => !deschis && setConfirmare(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmi noul preț?</DialogTitle>
              <DialogDescription>
                {ETICHETE_PRET[confirmare.cheie]}: {String(setari.data[confirmare.cheie])} →{' '}
                {confirmare.valoare}. Schimbarea se vede imediat pe pagina publică și intră în
                registrul de audit.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmare(null)}>
                Renunță
              </Button>
              <Button
                disabled={salveaza.isPending}
                onClick={() => salveaza.mutate({ [confirmare.cheie]: confirmare.valoare })}
              >
                Confirmă
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function TabRegistru() {
  const audit = useQuery({ queryKey: CHEI_SA.audit(), queryFn: () => getAudit() })

  if (audit.isLoading) return <Skeleton className="h-64 w-full" />

  if ((audit.data ?? []).length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Nicio intervenție înregistrată.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-36">Când</TableHead>
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
              <TableCell className="font-medium">{ETICHETE_AUDIT[intrare.actiune]}</TableCell>
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
  )
}

export function SetariSAPage() {
  const { profil, utilizator } = useAuth()

  if (!profil || profil.tip !== 'super_admin') return null

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <h1 className="mb-4 text-lg font-semibold tracking-tight">Setări & echipă</h1>

      <Tabs defaultValue="echipa">
        <TabsList>
          <TabsTrigger value="echipa">Echipa TableX</TabsTrigger>
          <TabsTrigger value="globale">Setări globale</TabsTrigger>
          <TabsTrigger value="registru">Registru</TabsTrigger>
        </TabsList>

        <TabsContent value="echipa" className="mt-4">
          <EchipaTableX
            esteDeplin={profil.cont.rol === 'super_admin'}
            userId={utilizator?.id ?? ''}
          />
        </TabsContent>
        <TabsContent value="globale" className="mt-4">
          <TabSetariGlobale />
        </TabsContent>
        <TabsContent value="registru" className="mt-4">
          <TabRegistru />
        </TabsContent>
      </Tabs>
    </div>
  )
}
