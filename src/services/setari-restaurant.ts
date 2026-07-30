import { supabase } from '@/lib/supabase'
import type { Json, TablesUpdate } from '@/types/database'

export type ModificariRestaurant = TablesUpdate<'restaurants'>

/**
 * Zilele saptamanii, exact cu cheile din restaurants.program_standard.
 * Ordinea de aici e ordinea de afisare.
 */
export const ZILE_PROGRAM = [
  { cheie: 'luni', eticheta: 'Luni' },
  { cheie: 'marti', eticheta: 'Marti' },
  { cheie: 'miercuri', eticheta: 'Miercuri' },
  { cheie: 'joi', eticheta: 'Joi' },
  { cheie: 'vineri', eticheta: 'Vineri' },
  { cheie: 'sambata', eticheta: 'Sambata' },
  { cheie: 'duminica', eticheta: 'Duminica' },
] as const

export type CheieZi = (typeof ZILE_PROGRAM)[number]['cheie']

export type ProgramZi = { deschis: boolean; de_la: string; pana_la: string }
export type ProgramSaptamanal = Record<CheieZi, ProgramZi>

const IMPLICIT_ZI: ProgramZi = { deschis: true, de_la: '10:00', pana_la: '23:00' }

/** Normalizeaza jsonb-ul din baza intr-o forma pe care formularul o poate lega. */
export function programDinJson(valoare: Json): ProgramSaptamanal {
  const brut =
    valoare && typeof valoare === 'object' && !Array.isArray(valoare)
      ? (valoare as Record<string, unknown>)
      : {}

  const rezultat = {} as ProgramSaptamanal
  for (const { cheie } of ZILE_PROGRAM) {
    const zi = brut[cheie]
    if (zi && typeof zi === 'object') {
      const date = zi as Record<string, unknown>
      rezultat[cheie] = {
        deschis: date.deschis !== false,
        de_la: typeof date.de_la === 'string' ? date.de_la.slice(0, 5) : IMPLICIT_ZI.de_la,
        pana_la: typeof date.pana_la === 'string' ? date.pana_la.slice(0, 5) : IMPLICIT_ZI.pana_la,
      }
    } else {
      rezultat[cheie] = { ...IMPLICIT_ZI }
    }
  }
  return rezultat
}

/**
 * Politica RLS permite UPDATE doar managerului restaurantului sau. Un refuz NU
 * vine ca eroare: clauza USING filtreaza randul si raspunsul e 200 cu zero
 * randuri (verificat pe proiect). De aceea verificam explicit.
 */
export async function actualizeazaRestaurant(
  restaurantId: string,
  modificari: ModificariRestaurant,
): Promise<void> {
  const { data, error } = await supabase
    .from('restaurants')
    .update(modificari)
    .eq('id', restaurantId)
    .select('id')
  if (error) throw error
  if (!data?.length) {
    throw new Error('Setarile nu au fost salvate: doar managerul poate schimba configurarea.')
  }
}

export type ConflictBuffer = {
  table_id: string
  rezervare_a: string
  rezervare_b: string
  suprapunere: string
}

/**
 * Schimbarea buffer-ului e NERETROACTIVA (rezervarile existente isi pastreaza
 * snapshot-ul), deci marirea lui nu poate strica nimic din trecut. Functia
 * arata insa ce suprapuneri ar apărea daca noua valoare s-ar aplica peste
 * rezervarile viitoare — informatie utila inainte de a salva.
 */
export async function verificaConflicteBuffer(
  restaurantId: string,
  bufferNou: number,
): Promise<ConflictBuffer[]> {
  const { data, error } = await supabase.rpc('verifica_conflicte_buffer', {
    p_restaurant_id: restaurantId,
    p_buffer_nou: bufferNou,
  })
  if (error) throw error
  return data ?? []
}
