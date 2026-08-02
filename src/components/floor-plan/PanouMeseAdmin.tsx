import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LinkIcon, PlusIcon, Trash2Icon, UnlinkIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Switch } from '@/components/ui/switch'
import { useNotificari } from '@/hooks/useNotificari'
import {
  actualizeazaMasa,
  creeazaMasa,
  desparteGrup,
  stergeMasa,
  unesteMese,
} from '@/services/editor-plan'
import { CHEI_MESE } from '@/services/mese'
import type { Enums } from '@/types/database'
import type { MasaHarta, ZonaHarta } from '@/types/floor-plan'

const FORME: Array<{ valoare: Enums<'masa_forma'>; eticheta: string }> = [
  { valoare: 'rotunda', eticheta: 'Rotundă' },
  { valoare: 'patrata', eticheta: 'Pătrată' },
  { valoare: 'dreptunghiulara', eticheta: 'Dreptunghiulară' },
]

/**
 * Layer 2 in mana restaurantului (§28.6).
 *
 * Pana acum, mesele se puteau crea DOAR din editorul echipei TableX. Un
 * restaurant care se inscria singur ramanea cu o sala goala si fara nimic de
 * facut in ea — nu era un produs self-serve. Structura (pereti, bar, usi)
 * ramane a echipei, impusa de RLS din migratia 26.
 *
 * Mutarea se face tragand masa pe harta; aici stau restul proprietatilor,
 * plus adaugarea si stergerea.
 */
export function PanouMeseAdmin({
  restaurantId,
  zona,
  masa,
  mese,
  onSelecteaza,
}: {
  restaurantId: string
  zona: ZonaHarta
  /** Masa selectata pe harta, daca exista. */
  masa: MasaHarta | null
  /** Toate mesele zonei — pentru grupuri si pentru pozitionarea celei noi. */
  mese: MasaHarta[]
  onSelecteaza: (id: string | null) => void
}) {
  const notificari = useNotificari()
  const queryClient = useQueryClient()
  const [deUnit, setDeUnit] = useState<string[]>([])
  /** §24.7 — stergerea mesei e distructiva: cere confirmare explicita. */
  const [confirmaStergere, setConfirmaStergere] = useState(false)

  const meseInZona = mese.length

  // Colegii de grup ai mesei selectate, si candidatii pentru un grup nou.
  const colegiDeGrup = masa?.grup_unire_id
    ? mese.filter((m) => m.grup_unire_id === masa.grup_unire_id && m.id !== masa.id)
    : []

  const capacitateGrup = masa
    ? masa.capacitate + colegiDeGrup.reduce((total, m) => total + m.capacitate, 0)
    : 0

  const candidatiUnire = masa
    ? mese.filter((m) => m.id !== masa.id && !m.grup_unire_id && m.activa)
    : []

  const reincarca = () =>
    void queryClient.invalidateQueries({ queryKey: CHEI_MESE.mese(restaurantId) })

  const adauga = useMutation({
    mutationFn: () =>
      creeazaMasa({
        restaurantId,
        zoneId: zona.id,
        capacitate: 4,
        // Asezata in coltul din stanga-sus, decalata cu cate un pas de grid
        // pentru fiecare masa deja existenta: doua mese nou create nu se
        // suprapun perfect, deci a doua nu pare ca lipseste.
        pozitieX: zona.grid_marime * (2 + (meseInZona % 8)),
        pozitieY: zona.grid_marime * (2 + Math.floor(meseInZona / 8)),
      }),
    onSuccess: (creata) => {
      notificari.succes(`Masa ${creata.numar_masa} a fost adăugată.`, {
        descriere: 'Trage-o pe hartă unde îi e locul.',
      })
      onSelecteaza(creata.id)
      reincarca()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const salveaza = useMutation({
    mutationFn: (modificari: Parameters<typeof actualizeazaMasa>[1]) =>
      actualizeazaMasa(masa!.id, modificari),
    onSuccess: reincarca,
    onError: (eroare) => notificari.eroare(eroare),
  })

  const uneste = useMutation({
    mutationFn: (ids: string[]) => unesteMese(ids),
    onSuccess: () => {
      notificari.succes('Mesele au fost unite.', {
        descriere: 'O rezervare pe oricare dintre ele ocupă acum tot grupul.',
      })
      setDeUnit([])
      reincarca()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const desparte = useMutation({
    mutationFn: (grupId: string) => desparteGrup(grupId),
    onSuccess: (cate) => {
      notificari.succes(`Grupul a fost desfacut (${cate} mese).`)
      reincarca()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const sterge = useMutation({
    mutationFn: () => stergeMasa(masa!.id),
    onSuccess: () => {
      notificari.succes('Masa a fost ștearsă.')
      onSelecteaza(null)
      reincarca()
    },
    // Migratia 19 refuza stergerea unei mese cu rezervari viitoare, cu un mesaj
    // care spune deja ce sa faci in loc. Il aratam ca atare.
    onError: (eroare) => notificari.eroare(eroare),
  })

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Mesele sălii</CardTitle>
        <Button size="xs" variant="outline" disabled={adauga.isPending} onClick={() => adauga.mutate()}>
          <PlusIcon className="size-3.5" />
          Adaugă
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3">
        {!masa ? (
          <p className="text-xs text-muted-foreground">
            Alege o masă de pe hartă ca să-i schimbi numărul, locurile sau forma. Mut-o trăgând-o
            direct pe plan; pereții și barul rămân ale echipei TableX.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label htmlFor="masa-numar" className="text-xs">
                  Număr
                </Label>
                <Input
                  id="masa-numar"
                  key={`numar-${masa.id}`}
                  defaultValue={masa.numar_masa}
                  className="h-8"
                  onBlur={(e) => {
                    const numar = e.target.value.trim()
                    if (!numar || numar === masa.numar_masa) return
                    salveaza.mutate({ numar_masa: numar })
                  }}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="masa-locuri" className="text-xs">
                  Locuri
                </Label>
                <Input
                  id="masa-locuri"
                  key={`locuri-${masa.id}`}
                  type="number"
                  min={1}
                  defaultValue={masa.capacitate}
                  className="h-8"
                  onBlur={(e) => {
                    const capacitate = Number(e.target.value)
                    if (!capacitate || capacitate === masa.capacitate) return
                    // Plafonul (§17.4) e impus de triggerul verifica_capacitate_masa,
                    // pe valoarea din restaurants.max_scaune_masa. Nu-l duplicam
                    // aici: ar fi doua adevaruri despre acelasi numar.
                    salveaza.mutate({ capacitate })
                  }}
                />
              </div>
            </div>

            <div className="grid gap-1">
              <Label htmlFor="masa-forma" className="text-xs">
                Forma
              </Label>
              <Select
                value={masa.forma}
                onValueChange={(v) => salveaza.mutate({ forma: v as Enums<'masa_forma'> })}
              >
                <SelectTrigger id="masa-forma" className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORME.map((forma) => (
                    <SelectItem key={forma.valoare} value={forma.valoare}>
                      {forma.eticheta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label htmlFor="masa-latime" className="text-xs">
                  Lățime
                </Label>
                <Input
                  id="masa-latime"
                  key={`latime-${masa.id}`}
                  type="number"
                  min={20}
                  step={10}
                  defaultValue={masa.latime}
                  className="h-8"
                  onBlur={(e) => {
                    const latime = Number(e.target.value)
                    if (!latime || latime === masa.latime) return
                    salveaza.mutate({ latime })
                  }}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="masa-inaltime" className="text-xs">
                  Înălțime
                </Label>
                <Input
                  id="masa-inaltime"
                  key={`inaltime-${masa.id}`}
                  type="number"
                  min={20}
                  step={10}
                  defaultValue={masa.inaltime}
                  className="h-8"
                  onBlur={(e) => {
                    const inaltime = Number(e.target.value)
                    if (!inaltime || inaltime === masa.inaltime) return
                    salveaza.mutate({ inaltime })
                  }}
                />
              </div>
            </div>

            {/* Masa stricata sau scoasa din uz: ramane pe plan, dar nu se mai
                poate rezerva. Fara asta, singura optiune ar fi stergerea — care
                sterge si istoricul ei. */}
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
              <Label htmlFor="masa-indisponibila" className="text-sm font-normal">
                Scoasă din uz
              </Label>
              <Switch
                id="masa-indisponibila"
                checked={masa.indisponibila}
                onCheckedChange={(indisponibila) => salveaza.mutate({ indisponibila })}
              />
            </div>

            {/* Grupuri pentru mese mari (§28.6). Unirea e MANUALA (§15.4):
                sistemul nu propune combinatii, omul alege mesele. */}
            <div className="grid gap-2 border-t border-border pt-3">
              {masa.grup_unire_id ? (
                <>
                  <p className="text-sm font-medium">
                    Unită cu{' '}
                    {colegiDeGrup.map((m) => m.numar_masa).join(', ') || 'nicio altă masă'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    O rezervare pusă pe oricare dintre ele ocupă tot grupul —{' '}
                    {capacitateGrup} locuri la un loc.
                  </p>
                  <Button
                    size="xs"
                    variant="outline"
                    className="justify-self-start"
                    disabled={desparte.isPending}
                    onClick={() => desparte.mutate(masa.grup_unire_id!)}
                  >
                    <UnlinkIcon className="size-3.5" />
                    Desfă grupul
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">Unește cu altă masă</p>
                  {candidatiUnire.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nu mai e nicio altă masă liberă de grup în zona asta.
                    </p>
                  ) : (
                    <>
                      <ul className="grid max-h-32 gap-1 overflow-y-auto">
                        {candidatiUnire.map((alta) => (
                          <li key={alta.id}>
                            <Label className="flex items-center gap-2 text-sm font-normal">
                              <Checkbox
                                checked={deUnit.includes(alta.id)}
                                onCheckedChange={() =>
                                  setDeUnit((curent) =>
                                    curent.includes(alta.id)
                                      ? curent.filter((id) => id !== alta.id)
                                      : [...curent, alta.id],
                                  )
                                }
                              />
                              Masa {alta.numar_masa} · {alta.capacitate} loc.
                            </Label>
                          </li>
                        ))}
                      </ul>
                      <Button
                        size="xs"
                        className="justify-self-start"
                        disabled={deUnit.length === 0 || uneste.isPending}
                        onClick={() => uneste.mutate([masa.id, ...deUnit])}
                      >
                        <LinkIcon className="size-3.5" />
                        Unește ({1 + deUnit.length} mese,{' '}
                        {masa.capacitate +
                          candidatiUnire
                            .filter((m) => deUnit.includes(m.id))
                            .reduce((total, m) => total + m.capacitate, 0)}{' '}
                        locuri)
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>

            <Button
              variant="outline"
              size="xs"
              className="justify-self-start text-destructive"
              disabled={sterge.isPending}
              onClick={() => setConfirmaStergere(true)}
            >
              <Trash2Icon className="size-3.5" />
              Șterge masa
            </Button>

            {confirmaStergere && (
              <Dialog open onOpenChange={(deschis) => !deschis && setConfirmaStergere(false)}>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Ștergi masa {masa.numar_masa}?</DialogTitle>
                    <DialogDescription>
                      Masa dispare de pe plan. Baza refuză oricum ștergerea dacă masa are
                      rezervări viitoare.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setConfirmaStergere(false)}>
                      Renunță
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={sterge.isPending}
                      onClick={() => {
                        sterge.mutate()
                        setConfirmaStergere(false)
                      }}
                    >
                      Șterge masa
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
