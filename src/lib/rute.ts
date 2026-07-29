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

  /** Panoul restaurantului (Manager / Ospatar). */
  app: '/app',
  appRezervari: '/app/rezervari',
  appHarta: '/app/harta',
  appClienti: '/app/clienti',
  appSetari: '/app/setari',

  /** Panoul echipei TableX. */
  superadmin: '/superadmin',

  /** Widget public de rezervare, pe slug-ul restaurantului. */
  widget: (slug: string) => `/r/${slug}`,
} as const

/** Unde ajunge un utilizator autentificat, in functie de tipul contului. */
export function ruteDupaLogin(tip: 'admin' | 'super_admin' | null): string {
  if (tip === 'super_admin') return RUTE.superadmin
  if (tip === 'admin') return RUTE.app
  return RUTE.acasa
}
