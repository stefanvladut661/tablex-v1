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
import {
  CHEI_NOTIFICARI,
  getNotificari,
  marcheazaCitita,
  marcheazaToateCitite,
} from '@/services/notificari'
import type { Enums } from '@/types/database'

/** §21: rosu = urgent, galben = cere o decizie, albastru = informativ. */
const CLASE_URGENTA: Record<Enums<'notificare_urgenta'>, string> = {
  rosu: 'bg-status-ocupat',
  galben: 'bg-status-expirare',
  albastru: 'bg-primary',
}

function candDinISO(iso: string): string {
  const minute = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minute < 1) return 'acum'
  if (minute < 60) return `acum ${minute} min`
  const ore = Math.round(minute / 60)
  if (ore < 24) return `acum ${ore} h`
  return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })
}

export function ClopotelNotificari({ restaurantId }: { restaurantId: string }) {
  const queryClient = useQueryClient()
  const notificariUi = useNotificari()

  const lista = useQuery({
    queryKey: CHEI_NOTIFICARI.lista(restaurantId),
    queryFn: () => getNotificari(restaurantId),
    // Realtime face invalidarea; polling-ul e doar plasa de siguranta.
    refetchInterval: 5 * 60_000,
  })

  const invalideaza = () =>
    queryClient.invalidateQueries({ queryKey: CHEI_NOTIFICARI.lista(restaurantId) })

  const citesteUna = useMutation({
    mutationFn: marcheazaCitita,
    onSuccess: invalideaza,
    onError: (eroare) => notificariUi.eroare(eroare),
  })
  const citesteToate = useMutation({
    mutationFn: () => marcheazaToateCitite(restaurantId),
    onSuccess: invalideaza,
    onError: (eroare) => notificariUi.eroare(eroare),
  })

  const necitite = (lista.data ?? []).filter((n) => !n.citita_la)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative" aria-label="Notificari">
          <BellIcon />
          {necitite.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-status-ocupat text-[10px] font-semibold text-status-ocupat-foreground tabular-nums">
              {necitite.length > 9 ? '9+' : necitite.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <span className="text-sm font-medium">Notificari</span>
          {necitite.length > 0 && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => citesteToate.mutate()}
              disabled={citesteToate.isPending}
            >
              <CheckCheckIcon />
              Marcheaza tot
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {lista.isLoading ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Se incarca...</p>
          ) : (lista.data ?? []).length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nicio notificare. Cererile din widgetul public apar aici.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {(lista.data ?? []).map((notificare) => (
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
                        <span className="block truncate text-xs text-muted-foreground">
                          {notificare.mesaj}
                        </span>
                      )}
                      <span className="block text-xs text-muted-foreground">
                        {candDinISO(notificare.created_at)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
