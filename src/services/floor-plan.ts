import { supabase } from '@/lib/supabase'
import type { Enums, Tables } from '@/types/database'

export type CerereFloorPlan = Tables<'floor_plan_requests'>
export type StatusCerere = Enums<'fp_request_status'>

export const CHEI_FP = {
  cereriRestaurant: (restaurantId: string) => ['floor-plan', 'cereri', restaurantId] as const,
  coada: ['floor-plan', 'coada'] as const,
}

/**
 * Cererile restaurantului curent. RLS le filtreaza oricum pe restaurant, dar
 * pastram filtrul explicit: e si documentatie, si foloseste indexul.
 *
 * ai_rezultat NU se selecteaza: e instrument intern al echipei (§14) si nu
 * trebuie sa ajunga nici accidental in bundle-ul restaurantului.
 */
export async function getCereriRestaurant(restaurantId: string): Promise<CerereFloorPlan[]> {
  const { data, error } = await supabase
    .from('floor_plan_requests')
    .select('id, restaurant_id, zone_nume, descriere, status, schita_image_url, created_at, updated_at')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as CerereFloorPlan[]
}

export type CerereNoua = {
  restaurantId: string
  zoneNume: string
  descriere?: string | null
}

export async function creeazaCerere(cerere: CerereNoua): Promise<CerereFloorPlan> {
  const { data, error } = await supabase
    .from('floor_plan_requests')
    .insert({
      restaurant_id: cerere.restaurantId,
      zone_nume: cerere.zoneNume.trim(),
      descriere: cerere.descriere?.trim() || null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

/** Coada echipei TableX: toate cererile, cele in asteptare primele. */
export async function getCoadaCereri(): Promise<CerereFloorPlan[]> {
  const { data, error } = await supabase
    .from('floor_plan_requests')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function schimbaStatusCerere(id: string, status: StatusCerere): Promise<void> {
  const { data, error } = await supabase
    .from('floor_plan_requests')
    .update({ status })
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data?.length) {
    throw new Error('Cererea nu a fost modificata: contul tau nu are acest drept.')
  }
}
