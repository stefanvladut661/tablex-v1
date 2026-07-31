import { supabase } from '@/lib/supabase'
import type { Enums, Tables, TablesUpdate } from '@/types/database'

export type Restaurant = Tables<'restaurants'>
export type IntrareAudit = Tables<'audit_super_admin'>
export type SetariGlobale = Tables<'app_settings'>

export const CHEI_SA = {
  restaurante: ['sa', 'restaurante'] as const,
  audit: ['sa', 'audit'] as const,
  setari: ['sa', 'setari-globale'] as const,
}

/** Politicile RLS dau echipei TableX acces la toate restaurantele. */
export async function getRestaurante(): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/**
 * Intervențiile privilegiate (plan, status, discount, trial, deblocare floor
 * plan) sunt permise doar echipei — trigger-ul din migratia 13 le refuza
 * oricui altcuiva, iar auditul se scrie automat, deci nu trebuie sa-l scriem
 * noi de aici.
 */
export async function intervine(
  restaurantId: string,
  modificari: TablesUpdate<'restaurants'>,
): Promise<void> {
  const { data, error } = await supabase
    .from('restaurants')
    .update(modificari)
    .eq('id', restaurantId)
    .select('id')
  if (error) throw error
  if (!data?.length) {
    throw new Error('Modificarea nu a fost aplicata: contul tau nu are acest drept.')
  }
}

export async function getAudit(limita = 40): Promise<IntrareAudit[]> {
  const { data, error } = await supabase
    .from('audit_super_admin')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limita)
  if (error) throw error
  return data
}

export async function getSetariGlobale(): Promise<SetariGlobale> {
  const { data, error } = await supabase.from('app_settings').select('*').single()
  if (error) throw error
  return data
}

/** app_settings e singleton: un singur rand, cu id = true. */
export async function actualizeazaSetariGlobale(
  modificari: TablesUpdate<'app_settings'>,
): Promise<void> {
  const { data, error } = await supabase
    .from('app_settings')
    .update(modificari)
    .eq('id', true)
    .select('id')
  if (error) throw error
  if (!data?.length) {
    throw new Error('Setarile globale se schimba doar de rolul super_admin.')
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Echipa TableX (§9.2.7)
//
// Pana acum, singurul mod de a adauga pe cineva in echipa era un INSERT manual
// in super_admin_users, din SQL, cu user_id-ul copiat de mana din auth.users.
// Tabela de invitatii exista de la inceput; ii lipsea drumul.
// ═══════════════════════════════════════════════════════════════════════════

export type MembruTableX = Tables<'super_admin_users'>
export type InvitatieEchipa = Tables<'super_admin_invitations'>

export const CHEI_ECHIPA_TX = {
  membri: ['sa', 'echipa', 'membri'] as const,
  invitatii: ['sa', 'echipa', 'invitatii'] as const,
}

export async function getMembriEchipa(): Promise<MembruTableX[]> {
  const { data, error } = await supabase
    .from('super_admin_users')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function getInvitatiiEchipa(): Promise<InvitatieEchipa[]> {
  const { data, error } = await supabase
    .from('super_admin_invitations')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/**
 * Tokenul se genereaza in baza (default pe coloana), deci il citim din randul
 * inserat: din el se construieste linkul, ca la invitatiile de restaurant.
 */
export async function invitaInEchipa(
  email: string,
  rol: Enums<'super_admin_rol'>,
  invitatDe: string,
): Promise<InvitatieEchipa> {
  const { data, error } = await supabase
    .from('super_admin_invitations')
    .insert({ email: email.trim().toLowerCase(), rol, invited_by: invitatDe })
    .select('*')
    .single()
  if (error) throw error
  return data
}

/** Un UPDATE respins de RLS raspunde 200 cu zero randuri, nu cu eroare. */
async function confirmaScriere(randuri: Array<{ id: string }> | null, actiune: string) {
  if (!randuri?.length) {
    throw new Error(`${actiune} nu a fost aplicata: doar rolul super_admin poate face asta.`)
  }
}

export async function anuleazaInvitatiaEchipa(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('super_admin_invitations')
    .update({ status: 'anulata' })
    .eq('id', id)
    .select('id')
  if (error) throw error
  await confirmaScriere(data, 'Anularea invitatiei')
}

/**
 * Rolul si accesul unui membru. Ultimul super admin deplin nu se poate
 * dezactiva sau retrograda — garda e in baza, nu doar aici: altfel panoul
 * echipei s-ar putea inchide pentru toata lumea, iar reintrarea ar cere SQL.
 */
export async function actualizeazaMembruEchipa(
  id: string,
  modificari: Pick<TablesUpdate<'super_admin_users'>, 'rol' | 'activ' | 'nume'>,
): Promise<void> {
  const { data, error } = await supabase
    .from('super_admin_users')
    .update(modificari)
    .eq('id', id)
    .select('id')
  if (error) throw error
  await confirmaScriere(data, 'Modificarea membrului')
}
