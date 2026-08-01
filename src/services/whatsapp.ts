import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type PachetCredite = Tables<'whatsapp_credit_packages'>
export type TranzactieCredite = Tables<'whatsapp_tranzactii'>

export const CHEI_WHATSAPP = {
  sold: (restaurantId: string) => ['whatsapp', 'sold', restaurantId] as const,
  pachete: ['whatsapp', 'pachete'] as const,
  tranzactii: (restaurantId: string) => ['whatsapp', 'tranzactii', restaurantId] as const,
}

/** Soldul e SUMA tranzactiilor, calculata in baza — nu o coloana. */
export async function getSoldCredite(): Promise<number> {
  const { data, error } = await supabase.rpc('credite_whatsapp')
  if (error) throw error
  return data ?? 0
}

export async function getPachete(): Promise<PachetCredite[]> {
  const { data, error } = await supabase
    .from('whatsapp_credit_packages')
    .select('*')
    .eq('activ', true)
    .order('ordine')
  if (error) throw error
  return data
}

export async function getTranzactii(restaurantId: string): Promise<TranzactieCredite[]> {
  const { data, error } = await supabase
    .from('whatsapp_tranzactii')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(60)
  if (error) throw error
  return data
}

/**
 * Reincarcare DEMONSTRATIVA (§14): scrie tranzactia, nu incaseaza nimic.
 * Scrierea trece printr-un RPC fiindca tabela nu are politica de INSERT —
 * altfel oricine si-ar putea adauga credite dintr-un apel REST.
 */
export async function reincarcaCredite(packageId: string): Promise<number> {
  const { data, error } = await supabase.rpc('reincarca_credite', { p_package_id: packageId })
  if (error) throw error
  return data ?? 0
}

/** Consumul lunar, pentru graficul din §30.4. Grupat in client: sunt 60 de randuri. */
export function consumPeLuni(tranzactii: TranzactieCredite[]): Array<{ luna: string; consum: number }> {
  const peLuna = new Map<string, number>()
  for (const t of tranzactii) {
    if (t.credite >= 0) continue
    const luna = t.created_at.slice(0, 7)
    peLuna.set(luna, (peLuna.get(luna) ?? 0) + Math.abs(t.credite))
  }
  return [...peLuna.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([luna, consum]) => ({ luna, consum }))
}
