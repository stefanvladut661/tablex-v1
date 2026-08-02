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

import { ETICHETE_ROL_ADMIN, ETICHETE_ROL_ECHIPA } from '@/lib/etichete'

const ETICHETE_ROL: Record<string, string> = { ...ETICHETE_ROL_ADMIN, ...ETICHETE_ROL_ECHIPA }

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
        descriere="Linkul de invitație nu conține niciun token."
        subsol={
          <Link to={RUTE.acasa} className="font-medium text-primary hover:underline">
            Înapoi la pagina principală
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          Deschide linkul exact cum l-ai primit pe email, fără să îl modifici.
        </p>
      </CadruAuth>
    )
  }

  if (incarcare || invitatie.isLoading) return <EcranIncarcare mesaj="Se verifică invitația..." />

  if (invitatie.isError) {
    return (
      <CadruAuth titlu="Nu am putut verifica invitația" descriere="Încearcă din nou în câteva momente.">
        <Button variant="outline" onClick={() => void invitatie.refetch()}>
          Reîncearcă
        </Button>
      </CadruAuth>
    )
  }

  const date = invitatie.data
  if (!date) {
    return (
      <CadruAuth
        titlu="Invitație invalidă"
        descriere="Invitația a expirat, a fost anulată sau a fost deja folosită."
        subsol={
          <Link to={RUTE.acasa} className="font-medium text-primary hover:underline">
            Înapoi la pagina principală
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          Cere managerului restaurantului o invitație nouă.
        </p>
      </CadruAuth>
    )
  }

  const esteEchipa = date.tip === 'echipa'

  const antet = (
    <div className="grid gap-2 rounded-lg bg-muted p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">{esteEchipa ? 'Organizație' : 'Restaurant'}</span>
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
        titlu={`Invitație la ${date.restaurant_nume}`}
        descriere="Autentifică-te cu adresa invitată pentru a accepta."
      >
        <div className="grid gap-4">
          {antet}
          <Button asChild>
            <Link to={RUTE.login} state={{ de_la: inapoiAici }}>
              Am cont — autentifică-te
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={RUTE.signup} state={{ de_la: inapoiAici }}>
              Creează cont
            </Link>
          </Button>
        </div>
      </CadruAuth>
    )
  }

  // Un cont apartine unui singur loc: unui restaurant SAU echipei TableX.
  // Regula e impusa de un trigger in baza; aici o spunem pe intelesul omului.
  if (profil) {
    return (
      <CadruAuth
        titlu={
          profil.tip === 'super_admin'
            ? 'Contul face deja parte din echipa TableX'
            : 'Contul are deja un restaurant'
        }
        descriere="Un cont poate aparține unui singur loc."
      >
        <div className="grid gap-4">
          {antet}
          <p className="text-sm text-muted-foreground">
            Deconectează-te și intră cu adresa {date.email} pentru a accepta invitația.
          </p>
          <Button variant="outline" onClick={() => void deconectare()}>
            Ieși din cont
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
      notificari.succes(`Bine ai venit în echipa ${date!.restaurant_nume}!`)
      // Invitatia de echipa nu are restaurant: panoul ei e altul.
      navigate(date!.tip === 'echipa' ? RUTE.superadmin : RUTE.app, { replace: true })
    } catch (eroare) {
      notificari.eroare(eroare)
    } finally {
      setSeAccepta(false)
    }
  }

  return (
    <CadruAuth
      titlu={`Invitație la ${date.restaurant_nume}`}
      descriere={
        emailPotrivit
          ? 'Acceptă invitația pentru a intra în panoul restaurantului.'
          : 'Invitația e pentru o altă adresă de email.'
      }
    >
      <div className="grid gap-4">
        {antet}

        {emailPotrivit ? (
          <Button onClick={() => void accepta()} disabled={seAccepta}>
            {seAccepta ? <Loader2Icon className="animate-spin" /> : <MailIcon />}
            Acceptă invitația
          </Button>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Ești autentificat ca {utilizator?.email}. Invitația a fost trimisă adresei{' '}
              {date.email}.
            </p>
            <Button variant="outline" onClick={() => void deconectare()}>
              Ieși și intră cu adresa corectă
            </Button>
          </>
        )}
      </div>
    </CadruAuth>
  )
}
