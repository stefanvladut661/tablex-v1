import { createBrowserRouter } from 'react-router'

import { RutaAdmin, RutaOaspete, RutaProtejata, RutaSuperAdmin } from '@/components/rute-protejate'
import { DemoHartaPage } from '@/pages/DemoHartaPage'
import { LandingPage } from '@/pages/LandingPage'
import { MentenantaPage } from '@/pages/MentenantaPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ParolaNouaPage } from '@/pages/auth/ParolaNouaPage'
import { ResetareParolaPage } from '@/pages/auth/ResetareParolaPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { VerificaEmailPage } from '@/pages/auth/VerificaEmailPage'
import { DashboardPage } from '@/pages/app/DashboardPage'
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
  { path: RUTE.mentenanta, element: <MentenantaPage /> },
  { path: RUTE.demoHarta, element: <DemoHartaPage /> },

  {
    element: <RutaProtejata />,
    children: [
      {
        element: <RutaAdmin />,
        children: [{ path: RUTE.app, element: <DashboardPage /> }],
      },
      {
        element: <RutaSuperAdmin />,
        children: [{ path: RUTE.superadmin, element: <SuperAdminPage /> }],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
