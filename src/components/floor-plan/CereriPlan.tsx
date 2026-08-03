import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2Icon, SendIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useNotificari } from '@/hooks/useNotificari'
import { ETICHETE_STATUS_CERERE_FP } from '@/lib/etichete'
import {
  CHEI_FP,
  creeazaCerere,
  getCereriRestaurant,
  incarcaSchita,
  type StatusCerere,
} from '@/services/floor-plan'

const CLASE_STATUS: Record<StatusCerere, string> = {
  pending: 'bg-status-expirare-soft text-foreground',
  in_progress: 'bg-status-eveniment-soft text-foreground',
  published: 'bg-status-liber-soft text-foreground',
  respins: 'bg-status-ocupat-soft text-foreground',
}

/**
 * Planul 2D nu se deseneaza de restaurant (§8.4): el trimite o descriere sau o
 * schita, iar echipa TableX construieste harta. De aceea aici e un formular de
 * cerere, nu un editor.
 */
export function CereriPlan({ restaurantId }: { restaurantId: string }) {
  const notificari = useNotificari()
  const queryClient = useQueryClient()
  const [zoneNume, setZoneNume] = useState('')
  const [descriere, setDescriere] = useState('')
  const [schita, setSchita] = useState<File | null>(null)

  const cereri = useQuery({
    queryKey: CHEI_FP.cereriRestaurant(restaurantId),
    queryFn: () => getCereriRestaurant(restaurantId),
  })

  const trimite = useMutation({
    mutationFn: async () => {
      // Schita se incarca INAINTE de cerere: daca incarcarea cade, nu rămâne o
      // cerere fara imaginea pe care utilizatorul credea ca a trimis-o.
      const schitaCale = schita ? await incarcaSchita(restaurantId, schita) : null
      return creeazaCerere({ restaurantId, zoneNume, descriere, schitaCale })
    },
    onSuccess: () => {
      notificari.succes('Cerere trimisă echipei TableX.', {
        descriere: 'Primești o notificare când planul e publicat.',
      })
      setZoneNume('')
      setDescriere('')
      setSchita(null)
      void queryClient.invalidateQueries({ queryKey: CHEI_FP.cereriRestaurant(restaurantId) })
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const inAsteptare = (cereri.data ?? []).filter(
    (c) => c.status === 'pending' || c.status === 'in_progress',
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Plan 2D al sălii</CardTitle>
        <CardDescription>
          Trimite numele zonei, o descriere și, dacă ai, o schiță sau o poză a sălii. Echipa TableX
          construiește harta și o publică în contul tău.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        <form
          className="grid gap-3"
          onSubmit={(eveniment) => {
            eveniment.preventDefault()
            if (zoneNume.trim().length < 2) return
            trimite.mutate()
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="zona-cerere">Numele zonei</Label>
            <Input
              id="zona-cerere"
              value={zoneNume}
              onChange={(e) => setZoneNume(e.target.value)}
              placeholder="Salon interior, Terasă, Etaj 1..."
              className="h-9"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="descriere-cerere">Descriere</Label>
            <Textarea
              id="descriere-cerere"
              rows={3}
              value={descriere}
              onChange={(e) => setDescriere(e.target.value)}
              placeholder="Câte mese, ce forme, unde sunt barul și intrarea, ce e fix și ce se poate muta."
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="schita-cerere">Schiță sau poză a sălii (opțional)</Label>
            <Input
              id="schita-cerere"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/heic,application/pdf"
              className="h-9 py-1.5"
              onChange={(e) => setSchita(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WEBP sau PDF, până la 5 MB. Limitele sunt impuse pe server.
            </p>
          </div>

          <Button
            type="submit"
            className="justify-self-start"
            disabled={trimite.isPending || zoneNume.trim().length < 2}
          >
            {trimite.isPending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
            Trimite cererea
          </Button>
        </form>

        {inAsteptare.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Ai {inAsteptare.length} {inAsteptare.length === 1 ? 'cerere' : 'cereri'} în lucru.
          </p>
        )}

        {(cereri.data ?? []).length > 0 && (
          <ul className="grid gap-2 border-t border-border pt-3">
            {(cereri.data ?? []).map((cerere) => (
              <li key={cerere.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{cerere.zone_nume}</p>
                  {cerere.descriere && (
                    <p className="truncate text-xs text-muted-foreground">{cerere.descriere}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    trimisă {new Date(cerere.created_at).toLocaleDateString('ro-RO')}
                    {cerere.schita_image_url ? ' · cu schiță' : ''}
                  </p>
                  {/* Motivul respingerii e singurul lucru care face refuzul
                      util: fara el, Adminul stie ca cererea a picat, dar nu ce
                      sa schimbe ca sa o retrimita. Nu se trunchiaza. */}
                  {cerere.status === 'respins' && cerere.motiv_respingere && (
                    <p className="mt-1 text-xs text-foreground">
                      Motivul respingerii: {cerere.motiv_respingere}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${CLASE_STATUS[cerere.status]}`}
                >
                  {ETICHETE_STATUS_CERERE_FP[cerere.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
