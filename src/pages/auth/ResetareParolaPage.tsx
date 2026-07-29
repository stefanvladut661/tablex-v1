import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router'
import { Loader2Icon, MailCheckIcon } from 'lucide-react'
import { z } from 'zod'

import { CadruAuth } from '@/components/layout/CadruAuth'
import { CampText } from '@/components/formular/CampText'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useNotificari } from '@/hooks/useNotificari'
import { RUTE } from '@/lib/rute'
import { emailSchema } from '@/lib/validari'

const schema = z.object({ email: emailSchema })
type FormResetare = z.infer<typeof schema>

export function ResetareParolaPage() {
  const { trimiteResetareParola } = useAuth()
  const notificari = useNotificari()
  const [trimis, setTrimis] = useState(false)

  const form = useForm<FormResetare>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  async function trimite(valori: FormResetare) {
    try {
      await trimiteResetareParola(valori.email)
      setTrimis(true)
    } catch (eroare) {
      notificari.eroare(eroare)
    }
  }

  return (
    <CadruAuth
      titlu="Resetare parola"
      descriere="Iti trimitem un link pentru setarea unei parole noi."
      subsol={
        <Link to={RUTE.login} className="font-medium text-primary hover:underline">
          Inapoi la autentificare
        </Link>
      }
    >
      {trimis ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <MailCheckIcon className="size-6 text-primary" />
          <p className="text-sm text-muted-foreground">
            Daca adresa exista in sistem, vei primi un email cu linkul de resetare in cateva
            minute.
          </p>
        </div>
      ) : (
        <form className="grid gap-4" onSubmit={form.handleSubmit(trimite)} noValidate>
          <CampText
            eticheta="Email"
            type="email"
            autoComplete="email"
            placeholder="nume@restaurant.ro"
            eroare={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2Icon className="animate-spin" />}
            Trimite linkul
          </Button>
        </form>
      )}
    </CadruAuth>
  )
}
