import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

import type { Tables } from '@/types/database'

export type Restaurant = Tables<'restaurants'>
export type ContAdmin = Tables<'admin_users'>
export type ContSuperAdmin = Tables<'super_admin_users'>

/**
 * Un cont apartine EXCLUSIV unei singure lumi: ori e admin de restaurant,
 * ori e membru al echipei TableX. Triggerul verifica_apartenenta_unica din
 * migratia tenancy garanteaza asta la nivel de baza de date, deci un union
 * discriminat modeleaza corect realitatea (nu doua campuri optionale).
 */
export type Profil =
  | { tip: 'admin'; cont: ContAdmin; restaurant: Restaurant }
  | { tip: 'super_admin'; cont: ContSuperAdmin }

export type DateInregistrare = {
  email: string
  parola: string
  numePersoana: string
  /** Gol pentru cine se inregistreaza dintr-o invitatie: nu-si face restaurant. */
  numeRestaurant: string
  telefon?: string
  /**
   * Calea la care duce linkul din emailul de confirmare. Implicit /app, dar
   * cine vine dintr-o invitatie trebuie sa se intoarca la ea — altfel ajunge
   * in onboarding si i se cere sa-si creeze un restaurant pe care nu-l vrea.
   */
  dupaConfirmare?: string
}

export type ValoareAuth = {
  sesiune: Session | null
  utilizator: User | null
  /** null cand utilizatorul e autentificat dar nu are inca un cont atasat. */
  profil: Profil | null
  /** true cat timp sesiunea sau profilul inca se rezolva. */
  incarcare: boolean
  esteAutentificat: boolean
  esteAdmin: boolean
  esteManager: boolean
  esteSuperAdmin: boolean
  /**
   * Restaurantul are Harta 2D: plan Pro Floor sau deblocare manuala de catre
   * echipa, pentru cine a platit prin transfer (§10.1, §43.6). Aceeasi regula
   * e impusa si de politicile RLS pe `tables` si `zones` — asta e doar
   * oglinda ei in interfata, ca sa nu aratam butoane care esueaza.
   */
  areFloorPlan: boolean

  autentificare: (email: string, parola: string) => Promise<void>
  trimiteMagicLink: (email: string) => Promise<void>
  inregistrare: (date: DateInregistrare) => Promise<void>
  retrimiteConfirmare: (email: string) => Promise<void>
  trimiteResetareParola: (email: string) => Promise<void>
  seteazaParolaNoua: (parola: string) => Promise<void>
  deconectare: () => Promise<void>
  reincarcaProfil: () => Promise<void>
}

export const AuthContext = createContext<ValoareAuth | null>(null)
