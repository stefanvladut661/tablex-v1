import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'
import type { ElementStructura, MasaHarta, ZonaHarta } from '@/types/floor-plan'

/**
 * Tot ce vede un vizitator anonim trece prin vederile publice si prin RPC-ul
 * rezerva_public (migratia 10). Tabelele zones/tables/restaurants rămân
 * inaccesibile cu cheia anon — vederile expun doar coloanele necesare.
 */

export type RestaurantPublic = Tables<'restaurante_publice'>

export const CHEI_WIDGET = {
  restaurant: (slug: string) => ['widget', 'restaurant', slug] as const,
  sala: (restaurantId: string) => ['widget', 'sala', restaurantId] as const,
}

export async function getRestaurantPublic(slug: string): Promise<RestaurantPublic | null> {
  const { data, error } = await supabase
    .from('restaurante_publice')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * §16.4 — restaurantul exista, dar e suspendat/banat? Vederea divulga doar
 * slug-ul, exact cat sa putem arata alt mesaj decat la un slug inexistent.
 */
export async function esteIndisponibil(slug: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('restaurante_indisponibile')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
}

/**
 * MasaHarta descrie doar ce e nevoie pentru randare; gruparea pe zone e
 * treaba apelantului, deci adaugam zone_id aici si nu in tipul hartii.
 */
export type MasaPublica = MasaHarta & { zone_id: string }

export type SalaPublica = {
  zone: ZonaHarta[]
  mese: MasaPublica[]
  structura: Record<string, ElementStructura[]>
}

/** Geometria salii pentru previzualizarea din widget (fara statusuri). */
export async function getSalaPublica(restaurantId: string): Promise<SalaPublica> {
  const [zone, mese, structura] = await Promise.all([
    supabase
      .from('zone_publice')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('ordine_afisare'),
    supabase.from('mese_publice').select('*').eq('restaurant_id', restaurantId),
    supabase.from('structura_publica').select('*').eq('restaurant_id', restaurantId),
  ])

  if (zone.error) throw zone.error
  if (mese.error) throw mese.error
  if (structura.error) throw structura.error

  // Vederile au toate coloanele nullable (asa le genereaza Postgres), dar
  // filtrele lor garanteaza randuri complete; normalizam o singura data aici.
  const zoneCurate: ZonaHarta[] = (zone.data ?? []).map((z) => ({
    id: z.id!,
    nume: z.nume!,
    canvas_latime: z.canvas_latime!,
    canvas_inaltime: z.canvas_inaltime!,
    grid_marime: z.grid_marime!,
  }))

  const meseCurate: MasaPublica[] = (mese.data ?? []).map((m) => ({
    id: m.id!,
    zone_id: m.zone_id!,
    numar_masa: m.numar_masa!,
    capacitate: m.capacitate!,
    forma: m.forma!,
    pozitie_x: m.pozitie_x!,
    pozitie_y: m.pozitie_y!,
    latime: m.latime!,
    inaltime: m.inaltime!,
    rotatie: m.rotatie!,
    activa: true,
    indisponibila: false,
    grup_unire_id: m.grup_unire_id,
  }))

  const peZone: Record<string, ElementStructura[]> = {}
  for (const rand of structura.data ?? []) {
    if (rand.zone_id && Array.isArray(rand.continut)) {
      peZone[rand.zone_id] = rand.continut as unknown as ElementStructura[]
    }
  }

  return { zone: zoneCurate, mese: meseCurate, structura: peZone }
}

export type CerereRezervare = {
  slug: string
  clientNume: string
  telefon: string
  nrPersoane: number
  dataOra: Date
  zoneId?: string | null
  email?: string | null
  noteClient?: string | null
  gdpr: boolean
  /** Raspunsurile la campurile proprii ale restaurantului, pe cheie. */
  campuriCustom?: Record<string, string>
}

export type RezultatRezervare = {
  id: string
  status: 'pending' | 'confirmata'
  restaurant: string
}

export async function trimiteCerereRezervare(
  cerere: CerereRezervare,
): Promise<RezultatRezervare> {
  const { data, error } = await supabase.rpc('rezerva_public', {
    p_slug: cerere.slug,
    p_client_nume: cerere.clientNume,
    p_telefon: cerere.telefon,
    p_nr_persoane: cerere.nrPersoane,
    p_data_ora: cerere.dataOra.toISOString(),
    p_zone_id: cerere.zoneId ?? undefined,
    p_email: cerere.email ?? undefined,
    p_note_client: cerere.noteClient ?? undefined,
    p_gdpr: cerere.gdpr,
    p_campuri_custom: cerere.campuriCustom ?? {},
  })
  if (error) throw error
  return data as unknown as RezultatRezervare
}


// ── Campurile proprii ale formularului (migratia 23) ─────────────────────

export type CampFormularPublic = Tables<'campuri_formular_publice'>

/**
 * Configurarea formularului, citita de un vizitator ANONIM prin vederea
 * publica. Cele patru campuri de sistem (nume, telefon, email, nr_persoane) au
 * parametri proprii in rezerva_public, deci widgetul le randeaza oricum; de
 * aici ne intereseaza restul, plus eventualele etichete schimbate.
 */
export const CHEIE_CAMPURI = (restaurantId: string) =>
  ['widget', 'campuri', restaurantId] as const

const CHEI_SISTEM = ['nume', 'telefon', 'email', 'nr_persoane']

export async function getCampuriFormular(restaurantId: string): Promise<CampFormularPublic[]> {
  const { data, error } = await supabase
    .from('campuri_formular_publice')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('ordine', { ascending: true })
  if (error) throw error
  return data
}

/**
 * Doar campurile adaugate de restaurant, in ordinea lor.
 *
 * Coloanele unei vederi sunt nullabile in tipurile generate (Postgres nu
 * garanteaza non-null prin vedere), desi aici nu pot fi goale niciodata.
 * Filtram explicit, ca sa nu randam un camp fara cheie.
 */
export function campuriProprii(campuri: CampFormularPublic[]): CampFormularPublic[] {
  return campuri.filter((camp) => camp.cheie !== null && !CHEI_SISTEM.includes(camp.cheie))
}

/**
 * Anuntul de eveniment de pe widget (§8.5).
 *
 * Vederea `evenimente_publice` filtreaza deja tot ce nu trebuie vazut: doar
 * evenimente PUBLICATE, cu anuntul pornit, si doar in fereastra configurata
 * inainte de data. Clientul nu vede ciornele restaurantului, iar filtrul nu se
 * poate ocoli dintr-un apel direct — nu e in interfata, e in vedere.
 */
export type EvenimentPublic = {
  id: string
  nume: string
  descriere: string | null
  data_ora: string
  afis_url: string | null
  pret_de_la: number | null
}

export async function getEvenimenteWidget(restaurantId: string): Promise<EvenimentPublic[]> {
  const { data, error } = await supabase
    .from('evenimente_publice')
    .select('id, nume, descriere, data_ora, afis_url, pret_de_la')
    .eq('restaurant_id', restaurantId)
    .order('data_ora', { ascending: true })
  if (error) throw error
  return data as EvenimentPublic[]
}
