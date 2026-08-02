import type { ComponentProps } from 'react'
import { TriangleAlertIcon } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type Props = ComponentProps<'input'> & {
  eticheta: string
  eroare?: string
  ajutor?: string
}

/**
 * Camp de formular minimal. Nu folosim <Form> din shadcn pentru ca nu e
 * instalat in components/ui; register() din react-hook-form se pune direct.
 */
export function CampText({ eticheta, eroare, ajutor, id, className, ...rest }: Props) {
  const idCamp = id ?? rest.name
  const idEroare = `${idCamp}-eroare`
  const idAjutor = `${idCamp}-ajutor`

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={idCamp}>{eticheta}</Label>
      <Input
        id={idCamp}
        aria-invalid={Boolean(eroare)}
        aria-describedby={eroare ? idEroare : ajutor ? idAjutor : undefined}
        className={cn('h-9', className)}
        {...rest}
      />
      {ajutor && !eroare && (
        <p id={idAjutor} className="text-xs text-muted-foreground">
          {ajutor}
        </p>
      )}
      {eroare && (
        /**
         * §50.6 — iconita de alerta langa mesaj + shake-ul din .camp-invalid.
         * key={eroare}: la fiecare mesaj NOU paragraful se remonteaza si
         * animatia ruleaza din nou; input-ul ramane neatins, deci focusul nu
         * se pierde. Reduced-motion o opreste din CSS.
         */
        <p
          key={eroare}
          id={idEroare}
          className="camp-invalid flex items-start gap-1 text-xs font-medium text-destructive"
        >
          <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {eroare}
        </p>
      )}
    </div>
  )
}
