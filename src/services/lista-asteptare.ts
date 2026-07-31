import { supabase } from '@/lib/supabase'
import type { Enums, Tables } from '@/types/database'

export type IntrareAsteptare = Tables<'waitlist'>
export type StatusAsteptare = Enums<'waitlist_status'>

export const CHEI_ASTEPTARE = {
  lista: (restaurantId: string) => ['asteptare', restaurantId] as const,
}

/**
 * Lista de asteptare (§25): oaspetii care au venit fara rezervare si nu au
 * avut masa libera. E un instrument de sala, folosit la intrare — de aceea
 * arata implicit doar cine ASTEAPTA acum; cei asezati sau plecati raman in
 * baza pentru statistici, dar nu incarca ecranul.
 *
 * Telefonul e optional, din acelasi motiv ca la walk-in (§25.6): oaspetele e
 * in fata ta. Cine il lasa primeste un semn cand se elibereaza masa; cine nu,
 * asteapta pe loc.
 */
export async function getListaAsteptare(restaurantId: string): Promise<IntrareAsteptare[]> {
  const { data, error } = await supabase
    .from('waitlist')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'asteptare')
    .order('pozitie', { ascending: true })
    // Doua intrari pot ajunge pe aceeasi pozitie daca sunt adaugate simultan;
    // ordinea sosirii decide, ca la o coada reala.
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export type IntrareNoua = {
  restaurantId: string
  nume: string
  telefon?: string | null
  nrPersoane: number
  zoneId?: string | null
  timpEstimatMin?: number | null
}

export async function adaugaInAsteptare(intrare: IntrareNoua): Promise<IntrareAsteptare> {
  // `pozitie` e NOT NULL fara default. Nu exista constrangere de unicitate pe
  // ea, deci o coliziune la doua adaugari simultane nu strica nimic — se
  // departajeaza dupa created_at.
  const { data: existente, error: eroareCitire } = await supabase
    .from('waitlist')
    .select('pozitie')
    .eq('restaurant_id', intrare.restaurantId)
    .eq('status', 'asteptare')
  if (eroareCitire) throw eroareCitire

  const urmatoarea = (existente ?? []).reduce((maxim, r) => Math.max(maxim, r.pozitie), 0) + 1

  const { data, error } = await supabase
    .from('waitlist')
    .insert({
      restaurant_id: intrare.restaurantId,
      nume: intrare.nume.trim(),
      telefon: intrare.telefon?.trim() || null,
      nr_persoane: intrare.nrPersoane,
      zone_id: intrare.zoneId || null,
      timp_asteptare_estimat_min: intrare.timpEstimatMin ?? null,
      pozitie: urmatoarea,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

/**
 * `asezat_la` se completeaza doar la asezare — e momentul din care se poate
 * calcula cat a asteptat efectiv oaspetele, singura masura care spune daca
 * estimarile date la intrare sunt realiste.
 */
export async function schimbaStatusAsteptare(
  id: string,
  status: StatusAsteptare,
  tableId?: string | null,
): Promise<void> {
  const { data, error } = await supabase
    .from('waitlist')
    .update({
      status,
      asezat_la: status === 'asezat' ? new Date().toISOString() : null,
      table_id: status === 'asezat' ? (tableId ?? null) : null,
    })
    .eq('id', id)
    .select('id')
  if (error) throw error
  // Un UPDATE respins de RLS raspunde 200 cu zero randuri (lectia din Faza 3).
  if (!data?.length) {
    throw new Error('Modificarea nu a fost aplicata: contul tau nu are acest drept.')
  }
}

/** Schimba intre ele pozitiile a doua intrari — mutarea in sus/jos din lista. */
export async function schimbaPozitii(
  prima: { id: string; pozitie: number },
  aDoua: { id: string; pozitie: number },
): Promise<void> {
  // Doua UPDATE-uri separate: PostgREST nu ofera tranzactii, iar o coada in
  // care doua persoane au aceeasi pozitie pentru o clipa nu strica nimic —
  // departajarea pe created_at tine ordinea stabila.
  const rezultate = await Promise.all([
    supabase.from('waitlist').update({ pozitie: aDoua.pozitie }).eq('id', prima.id).select('id'),
    supabase.from('waitlist').update({ pozitie: prima.pozitie }).eq('id', aDoua.id).select('id'),
  ])

  for (const { error, data } of rezultate) {
    if (error) throw error
    if (!data?.length) {
      throw new Error('Reordonarea nu a fost aplicata: contul tau nu are acest drept.')
    }
  }
}
