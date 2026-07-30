import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type Notificare = Tables<'notificari'>

export const CHEI_NOTIFICARI = {
  lista: (restaurantId: string) => ['notificari', restaurantId] as const,
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
