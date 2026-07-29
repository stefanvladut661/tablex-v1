import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router'
import { Loader2Icon } from 'lucide-react'
import { z } from 'zod'

import { CadruAuth } from '@/components/layout/CadruAuth'
import { CampText } from '@/components/formular/CampText'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { useNotificari } from '@/hooks/useNotificari'
import { RUTE } from '@/lib/rute'
import { emailSchema, numeSchema, parolaSchema, telefonSchema } from '@/lib/validari'

const schema = z
  .object({
    numePersoana: numeSchema,
    numeRestaurant: numeSchema,
    email: emailSchema,
    telefon: telefonSchema,
    parola: parolaSchema,
    confirmare: z.string(),
    termeni: z
      .boolean()
      .refine((bifat) => bifat, { message: 'Trebuie sa accepti termenii pentru a continua.' }),
  })
  .refine((date) => date.parola === date.confirmare, {
    message: 'Parolele nu coincid.',
    path: ['confirmare'],
  })

type FormSignup = z.infer<typeof schema>

export function SignupPage() {
  const { inregistrare } = useAuth()
  const notificari = useNotificari()
  const navigate = useNavigate()

  const form = useForm<FormSignup>({
    resolver: zodResolver(schema),
    defaultValues: {
      numePersoana: '',
      numeRestaurant: '',
      email: '',
      telefon: '',
      parola: '',
      confirmare: '',
      termeni: false,
    },
  })

  async function trimite(valori: FormSignup) {
    try {
      await inregistrare({
        email: valori.email,
        parola: valori.parola,
        numePersoana: valori.numePersoana,
        numeRestaurant: valori.numeRestaurant,
        telefon: valori.telefon,
      })
      navigate(RUTE.verificaEmail, { replace: true, state: { email: valori.email } })
    } catch (eroare) {
      notificari.eroare(eroare)
    }
  }

  return (
    <CadruAuth
      titlu="Creeaza cont"
      descriere="Restaurantul se configureaza dupa confirmarea adresei de email."
      subsol={
        <>
          Ai deja cont?{' '}
          <Link to={RUTE.login} className="font-medium text-primary hover:underline">
            Autentifica-te
          </Link>
        </>
      }
    >
      <form className="grid gap-4" onSubmit={form.handleSubmit(trimite)} noValidate>
        <CampText
          eticheta="Numele tau"
          autoComplete="name"
          eroare={form.formState.errors.numePersoana?.message}
          {...form.register('numePersoana')}
        />
        <CampText
          eticheta="Numele restaurantului"
          autoComplete="organization"
          eroare={form.formState.errors.numeRestaurant?.message}
          {...form.register('numeRestaurant')}
        />
        <CampText
          eticheta="Email"
          type="email"
          autoComplete="email"
          placeholder="nume@restaurant.ro"
          eroare={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <CampText
          eticheta="Telefon"
          type="tel"
          autoComplete="tel"
          placeholder="0722123456"
          eroare={form.formState.errors.telefon?.message}
          {...form.register('telefon')}
        />
        <CampText
          eticheta="Parola"
          type="password"
          autoComplete="new-password"
          ajutor="Minim 8 caractere."
          eroare={form.formState.errors.parola?.message}
          {...form.register('parola')}
        />
        <CampText
          eticheta="Confirma parola"
          type="password"
          autoComplete="new-password"
          eroare={form.formState.errors.confirmare?.message}
          {...form.register('confirmare')}
        />

        <div className="grid gap-1.5">
          <div className="flex items-start gap-2">
            {/* Controller, nu watch(): watch() returneaza o functie pe care
                React Compiler nu poate memoiza si dezactiveaza compilarea. */}
            <Controller
              control={form.control}
              name="termeni"
              render={({ field }) => (
                <Checkbox
                  id="termeni"
                  checked={field.value}
                  onBlur={field.onBlur}
                  onCheckedChange={(bifat) => field.onChange(bifat === true)}
                />
              )}
            />
            <Label htmlFor="termeni" className="text-sm font-normal leading-snug">
              Sunt de acord cu termenii si cu prelucrarea datelor conform GDPR.
            </Label>
          </div>
          {form.formState.errors.termeni && (
            <p className="text-xs font-medium text-destructive">
              {form.formState.errors.termeni.message}
            </p>
          )}
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2Icon className="animate-spin" />}
          Creeaza cont
        </Button>
      </form>
    </CadruAuth>
  )
}
