import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, Trash2Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { actualizeazaMasa, creeazaMasa, stergeMasa } from '@/services/editor-plan'
import { CHEI_MESE } from '@/services/mese'
import type { Enums } from '@/types/database'
import type { MasaHarta, ZonaHarta } from '@/types/floor-plan'

const FORME: Array<{ valoare: Enums<'masa_forma'>; eticheta: string }> = [
  { valoare: 'rotunda', eticheta: 'Rotunda' },
  { valoare: 'patrata', eticheta: 'Patrata' },
  { valoare: 'dreptunghiulara', eticheta: 'Dreptunghiulara' },
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
  meseInZona,
  onSelecteaza,
}: {
  restaurantId: string
  zona: ZonaHarta
  /** Masa selectata pe harta, daca exista. */
  masa: MasaHarta | null
  meseInZona: number
  onSelecteaza: (id: string | null) => void
}) {
  const notificari = useNotificari()
  const queryClient = useQueryClient()

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
      notificari.succes(`Masa ${creata.numar_masa} a fost adaugata.`, {
        descriere: 'Trage-o pe harta unde ii e locul.',
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

  const sterge = useMutation({
    mutationFn: () => stergeMasa(masa!.id),
    onSuccess: () => {
      notificari.succes('Masa a fost stearsa.')
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
        <CardTitle className="text-base">Mesele salii</CardTitle>
        <Button size="xs" variant="outline" disabled={adauga.isPending} onClick={() => adauga.mutate()}>
          <PlusIcon className="size-3.5" />
          Adauga
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3">
        {!masa ? (
          <p className="text-xs text-muted-foreground">
            Alege o masa de pe harta ca sa-i schimbi numarul, locurile sau forma. Muta-o tragand-o
            direct pe plan; peretii si barul raman ale echipei TableX.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label htmlFor="masa-numar" className="text-xs">
                  Numar
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
                  Latime
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
                  Inaltime
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
                Scoasa din uz
              </Label>
              <Switch
                id="masa-indisponibila"
                checked={masa.indisponibila}
                onCheckedChange={(indisponibila) => salveaza.mutate({ indisponibila })}
              />
            </div>

            <Button
              variant="outline"
              size="xs"
              className="justify-self-start text-destructive"
              disabled={sterge.isPending}
              onClick={() => sterge.mutate()}
            >
              <Trash2Icon className="size-3.5" />
              Sterge masa
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
