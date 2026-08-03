import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellIcon, CheckCheckIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotificari } from '@/hooks/useNotificari'
import { etichetaBulina, necititeDin } from '@/lib/notificari-citit'
import {
  CHEI_NOTIFICARI,
  getNotificariEchipa,
  marcheazaCitita,
  marcheazaToateCitite,
  type Notificare,
} from '@/services/notificari'
import type { Enums } from '@/types/database'

/**
 * Clopotelul echipei TableX (§9.1, §38.4) — spre deosebire de clopotelul
 * restaurantului, aici notificarile sunt GRUPATE PE URGENTA, nu doar sortate
 * cronologic: intai cele rosii (cerere de plan nepreluata), apoi galbenele
 * (credite epuizate), apoi albastrele (tichete noi).
 */

const CLASE_URGENTA: Record<Enums<'notificare_urgenta'>, string> = {
  rosu: 'bg-status-ocupat',
  galben: 'bg-status-expirare',
  albastru: 'bg-primary',
}

const TITLU_GRUP: Record<Enums<'notificare_urgenta'>, string> = {
  rosu: 'Urgente',
  galben: 'De urmărit',
  albastru: 'Informative',
}

const ORDINE_URGENTA: Array<Enums<'notificare_urgenta'>> = ['rosu', 'galben', 'albastru']

function candDinISO(iso: string): string {
  const minute = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minute < 1) return 'acum'
  if (minute < 60) return `acum ${minute} min`
  const ore = Math.round(minute / 60)
  if (ore < 24) return `acum ${ore} h`
  return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })
}

/**
 * `userId` intra in cheia de cache fiindca starea de citit e a persoanei (§33).
 * Consecinta de comportament, intentionata: „Marchează tot" nu mai stinge
 * bulina colegilor din echipa TableX, cum facea pana acum.
 */
export function ClopotelEchipa({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const notificariUi = useNotificari()

  const lista = useQuery({
    queryKey: CHEI_NOTIFICARI.echipa(userId),
    queryFn: getNotificariEchipa,
    // Realtime face invalidarea; polling-ul e doar plasa de siguranta.
    refetchInterval: 5 * 60_000,
  })

  const invalideaza = () =>
    queryClient.invalidateQueries({ queryKey: CHEI_NOTIFICARI.echipa(userId) })

  const citesteUna = useMutation({
    mutationFn: marcheazaCitita,
    onSuccess: invalideaza,
    onError: (eroare) => notificariUi.eroare(eroare),
  })
  const citesteToate = useMutation({
    mutationFn: () => marcheazaToateCitite('super_admin'),
    onSuccess: invalideaza,
    onError: (eroare) => notificariUi.eroare(eroare),
  })

  const necitite = necititeDin(lista.data ?? [])

  const grupuri = useMemo(() => {
    const toate = lista.data ?? []
    return ORDINE_URGENTA.map((urgenta) => ({
      urgenta,
      notificari: toate.filter((n) => n.urgenta === urgenta),
    })).filter((grup) => grup.notificari.length > 0)
  }, [lista.data])

  const randNotificare = (notificare: Notificare) => (
    <li key={notificare.id}>
      <button
        type="button"
        onClick={() => !notificare.citita_la && citesteUna.mutate(notificare.id)}
        className={`flex w-full gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-accent/50 ${
          notificare.citita_la ? 'opacity-60' : ''
        }`}
      >
        <span
          className={`mt-1.5 size-2 shrink-0 rounded-full ${CLASE_URGENTA[notificare.urgenta]}`}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{notificare.titlu}</span>
          {notificare.mesaj && (
            <span className="block truncate text-xs text-muted-foreground">{notificare.mesaj}</span>
          )}
          <span className="block text-xs text-muted-foreground">
            {candDinISO(notificare.created_at)}
          </span>
        </span>
      </button>
    </li>
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative" aria-label="Notificări interne">
          <BellIcon />
          {necitite.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-status-ocupat text-[10px] font-semibold text-status-ocupat-foreground tabular-nums">
              {etichetaBulina(necitite.length)}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <span className="text-sm font-medium">Notificări interne</span>
          {necitite.length > 0 && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => citesteToate.mutate()}
              disabled={citesteToate.isPending}
            >
              <CheckCheckIcon />
              Marchează tot
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {lista.isLoading ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Se încarcă...</p>
          ) : grupuri.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nicio notificare. Cererile de plan, creditele epuizate și tichetele noi apar aici.
            </p>
          ) : (
            grupuri.map((grup) => (
              <div key={grup.urgenta}>
                <p className="bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground uppercase">
                  {TITLU_GRUP[grup.urgenta]}
                </p>
                <ul className="divide-y divide-border">{grup.notificari.map(randNotificare)}</ul>
              </div>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
