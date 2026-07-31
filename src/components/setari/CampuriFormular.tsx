import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, Trash2Icon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  CHEI_CAMPURI,
  ETICHETE_TIP,
  actualizeazaCamp,
  cheieDinEticheta,
  creeazaCamp,
  getCampuri,
  stergeCamp,
  type TipCamp,
} from '@/services/campuri-formular'

/**
 * Campurile formularului public.
 *
 * Cele patru de SISTEM (nume, telefon, email, numar de persoane) se arata dar
 * nu se sterg: au parametri dedicati in `rezerva_public` si coloane proprii in
 * `reservations`. Se poate schimba doar daca sunt obligatorii — si nici asta
 * pentru toate: fara nume si telefon nu exista rezervare.
 *
 * Campurile proprii ajung in `reservations.campuri_custom` si sunt validate in
 * baza, nu doar in widget: API-ul public poate fi apelat direct.
 */
const CHEI_NEDISPENSABILE = ['nume', 'telefon', 'nr_persoane']

export function CampuriFormular({ restaurantId }: { restaurantId: string }) {
  const notificari = useNotificari()
  const queryClient = useQueryClient()

  const [eticheta, setEticheta] = useState('')
  const [tip, setTip] = useState<TipCamp>('text')
  const [obligatoriu, setObligatoriu] = useState(false)
  const [optiuni, setOptiuni] = useState('')

  const campuri = useQuery({
    queryKey: CHEI_CAMPURI.lista(restaurantId),
    queryFn: () => getCampuri(restaurantId),
    enabled: Boolean(restaurantId),
  })

  function reincarca() {
    void queryClient.invalidateQueries({ queryKey: CHEI_CAMPURI.lista(restaurantId) })
  }

  const adauga = useMutation({
    mutationFn: creeazaCamp,
    onSuccess: () => {
      notificari.succes('Camp adaugat in formular.')
      setEticheta('')
      setOptiuni('')
      setObligatoriu(false)
      reincarca()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const salveaza = useMutation({
    mutationFn: ({ id, modificari }: { id: string; modificari: Parameters<typeof actualizeazaCamp>[1] }) =>
      actualizeazaCamp(id, modificari),
    onSuccess: reincarca,
    onError: (eroare) => notificari.eroare(eroare),
  })

  const sterge = useMutation({
    mutationFn: stergeCamp,
    onSuccess: () => {
      notificari.succes('Camp sters.')
      reincarca()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const listaOptiuni = optiuni
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  const potAdauga =
    cheieDinEticheta(eticheta).length > 0 &&
    (tip !== 'dropdown' || listaOptiuni.length >= 2) &&
    !adauga.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Formularul public</CardTitle>
        <CardDescription>
          Ce intreaba widgetul cand cineva rezerva. Raspunsurile apar pe rezervare, in panou.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        {campuri.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <ul className="grid gap-1.5">
            {(campuri.data ?? []).map((camp) => {
              const nedispensabil = CHEI_NEDISPENSABILE.includes(camp.cheie)
              return (
                <li
                  key={camp.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {camp.eticheta}
                      {camp.sistem && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          sistem
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ETICHETE_TIP[camp.tip]}
                      {camp.tip === 'dropdown' &&
                        Array.isArray(camp.optiuni) &&
                        ` · ${(camp.optiuni as string[]).join(', ')}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label htmlFor={`oblig-${camp.id}`} className="text-xs font-normal">
                      Obligatoriu
                    </Label>
                    <Switch
                      id={`oblig-${camp.id}`}
                      checked={camp.obligatoriu}
                      // Fara nume, telefon si numar de persoane nu exista
                      // rezervare — baza le cere oricum.
                      disabled={nedispensabil}
                      onCheckedChange={(valoare) =>
                        salveaza.mutate({ id: camp.id, modificari: { obligatoriu: valoare } })
                      }
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Label htmlFor={`activ-${camp.id}`} className="text-xs font-normal">
                      Afisat
                    </Label>
                    <Switch
                      id={`activ-${camp.id}`}
                      checked={camp.activ}
                      disabled={nedispensabil}
                      onCheckedChange={(valoare) =>
                        salveaza.mutate({ id: camp.id, modificari: { activ: valoare } })
                      }
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Sterge campul ${camp.eticheta}`}
                    // Campurile de sistem nu se sterg: au coloane proprii in
                    // rezervari, iar rezerva_public le asteapta mereu.
                    disabled={camp.sistem}
                    onClick={() => sterge.mutate(camp.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}

        <form
          className="grid gap-3 rounded-lg border border-border p-3"
          onSubmit={(eveniment) => {
            eveniment.preventDefault()
            if (!potAdauga) return
            adauga.mutate({
              restaurantId,
              eticheta,
              tip,
              obligatoriu,
              optiuni: listaOptiuni,
            })
          }}
        >
          <p className="text-sm font-medium">Adauga o intrebare proprie</p>

          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <div className="grid gap-1.5">
              <Label htmlFor="camp-eticheta">Intrebarea</Label>
              <Input
                id="camp-eticheta"
                value={eticheta}
                onChange={(e) => setEticheta(e.target.value)}
                placeholder="Scaun pentru copil? Ocazie speciala?"
                className="h-9"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="camp-tip">Tip</Label>
              <Select value={tip} onValueChange={(v) => setTip(v as TipCamp)}>
                <SelectTrigger id="camp-tip" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ETICHETE_TIP) as TipCamp[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {ETICHETE_TIP[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {tip === 'dropdown' && (
            <div className="grid gap-1.5">
              <Label htmlFor="camp-optiuni">Optiuni</Label>
              <Input
                id="camp-optiuni"
                value={optiuni}
                onChange={(e) => setOptiuni(e.target.value)}
                placeholder="Aniversare, Cerere in casatorie, Intalnire de afaceri"
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Separate prin virgula, cel putin doua. Baza refuza orice alta valoare.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <Label htmlFor="camp-obligatoriu" className="font-normal">
                Obligatoriu
              </Label>
              <Switch
                id="camp-obligatoriu"
                checked={obligatoriu}
                onCheckedChange={setObligatoriu}
              />
            </div>
            <Button type="submit" size="sm" disabled={!potAdauga}>
              <PlusIcon />
              Adauga
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Numele intern al campului se deriva din intrebare si nu se mai schimba: el e cheia sub
            care raman salvate raspunsurile deja primite.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
