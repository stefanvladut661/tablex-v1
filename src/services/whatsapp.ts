import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type PachetCredite = Tables<'whatsapp_credit_packages'>
export type TranzactieCredite = Tables<'whatsapp_tranzactii'>
export type SablonWhatsApp = Tables<'whatsapp_templates'>
export type MesajWhatsApp = Tables<'whatsapp_mesaje'> & {
  restaurant: { nume: string } | null
}

export const CHEI_WHATSAPP = {
  sold: (restaurantId: string) => ['whatsapp', 'sold', restaurantId] as const,
  pachete: ['whatsapp', 'pachete'] as const,
  tranzactii: (restaurantId: string) => ['whatsapp', 'tranzactii', restaurantId] as const,
  sabloane: ['sa', 'whatsapp', 'sabloane'] as const,
  jurnal: ['sa', 'whatsapp', 'jurnal'] as const,
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

/**
 * Incearca un mesaj WhatsApp (§16.2, §21.1): consuma 1 credit si scrie in
 * jurnal — trimiterea reala ramane interzisa in v1 (§14). Best-effort ca
 * emailul: un mesaj care nu pleaca nu anuleaza actiunea care l-a declansat,
 * de aceea functia nu arunca niciodata.
 */
export async function trimiteWhatsAppSimulat(
  telefon: string,
  sablon: string,
  continut?: string,
  reservationId?: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('consuma_credit', {
      p_telefon: telefon,
      p_sablon: sablon,
      p_continut: continut,
      p_reservation_id: reservationId,
    })
    if (error) throw error
    return data ?? false
  } catch (eroare) {
    console.warn('Mesajul WhatsApp nu a fost consemnat:', eroare)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Communications — partea echipei TableX (§9.2.5, §45)
// ═══════════════════════════════════════════════════════════════════════════

/** Template Manager (§45.2): lista de referinta, fara variabile si aprobare. */
export async function getSabloaneWhatsApp(): Promise<SablonWhatsApp[]> {
  const { data, error } = await supabase
    .from('whatsapp_templates')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function creeazaSablonWhatsApp(
  nume: string,
  continut: string,
  createdBy: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('whatsapp_templates')
    .insert({ nume, continut, created_by: createdBy })
    .select('id')
  if (error) throw error
  if (!data?.length) {
    throw new Error('Șablonul nu a fost salvat: doar rolul super_admin scrie șabloane.')
  }
}

export async function stergeSablonWhatsApp(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('whatsapp_templates')
    .delete()
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data?.length) {
    throw new Error('Șablonul nu a fost șters: doar rolul super_admin șterge șabloane.')
  }
}

/** System Logs (§45.3): jurnalul mesajelor din toata reteaua, cu erori. */
export async function getJurnalMesaje(limita = 100): Promise<MesajWhatsApp[]> {
  const { data, error } = await supabase
    .from('whatsapp_mesaje')
    .select('*, restaurant:restaurants(nume)')
    .order('created_at', { ascending: false })
    .limit(limita)
  if (error) throw error
  return data
}

/**
 * Balanta Meta (§45.1): bugetul lunar din contul Meta e SIMULAT (§14 — fara
 * integrare reala), dar consumul din el e cel real din jurnal: cate mesaje
 * s-au „trimis" luna asta. Constanta e marcata explicit in UI ca simulata.
 */
export const BUGET_LUNAR_META_SIMULAT = 1000

export function mesajeTrimiseLunaAsta(mesaje: Array<{ created_at: string; status: string }>): number {
  const lunaCurenta = new Date().toISOString().slice(0, 7)
  return mesaje.filter((m) => m.status === 'trimis' && m.created_at.startsWith(lunaCurenta)).length
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
