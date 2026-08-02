import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'
import type { ElementStructura } from '@/types/floor-plan'

export type Zona = Tables<'zones'>
export type Masa = Tables<'tables'>

export const CHEI_MESE = {
  zone: (restaurantId: string) => ['zone', restaurantId] as const,
  mese: (restaurantId: string) => ['mese', restaurantId] as const,
  structura: (restaurantId: string) => ['structura', restaurantId] as const,
  disponibilitate: (restaurantId: string, zoneId: string | null, start: string, durata: number) =>
    ['disponibilitate', restaurantId, zoneId, start, durata] as const,
}

/**
 * Layer 1 (pereti, usi, bar, zone speciale) pentru harta din panou (§8.4).
 *
 * Se citeste prin ACEEASI vedere ca widgetul public (structura_publica), nu
 * direct din floor_plan_layers: vederea cere vizibil + publicat, deci panoul
 * arata exact ce a publicat echipa TableX — niciodata lucrul ei in curs.
 * Adminul oricum nu poate edita stratul asta (RLS, migratia 26).
 */
export async function getStructuraPublicata(
  restaurantId: string,
): Promise<Record<string, ElementStructura[]>> {
  const { data, error } = await supabase
    .from('structura_publica')
    .select('*')
    .eq('restaurant_id', restaurantId)
  if (error) throw error

  const peZone: Record<string, ElementStructura[]> = {}
  for (const rand of data ?? []) {
    if (rand.zone_id && Array.isArray(rand.continut)) {
      peZone[rand.zone_id] = rand.continut as unknown as ElementStructura[]
    }
  }
  return peZone
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
