import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type Notificare = Tables<'notificari'>

export const CHEI_NOTIFICARI = {
  lista: (restaurantId: string) => ['notificari', restaurantId] as const,
  echipa: ['notificari', 'echipa'] as const,
}

/** Ultimele notificari ale restaurantului; clopotelul nu are nevoie de arhiva. */
export async function getNotificari(restaurantId: string): Promise<Notificare[]> {
  const { data, error } = await supabase
    .from('notificari')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return data
}

export async function marcheazaCitita(id: string): Promise<void> {
  const { error } = await supabase
    .from('notificari')
    .update({ citita_la: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function marcheazaToateCitite(restaurantId: string): Promise<void> {
  const { error } = await supabase
    .from('notificari')
    .update({ citita_la: new Date().toISOString() })
    .eq('restaurant_id', restaurantId)
    .is('citita_la', null)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════════════════════
// Clopotelul echipei TableX (§9.1, §38.4)
//
// Notificarile echipei au destinatie = 'super_admin'. Unele poarta si un
// restaurant_id (ex. creditele epuizate — pe el se face deduplicarea), dar
// politica de citire a restaurantului filtreaza destinatie = 'admin', deci
// randurile astea nu ajung niciodata in clopotelul restaurantului.
// ═══════════════════════════════════════════════════════════════════════════

/** §9.1: grupate pe urgenta — rosu, galben, albastru; necitite primele. */
export async function getNotificariEchipa(): Promise<Notificare[]> {
  const { data, error } = await supabase
    .from('notificari')
    .select('*')
    .eq('destinatie', 'super_admin')
    .order('created_at', { ascending: false })
    .limit(60)
  if (error) throw error
  return data
}

export async function marcheazaToateCititeEchipa(): Promise<void> {
  const { error } = await supabase
    .from('notificari')
    .update({ citita_la: new Date().toISOString() })
    .eq('destinatie', 'super_admin')
    .is('citita_la', null)
  if (error) throw error
}
