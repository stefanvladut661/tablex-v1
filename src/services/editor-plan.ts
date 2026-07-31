import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/types/database'
import type { ElementStructura } from '@/types/floor-plan'

export type Zona = Tables<'zones'>
export type Masa = Tables<'tables'>
export type Layer = Tables<'floor_plan_layers'>

export const CHEI_EDITOR = {
  zone: (restaurantId: string) => ['editor', 'zone', restaurantId] as const,
  mese: (restaurantId: string) => ['editor', 'mese', restaurantId] as const,
  layer1: (zoneId: string) => ['editor', 'layer1', zoneId] as const,
}

/**
 * Editorul e unealta echipei TableX (§8.4): restaurantul cere planul, nu il
 * deseneaza. Politicile RLS dau echipei ALL pe zones/tables, deci nu e nevoie
 * de niciun RPC — scriem direct, cu filtrul pe restaurant scris explicit.
 *
 * Spre deosebire de getZone() din panoul restaurantului, aici NU filtram pe
 * activa: o zona dezactivata trebuie sa rămână editabila, altfel dezactivarea
 * ar fi un drum fara intoarcere.
 */
export async function getZoneEditor(restaurantId: string): Promise<Zona[]> {
  const { data, error } = await supabase
    .from('zones')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('ordine_afisare', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function getMeseEditor(restaurantId: string): Promise<Masa[]> {
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('numar_masa', { ascending: true })
  if (error) throw error
  return data
}

/**
 * Un UPDATE respins de RLS NU intoarce eroare: clauza USING filtreaza randul,
 * iar PostgREST raspunde 200 cu zero randuri (descoperirea din Faza 3). Deci
 * fiecare scriere verifica numarul de randuri, altfel interfata ar raporta
 * "salvat" degeaba.
 */
function verificaAplicat(randuri: unknown[] | null, ce: string): void {
  if (!randuri?.length) {
    throw new Error(`${ce} nu a fost aplicata: contul tau nu are acest drept.`)
  }
}

export async function creeazaZona(restaurantId: string, nume: string): Promise<Zona> {
  // ordine_afisare se calculeaza aici, nu in baza: zonele noi merg la coada,
  // iar utilizatorul le poate reordona ulterior.
  const existente = await getZoneEditor(restaurantId)
  const urmatoarea = existente.reduce((maxim, z) => Math.max(maxim, z.ordine_afisare), -1) + 1

  const { data, error } = await supabase
    .from('zones')
    .insert({ restaurant_id: restaurantId, nume: nume.trim(), ordine_afisare: urmatoarea })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function actualizeazaZona(
  id: string,
  modificari: TablesUpdate<'zones'>,
): Promise<void> {
  const { data, error } = await supabase.from('zones').update(modificari).eq('id', id).select('id')
  if (error) throw error
  verificaAplicat(data, 'Modificarea zonei')
}

/**
 * Migratia 18 refuza stergerea unei zone cu rezervari viitoare (P0002).
 * Nu preintampinam aici: baza e sursa de adevar, iar mesajul ei e deja explicit.
 */
export async function stergeZona(id: string): Promise<void> {
  const { error } = await supabase.from('zones').delete().eq('id', id)
  if (error) throw error
}

export type MasaNoua = {
  restaurantId: string
  zoneId: string
  capacitate: number
  pozitieX: number
  pozitieY: number
}

/**
 * Numarul urmator LIBER din restaurant.
 *
 * Doua capcane, ambele prinse la testare:
 *  1. Constrangerea e UNIQUE (restaurant_id, numar_masa) — pe restaurant, NU pe
 *     zona. O numerotare per zona ar fi produs coliziuni intre zone.
 *  2. Se citeste din BAZA, nu din starea React: doua asezari rapide una dupa
 *     alta ar calcula amandoua acelasi numar dintr-un cache nereimprospatat.
 * Cursele reale rămân posibile, deci apelantul reincearca la 23505.
 */
async function urmatorulNumarLiber(restaurantId: string): Promise<string> {
  const { data, error } = await supabase
    .from('tables')
    .select('numar_masa')
    .eq('restaurant_id', restaurantId)
  if (error) throw error

  const numere = (data ?? [])
    .map((rand) => Number(rand.numar_masa))
    .filter((numar) => Number.isInteger(numar) && numar > 0)

  // Etichetele nenumerice ("Terasa 3") sunt ignorate intentionat: nu incercam
  // sa le continuam schema, doar sa nu ne ciocnim de ele.
  const maxim = numere.length ? Math.max(...numere) : 0
  return String(maxim + 1)
}

export async function creeazaMasa(masa: MasaNoua): Promise<Masa> {
  for (let incercare = 0; incercare < 5; incercare += 1) {
    const numar = await urmatorulNumarLiber(masa.restaurantId)

    const { data, error } = await supabase
      .from('tables')
      .insert({
        restaurant_id: masa.restaurantId,
        zone_id: masa.zoneId,
        numar_masa: numar,
        capacitate: masa.capacitate,
        pozitie_x: masa.pozitieX,
        pozitie_y: masa.pozitieY,
      })
      .select('*')
      .single()

    if (!error) return data
    // 23505 = alt insert a luat numarul intre citire si scriere. Recitim si
    // reincercam; orice alta eroare se propaga asa cum e.
    if (error.code !== '23505') throw error
  }

  throw new Error('Nu am putut aloca un numar liber pentru masa noua. Incearca din nou.')
}

export async function actualizeazaMasa(
  id: string,
  modificari: TablesUpdate<'tables'>,
): Promise<void> {
  const { data, error } = await supabase.from('tables').update(modificari).eq('id', id).select('id')
  if (error) throw error
  verificaAplicat(data, 'Modificarea mesei')
}

export async function stergeMasa(id: string): Promise<void> {
  const { error } = await supabase.from('tables').delete().eq('id', id)
  if (error) throw error
}

// ── Layer 1: structura salii (pereti, bar, intrare...) ───────────────────
//
// Geometria structurala NU are tabela proprie: sta ca array jsonb in
// floor_plan_layers.continut, cu UNIQUE (zone_id, tip). Deci o zona are exact
// un layer1, iar o salvare rescrie tot array-ul.
//
// De aici vine nevoia de blocaj optimist: doi membri ai echipei care deseneaza
// aceeasi sala si-ar suprascrie tacit munca, ultimul castigand tot. Coloana
// `versiune` exista din migratia floor_plan si nu era folosita nicaieri — e
// exact instrumentul potrivit: scriem doar daca versiunea din baza e cea pe
// care am citit-o.

export type Layer1 = {
  id: string
  elemente: ElementStructura[]
  vizibil: boolean
  publicat: boolean
  versiune: number
} | null

export async function getLayer1(zoneId: string): Promise<Layer1> {
  const { data, error } = await supabase
    .from('floor_plan_layers')
    .select('id, continut, vizibil, publicat, versiune')
    .eq('zone_id', zoneId)
    .eq('tip', 'layer1')
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  return {
    id: data.id,
    // continut e jsonb liber; daca cineva a scris altceva decat un array, nu
    // lasam editorul sa cada — il tratam ca gol.
    elemente: Array.isArray(data.continut) ? (data.continut as ElementStructura[]) : [],
    vizibil: data.vizibil,
    publicat: data.publicat,
    versiune: data.versiune,
  }
}

export type SalvareLayer1 = {
  restaurantId: string
  zoneId: string
  elemente: ElementStructura[]
  vizibil: boolean
  publicat: boolean
  /** Versiunea pe care am citit-o; null cand stratul nu exista inca. */
  versiuneCitita: number | null
  layerId: string | null
}

/**
 * Intoarce starea NOUA a stratului. Apelantul o pune direct in cache: daca ar
 * astepta o reimprospatare, o a doua salvare rapida (doua apasari de sageata
 * una dupa alta) ar pleca cu versiunea veche si s-ar lovi de propriul blocaj
 * optimist, raportand un conflict inexistent.
 */
export async function salveazaLayer1(salvare: SalvareLayer1): Promise<NonNullable<Layer1>> {
  const continut = salvare.elemente as unknown as Tables<'floor_plan_layers'>['continut']

  if (!salvare.layerId || salvare.versiuneCitita === null) {
    const { data, error } = await supabase
      .from('floor_plan_layers')
      .insert({
        restaurant_id: salvare.restaurantId,
        zone_id: salvare.zoneId,
        tip: 'layer1',
        continut,
        vizibil: salvare.vizibil,
        publicat: salvare.publicat,
      })
      .select('id, versiune')
      .single()
    if (error) throw error
    return {
      id: data.id,
      elemente: salvare.elemente,
      vizibil: salvare.vizibil,
      publicat: salvare.publicat,
      versiune: data.versiune,
    }
  }

  const { data, error } = await supabase
    .from('floor_plan_layers')
    .update({
      continut,
      vizibil: salvare.vizibil,
      publicat: salvare.publicat,
      versiune: salvare.versiuneCitita + 1,
    })
    .eq('id', salvare.layerId)
    .eq('versiune', salvare.versiuneCitita)
    .select('id, versiune')

  if (error) throw error

  // Zero randuri => ori RLS a filtrat, ori versiunea din baza s-a schimbat
  // intre timp. In ambele cazuri NU am salvat, si utilizatorul trebuie sa afle.
  if (!data?.length) {
    throw new Error(
      'Planul a fost modificat intre timp de altcineva. Reincarca pagina inainte sa salvezi din nou.',
    )
  }

  return {
    id: data[0].id,
    elemente: salvare.elemente,
    vizibil: salvare.vizibil,
    publicat: salvare.publicat,
    versiune: data[0].versiune,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Istoricul versiunilor publicate (§40)
//
// Instantaneele NU se scriu de aici: le face un trigger la fiecare publicare a
// structurii. Serviciul doar le citeste si cere revenirea. Daca le-ar scrie
// frontend-ul, orice alta cale de scriere ar lasa o gaura in istoric — exact
// acolo unde te bazezi pe el.
// ═══════════════════════════════════════════════════════════════════════════

export type VersiunePlan = Pick<
  Tables<'floor_plan_projects'>,
  'id' | 'nume' | 'status' | 'versiune' | 'publicat_la' | 'publicat_de'
>

export const CHEIE_ISTORIC = (zoneId: string) => ['editor', 'istoric', zoneId] as const

export async function getIstoricVersiuni(zoneId: string): Promise<VersiunePlan[]> {
  const { data, error } = await supabase
    .from('floor_plan_projects')
    .select('id, nume, status, versiune, publicat_la, publicat_de')
    .eq('zone_id', zoneId)
    .eq('tip', 'fisier')
    .order('publicat_la', { ascending: false })
    .limit(30)
  if (error) throw error
  return data
}

/**
 * Revenirea scrie continutul vechi ca versiune NOUA — nu sterge istoricul si
 * nu „intoarce timpul", deci si o revenire gresita se poate reveni. Intoarce
 * numarul versiunii rezultate.
 */
export async function restaureazaVersiune(projectId: string): Promise<number> {
  const { data, error } = await supabase.rpc('restaureaza_versiune_plan', {
    p_project_id: projectId,
  })
  if (error) throw error
  return data ?? 0
}
