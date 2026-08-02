import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router'
import { Loader2Icon } from 'lucide-react'
import { z } from 'zod'

import { CadruAuth } from '@/components/layout/CadruAuth'
import { CampText } from '@/components/formular/CampText'
import { EcranIncarcare } from '@/components/EcranIncarcare'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useNotificari } from '@/hooks/useNotificari'
import { RUTE, ruteDupaLogin } from '@/lib/rute'
import { parolaSchema } from '@/lib/validari'

const schema = z
  .object({ parola: parolaSchema, confirmare: z.string() })
  .refine((date) => date.parola === date.confirmare, {
    message: 'Parolele nu coincid.',
    path: ['confirmare'],
  })

type FormParolaNoua = z.infer<typeof schema>

/**
 * Se ajunge aici din linkul de resetare. Supabase a schimbat deja codul din
 * URL pe o sesiune de recovery (detectSessionInUrl), deci daca nu exista
 * sesiune inseamna ca linkul a expirat sau a fost deja folosit.
 */
export function ParolaNouaPage() {
  const { incarcare, esteAutentificat, profil, seteazaParolaNoua } = useAuth()
  const notificari = useNotificari()
  const navigate = useNavigate()

  const form = useForm<FormParolaNoua>({
    resolver: zodResolver(schema),
    defaultValues: { parola: '', confirmare: '' },
  })

  if (incarcare) return <EcranIncarcare mesaj="Se verifică linkul..." />

  if (!esteAutentificat) {
    return (
      <CadruAuth
        titlu="Link invalid"
        descriere="Linkul de resetare a expirat sau a fost deja folosit."
        subsol={
          <Link to={RUTE.resetareParola} className="font-medium text-primary hover:underline">
            Cere un link nou
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          Din motive de securitate, linkurile de resetare sunt valabile o singură dată.
        </p>
      </CadruAuth>
    )
  }

  async function trimite(valori: FormParolaNoua) {
    try {
      await seteazaParolaNoua(valori.parola)
      notificari.succes('Parola a fost schimbată.')
      navigate(ruteDupaLogin(profil?.tip ?? null), { replace: true })
    } catch (eroare) {
      notificari.eroare(eroare)
    }
  }

  return (
    <CadruAuth titlu="Parolă nouă" descriere="Alege o parolă pe care nu ai mai folosit-o.">
      <form className="grid gap-4" onSubmit={form.handleSubmit(trimite)} noValidate>
        <CampText
          eticheta="Parolă nouă"
          type="password"
          autoComplete="new-password"
          ajutor="Minim 8 caractere."
          eroare={form.formState.errors.parola?.message}
          {...form.register('parola')}
        />
        <CampText
          eticheta="Confirmă parola"
          type="password"
          autoComplete="new-password"
          eroare={form.formState.errors.confirmare?.message}
          {...form.register('confirmare')}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2Icon className="animate-spin" />}
          Salvează parola
        </Button>
      </form>
    </CadruAuth>
  )
}
