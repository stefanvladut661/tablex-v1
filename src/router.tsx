import { createBrowserRouter } from 'react-router'

import { LayoutApp } from '@/components/layout/LayoutApp'
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
import { WidgetRezervarePage } from '@/pages/WidgetRezervarePage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ParolaNouaPage } from '@/pages/auth/ParolaNouaPage'
import { ResetareParolaPage } from '@/pages/auth/ResetareParolaPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { VerificaEmailPage } from '@/pages/auth/VerificaEmailPage'
import { CalendarPage } from '@/pages/app/CalendarPage'
import { ClientiPage } from '@/pages/app/ClientiPage'
import { ListaAsteptarePage } from '@/pages/app/ListaAsteptarePage'
import { EchipaPage } from '@/pages/app/EchipaPage'
import { HartaPage } from '@/pages/app/HartaPage'
import { ListaRezervariPage } from '@/pages/app/ListaRezervariPage'
import { OnboardingPage } from '@/pages/app/OnboardingPage'
import { SetariPage } from '@/pages/app/SetariPage'
import { EditorPlanPage } from '@/pages/superadmin/EditorPlanPage'
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

  // Fara garda: /parola-noua ruleaza tocmai pe sesiunea de recovery,
  // /verifica-email e vizibil inainte de confirmarea contului, iar pagina de
  // invitatie trebuie sa poata trimite invitatul la login sau la signup.
  { path: RUTE.parolaNoua, element: <ParolaNouaPage /> },
  { path: RUTE.verificaEmail, element: <VerificaEmailPage /> },
  { path: RUTE.invitatie, element: <InvitatiePage /> },
  { path: RUTE.mentenanta, element: <MentenantaPage /> },
  { path: RUTE.demoHarta, element: <DemoHartaPage /> },
  // Widgetul public de rezervare, pe slug-ul restaurantului.
  { path: '/r/:slug', element: <WidgetRezervarePage /> },

  {
    element: <RutaProtejata />,
    children: [
      // Onboarding-ul sta INTENTIONAT in afara RutaAdmin: aici ajunge exact
      // contul care nu are inca profil, adica cel pe care RutaAdmin il respinge.
      { path: RUTE.appOnboarding, element: <OnboardingPage /> },
      {
        element: <RutaAdmin />,
        children: [
          {
            // Shell-ul comun (sidebar + bara de sus) pentru tot panoul.
            element: <LayoutApp />,
            children: [
              { path: RUTE.app, element: <CalendarPage /> },
              { path: RUTE.appRezervari, element: <ListaRezervariPage /> },
              { path: RUTE.appHarta, element: <HartaPage /> },
              // CRM-ul e vizibil si ospatarului: el are nevoie sa stie ca
              // oaspetele care intra pe usa are 12 vizite sau 3 neprezentari.
              { path: RUTE.appClienti, element: <ClientiPage /> },
              { path: RUTE.appAsteptare, element: <ListaAsteptarePage /> },
              {
                element: <RutaManager />,
                children: [
                  { path: RUTE.appEchipa, element: <EchipaPage /> },
                  { path: RUTE.appSetari, element: <SetariPage /> },
                ],
              },
            ],
          },
        ],
      },
      {
        element: <RutaSuperAdmin />,
        children: [
          { path: RUTE.superadmin, element: <SuperAdminPage /> },
          // Parametrizata, deci scrisa aici direct: RUTE.superadminEditor e o
          // functie (constructorul de cale), nu un sablon de ruta.
          { path: '/superadmin/editor/:restaurantId', element: <EditorPlanPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
