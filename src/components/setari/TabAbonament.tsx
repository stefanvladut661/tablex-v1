import { useState } from 'react'
import { CheckIcon, CreditCardIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSetariApp } from '@/hooks/useSetariApp'
import type { Restaurant } from '@/contexts/auth-context'

/**
 * Abonamentul (§30.5) si calculatorul de setup (§10.2).
 *
 * Ecran simplu, cum cere spec-ul: planul curent, ce include celalalt, si pretul.
 * FARA istoric de facturi in v1.
 *
 * Schimbarea planului NU se face de aici. Nu din lene: `restaurants.plan` e o
 * coloana privilegiata, aparata de un trigger si de audit (migratia 13) —
 * schimbarea ei e o operatie comerciala, care in v1 trece prin echipa TableX.
 * Butonul cere upgrade-ul; nu si-l acorda singur.
 */
export function TabAbonament({ restaurant }: { restaurant: Restaurant }) {
  const setari = useSetariApp()
  const [mese, setMese] = useState('30')

  const pretStart = Number(setari.data?.pret_plan_start ?? 5)
  const pretPro = Number(setari.data?.pret_plan_pro ?? 10)
  const pretSetup = Number(setari.data?.setup_floor_plan_pret ?? 100)
  const pragMese = setari.data?.setup_prag_mese ?? 50
  const pretMasaExtra = Number(setari.data?.setup_pret_masa_extra ?? 2)

  const nrMese = Math.max(0, Number(mese) || 0)
  const setupTotal = pretSetup + Math.max(0, nrMese - pragMese) * pretMasaExtra
  const ePro = restaurant.plan === 'pro_floor'

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCardIcon className="size-4 text-primary" />
            Planul tau
          </CardTitle>
          <CardDescription>
            Fara contract pe termen lung si fara comision pe rezervare.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary p-3">
            <div>
              <p className="flex items-center gap-2 font-medium">
                {ePro ? 'Pro Floor' : 'Start'}
                <Badge variant="secondary">activ</Badge>
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">
                {ePro ? pretPro : pretStart} EUR pe luna
              </p>
            </div>
            {restaurant.discount_procent && (
              <Badge>Discount {restaurant.discount_procent}%</Badge>
            )}
          </div>

          {!ePro && (
            <div className="grid gap-2 rounded-lg border border-border p-3">
              <p className="font-medium">Pro Floor — {pretPro} EUR pe luna</p>
              <ul className="grid gap-1 text-sm text-muted-foreground">
                {[
                  'Harta 2D a salii, cu status live pe mese',
                  'Mutarea rezervarilor intre mese, prin tragere',
                  'Unirea meselor pentru grupuri mari',
                  'Coada de asteptare langa plan',
                ].map((functie) => (
                  <li key={functie} className="flex items-start gap-1.5">
                    <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-status-liber" />
                    {functie}
                  </li>
                ))}
              </ul>
              <Button size="sm" className="mt-1 justify-self-start" asChild>
                <a href="mailto:contact@tablex.ro?subject=Upgrade%20la%20Pro%20Floor">
                  Cere upgrade la Pro Floor
                </a>
              </Button>
              <p className="text-xs text-muted-foreground">
                Planul se schimba de echipa TableX: e o operatie comerciala, inregistrata in
                registrul de interventii.
              </p>
            </div>
          )}

          {/* §10.2 — calculatorul de setup, cu preturile reale din app_settings. */}
          <div className="grid gap-2 rounded-lg border border-border p-3">
            <p className="font-medium">Configurarea hartii 2D — taxa unica</p>
            <div className="flex items-center gap-2">
              <Label htmlFor="mese-setup" className="text-sm font-normal text-muted-foreground">
                Cate mese ai?
              </Label>
              <Input
                id="mese-setup"
                type="number"
                min={1}
                max={500}
                value={mese}
                onChange={(e) => setMese(e.target.value)}
                className="h-8 w-24"
              />
              <span className="ml-auto font-semibold tabular-nums">{setupTotal} EUR</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {pretSetup} EUR acopera pana la {pragMese} de mese, indiferent de cate zone ai. Peste,{' '}
              {pretMasaExtra} EUR pentru fiecare masa in plus.
              {restaurant.setup_floor_plan_platit && ' Taxa e deja achitata pentru contul tau.'}
            </p>
          </div>

          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-center">
            <p className="text-sm font-medium">Plata online se activeaza in curand</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pana atunci, facturarea se face prin transfer, la cererea echipei.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
