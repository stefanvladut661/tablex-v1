import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type Zona = Tables<'zones'>
export type Masa = Tables<'tables'>

export const CHEI_MESE = {
  zone: (restaurantId: string) => ['zone', restaurantId] as const,
  mese: (restaurantId: string) => ['mese', restaurantId] as const,
  disponibilitate: (restaurantId: string, zoneId: string | null, start: string, durata: number) =>
    ['disponibilitate', restaurantId, zoneId, start, durata] as const,
}

export async function getZone(restaurantId: string): Promise<Zona[]> {
  const { data, error } = await supabase
    .from('zones')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('activa', true)
    .order('ordine_afisare', { ascending: true })
  if (error) throw error
  return data
}

export async function getMese(restaurantId: string): Promise<Masa[]> {
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('numar_masa', { ascending: true })
  if (error) throw error
  return data
}

export type DisponibilitateMasa = {
  table_id: string
  numar_masa: string
  capacitate: number
  libera: boolean
}

/**
 * Sursa unica de adevar pentru "ce masa e libera la ora X": functia din baza
 * calculeaza suprapunerea cu table_allocations, inclusiv buffer-ul. Clientul
 * nu reimplementeaza regula.
 */
export async function getDisponibilitate(
  restaurantId: string,
  zoneId: string | null,
  start: Date,
  durataMinute?: number,
): Promise<DisponibilitateMasa[]> {
  const { data, error } = await supabase.rpc('disponibilitate_mese', {
    p_restaurant_id: restaurantId,
    p_zone_id: zoneId as string,
    p_start: start.toISOString(),
    p_durata_minute: durataMinute,
  })
  if (error) throw error
  return data ?? []
}
