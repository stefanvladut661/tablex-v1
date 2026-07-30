import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'

import { EcranIncarcare } from '@/components/EcranIncarcare'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { RUTE, ruteDupaLogin } from '@/lib/rute'

/**
 * Cele cinci garzi de acces (spec §9).
 *
 *   RutaOaspete     — doar neautentificat (login, signup)
 *   RutaProtejata   — orice utilizator autentificat
 *   RutaAdmin       — cont de restaurant, activ, cu restaurant activ
 *   RutaManager     — RutaAdmin + rol 'manager' (ospatarul nu are voie)
 *   RutaSuperAdmin  — echipa TableX
 *
 * Garzile se compun prin imbricare in router: verificarile mai slabe stau
 * deasupra, ca sa nu se repete in fiecare frunza.
 */

function Blocaj({
  titlu,
  descriere,
  copil,
}: {
  titlu: string
  descriere: string
  copil?: ReactNode
}) {
  const { deconectare } = useAuth()

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{titlu}</CardTitle>
          <CardDescription>{descriere}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {copil}
          <Button variant="outline" onClick={() => void deconectare()}>
            Iesi din cont
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function RutaOaspete() {
  const { incarcare, esteAutentificat, profil } = useAuth()

  if (incarcare) return <EcranIncarcare />
  // ruteDupaLogin duce in onboarding cand contul nu are inca un restaurant.
  if (esteAutentificat) return <Navigate to={ruteDupaLogin(profil?.tip ?? null)} replace />

  return <Outlet />
}

export function RutaProtejata() {
  const { incarcare, esteAutentificat } = useAuth()
  const locatie = useLocation()

  if (incarcare) return <EcranIncarcare />
  if (!esteAutentificat) {
    // Retinem destinatia ca sa revenim la ea dupa autentificare.
    return <Navigate to={RUTE.login} replace state={{ de_la: locatie.pathname }} />
  }

  return <Outlet />
}

export function RutaAdmin() {
  const { incarcare, profil } = useAuth()

  if (incarcare) return <EcranIncarcare />

  // Cont valid, fara restaurant: onboarding, nu un ecran de eroare.
  if (!profil) return <Navigate to={RUTE.appOnboarding} replace />


  if (profil.tip !== 'admin') return <Navigate to={RUTE.superadmin} replace />

  if (!profil.cont.activ) {
    return (
      <Blocaj
        titlu="Cont dezactivat"
        descriere="Accesul tau a fost dezactivat de managerul restaurantului."
      />
    )
  }

  if (profil.restaurant.status !== 'activ') {
    return (
      <Blocaj
        titlu={profil.restaurant.status === 'banat' ? 'Cont blocat' : 'Cont suspendat'}
        descriere={
          profil.restaurant.motiv_suspendare ??
          'Contacteaza echipa TableX pentru reactivarea contului.'
        }
      />
    )
  }

  return <Outlet />
}

/** Se imbrica DUPA RutaAdmin — presupune ca profilul e deja validat. */
export function RutaManager() {
  const { incarcare, esteManager } = useAuth()

  if (incarcare) return <EcranIncarcare />
  if (!esteManager) return <Navigate to={RUTE.app} replace />

  return <Outlet />
}

export function RutaSuperAdmin() {
  const { incarcare, profil } = useAuth()

  if (incarcare) return <EcranIncarcare />
  if (!profil || profil.tip !== 'super_admin') return <Navigate to={RUTE.acasa} replace />

  if (!profil.cont.activ) {
    return <Blocaj titlu="Cont dezactivat" descriere="Contul tau de echipa nu mai este activ." />
  }

  return <Outlet />
}
