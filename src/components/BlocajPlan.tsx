import type { ReactNode } from 'react'
import { LockIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { RUTE } from '@/lib/rute'

/**
 * Blur + lacat peste o functionalitate care apartine planului Pro Floor
 * (§8.4, §10.1). Continutul ramane randat dedesubt, neclar: spec cere ca
 * pagina sa fie vizibila in navigatie, nu ascunsa — restaurantul trebuie sa
 * vada CE cumpara, nu doar ca-i lipseste ceva.
 *
 * Blocajul NU e o masura de securitate. Politicile RLS pe `tables` si `zones`
 * (migratia 26) refuza scrierea oricum; asta doar nu arata butoane care ar
 * esua. Ordinea conteaza: intai regula in baza, apoi oglinda ei aici.
 */
export function BlocajPlan({
  titlu = 'Harta 2D face parte din planul Pro Floor',
  descriere = 'Planul sălii, statusul meselor în timp real și mutarea rezervărilor între mese sunt incluse în Pro Floor.',
  children,
}: {
  titlu?: string
  descriere?: string
  children: ReactNode
}) {
  return (
    <div className="relative">
      {/* aria-hidden + inert: continutul de dedesubt e decor, nu trebuie sa
          poata fi atins cu Tab sau citit de un cititor de ecran. */}
      <div className="pointer-events-none select-none blur-[6px]" aria-hidden inert>
        {children}
      </div>

      <div className="absolute inset-0 grid place-items-center bg-background/60 p-6">
        <div className="grid max-w-sm justify-items-center gap-3 rounded-lg border border-border bg-card p-6 text-center shadow-md">
          <span className="grid size-10 place-items-center rounded-full bg-muted">
            <LockIcon className="size-4 text-muted-foreground" />
          </span>
          <h2 className="font-semibold tracking-tight">{titlu}</h2>
          <p className="text-sm text-muted-foreground">{descriere}</p>
          <Button asChild size="sm">
            {/* Upgrade-ul se cere din Setari → Abonament; pana la ecranul acela
                (§30.5) trimitem in Setari, nu intr-un loc care nu exista. */}
            <a href={RUTE.appSetari}>Deblochează Harta 2D — Upgrade la Pro Floor</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
