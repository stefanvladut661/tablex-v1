import { supabase } from '@/lib/supabase'
import type { Enums, Tables, TablesUpdate } from '@/types/database'

export type StatusRezervare = Enums<'rezervare_status'>
export type SursaRezervare = Enums<'rezervare_sursa'>

/** Rezervarea, cu numele mesei si al zonei aduse din acelasi query. */
export type Rezervare = Tables<'reservations'> & {
  masa: { numar_masa: string; capacitate: number } | null
  zona: { nume: string } | null
}

const SELECT_REZERVARE = '*, masa:tables(numar_masa, capacitate), zona:zones(nume)'

export const CHEI_REZERVARI = {
  interval: (restaurantId: string, deLa: string, panaLa: string) =>
    ['rezervari', restaurantId, deLa, panaLa] as const,
  toate: (restaurantId: string) => ['rezervari', restaurantId] as const,
}

/**
 * Rezervarile care SE SUPRAPUN cu intervalul cerut, nu doar cele care incep in
 * el: altfel o rezervare de la 23:30 ar dispărea din ziua urmatoare, iar o masa
 * ocupata la ora afisata nu ar aparea deloc.
 */
export async function getRezervari(
  restaurantId: string,
  deLa: Date,
  panaLa: Date,
): Promise<Rezervare[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select(SELECT_REZERVARE)
    .eq('restaurant_id', restaurantId)
    .lt('data_ora', panaLa.toISOString())
    .gt('blocat_pana_la', deLa.toISOString())
    .order('data_ora', { ascending: true })
  if (error) throw error
  return data as Rezervare[]
}

export type DateRezervareNoua = {
  clientNume: string
  /** null e permis DOAR pentru walk-in (§25.6) — baza impune regula. */
  telefon: string | null
  nrPersoane: number
  dataOra: Date
  tableId?: string | null
  zoneId?: string | null
  durataMinute?: number | null
  status?: StatusRezervare
  sursa?: SursaRezervare
  email?: string | null
  noteInterne?: string | null
  noteClient?: string | null
  gdpr?: boolean
}

/**
 * Trece prin RPC: acolo stau upsert-ul de client pe telefon (§16.1) si
 * derivarea restaurantului din contul curent. Conflictul de masa vine ca
 * SQLSTATE 23P01 din constrangerea EXCLUDE si e tradus in lib/erori.ts.
 */
export async function creeazaRezervare(date: DateRezervareNoua): Promise<string> {
  const { data, error } = await supabase.rpc('creeaza_rezervare', {
    p_client_nume: date.clientNume,
    p_telefon: date.telefon,
    p_nr_persoane: date.nrPersoane,
    p_data_ora: date.dataOra.toISOString(),
    p_table_id: date.tableId ?? undefined,
    p_zone_id: date.zoneId ?? undefined,
    p_durata_minute: date.durataMinute ?? undefined,
    p_status: date.status,
    p_sursa: date.sursa,
    p_email: date.email ?? undefined,
    p_note_interne: date.noteInterne ?? undefined,
    p_note_client: date.noteClient ?? undefined,
    p_gdpr: date.gdpr,
  })
  if (error) throw error
  return data
}

export async function schimbaStatus(id: string, status: StatusRezervare): Promise<void> {
  const { data, error } = await supabase
    .from('reservations')
    .update({
      status,
      // sosit_la e sursa pentru "de cat timp sta masa" (§28.12) si pentru
      // data ultimei vizite din CRM.
      sosit_la: status === 'sosita' ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data?.length) {
    throw new Error('Rezervarea nu a fost modificata: contul tau nu are acest drept.')
  }
}

/**
 * Ce se poate schimba la o rezervare care exista deja (§26.3).
 *
 * Telefonul lipseste INTENTIONAT. E cheia fisei de client (§16.1): schimbat
 * aici, `customer_id` ar trebui re-legat, iar vizitele s-ar imparti sau s-ar
 * dubla intre doua fise. Un numar gresit se rezolva contopind fisele din CRM
 * (§19.2), nu rescriind rezervarea.
 */
export type MutareRezervare = {
  id: string
  tableId?: string | null
  zoneId?: string | null
  dataOra?: Date
  durataMinute?: number
  nrPersoane?: number
  noteInterne?: string | null
}

/**
 * Intervalul si buffer-ul NU se calculeaza aici: le recalculeaza triggerul
 * `rezervare_calculeaza_interval` la fiecare UPDATE. Daca le-am duplica in
 * client, cele doua aritmetici ar diverge tacut la prima schimbare de setari.
 *
 * Conflictul cu alta rezervare vine ca SQLSTATE 23P01 din constrangerea
 * EXCLUDE si e tradus in lib/erori.ts. Nu exista forma de fortare (§15.3).
 */
export async function mutaRezervare(mutare: MutareRezervare): Promise<void> {
  const modificari: TablesUpdate<'reservations'> = {}
  if (mutare.tableId !== undefined) modificari.table_id = mutare.tableId
  if (mutare.zoneId !== undefined) modificari.zone_id = mutare.zoneId
  if (mutare.dataOra) modificari.data_ora = mutare.dataOra.toISOString()
  if (mutare.durataMinute) modificari.durata_minute = mutare.durataMinute
  if (mutare.nrPersoane) modificari.nr_persoane = mutare.nrPersoane
  if (mutare.noteInterne !== undefined) modificari.note_interne = mutare.noteInterne

  const { data, error } = await supabase
    .from('reservations')
    .update(modificari)
    .eq('id', mutare.id)
    .select('id')
  if (error) throw error
  if (!data?.length) {
    throw new Error('Rezervarea nu a fost modificata: contul tau nu are acest drept.')
  }
}

export type MasaDisponibila = {
  table_id: string
  numar_masa: string
  capacitate: number
  libera: boolean
}

/**
 * Mesele pentru re-alocarea unei rezervari EXISTENTE (§26.3).
 *
 * Nu folosim `disponibilitate_mese`: aceea ar arata masa curenta drept ocupata
 * de propria rezervare, deci n-ai putea schimba doar ora, pastrand masa.
 * RPC-ul din migratia 27 ignora alocarile rezervarii primite.
 *
 * `dataOra` si `durata` sunt optionale: lipsa lor inseamna „la ora ei de acum".
 */
export async function getMeseLibere(
  reservationId: string,
  dataOra?: Date,
  durataMinute?: number,
): Promise<MasaDisponibila[]> {
  const { data, error } = await supabase.rpc('mese_libere_pentru_rezervare', {
    p_reservation_id: reservationId,
    p_start: dataOra?.toISOString(),
    p_durata_minute: durataMinute,
  })
  if (error) throw error
  return data ?? []
}
