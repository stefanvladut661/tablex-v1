import { supabase } from '@/lib/supabase'
import type { Enums, Tables } from '@/types/database'

export type CerereFloorPlan = Tables<'floor_plan_requests'>
export type StatusCerere = Enums<'fp_request_status'>

export const CHEI_FP = {
  cereriRestaurant: (restaurantId: string) => ['floor-plan', 'cereri', restaurantId] as const,
  coada: ['floor-plan', 'coada'] as const,
  schita: (cale: string) => ['floor-plan', 'schita', cale] as const,
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
  /** Calea din bucket-ul privat, nu un URL (vezi incarcaSchita). */
  schitaCale?: string | null
}

export async function creeazaCerere(cerere: CerereNoua): Promise<CerereFloorPlan> {
  const { data, error } = await supabase
    .from('floor_plan_requests')
    .insert({
      restaurant_id: cerere.restaurantId,
      zone_nume: cerere.zoneNume.trim(),
      descriere: cerere.descriere?.trim() || null,
      schita_image_url: cerere.schitaCale ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

/**
 * In coada echipei cererea nu inseamna nimic fara restaurantul care a trimis-o:
 * planul se deseneaza pentru o sala anume. De aceea aici imbinam numele, spre
 * deosebire de lista restaurantului, unde e evident al cui e.
 */
export type CerereCoada = CerereFloorPlan & {
  restaurant: { nume: string; slug: string } | null
}

/** Coada echipei TableX: toate cererile, cele mai vechi primele. */
export async function getCoadaCereri(): Promise<CerereCoada[]> {
  const { data, error } = await supabase
    .from('floor_plan_requests')
    .select('*, restaurant:restaurants(nume, slug)')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as CerereCoada[]
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

/**
 * Schitele stau intr-un bucket PRIVAT, izolat pe folder: prima parte a caii e
 * restaurant_id, iar politicile din storage compara acel folder cu
 * current_restaurant_id(). Deci calea nu e un secret — accesul e verificat pe
 * server, nu obscurizat.
 *
 * In coloana schita_image_url salvam CALEA, nu un URL: URL-urile semnate expira,
 * deci un URL stocat ar deveni inutil. Se semneaza la afisare.
 */
const BUCKET_SCHITE = 'schite'

export async function incarcaSchita(restaurantId: string, fisier: File): Promise<string> {
  const extensie = fisier.name.split('.').pop()?.toLowerCase() ?? 'png'
  const cale = `${restaurantId}/${crypto.randomUUID()}.${extensie}`

  const { error } = await supabase.storage.from(BUCKET_SCHITE).upload(cale, fisier, {
    contentType: fisier.type || undefined,
    upsert: false,
  })
  if (error) throw error
  return cale
}

/** URL temporar pentru afisare; valabil o ora. */
export async function urlSchita(cale: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET_SCHITE)
    .createSignedUrl(cale, 60 * 60)
  if (error) {
    console.warn('Nu am putut semna URL-ul schitei:', error)
    return null
  }
  return data.signedUrl
}
