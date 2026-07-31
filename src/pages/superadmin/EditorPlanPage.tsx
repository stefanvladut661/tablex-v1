import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, PlusIcon, Trash2Icon } from 'lucide-react'

import { EditorZona, type Strat } from '@/components/floor-plan/EditorZona'
import { Badge } from '@/components/ui/badge'
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
  CHEIE_ISTORIC,
  CHEI_EDITOR,
  actualizeazaMasa,
  actualizeazaZona,
  creeazaMasa,
  creeazaZona,
  getIstoricVersiuni,
  getLayer1,
  getMeseEditor,
  getZoneEditor,
  restaureazaVersiune,
  salveazaLayer1,
  stergeMasa,
  stergeZona,
  type Layer1,
  type Masa,
} from '@/services/editor-plan'
import { CHEI_SA, getRestaurante } from '@/services/super-admin'
import type { Enums } from '@/types/database'
import type { ElementStructura, TipStructura } from '@/types/floor-plan'

const ETICHETE_FORMA: Record<Enums<'masa_forma'>, string> = {
  rotunda: 'Rotunda',
  patrata: 'Patrata',
  dreptunghiulara: 'Dreptunghiulara',
}

/**
 * Dimensiunile implicite ale fiecarui element de structura, plus eticheta pusa
 * automat acolo unde ElementStructura o si deseneaza. Un perete e lung si
 * subtire, o planta e mica si patrata — daca toate ar aparea la aceeasi marime,
 * fiecare asezare ar cere doua redimensionari.
 */
const SABLOANE_STRUCTURA: Record<
  TipStructura,
  { eticheta: string; latime: number; inaltime: number; text?: string }
> = {
  perete: { eticheta: 'Perete', latime: 400, inaltime: 20 },
  usa: { eticheta: 'Usa', latime: 80, inaltime: 20 },
  intrare: { eticheta: 'Intrare', latime: 120, inaltime: 40, text: 'Intrare' },
  bar: { eticheta: 'Bar', latime: 300, inaltime: 80, text: 'Bar' },
  dj: { eticheta: 'DJ', latime: 120, inaltime: 100, text: 'DJ' },
  vip: { eticheta: 'Zona VIP', latime: 260, inaltime: 200, text: 'VIP' },
  bucatarie: { eticheta: 'Bucatarie', latime: 240, inaltime: 180, text: 'Bucatarie' },
  planta: { eticheta: 'Planta', latime: 60, inaltime: 60 },
  piscina: { eticheta: 'Piscina', latime: 320, inaltime: 200, text: 'Piscina' },
}

const TIPURI_STRUCTURA = Object.keys(SABLOANE_STRUCTURA) as TipStructura[]

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
 * Doua straturi, editate pe rand:
 *   Layer 2 — zone si mese, randuri in `tables`. De ele depind rezervarile.
 *   Layer 1 — structura salii (pereti, bar, intrare), un array jsonb in
 *             floor_plan_layers.continut, cu publicare separata.
 * Se editeaza unul singur odata: mesele se deseneaza PESTE structura, deci un
 * canvas care le asculta pe amandoua ar avea un test de lovire ambiguu.
 */
export function EditorPlanPage() {
  const { restaurantId = '' } = useParams()
  const notificari = useNotificari()
  const queryClient = useQueryClient()

  const [zonaActiva, setZonaActiva] = useState<string | null>(null)
  const [masaSelectata, setMasaSelectata] = useState<string | null>(null)
  const [modAdaugare, setModAdaugare] = useState(false)
  const [strat, setStrat] = useState<Strat>('mese')
  const [tipDeAsezat, setTipDeAsezat] = useState<TipStructura>('perete')
  const [structuraSelectata, setStructuraSelectata] = useState<number | null>(null)
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

  const layer1 = useQuery({
    queryKey: CHEI_EDITOR.layer1(zonaCurenta?.id ?? ''),
    queryFn: () => getLayer1(zonaCurenta!.id),
    enabled: Boolean(zonaCurenta?.id),
  })
  const elemente = layer1.data?.elemente ?? []
  const element = structuraSelectata === null ? null : (elemente[structuraSelectata] ?? null)

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

  /**
   * O singura mutatie pentru tot stratul: continut e un array jsonb, deci orice
   * schimbare (adaugare, mutare, redimensionare, stergere, publicare) rescrie
   * acelasi rand. Rezultatul intra direct in cache — vezi comentariul din
   * salveazaLayer1 pentru de ce nu asteptam o reimprospatare.
   */
  const salveazaStructura = useMutation({
    mutationFn: (schimbare: {
      elemente?: ElementStructura[]
      vizibil?: boolean
      publicat?: boolean
    }) =>
      salveazaLayer1({
        restaurantId,
        zoneId: zonaCurenta!.id,
        elemente: schimbare.elemente ?? elemente,
        vizibil: schimbare.vizibil ?? layer1.data?.vizibil ?? true,
        publicat: schimbare.publicat ?? layer1.data?.publicat ?? false,
        versiuneCitita: layer1.data?.versiune ?? null,
        layerId: layer1.data?.id ?? null,
      }),
    onSuccess: (stratNou) => {
      queryClient.setQueryData<Layer1>(CHEI_EDITOR.layer1(zonaCurenta!.id), stratNou)
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  /**
   * Istoricul (§40). Instantaneele le scrie un trigger la fiecare publicare,
   * deci lista se reimprospateaza dupa orice salvare a structurii publicate.
   */
  const istoric = useQuery({
    queryKey: CHEIE_ISTORIC(zonaCurenta?.id ?? ''),
    queryFn: () => getIstoricVersiuni(zonaCurenta!.id),
    enabled: Boolean(zonaCurenta?.id),
  })

  const revino = useMutation({
    mutationFn: restaureazaVersiune,
    onSuccess: (versiuneNoua) => {
      notificari.succes(`Planul a revenit la versiunea aleasa (acum versiunea ${versiuneNoua}).`)
      // Continutul stratului s-a schimbat in baza, nu in cache: il recitim.
      void queryClient.invalidateQueries({ queryKey: CHEI_EDITOR.layer1(zonaCurenta!.id) })
      void queryClient.invalidateQueries({ queryKey: CHEIE_ISTORIC(zonaCurenta!.id) })
    },
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
              <>
                <div className="flex overflow-hidden rounded-md border border-border">
                  {(
                    [
                      ['mese', 'Mese'],
                      ['structura', 'Structura'],
                    ] as const
                  ).map(([valoare, eticheta]) => (
                    <button
                      key={valoare}
                      type="button"
                      aria-pressed={strat === valoare}
                      onClick={() => {
                        setStrat(valoare)
                        setModAdaugare(false)
                        setMasaSelectata(null)
                        setStructuraSelectata(null)
                      }}
                      className={`px-2.5 py-1 text-xs font-medium ${
                        strat === valoare
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-transparent text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {eticheta}
                    </button>
                  ))}
                </div>

                {strat === 'structura' && (
                  <Select
                    value={tipDeAsezat}
                    onValueChange={(tip) => setTipDeAsezat(tip as TipStructura)}
                  >
                    <SelectTrigger className="h-8 w-40" aria-label="Tipul elementului de asezat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPURI_STRUCTURA.map((tip) => (
                        <SelectItem key={tip} value={tip}>
                          {SABLOANE_STRUCTURA[tip].eticheta}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button
                  variant={modAdaugare ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setModAdaugare((activ) => !activ)}
                  aria-pressed={modAdaugare}
                >
                  <PlusIcon />
                  {modAdaugare
                    ? 'Click pe plan ca sa asezi'
                    : strat === 'mese'
                      ? 'Adauga mese'
                      : 'Adauga elemente'}
                </Button>
              </>
            )}

            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {strat === 'mese'
                ? `${meseZona.length} mese in zona`
                : `${elemente.length} elemente de structura`}
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
              stratActiv={strat}
              structura={elemente}
              mese={meseZona}
              masaSelectata={masaSelectata}
              onSelecteazaMasa={setMasaSelectata}
              onMutaMasa={(id, x, y) =>
                salveazaMasa.mutate({ id, modificari: { pozitie_x: x, pozitie_y: y } })
              }
              structuraSelectata={structuraSelectata}
              onSelecteazaStructura={setStructuraSelectata}
              onMutaStructura={(indice, x, y) =>
                salveazaStructura.mutate({
                  elemente: elemente.map((el, i) => (i === indice ? { ...el, x, y } : el)),
                })
              }
              modAdaugare={modAdaugare}
              onAdauga={(x, y) => {
                if (strat === 'mese') {
                  masaNoua.mutate({ x, y })
                  return
                }
                const sablon = SABLOANE_STRUCTURA[tipDeAsezat]
                const nou: ElementStructura = {
                  tip: tipDeAsezat,
                  x,
                  y,
                  latime: sablon.latime,
                  inaltime: sablon.inaltime,
                  ...(sablon.text ? { eticheta: sablon.text } : {}),
                }
                salveazaStructura.mutate({ elemente: [...elemente, nou] })
                setStructuraSelectata(elemente.length)
              }}
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

          {strat === 'mese' && masa && (
            <PanouMasa
              masa={masa}
              onSalveaza={salveazaMasa.mutate}
              onCereStergere={() =>
                setStergere({ tip: 'masa', id: masa.id, nume: masa.numar_masa })
              }
            />
          )}

          {strat === 'structura' && zonaCurenta && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stratul de structura</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                  <Label htmlFor="strat-vizibil" className="text-sm">
                    Vizibil
                  </Label>
                  <Switch
                    id="strat-vizibil"
                    checked={layer1.data?.vizibil ?? true}
                    onCheckedChange={(vizibil) => salveazaStructura.mutate({ vizibil })}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                  <Label htmlFor="strat-publicat" className="text-sm">
                    Publicat
                  </Label>
                  <Switch
                    id="strat-publicat"
                    checked={layer1.data?.publicat ?? false}
                    onCheckedChange={(publicat) => salveazaStructura.mutate({ publicat })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Structura ajunge in widgetul public doar daca e si vizibila, si publicata —
                  vederea structura_publica cere ambele. Mesele nu depind de asta.
                </p>

                {/* ── Istoricul versiunilor publicate (§40) ── */}
                <div className="grid gap-1.5 border-t border-border pt-3">
                  <p className="text-sm font-medium">Versiuni publicate</p>
                  {(istoric.data ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Inca nicio versiune. Fiecare publicare a structurii lasa un instantaneu
                      aici, ca o greseala sa nu fie definitiva.
                    </p>
                  ) : (
                    <ul className="grid max-h-56 gap-1 overflow-y-auto">
                      {(istoric.data ?? []).map((versiune) => (
                        <li
                          key={versiune.id}
                          className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-xs"
                        >
                          <span className="min-w-0">
                            <span className="block font-medium">{versiune.nume}</span>
                            <span className="block text-muted-foreground tabular-nums">
                              {versiune.publicat_la
                                ? new Date(versiune.publicat_la).toLocaleString('ro-RO', {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                  })
                                : '—'}
                            </span>
                          </span>
                          {versiune.status === 'published' ? (
                            <Badge variant="secondary">Acum</Badge>
                          ) : (
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={revino.isPending}
                              onClick={() => revino.mutate(versiune.id)}
                            >
                              Revino
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Revenirea nu sterge nimic: scrie versiunea aleasa ca versiune noua, deci se
                    poate reveni si din ea.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {strat === 'structura' && element && structuraSelectata !== null && (
            <PanouStructura
              element={element}
              onSalveaza={(modificari) =>
                salveazaStructura.mutate({
                  elemente: elemente.map((el, i) =>
                    i === structuraSelectata ? { ...el, ...modificari } : el,
                  ),
                })
              }
              onSterge={() => {
                salveazaStructura.mutate({
                  elemente: elemente.filter((_, i) => i !== structuraSelectata),
                })
                // Indicii se decaleaza dupa stergere, deci selectia veche ar
                // arata alt element. O golim.
                setStructuraSelectata(null)
              }}
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

/**
 * Elementele de structura nu au rand propriu in baza: sunt obiecte intr-un
 * array jsonb, deci se identifica prin indice si se salveaza rescriind tot
 * array-ul. De aceea panoul primeste doar `modificari` partiale.
 */
function PanouStructura({
  element,
  onSalveaza,
  onSterge,
}: {
  element: ElementStructura
  onSalveaza: (modificari: Partial<ElementStructura>) => void
  onSterge: () => void
}) {
  const sablon = SABLOANE_STRUCTURA[element.tip]
  // Cheia pentru campurile necontrolate: la schimbarea selectiei trebuie sa
  // reciteasca defaultValue, altfel ar arata valorile elementului anterior.
  const cheie = `${element.tip}-${element.x}-${element.y}`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{sablon.eticheta}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ['latime', 'Latime'],
              ['inaltime', 'Inaltime'],
              ['rotatie', 'Rotatie'],
            ] as const
          ).map(([camp, eticheta]) => (
            <div key={camp} className="grid gap-1.5">
              <Label htmlFor={`str-${camp}`}>{eticheta}</Label>
              <Input
                id={`str-${camp}`}
                type="number"
                min={camp === 'rotatie' ? 0 : 10}
                max={camp === 'rotatie' ? 359 : 2000}
                step={camp === 'rotatie' ? 15 : 10}
                key={`${camp}-${cheie}`}
                defaultValue={String(element[camp] ?? 0)}
                className="h-8 tabular-nums"
                onBlur={(e) => {
                  const valoare = Number(e.target.value)
                  if (!Number.isFinite(valoare) || valoare === (element[camp] ?? 0)) return
                  onSalveaza({ [camp]: valoare })
                }}
              />
            </div>
          ))}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="str-eticheta">Eticheta</Label>
          <Input
            id="str-eticheta"
            key={`eticheta-${cheie}`}
            defaultValue={element.eticheta ?? ''}
            className="h-8"
            placeholder="Se scrie doar pe elementele mari"
            onBlur={(e) => {
              const eticheta = e.target.value.trim()
              if (eticheta === (element.eticheta ?? '')) return
              onSalveaza({ eticheta: eticheta || undefined })
            }}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="str-z">Ordine de desenare (z)</Label>
          <Input
            id="str-z"
            type="number"
            min={0}
            max={99}
            key={`z-${cheie}`}
            defaultValue={String(element.z ?? 0)}
            className="h-8 w-24 tabular-nums"
            onBlur={(e) => {
              const z = Number(e.target.value)
              if (!Number.isFinite(z) || z === (element.z ?? 0)) return
              onSalveaza({ z })
            }}
          />
          <p className="text-xs text-muted-foreground">
            Mai mare = desenat deasupra. Util ca o planta sa stea peste bar.
          </p>
        </div>

        <Button variant="destructive" size="xs" className="justify-self-start" onClick={onSterge}>
          <Trash2Icon />
          Sterge elementul
        </Button>
      </CardContent>
    </Card>
  )
}
