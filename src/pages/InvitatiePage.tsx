import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Loader2Icon, MailIcon } from 'lucide-react'

import { CadruAuth } from '@/components/layout/CadruAuth'
import { EcranIncarcare } from '@/components/EcranIncarcare'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useNotificari } from '@/hooks/useNotificari'
import { RUTE } from '@/lib/rute'
import { acceptaInvitatie, getDetaliiInvitatie } from '@/services/onboarding'

const ETICHETE_ROL = { manager: 'Manager', ospatar: 'Ospatar' } as const

export function InvitatiePage() {
  const [parametri] = useSearchParams()
  const token = parametri.get('token') ?? ''

  const { utilizator, profil, incarcare, esteAutentificat, reincarcaProfil, deconectare } = useAuth()
  const notificari = useNotificari()
  const navigate = useNavigate()
  const [seAccepta, setSeAccepta] = useState(false)

  const invitatie = useQuery({
    queryKey: ['invitatie', token],
    queryFn: () => getDetaliiInvitatie(token),
    enabled: token.length > 0,
    retry: false,
  })

  if (!token) {
    return (
      <CadruAuth
        titlu="Link incomplet"
        descriere="Linkul de invitatie nu contine niciun token."
        subsol={
          <Link to={RUTE.acasa} className="font-medium text-primary hover:underline">
            Inapoi la pagina principala
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          Deschide linkul exact cum l-ai primit pe email, fara sa il modifici.
        </p>
      </CadruAuth>
    )
  }

  if (incarcare || invitatie.isLoading) return <EcranIncarcare mesaj="Se verifica invitatia..." />

  if (invitatie.isError) {
    return (
      <CadruAuth titlu="Nu am putut verifica invitatia" descriere="Incearca din nou in cateva momente.">
        <Button variant="outline" onClick={() => void invitatie.refetch()}>
          Reincearca
        </Button>
      </CadruAuth>
    )
  }

  const date = invitatie.data
  if (!date) {
    return (
      <CadruAuth
        titlu="Invitatie invalida"
        descriere="Invitatia a expirat, a fost anulata sau a fost deja folosita."
        subsol={
          <Link to={RUTE.acasa} className="font-medium text-primary hover:underline">
            Inapoi la pagina principala
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          Cere managerului restaurantului o invitatie noua.
        </p>
      </CadruAuth>
    )
  }

  const antet = (
    <div className="grid gap-2 rounded-lg bg-muted p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Restaurant</span>
        <span className="font-medium">{date.restaurant_nume}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Rol</span>
        <Badge variant="secondary">{ETICHETE_ROL[date.rol]}</Badge>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">Email</span>
        <span className="font-medium">{date.email}</span>
      </div>
    </div>
  )

  // Neautentificat: invitatia e legata de o adresa, deci trimitem la login sau
  // la signup si revenim aici (garda de login respecta state.de_la).
  if (!esteAutentificat) {
    const inapoiAici = `${RUTE.invitatie}?token=${encodeURIComponent(token)}`
    return (
      <CadruAuth
        titlu={`Invitatie la ${date.restaurant_nume}`}
        descriere="Autentifica-te cu adresa invitata pentru a accepta."
      >
        <div className="grid gap-4">
          {antet}
          <Button asChild>
            <Link to={RUTE.login} state={{ de_la: inapoiAici }}>
              Am cont — autentifica-te
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={RUTE.signup} state={{ de_la: inapoiAici }}>
              Creeaza cont
            </Link>
          </Button>
        </div>
      </CadruAuth>
    )
  }

  if (profil) {
    return (
      <CadruAuth
        titlu="Contul are deja un restaurant"
        descriere="Un cont poate aparține unui singur restaurant."
      >
        <div className="grid gap-4">
          {antet}
          <p className="text-sm text-muted-foreground">
            Deconecteaza-te si intra cu adresa {date.email} pentru a accepta invitatia.
          </p>
          <Button variant="outline" onClick={() => void deconectare()}>
            Iesi din cont
          </Button>
        </div>
      </CadruAuth>
    )
  }

  const emailPotrivit =
    (utilizator?.email ?? '').toLowerCase() === date.email.toLowerCase()

  async function accepta() {
    setSeAccepta(true)
    try {
      await acceptaInvitatie(token)
      await reincarcaProfil()
      notificari.succes(`Bine ai venit in echipa ${date!.restaurant_nume}!`)
      navigate(RUTE.app, { replace: true })
    } catch (eroare) {
      notificari.eroare(eroare)
    } finally {
      setSeAccepta(false)
    }
  }

  return (
    <CadruAuth
      titlu={`Invitatie la ${date.restaurant_nume}`}
      descriere={
        emailPotrivit
          ? 'Accepta invitatia pentru a intra in panoul restaurantului.'
          : 'Invitatia e pentru o alta adresa de email.'
      }
    >
      <div className="grid gap-4">
        {antet}

        {emailPotrivit ? (
          <Button onClick={() => void accepta()} disabled={seAccepta}>
            {seAccepta ? <Loader2Icon className="animate-spin" /> : <MailIcon />}
            Accepta invitatia
          </Button>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Ești autentificat ca {utilizator?.email}. Invitatia a fost trimisa adresei{' '}
              {date.email}.
            </p>
            <Button variant="outline" onClick={() => void deconectare()}>
              Iesi si intra cu adresa corecta
            </Button>
          </>
        )}
      </div>
    </CadruAuth>
  )
}
