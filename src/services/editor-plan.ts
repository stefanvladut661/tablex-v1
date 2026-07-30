import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/types/database'

export type Zona = Tables<'zones'>
export type Masa = Tables<'tables'>

export const CHEI_EDITOR = {
  zone: (restaurantId: string) => ['editor', 'zone', restaurantId] as const,
  mese: (restaurantId: string) => ['editor', 'mese', restaurantId] as const,
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
