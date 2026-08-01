import { createBrowserRouter } from 'react-router'

import { LayoutApp } from '@/components/layout/LayoutApp'
import {
  RutaAdmin,
  RutaManager,
  RutaOaspete,
  RutaProtejata,
  RutaSuperAdmin,
} from '@/components/rute-protejate'
import { RUTE } from '@/lib/rute'

/**
 * Paginile se incarca la cerere (§7 — plasa de siguranta). Tot codul intra
 * altfel intr-un singur fisier de peste un megabyte, pe care il descarca si
 * ospatarul care deschide calendarul de pe telefon, in sala, pe 4G: editorul de
 * planuri al echipei, panoul de super admin, landingul cu animatii — nimic din
 * ce ii trebuie lui.
 *
 * Garzile de ruta raman incarcate de la inceput: sunt cateva randuri fiecare si
 * decid CE se incarca mai departe, deci n-au cum sa astepte ele insele.
 */
const pagina = <T extends Record<string, React.ComponentType>>(
  incarca: () => Promise<T>,
  nume: keyof T,
) => async () => ({ Component: (await incarca())[nume] })

export const router = createBrowserRouter([
  { path: RUTE.acasa, lazy: pagina(() => import('@/pages/LandingPage'), 'LandingPage') },

  // Doar pentru vizitatori: un utilizator logat e trimis in panoul lui.
  {
    element: <RutaOaspete />,
    children: [
      { path: RUTE.login, lazy: pagina(() => import('@/pages/auth/LoginPage'), 'LoginPage') },
      { path: RUTE.signup, lazy: pagina(() => import('@/pages/auth/SignupPage'), 'SignupPage') },
      {
        path: RUTE.resetareParola,
        lazy: pagina(() => import('@/pages/auth/ResetareParolaPage'), 'ResetareParolaPage'),
      },
    ],
  },

  // Fara garda: /parola-noua ruleaza tocmai pe sesiunea de recovery,
  // /verifica-email e vizibil inainte de confirmarea contului, iar pagina de
  // invitatie trebuie sa poata trimite invitatul la login sau la signup.
  {
    path: RUTE.parolaNoua,
    lazy: pagina(() => import('@/pages/auth/ParolaNouaPage'), 'ParolaNouaPage'),
  },
  {
    path: RUTE.verificaEmail,
    lazy: pagina(() => import('@/pages/auth/VerificaEmailPage'), 'VerificaEmailPage'),
  },
  { path: RUTE.invitatie, lazy: pagina(() => import('@/pages/InvitatiePage'), 'InvitatiePage') },
  {
    path: RUTE.mentenanta,
    lazy: pagina(() => import('@/pages/MentenantaPage'), 'MentenantaPage'),
  },
  { path: RUTE.demoHarta, lazy: pagina(() => import('@/pages/DemoHartaPage'), 'DemoHartaPage') },
  // Widgetul public de rezervare, pe slug-ul restaurantului.
  {
    path: '/r/:slug',
    lazy: pagina(() => import('@/pages/WidgetRezervarePage'), 'WidgetRezervarePage'),
  },

  {
    element: <RutaProtejata />,
    children: [
      // Onboarding-ul sta INTENTIONAT in afara RutaAdmin: aici ajunge exact
      // contul care nu are inca profil, adica cel pe care RutaAdmin il respinge.
      {
        path: RUTE.appOnboarding,
        lazy: pagina(() => import('@/pages/app/OnboardingPage'), 'OnboardingPage'),
      },
      {
        element: <RutaAdmin />,
        children: [
          {
            // Shell-ul comun (sidebar + bara de sus) pentru tot panoul.
            element: <LayoutApp />,
            children: [
              { path: RUTE.app, lazy: pagina(() => import('@/pages/app/AcasaPage'), 'AcasaPage') },
              {
                path: RUTE.appCalendar,
                lazy: pagina(() => import('@/pages/app/CalendarPage'), 'CalendarPage'),
              },
              {
                path: RUTE.appRezervari,
                lazy: pagina(() => import('@/pages/app/ListaRezervariPage'), 'ListaRezervariPage'),
              },
              { path: RUTE.appHarta, lazy: pagina(() => import('@/pages/app/HartaPage'), 'HartaPage') },
              // CRM-ul e vizibil si ospatarului: el are nevoie sa stie ca
              // oaspetele care intra pe usa are 12 vizite sau 3 neprezentari.
              {
                path: RUTE.appClienti,
                lazy: pagina(() => import('@/pages/app/ClientiPage'), 'ClientiPage'),
              },
              // Evenimentele sunt accesibile si ospatarului (§29.7): el vinde
              // biletele la usa si le scaneaza la intrare.
              {
                path: RUTE.appEvenimente,
                lazy: pagina(() => import('@/pages/app/EvenimentePage'), 'EvenimentePage'),
              },
              {
                path: RUTE.appAsteptare,
                lazy: pagina(() => import('@/pages/app/ListaAsteptarePage'), 'ListaAsteptarePage'),
              },
              {
                element: <RutaManager />,
                children: [
                  {
                    path: RUTE.appEchipa,
                    lazy: pagina(() => import('@/pages/app/EchipaPage'), 'EchipaPage'),
                  },
                  {
                    path: RUTE.appSetari,
                    lazy: pagina(() => import('@/pages/app/SetariPage'), 'SetariPage'),
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        element: <RutaSuperAdmin />,
        children: [
          {
            path: RUTE.superadmin,
            lazy: pagina(() => import('@/pages/superadmin/SuperAdminPage'), 'SuperAdminPage'),
          },
          // Parametrizata, deci scrisa aici direct: RUTE.superadminEditor e o
          // functie (constructorul de cale), nu un sablon de ruta.
          {
            path: '/superadmin/editor/:restaurantId',
            lazy: pagina(() => import('@/pages/superadmin/EditorPlanPage'), 'EditorPlanPage'),
          },
        ],
      },
    ],
  },

  { path: '*', lazy: pagina(() => import('@/pages/NotFoundPage'), 'NotFoundPage') },
])
