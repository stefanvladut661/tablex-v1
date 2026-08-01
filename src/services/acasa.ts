import { supabase } from '@/lib/supabase'
import type { Rezervare } from '@/services/rezervari'

export type KpiZi = {
  rezervari_azi: number
  persoane_azi: number
  pending_nerezolvate: number
  mese_ocupate: number
  mese_total: number
  no_show_7_zile: number
}

export const CHEI_ACASA = {
  kpi: (restaurantId: string) => ['acasa', 'kpi', restaurantId] as const,
  sosiri: (restaurantId: string) => ['acasa', 'sosiri', restaurantId] as const,
}

/** Toate cifrele intr-un singur apel — vezi comentariul migratiei 32. */
export async function getKpiZi(): Promise<KpiZi | null> {
  const { data, error } = await supabase.rpc('kpi_zi')
  if (error) throw error
  return data?.[0] ?? null
}

const SELECT_SOSIRE = '*, masa:tables(numar_masa, capacitate), zona:zones(nume)'

/**
 * „Urmatoarele sosiri" (§24.4): cine urmeaza sa intre pe usa, in ordine.
 *
 * Filtrul e pe VIITOR fata de acum, nu pe ziua curenta: la 23:40, urmatoarea
 * sosire poate fi maine la pranz, si tot ea e raspunsul corect la intrebarea
 * „cine urmeaza". Cei deja sositi ies din lista — au intrat.
 */
export async function getUrmatoareleSosiri(
  restaurantId: string,
  limita = 5,
): Promise<Rezervare[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select(SELECT_SOSIRE)
    .eq('restaurant_id', restaurantId)
    .in('status', ['pending', 'confirmata'])
    .gte('data_ora', new Date().toISOString())
    .order('data_ora', { ascending: true })
    .limit(limita)
  if (error) throw error
  return data as Rezervare[]
}
