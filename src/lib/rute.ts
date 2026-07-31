/**
 * Sursa unica de adevar pentru caile aplicatiei.
 *
 * Segmentele de nivel 1 folosite aici trebuie sa existe si in tabela
 * public.slug_rezervate (migratia tenancy), altfel un restaurant si-ar putea
 * lua un slug care umbreste o ruta de sistem.
 */
export const RUTE = {
  acasa: '/',
  login: '/login',
  signup: '/signup',
  resetareParola: '/resetare-parola',
  parolaNoua: '/parola-noua',
  verificaEmail: '/verifica-email',
  invitatie: '/invitatie',
  mentenanta: '/mentenanta',
  /** Demonstratie publica a hartii 2D, cu date fictive. */
  demoHarta: '/demo',

  /** Panoul restaurantului (Manager / Ospatar). */
  app: '/app',
  /** Creare restaurant — pentru un cont autentificat fara profil. */
  appOnboarding: '/app/onboarding',
  appEchipa: '/app/echipa',
  appRezervari: '/app/rezervari',
  appHarta: '/app/harta',
  appClienti: '/app/clienti',
  appAsteptare: '/app/asteptare',
  appSetari: '/app/setari',

  /** Panoul echipei TableX. */
  superadmin: '/superadmin',
  /** Editorul de floor plan (§8.4) — se deseneaza de echipa, nu de restaurant. */
  superadminEditor: (restaurantId: string) => `/superadmin/editor/${restaurantId}`,

  /** Widget public de rezervare, pe slug-ul restaurantului. */
  widget: (slug: string) => `/r/${slug}`,
} as const

/**
 * Unde ajunge un utilizator AUTENTIFICAT, in functie de tipul contului.
 * tip === null inseamna cont valid fara profil: nu si-a creat inca
 * restaurantul, deci merge in onboarding, nu pe landing.
 */
export function ruteDupaLogin(tip: 'admin' | 'super_admin' | null): string {
  if (tip === 'super_admin') return RUTE.superadmin
  if (tip === 'admin') return RUTE.app
  return RUTE.appOnboarding
}
