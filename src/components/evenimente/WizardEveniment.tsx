import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckIcon, ImageIcon, Loader2Icon } from 'lucide-react'

import { AnuntEveniment } from '@/components/widget/AnuntEveniment'
import { Button } from '@/components/ui/button'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useNotificari } from '@/hooks/useNotificari'
import {
  CHEI_EVENIMENTE,
  creeazaEveniment,
  setMeseEveniment,
  setPretZona,
  urcaAfis,
} from '@/services/evenimente'
import type { MasaHarta, ZonaHarta } from '@/types/floor-plan'

const PASI = ['Detalii', 'Mese', 'Pret si anunt'] as const

/**
 * Wizardul in trei pasi din §29.2. Ordinea nu e arbitrara: nu poti pune pret
 * pe zone inainte sa stii ce mese intra in eveniment, si nu poti alege mesele
 * inainte sa existe evenimentul.
 *
 * Evenimentul se creeaza la ULTIMUL pas, ca la onboarding: un wizard abandonat
 * la jumatate nu lasa in urma o ciorna pe care nimeni n-o mai cauta.
 */
export function WizardEveniment({
  restaurantId,
  fus,
  zone,
  mese,
  onInchide,
}: {
  restaurantId: string
  fus: string
  zone: ZonaHarta[]
  mese: MasaHarta[]
  onInchide: () => void
}) {
  const notificari = useNotificari()
  const queryClient = useQueryClient()

  const [pas, setPas] = useState(0)
  const [nume, setNume] = useState('')
  const [descriere, setDescriere] = useState('')
  const [zi, setZi] = useState('')
  const [ora, setOra] = useState('20:00')
  const [durata, setDurata] = useState('240')
  const [afis, setAfis] = useState<File | null>(null)
  const [meseAlese, setMeseAlese] = useState<string[]>([])
  const [preturi, setPreturi] = useState<Record<string, string>>({})
  const [popup, setPopup] = useState(true)
  const [zileInainte, setZileInainte] = useState('7')

  // Preview-ul afisului (§29.2 pasul 1) — un object URL local, revocat la
  // schimbare si la demontare, ca sa nu ramana blob-uri in memorie.
  const afisPreview = useMemo(() => (afis ? URL.createObjectURL(afis) : null), [afis])
  useEffect(() => {
    return () => {
      if (afisPreview) URL.revokeObjectURL(afisPreview)
    }
  }, [afisPreview])

  const creeaza = useMutation({
    mutationFn: async () => {
      const dataOra = new Date(`${zi}T${ora}:00`)
      if (Number.isNaN(dataOra.getTime())) throw new Error('Data sau ora nu sunt valide.')

      // Afisul se urca INAINTE de creare: daca urcarea esueaza, nu ramane un
      // eveniment fara poza pe care nimeni nu-l mai repara.
      const afisUrl = afis ? await urcaAfis(restaurantId, afis) : null

      const eveniment = await creeazaEveniment({
        restaurant_id: restaurantId,
        nume: nume.trim(),
        descriere: descriere.trim() || null,
        data_ora: dataOra.toISOString(),
        durata_minute: Number(durata) || 240,
        afis_url: afisUrl,
        popup_activ: popup,
        popup_zile_inainte: Number(zileInainte) || 7,
        status: 'draft',
      })

      await setMeseEveniment(eveniment.id, meseAlese)

      // Preturile pe zona (§29.3). Doar cele completate: o zona fara pret nu
      // inseamna „gratuit", ci „nu se vand bilete acolo".
      for (const [zoneId, valoare] of Object.entries(preturi)) {
        const pret = Number(valoare)
        if (valoare.trim() && !Number.isNaN(pret)) await setPretZona(eveniment.id, zoneId, pret)
      }

      return eveniment
    },
    onSuccess: (eveniment) => {
      notificari.succes(`Evenimentul „${eveniment.nume}" a fost creat.`, {
        descriere: 'E ciorna: publica-l cand vrei sa apara pe widget.',
      })
      void queryClient.invalidateQueries({ queryKey: CHEI_EVENIMENTE.lista(restaurantId) })
      onInchide()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const capacitateAleasa = mese
    .filter((m) => meseAlese.includes(m.id))
    .reduce((total, m) => total + m.capacitate, 0)

  const poateContinua = pas === 0 ? nume.trim().length >= 2 && zi !== '' : true

  return (
    <Dialog open onOpenChange={(deschis) => !deschis && onInchide()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Eveniment nou</DialogTitle>
          <DialogDescription>
            {PASI.map((eticheta, i) => (
              <span key={eticheta} className={i === pas ? 'font-medium text-foreground' : ''}>
                {i > 0 && ' › '}
                {i < pas && <CheckIcon className="inline size-3" />} {eticheta}
              </span>
            ))}
          </DialogDescription>
        </DialogHeader>

        {pas === 0 && (
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ev-nume">Numele evenimentului</Label>
              <Input
                id="ev-nume"
                value={nume}
                onChange={(e) => setNume(e.target.value)}
                placeholder="Seara de jazz"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ev-zi">Ziua</Label>
                <Input id="ev-zi" type="date" value={zi} onChange={(e) => setZi(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ev-ora">Ora</Label>
                <Input id="ev-ora" type="time" value={ora} onChange={(e) => setOra(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ev-durata">Durata (min)</Label>
                <Input
                  id="ev-durata"
                  type="number"
                  min={30}
                  step={30}
                  value={durata}
                  onChange={(e) => setDurata(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-descriere">Descriere</Label>
              <Textarea
                id="ev-descriere"
                rows={3}
                value={descriere}
                onChange={(e) => setDescriere(e.target.value)}
                placeholder="Ce vede clientul pe widget."
              />
            </div>

            {/* Afisul (§29.2 pasul 1): apare pe card, in anunt si pe widget. */}
            <div className="grid gap-1.5">
              <Label htmlFor="ev-afis">Afis / poza (optional)</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="ev-afis"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="h-9"
                  onChange={(e) => setAfis(e.target.files?.[0] ?? null)}
                />
                {afisPreview ? (
                  <img
                    src={afisPreview}
                    alt="Previzualizarea afisului"
                    className="h-14 w-20 rounded-md border border-border object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-20 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                    <ImageIcon className="size-5" aria-hidden="true" />
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {pas === 1 && (
          <div className="grid gap-2">
            <p className="text-sm text-muted-foreground">
              Mesele care intra in eveniment. Capacitatea lui se calculeaza din scaunele lor — nu
              se scrie de mana, ca sa nu se departeze de sala.
            </p>
            {mese.length === 0 ? (
              <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
                Nu exista mese configurate. Adauga-le intai din Harta salii.
              </p>
            ) : (
              <ul className="grid max-h-64 gap-1 overflow-y-auto">
                {mese.map((masa) => (
                  <li key={masa.id}>
                    <Label className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm font-normal">
                      <Checkbox
                        checked={meseAlese.includes(masa.id)}
                        onCheckedChange={() =>
                          setMeseAlese((curent) =>
                            curent.includes(masa.id)
                              ? curent.filter((id) => id !== masa.id)
                              : [...curent, masa.id],
                          )
                        }
                      />
                      Masa {masa.numar_masa} · {masa.capacitate} loc.
                    </Label>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm">
              Capacitate: <span className="font-semibold tabular-nums">{capacitateAleasa}</span>{' '}
              locuri, din {meseAlese.length} mese.
            </p>
          </div>
        )}

        {pas === 2 && (
          <div className="grid gap-3">
            <div className="grid gap-2">
              <p className="text-sm font-medium">Pretul biletului, pe zona</p>
              <p className="text-xs text-muted-foreground">
                Pretul poate diferi de la o zona la alta (§29.3). O zona lasata goala nu vinde
                bilete.
              </p>
              {zone.map((zona) => (
                <div key={zona.id} className="flex items-center justify-between gap-3">
                  <Label htmlFor={`pret-${zona.id}`} className="text-sm font-normal">
                    {zona.nume}
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      id={`pret-${zona.id}`}
                      type="number"
                      min={0}
                      step={5}
                      value={preturi[zona.id] ?? ''}
                      onChange={(e) =>
                        setPreturi((curent) => ({ ...curent, [zona.id]: e.target.value }))
                      }
                      className="h-8 w-24"
                      placeholder="—"
                    />
                    <span className="text-sm text-muted-foreground">EUR</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-2 border-t border-border pt-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="ev-popup" className="text-sm font-normal">
                  Anunta evenimentul pe pagina de rezervari
                </Label>
                <Switch id="ev-popup" checked={popup} onCheckedChange={setPopup} />
              </div>
              {popup && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="ev-zile" className="text-xs text-muted-foreground">
                    Cu cate zile inainte
                  </Label>
                  <Input
                    id="ev-zile"
                    type="number"
                    min={1}
                    max={60}
                    value={zileInainte}
                    onChange={(e) => setZileInainte(e.target.value)}
                    className="h-8 w-20"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Anuntul apare doar dupa ce publici evenimentul, si doar in fereastra de mai sus.
              </p>

              {/* §29.4 — preview LIVE al anuntului, exact componenta care se
                  randeaza pe widgetul public. Nu poate minti: e acelasi cod. */}
              {popup && (
                <div className="grid gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Asa il vede clientul
                  </p>
                  <AnuntEveniment
                    fus={fus}
                    eveniment={{
                      id: 'preview',
                      nume: nume.trim() || 'Numele evenimentului',
                      descriere: descriere.trim() || null,
                      data_ora: new Date(`${zi || '2026-01-01'}T${ora}:00`).toISOString(),
                      afis_url: afisPreview,
                      pret_de_la: (() => {
                        const valori = Object.values(preturi)
                          .map((v) => Number(v))
                          .filter((v) => v > 0)
                        return valori.length ? Math.min(...valori) : null
                      })(),
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {pas > 0 && (
            <Button variant="ghost" onClick={() => setPas((p) => p - 1)}>
              Inapoi
            </Button>
          )}
          {pas < PASI.length - 1 ? (
            <Button disabled={!poateContinua} onClick={() => setPas((p) => p + 1)}>
              Continua
            </Button>
          ) : (
            <Button disabled={creeaza.isPending} onClick={() => creeaza.mutate()}>
              {creeaza.isPending && <Loader2Icon className="animate-spin" />}
              Creeaza evenimentul
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
