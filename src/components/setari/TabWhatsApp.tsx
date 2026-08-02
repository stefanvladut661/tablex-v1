import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircleIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotificari } from '@/hooks/useNotificari'
import {
  CHEI_WHATSAPP,
  consumPeLuni,
  getPachete,
  getSoldCredite,
  getTranzactii,
  reincarcaCredite,
} from '@/services/whatsapp'

/**
 * Creditele WhatsApp (§10.3, §30.4).
 *
 * Trimiterea reala prin Meta ramane interzisa in v1 (§14): aici sunt
 * contabilitatea si fluxul, gata de conectat. Ce e insa deja adevarat e regula
 * din §16.2 si §21.2 — mesajul pleaca DOAR daca exista credit, iar lipsa lui nu
 * e o eroare pentru client, ci un sold scazut pe care il vede restaurantul.
 *
 * Graficul e SVG scris de mana. O librarie de charting ar fi adus zeci de
 * kiloocteti pentru sase dreptunghiuri.
 */
export function TabWhatsApp({ restaurantId }: { restaurantId: string }) {
  const notificari = useNotificari()
  const queryClient = useQueryClient()

  const sold = useQuery({
    queryKey: CHEI_WHATSAPP.sold(restaurantId),
    queryFn: getSoldCredite,
  })
  const pachete = useQuery({ queryKey: CHEI_WHATSAPP.pachete, queryFn: getPachete })
  const tranzactii = useQuery({
    queryKey: CHEI_WHATSAPP.tranzactii(restaurantId),
    queryFn: () => getTranzactii(restaurantId),
  })

  const reincarca = useMutation({
    mutationFn: reincarcaCredite,
    onSuccess: (soldNou) => {
      notificari.succes(`Credite adăugate. Sold: ${soldNou}.`, {
        descriere: 'Reîncărcare demonstrativă — plata online se activează mai târziu.',
      })
      void queryClient.invalidateQueries({ queryKey: CHEI_WHATSAPP.sold(restaurantId) })
      void queryClient.invalidateQueries({ queryKey: CHEI_WHATSAPP.tranzactii(restaurantId) })
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const luni = consumPeLuni(tranzactii.data ?? [])
  const maxim = Math.max(1, ...luni.map((l) => l.consum))

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircleIcon className="size-4 text-primary" />
            Credite WhatsApp
          </CardTitle>
          <CardDescription>
            Un mesaj trimis = un credit. Emailul și notificările din aplicație rămân gratuite și
            nelimitate.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {sold.isLoading ? (
            <Skeleton className="h-12 w-32" />
          ) : (
            <div>
              <p className="text-3xl font-semibold tabular-nums">{sold.data ?? 0}</p>
              <p className="text-xs text-muted-foreground">credite disponibile</p>
            </div>
          )}

          {(sold.data ?? 0) === 0 && (
            <p className="rounded-lg border border-status-expirare bg-status-expirare-soft p-3 text-sm">
              Fără credite, mementourile și confirmările prin WhatsApp nu pleacă. Clientul nu vede
              nicio eroare — pur și simplu nu primește mesajul.
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            {(pachete.data ?? []).map((pachet) => (
              <div key={pachet.id} className="grid gap-1 rounded-lg border border-border p-3">
                <p className="font-medium">{pachet.nume}</p>
                <p className="text-sm tabular-nums">
                  {pachet.credite} credite · {pachet.pret_eur} EUR
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {(Number(pachet.pret_eur) / pachet.credite).toFixed(2)} EUR pe mesaj
                </p>
                <Button
                  size="xs"
                  variant="outline"
                  className="mt-1 justify-self-start"
                  disabled={reincarca.isPending}
                  onClick={() => reincarca.mutate(pachet.id)}
                >
                  Reîncarcă
                </Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Reîncărcarea e demonstrativă: adaugă creditele, dar nu încasează nimic.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consum lunar</CardTitle>
          <CardDescription>Ultimele șase luni cu activitate.</CardDescription>
        </CardHeader>
        <CardContent>
          {luni.length === 0 ? (
            <p className="text-sm text-muted-foreground">Niciun mesaj trimis încă.</p>
          ) : (
            <div className="flex items-end gap-3" style={{ height: 120 }}>
              {luni.map((luna) => (
                <div key={luna.luna} className="grid flex-1 justify-items-center gap-1">
                  <span className="text-xs tabular-nums">{luna.consum}</span>
                  <div
                    className="w-full rounded-t bg-primary"
                    style={{ height: `${Math.round((luna.consum / maxim) * 80)}px` }}
                  />
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {luna.luna.slice(5)}/{luna.luna.slice(2, 4)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
