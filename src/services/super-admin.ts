import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/types/database'

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
