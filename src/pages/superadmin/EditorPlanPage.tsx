import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, PlusIcon, Trash2Icon } from 'lucide-react'

import { EditorZona } from '@/components/floor-plan/EditorZona'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useNotificari } from '@/hooks/useNotificari'
import { RUTE } from '@/lib/rute'
import {
  CHEI_EDITOR,
  actualizeazaMasa,
  actualizeazaZona,
  creeazaMasa,
  creeazaZona,
  getMeseEditor,
  getZoneEditor,
  stergeMasa,
  stergeZona,
  type Masa,
} from '@/services/editor-plan'
import { CHEI_SA, getRestaurante } from '@/services/super-admin'
import type { Enums } from '@/types/database'

const ETICHETE_FORMA: Record<Enums<'masa_forma'>, string> = {
  rotunda: 'Rotunda',
  patrata: 'Patrata',
  dreptunghiulara: 'Dreptunghiulara',
}

function DialogZonaNoua({
  onInchide,
  onCreeaza,
  inLucru,
}: {
  onInchide: () => void
  onCreeaza: (nume: string) => void
  inLucru: boolean
}) {
  const [nume, setNume] = useState('')

  return (
    <Dialog open onOpenChange={(deschis) => !deschis && onInchide()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Zona noua</DialogTitle>
          <DialogDescription>
            Numele apare in panoul restaurantului si in widgetul public.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-1.5"
          onSubmit={(eveniment) => {
            eveniment.preventDefault()
            if (nume.trim().length >= 2) onCreeaza(nume.trim())
          }}
        >
          <Label htmlFor="zona-noua">Nume</Label>
          <Input
            id="zona-noua"
            autoFocus
            value={nume}
            onChange={(e) => setNume(e.target.value)}
            placeholder="Salon interior, Terasa, Etaj 1..."
            className="h-9"
          />
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onInchide}>
            Renunta
          </Button>
          <Button disabled={inLucru || nume.trim().length < 2} onClick={() => onCreeaza(nume.trim())}>
            Creeaza
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DialogStergere({
  titlu,
  descriere,
  onInchide,
  onConfirma,
  inLucru,
}: {
  titlu: string
  descriere: string
  onInchide: () => void
  onConfirma: () => void
  inLucru: boolean
}) {
  return (
    <Dialog open onOpenChange={(deschis) => !deschis && onInchide()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titlu}</DialogTitle>
          <DialogDescription>{descriere}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onInchide}>
            Renunta
          </Button>
          <Button variant="destructive" disabled={inLucru} onClick={onConfirma}>
            Sterge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Editorul de floor plan (§8.4) — unealta echipei TableX, nu a restaurantului.
 * Inchide bucla deschisa de coada de cereri: pana acum o cerere putea fi
 * marcata "publicat" fara sa existe vreo cale de a desena efectiv planul.
 *
 * Aceasta prima versiune acopera Layer 2 (zone si mese), adica exact ce au
 * nevoie rezervarile, harta si widgetul ca sa functioneze. Layer 1 (pereti,
 * bar, intrare) se deseneaza tot din floor_plan_layers si urmeaza separat.
 */
export function EditorPlanPage() {
  const { restaurantId = '' } = useParams()
  const notificari = useNotificari()
  const queryClient = useQueryClient()

  const [zonaActiva, setZonaActiva] = useState<string | null>(null)
  const [masaSelectata, setMasaSelectata] = useState<string | null>(null)
  const [modAdaugare, setModAdaugare] = useState(false)
  const [dialogZonaNoua, setDialogZonaNoua] = useState(false)
  const [stergere, setStergere] = useState<{ tip: 'zona' | 'masa'; id: string; nume: string } | null>(
    null,
  )

  const restaurante = useQuery({ queryKey: CHEI_SA.restaurante, queryFn: getRestaurante })
  const zone = useQuery({
    queryKey: CHEI_EDITOR.zone(restaurantId),
    queryFn: () => getZoneEditor(restaurantId),
    enabled: Boolean(restaurantId),
  })
  const mese = useQuery({
    queryKey: CHEI_EDITOR.mese(restaurantId),
    queryFn: () => getMeseEditor(restaurantId),
    enabled: Boolean(restaurantId),
  })

  const restaurant = restaurante.data?.find((r) => r.id === restaurantId)
  const zonaCurenta = zone.data?.find((z) => z.id === (zonaActiva ?? zone.data?.[0]?.id)) ?? null
  const meseZona = useMemo(
    () => (mese.data ?? []).filter((m) => m.zone_id === zonaCurenta?.id),
    [mese.data, zonaCurenta?.id],
  )
  const masa = meseZona.find((m) => m.id === masaSelectata) ?? null

  function reincarcaMese() {
    void queryClient.invalidateQueries({ queryKey: CHEI_EDITOR.mese(restaurantId) })
  }
  function reincarcaZone() {
    void queryClient.invalidateQueries({ queryKey: CHEI_EDITOR.zone(restaurantId) })
  }

  const zonaNoua = useMutation({
    mutationFn: (nume: string) => creeazaZona(restaurantId, nume),
    onSuccess: (zona) => {
      notificari.succes(`Zona „${zona.nume}" a fost creata.`)
      setZonaActiva(zona.id)
      setDialogZonaNoua(false)
      reincarcaZone()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const salveazaZona = useMutation({
    mutationFn: ({ id, modificari }: { id: string; modificari: Parameters<typeof actualizeazaZona>[1] }) =>
      actualizeazaZona(id, modificari),
    onSuccess: reincarcaZone,
    onError: (eroare) => notificari.eroare(eroare),
  })

  const eliminaZona = useMutation({
    mutationFn: stergeZona,
    onSuccess: () => {
      notificari.succes('Zona a fost stearsa.')
      setZonaActiva(null)
      setMasaSelectata(null)
      setStergere(null)
      reincarcaZone()
      reincarcaMese()
    },
    onError: (eroare) => {
      setStergere(null)
      notificari.eroare(eroare)
    },
  })

  const masaNoua = useMutation({
    // Numerotarea se face in serviciu, din baza: constrangerea de unicitate e
    // pe restaurant, iar starea de aici poate fi in urma cu o asezare.
    mutationFn: ({ x, y }: { x: number; y: number }) =>
      creeazaMasa({
        restaurantId,
        zoneId: zonaCurenta!.id,
        capacitate: 4,
        pozitieX: x,
        pozitieY: y,
      }),
    onSuccess: (masaCreata) => {
      setMasaSelectata(masaCreata.id)
      reincarcaMese()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const salveazaMasa = useMutation({
    mutationFn: ({ id, modificari }: { id: string; modificari: Parameters<typeof actualizeazaMasa>[1] }) =>
      actualizeazaMasa(id, modificari),
    onSuccess: reincarcaMese,
    onError: (eroare) => notificari.eroare(eroare),
  })

  const eliminaMasa = useMutation({
    mutationFn: stergeMasa,
    onSuccess: () => {
      notificari.succes('Masa a fost stearsa.')
      setMasaSelectata(null)
      setStergere(null)
      reincarcaMese()
    },
    // Migratia 18 refuza stergerea unei mese cu rezervari viitoare; mesajul ei
    // spune deja ce sa faca in loc (dezactivare).
    onError: (eroare) => {
      setStergere(null)
      notificari.eroare(eroare)
    },
  })

  if (!restaurantId) return null

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to={RUTE.superadmin}>
                <ArrowLeftIcon />
                Inapoi
              </Link>
            </Button>
            <div>
              <p className="text-sm font-semibold">
                Editor plan · {restaurant?.nume ?? 'Restaurant'}
              </p>
              <p className="text-xs text-muted-foreground">
                Modificarile se salveaza imediat, la fiecare acțiune.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-6 py-6 lg:grid-cols-[1fr_20rem]">
        {/* ── Canvas ── */}
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={zonaCurenta?.id ?? ''}
              onValueChange={(id) => {
                setZonaActiva(id)
                setMasaSelectata(null)
              }}
            >
              <SelectTrigger className="h-8 w-56">
                <SelectValue placeholder="Alege zona" />
              </SelectTrigger>
              <SelectContent>
                {(zone.data ?? []).map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.nume}
                    {z.activa ? '' : ' (dezactivata)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => setDialogZonaNoua(true)}>
              <PlusIcon />
              Zona noua
            </Button>

            {zonaCurenta && (
              <Button
                variant={modAdaugare ? 'default' : 'outline'}
                size="sm"
                onClick={() => setModAdaugare((activ) => !activ)}
                aria-pressed={modAdaugare}
              >
                <PlusIcon />
                {modAdaugare ? 'Click pe plan ca sa asezi masa' : 'Adauga mese'}
              </Button>
            )}

            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {meseZona.length} mese in zona
            </span>
          </div>

          {zone.isLoading || mese.isLoading ? (
            <Skeleton className="aspect-[3/2] w-full" />
          ) : !zonaCurenta ? (
            <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
              Restaurantul nu are nicio zona. Creeaza prima zona ca sa poti aseza mese.
            </p>
          ) : (
            <EditorZona
              zona={zonaCurenta}
              mese={meseZona}
              masaSelectata={masaSelectata}
              onSelecteaza={setMasaSelectata}
              modAdaugare={modAdaugare}
              onAdauga={(x, y) => masaNoua.mutate({ x, y })}
              onMuta={(id, x, y) =>
                salveazaMasa.mutate({ id, modificari: { pozitie_x: x, pozitie_y: y } })
              }
              className="aspect-[3/2] w-full"
            />
          )}

          <p className="text-xs text-muted-foreground">
            Trage o masa cu mouse-ul ca sa o muti; se aliniaza singura la grid. Cu masa
            selectata, sagetile o muta cu un pas de grid, iar Shift + sageti cu un pixel.
          </p>
        </div>

        {/* ── Panoul de proprietati ── */}
        <div className="grid content-start gap-4">
          {zonaCurenta && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Zona</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="nume-zona">Nume</Label>
                  <Input
                    id="nume-zona"
                    key={`nume-${zonaCurenta.id}`}
                    defaultValue={zonaCurenta.nume}
                    className="h-8"
                    onBlur={(e) => {
                      const nume = e.target.value.trim()
                      if (!nume || nume === zonaCurenta.nume) return
                      salveazaZona.mutate({ id: zonaCurenta.id, modificari: { nume } })
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['canvas_latime', 'Latime'],
                      ['canvas_inaltime', 'Inaltime'],
                    ] as const
                  ).map(([cheie, eticheta]) => (
                    <div key={cheie} className="grid gap-1.5">
                      <Label htmlFor={cheie}>{eticheta}</Label>
                      <Input
                        id={cheie}
                        type="number"
                        min={200}
                        max={5000}
                        step={20}
                        key={`${cheie}-${zonaCurenta.id}`}
                        defaultValue={String(zonaCurenta[cheie])}
                        className="h-8 tabular-nums"
                        onBlur={(e) => {
                          const valoare = Number(e.target.value)
                          if (!Number.isFinite(valoare) || valoare === zonaCurenta[cheie]) return
                          salveazaZona.mutate({
                            id: zonaCurenta.id,
                            modificari: { [cheie]: valoare },
                          })
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="grid">Pas grid</Label>
                  <Input
                    id="grid"
                    type="number"
                    min={5}
                    max={100}
                    step={5}
                    key={`grid-${zonaCurenta.id}`}
                    defaultValue={String(zonaCurenta.grid_marime)}
                    className="h-8 w-24 tabular-nums"
                    onBlur={(e) => {
                      const valoare = Number(e.target.value)
                      if (!Number.isFinite(valoare) || valoare === zonaCurenta.grid_marime) return
                      salveazaZona.mutate({
                        id: zonaCurenta.id,
                        modificari: { grid_marime: valoare },
                      })
                    }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                  <Label htmlFor="zona-activa" className="text-sm">
                    Zona activa
                  </Label>
                  <Switch
                    id="zona-activa"
                    checked={zonaCurenta.activa}
                    onCheckedChange={(activa) =>
                      salveazaZona.mutate({ id: zonaCurenta.id, modificari: { activa } })
                    }
                  />
                </div>

                <Button
                  variant="destructive"
                  size="xs"
                  className="justify-self-start"
                  onClick={() =>
                    setStergere({ tip: 'zona', id: zonaCurenta.id, nume: zonaCurenta.nume })
                  }
                >
                  <Trash2Icon />
                  Sterge zona
                </Button>
              </CardContent>
            </Card>
          )}

          {masa && (
            <PanouMasa
              masa={masa}
              onSalveaza={salveazaMasa.mutate}
              onCereStergere={() =>
                setStergere({ tip: 'masa', id: masa.id, nume: masa.numar_masa })
              }
            />
          )}
        </div>
      </main>

      {dialogZonaNoua && (
        <DialogZonaNoua
          inLucru={zonaNoua.isPending}
          onInchide={() => setDialogZonaNoua(false)}
          onCreeaza={(nume) => zonaNoua.mutate(nume)}
        />
      )}

      {stergere && (
        <DialogStergere
          titlu={stergere.tip === 'zona' ? `Stergi zona „${stergere.nume}"?` : `Stergi masa ${stergere.nume}?`}
          descriere={
            stergere.tip === 'zona'
              ? 'Se sterg si toate mesele din ea. Daca zona are rezervari viitoare, baza de date refuza stergerea — dezactiveaz-o in loc.'
              : 'Daca masa are rezervari viitoare, baza de date refuza stergerea — dezactiveaz-o in loc.'
          }
          inLucru={eliminaZona.isPending || eliminaMasa.isPending}
          onInchide={() => setStergere(null)}
          onConfirma={() =>
            stergere.tip === 'zona'
              ? eliminaZona.mutate(stergere.id)
              : eliminaMasa.mutate(stergere.id)
          }
        />
      )}
    </div>
  )
}

function PanouMasa({
  masa,
  onSalveaza,
  onCereStergere,
}: {
  masa: Masa
  onSalveaza: (argumente: { id: string; modificari: Parameters<typeof actualizeazaMasa>[1] }) => void
  onCereStergere: () => void
}) {
  const salveaza = (modificari: Parameters<typeof actualizeazaMasa>[1]) =>
    onSalveaza({ id: masa.id, modificari })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Masa {masa.numar_masa}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="numar">Numar</Label>
            <Input
              id="numar"
              key={`numar-${masa.id}`}
              defaultValue={masa.numar_masa}
              className="h-8"
              onBlur={(e) => {
                const numar_masa = e.target.value.trim()
                if (!numar_masa || numar_masa === masa.numar_masa) return
                salveaza({ numar_masa })
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="capacitate">Locuri</Label>
            <Input
              id="capacitate"
              type="number"
              min={1}
              max={24}
              key={`cap-${masa.id}`}
              defaultValue={String(masa.capacitate)}
              className="h-8 tabular-nums"
              onBlur={(e) => {
                const capacitate = Number(e.target.value)
                if (!Number.isFinite(capacitate) || capacitate === masa.capacitate) return
                salveaza({ capacitate })
              }}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="forma">Forma</Label>
          <Select
            value={masa.forma}
            onValueChange={(forma) => salveaza({ forma: forma as Enums<'masa_forma'> })}
          >
            <SelectTrigger id="forma" className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ETICHETE_FORMA).map(([valoare, eticheta]) => (
                <SelectItem key={valoare} value={valoare}>
                  {eticheta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ['latime', 'Latime'],
              ['inaltime', 'Inaltime'],
              ['rotatie', 'Rotatie'],
            ] as const
          ).map(([cheie, eticheta]) => (
            <div key={cheie} className="grid gap-1.5">
              <Label htmlFor={cheie}>{eticheta}</Label>
              <Input
                id={cheie}
                type="number"
                min={cheie === 'rotatie' ? 0 : 20}
                max={cheie === 'rotatie' ? 359 : 400}
                step={cheie === 'rotatie' ? 15 : 10}
                key={`${cheie}-${masa.id}`}
                defaultValue={String(masa[cheie])}
                className="h-8 tabular-nums"
                onBlur={(e) => {
                  const valoare = Number(e.target.value)
                  if (!Number.isFinite(valoare) || valoare === Number(masa[cheie])) return
                  salveaza({ [cheie]: valoare })
                }}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
          <Label htmlFor="masa-activa" className="text-sm">
            Masa activa
          </Label>
          <Switch
            id="masa-activa"
            checked={masa.activa}
            onCheckedChange={(activa) => salveaza({ activa })}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          O masa cu rezervari viitoare nu poate fi stearsa — dezactiveaz-o, ca sa nu ramana
          rezervari fara masa. Regula e impusa de baza de date.
        </p>

        <Button
          variant="destructive"
          size="xs"
          className="justify-self-start"
          onClick={onCereStergere}
        >
          <Trash2Icon />
          Sterge masa
        </Button>
      </CardContent>
    </Card>
  )
}
