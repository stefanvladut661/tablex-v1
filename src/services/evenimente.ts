import { supabase } from '@/lib/supabase'
import type { Enums, Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type Eveniment = Tables<'events'>
export type PretEveniment = Tables<'event_ticket_pricing'>
export type Bilet = Tables<'tickets'>
export type StatusEveniment = Enums<'event_status'>
export type StatusPlata = Enums<'ticket_plata_status'>

export const CHEI_EVENIMENTE = {
  lista: (restaurantId: string) => ['evenimente', restaurantId] as const,
  unul: (id: string) => ['evenimente', 'unul', id] as const,
  mese: (id: string) => ['evenimente', 'mese', id] as const,
  preturi: (id: string) => ['evenimente', 'preturi', id] as const,
  bilete: (id: string) => ['evenimente', 'bilete', id] as const,
}

export async function getEvenimente(restaurantId: string): Promise<Eveniment[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('data_ora', { ascending: false })
  if (error) throw error
  return data
}

export async function getEveniment(id: string): Promise<Eveniment | null> {
  const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function creeazaEveniment(date: TablesInsert<'events'>): Promise<Eveniment> {
  const { data, error } = await supabase.from('events').insert(date).select('*').single()
  if (error) throw error
  return data
}

export async function actualizeazaEveniment(
  id: string,
  modificari: TablesUpdate<'events'>,
): Promise<void> {
  const { data, error } = await supabase
    .from('events')
    .update(modificari)
    .eq('id', id)
    .select('id')
  if (error) throw error
  // Un UPDATE respins de RLS raspunde 200 cu zero randuri.
  if (!data?.length) {
    throw new Error('Evenimentul nu a fost modificat: contul tau nu are acest drept.')
  }
}

export async function stergeEveniment(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error
}

/**
 * Afisul evenimentului (§29.1, §29.2 pasul 1). Acelasi bucket public ca
 * logoul (branding): afisul apare pe widgetul anonim, deci URL-urile semnate
 * care expira nu sunt o optiune. Politicile de scriere compara primul segment
 * al caii cu restaurantul contului — public la citire, nu la scriere.
 */
export async function urcaAfis(restaurantId: string, fisier: File): Promise<string> {
  const extensie = fisier.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const cale = `${restaurantId}/afis-${Date.now()}.${extensie}`

  const { error } = await supabase.storage
    .from('branding')
    .upload(cale, fisier, { upsert: true, contentType: fisier.type })
  if (error) throw error

  const { data } = supabase.storage.from('branding').getPublicUrl(cale)
  return data.publicUrl
}

export type EvenimentCuMese = Eveniment & {
  event_tables: Array<{ table_id: string }>
}

/**
 * Evenimentele PUBLICATE care ating fereastra data, cu mesele lor — pentru
 * Mod Eveniment pe harta (§8.5): mesele alocate se coloreaza violet cat timp
 * evenimentul e in desfasurare.
 */
export async function getEvenimenteCuMese(
  restaurantId: string,
  deLa: Date,
  panaLa: Date,
): Promise<EvenimentCuMese[]> {
  // data_ora e inceputul; un eveniment inceput inainte de fereastra poate
  // inca sa o atinga, deci coboram cu o zi si taiem precis in client.
  const { data, error } = await supabase
    .from('events')
    .select('*, event_tables(table_id)')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'publicat')
    .gte('data_ora', new Date(deLa.getTime() - 24 * 60 * 60 * 1000).toISOString())
    .lte('data_ora', panaLa.toISOString())
  if (error) throw error

  return (data as EvenimentCuMese[]).filter((eveniment) => {
    const start = new Date(eveniment.data_ora).getTime()
    const sfarsit = start + eveniment.durata_minute * 60_000
    return sfarsit > deLa.getTime() && start < panaLa.getTime()
  })
}

/** Mesele alocate evenimentului — pasul 2 din wizard (§29.2). */
export async function getMeseEveniment(eventId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('event_tables')
    .select('table_id')
    .eq('event_id', eventId)
  if (error) throw error
  return data.map((rand) => rand.table_id)
}

/**
 * Inlocuieste complet lista de mese. Sterge-si-insereaza, nu diferenta: lista
 * are zeci de randuri, nu mii, iar o inlocuire completa nu poate ramane
 * pe jumatate facuta intr-un fel greu de observat.
 */
export async function setMeseEveniment(eventId: string, tableIds: string[]): Promise<void> {
  const { error: eroareStergere } = await supabase
    .from('event_tables')
    .delete()
    .eq('event_id', eventId)
  if (eroareStergere) throw eroareStergere

  if (tableIds.length === 0) return

  const { error } = await supabase
    .from('event_tables')
    .insert(tableIds.map((table_id) => ({ event_id: eventId, table_id })))
  if (error) throw error
}

export async function getPreturi(eventId: string): Promise<PretEveniment[]> {
  const { data, error } = await supabase
    .from('event_ticket_pricing')
    .select('*')
    .eq('event_id', eventId)
  if (error) throw error
  return data
}

/** Pretul unei zone (§29.3). Zero il sterge: „gratuit" se scrie explicit ca 0. */
export async function setPretZona(
  eventId: string,
  zoneId: string,
  pret: number | null,
): Promise<void> {
  if (pret === null) {
    const { error } = await supabase
      .from('event_ticket_pricing')
      .delete()
      .eq('event_id', eventId)
      .eq('zone_id', zoneId)
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('event_ticket_pricing')
    .upsert({ event_id: eventId, zone_id: zoneId, pret_eur: pret }, { onConflict: 'event_id,zone_id' })
  if (error) throw error
}

/** Capacitatea se CALCULEAZA din scaunele meselor alocate (§18.1). */
export async function getCapacitate(eventId: string): Promise<number> {
  const { data, error } = await supabase.rpc('capacitate_eveniment', { p_event_id: eventId })
  if (error) throw error
  return data ?? 0
}

export async function getBilete(eventId: string): Promise<Bilet[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function emiteBilet(date: TablesInsert<'tickets'>): Promise<Bilet> {
  const { data, error } = await supabase.from('tickets').insert(date).select('*').single()
  if (error) throw error
  return data
}

/**
 * Marcheaza biletul platit. ABIA acum masa se blocheaza — triggerul din baza
 * face alocarea, si numai pentru starea 'platit' (§10.4, anti-fentare).
 */
export async function schimbaPlataBilet(id: string, status: StatusPlata): Promise<void> {
  const { data, error } = await supabase
    .from('tickets')
    .update({ status_plata: status, platit_la: status === 'platit' ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data?.length) {
    throw new Error('Biletul nu a fost modificat: contul tau nu are acest drept.')
  }
}

export type RezultatScanare =
  | { rezultat: 'valid'; bilet: Bilet }
  | { rezultat: 'deja_folosit'; bilet: Bilet }
  | { rezultat: 'neplatit'; bilet: Bilet }
  | { rezultat: 'invalid' }

/**
 * Validarea la intrare (§29.6). Trei raspunsuri diferite, nu doua: un bilet
 * neplatit nu e „invalid" — omul chiar l-a rezervat, doar nu l-a platit, iar
 * la usa asta se rezolva altfel decat un cod inventat.
 *
 * Marcarea scanarii e conditionata de `scanat_la is null` in aceeasi cerere:
 * doua tablete care scaneaza acelasi bilet simultan nu pot amandoua sa
 * primeasca „valid".
 */
export async function valideazaBilet(cod: string): Promise<RezultatScanare> {
  const { data: bilet, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('cod', cod.trim().toUpperCase())
    .maybeSingle()
  if (error) throw error
  if (!bilet) return { rezultat: 'invalid' }
  if (bilet.status_plata !== 'platit') return { rezultat: 'neplatit', bilet }
  if (bilet.scanat_la) return { rezultat: 'deja_folosit', bilet }

  const { data: marcat, error: eroareMarcare } = await supabase
    .from('tickets')
    .update({ scanat_la: new Date().toISOString() })
    .eq('id', bilet.id)
    .is('scanat_la', null)
    .select('*')
  if (eroareMarcare) throw eroareMarcare

  // Zero randuri: altcineva a scanat acelasi bilet intre citire si scriere.
  if (!marcat?.length) return { rezultat: 'deja_folosit', bilet }
  return { rezultat: 'valid', bilet: marcat[0] }
}
