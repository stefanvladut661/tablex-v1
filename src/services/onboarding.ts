import { supabase } from '@/lib/supabase'
import type { Enums } from '@/types/database'

/**
 * Toate operatiile de aici trec prin RPC-uri SECURITY DEFINER, nu prin
 * insert-uri directe: un cont fara rand in admin_users nu are (si nu trebuie
 * sa aibe) drept de scriere in restaurants. Vezi migratia 06.
 */

export async function slugDisponibil(slug: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('slug_disponibil', { p_slug: slug })
  if (error) throw error
  return data ?? false
}

export type DateRestaurantNou = {
  nume: string
  slug: string
  numePersoana?: string
  plan: Enums<'plan_tip'>
  numeFirma?: string
  cui?: string
  oras?: string
  adresa?: string
  telefon?: string
  tipLocatie?: string
}

/** Returneaza id-ul restaurantului creat. */
export async function creeazaRestaurant(date: DateRestaurantNou): Promise<string> {
  const { data, error } = await supabase.rpc('creeaza_restaurant', {
    p_nume: date.nume,
    p_slug: date.slug,
    p_nume_persoana: date.numePersoana,
    p_plan: date.plan,
    p_nume_firma: date.numeFirma,
    p_cui: date.cui,
    p_oras: date.oras,
    p_adresa: date.adresa,
    p_telefon: date.telefon,
    p_tip_locatie: date.tipLocatie,
  })
  if (error) throw error
  return data
}

/**
 * Doua feluri de invitatie trec prin acelasi link si aceeasi pagina: intr-un
 * restaurant sau in echipa TableX (§9.2.7). Rolul vine ca text, fiindca cele
 * doua surse au enum-uri diferite si o functie SQL nu poate intoarce coloane
 * cu tip variabil.
 */
export type DetaliiInvitatie = {
  tip: 'restaurant' | 'echipa'
  restaurant_nume: string
  email: string
  rol: Enums<'admin_rol'> | Enums<'super_admin_rol'>
  expira_la: string
}

/** null cand token-ul nu exista, a fost folosit sau a expirat. */
export async function getDetaliiInvitatie(token: string): Promise<DetaliiInvitatie | null> {
  const { data, error } = await supabase.rpc('detalii_invitatie', { p_token: token })
  if (error) throw error
  const rand = data?.[0]
  return rand ? (rand as DetaliiInvitatie) : null
}

/**
 * Intoarce restaurantul pentru invitatiile de restaurant si null pentru cele
 * de echipa: acolo nu exista niciun restaurant de intors.
 */
export async function acceptaInvitatie(token: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('accepta_invitatie', { p_token: token })
  if (error) throw error
  return data
}
