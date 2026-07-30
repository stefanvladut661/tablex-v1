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

export type DetaliiInvitatie = {
  restaurant_nume: string
  email: string
  rol: Enums<'admin_rol'>
  expira_la: string
}

/** null cand token-ul nu exista, a fost folosit sau a expirat. */
export async function getDetaliiInvitatie(token: string): Promise<DetaliiInvitatie | null> {
  const { data, error } = await supabase.rpc('detalii_invitatie', { p_token: token })
  if (error) throw error
  return data?.[0] ?? null
}

export async function acceptaInvitatie(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('accepta_invitatie', { p_token: token })
  if (error) throw error
  return data
}
