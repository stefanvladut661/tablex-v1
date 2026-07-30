import { createBrowserRouter } from 'react-router'

import {
  RutaAdmin,
  RutaManager,
  RutaOaspete,
  RutaProtejata,
  RutaSuperAdmin,
} from '@/components/rute-protejate'
import { DemoHartaPage } from '@/pages/DemoHartaPage'
import { InvitatiePage } from '@/pages/InvitatiePage'
import { LandingPage } from '@/pages/LandingPage'
import { MentenantaPage } from '@/pages/MentenantaPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ParolaNouaPage } from '@/pages/auth/ParolaNouaPage'
import { ResetareParolaPage } from '@/pages/auth/ResetareParolaPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { VerificaEmailPage } from '@/pages/auth/VerificaEmailPage'
import { DashboardPage } from '@/pages/app/DashboardPage'
import { EchipaPage } from '@/pages/app/EchipaPage'
import { OnboardingPage } from '@/pages/app/OnboardingPage'
import { SuperAdminPage } from '@/pages/superadmin/SuperAdminPage'
import { RUTE } from '@/lib/rute'

export const router = createBrowserRouter([
  { path: RUTE.acasa, element: <LandingPage /> },

  // Doar pentru vizitatori: un utilizator logat e trimis in panoul lui.
  {
    element: <RutaOaspete />,
    children: [
      { path: RUTE.login, element: <LoginPage /> },
      { path: RUTE.signup, element: <SignupPage /> },
      { path: RUTE.resetareParola, element: <ResetareParolaPage /> },
    ],
  },

  // Fara garda: /parola-noua ruleaza tocmai pe sesiunea de recovery, iar
  // /verifica-email e vizibil si inainte de confirmarea contului.
  { path: RUTE.parolaNoua, element: <ParolaNouaPage /> },
  { path: RUTE.verificaEmail, element: <VerificaEmailPage /> },
  // Pagina de invitatie trebuie sa fie vizibila si neautentificat: de acolo
  // trimite invitatul la login sau la crearea contului.
  { path: RUTE.invitatie, element: <InvitatiePage /> },
  { path: RUTE.mentenanta, element: <MentenantaPage /> },
  { path: RUTE.demoHarta, element: <DemoHartaPage /> },

  {
    element: <RutaProtejata />,
    children: [
      // Onboarding-ul sta INTENTIONAT in afara RutaAdmin: aici ajunge exact
      // contul care nu are inca profil, adica cel pe care RutaAdmin il respinge.
      { path: RUTE.appOnboarding, element: <OnboardingPage /> },
      {
        element: <RutaAdmin />,
        children: [
          { path: RUTE.app, element: <DashboardPage /> },
          {
            element: <RutaManager />,
            children: [{ path: RUTE.appEchipa, element: <EchipaPage /> }],
          },
        ],
      },
      {
        element: <RutaSuperAdmin />,
        children: [{ path: RUTE.superadmin, element: <SuperAdminPage /> }],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
