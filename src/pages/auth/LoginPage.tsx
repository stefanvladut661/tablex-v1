import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate } from 'react-router'
import { Loader2Icon } from 'lucide-react'
import { z } from 'zod'

import { CadruAuth } from '@/components/layout/CadruAuth'
import { CampText } from '@/components/formular/CampText'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useNotificari } from '@/hooks/useNotificari'
import { RUTE } from '@/lib/rute'
import { emailSchema } from '@/lib/validari'

const schemaParola = z.object({
  email: emailSchema,
  parola: z.string().min(1, 'Introdu parola.'),
})

const schemaMagicLink = z.object({ email: emailSchema })

type FormParola = z.infer<typeof schemaParola>
type FormMagicLink = z.infer<typeof schemaMagicLink>

export function LoginPage() {
  const { autentificare, trimiteMagicLink } = useAuth()
  const notificari = useNotificari()
  const navigate = useNavigate()
  const locatie = useLocation()
  const [linkTrimis, setLinkTrimis] = useState(false)

  const dupaLogin = (locatie.state as { de_la?: string } | null)?.de_la

  const formParola = useForm<FormParola>({
    resolver: zodResolver(schemaParola),
    defaultValues: { email: '', parola: '' },
  })

  const formMagic = useForm<FormMagicLink>({
    resolver: zodResolver(schemaMagicLink),
    defaultValues: { email: '' },
  })

  async function trimiteParola(valori: FormParola) {
    try {
      await autentificare(valori.email, valori.parola)
      notificari.succes('Bine ai revenit!')
      // Fara destinatie retinuta, garda RutaOaspete duce singura la panoul
      // potrivit imediat ce profilul e incarcat.
      if (dupaLogin) navigate(dupaLogin, { replace: true })
    } catch (eroare) {
      notificari.eroare(eroare)
    }
  }

  async function trimiteLink(valori: FormMagicLink) {
    try {
      await trimiteMagicLink(valori.email)
      setLinkTrimis(true)
      notificari.succes('Link trimis', { descriere: 'Verifica-ti casuta de email.' })
    } catch (eroare) {
      notificari.eroare(eroare)
    }
  }

  return (
    <CadruAuth
      titlu="Autentificare"
      descriere="Intra in panoul restaurantului tau."
      subsol={
        <>
          Nu ai cont?{' '}
          <Link to={RUTE.signup} className="font-medium text-primary hover:underline">
            Creeaza unul
          </Link>
        </>
      }
    >
      <Tabs defaultValue="parola">
        <TabsList className="w-full">
          <TabsTrigger value="parola">Parola</TabsTrigger>
          <TabsTrigger value="magic">Link magic</TabsTrigger>
        </TabsList>

        <TabsContent value="parola">
          <form
            className="grid gap-4 pt-4"
            onSubmit={formParola.handleSubmit(trimiteParola)}
            noValidate
          >
            <CampText
              eticheta="Email"
              type="email"
              autoComplete="email"
              placeholder="nume@restaurant.ro"
              eroare={formParola.formState.errors.email?.message}
              {...formParola.register('email')}
            />
            <CampText
              eticheta="Parola"
              type="password"
              autoComplete="current-password"
              eroare={formParola.formState.errors.parola?.message}
              {...formParola.register('parola')}
            />

            <div className="flex justify-end">
              <Link
                to={RUTE.resetareParola}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Ai uitat parola?
              </Link>
            </div>

            <Button type="submit" disabled={formParola.formState.isSubmitting}>
              {formParola.formState.isSubmitting && <Loader2Icon className="animate-spin" />}
              Intra in cont
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="magic">
          {linkTrimis ? (
            <p className="pt-4 text-sm text-muted-foreground">
              Ti-am trimis un link de autentificare. Deschide-l de pe acest dispozitiv; expira in
              60 de minute.
            </p>
          ) : (
            <form
              className="grid gap-4 pt-4"
              onSubmit={formMagic.handleSubmit(trimiteLink)}
              noValidate
            >
              <CampText
                eticheta="Email"
                type="email"
                autoComplete="email"
                placeholder="nume@restaurant.ro"
                ajutor="Primesti un link de acces, fara parola."
                eroare={formMagic.formState.errors.email?.message}
                {...formMagic.register('email')}
              />
              <Button type="submit" disabled={formMagic.formState.isSubmitting}>
                {formMagic.formState.isSubmitting && <Loader2Icon className="animate-spin" />}
                Trimite linkul
              </Button>
            </form>
          )}
        </TabsContent>
      </Tabs>
    </CadruAuth>
  )
}
