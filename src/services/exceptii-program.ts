import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type ExceptieProgram = Tables<'program_exceptii'>

export const CHEI_EXCEPTII = {
  lista: (restaurantId: string) => ['exceptii-program', restaurantId] as const,
}

/**
 * Exceptiile de la programul standard (§30.2): zile in care restaurantul e
 * inchis (sarbatori, vacanta) sau are alt orar (Revelion).
 *
 * Regula NU se aplica din interfata: functia `este_deschis` din baza verifica
 * intai exceptia zilei si abia apoi programul saptamanal, iar `rezerva_public`
 * o apeleaza inainte sa accepte orice cerere. Deci un client nu poate rezerva
 * de Craciun nici daca ocoleste widgetul si apeleaza direct API-ul.
 */
export async function getExceptii(restaurantId: string): Promise<ExceptieProgram[]> {
  const { data, error } = await supabase
    .from('program_exceptii')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('data', { ascending: true })
  if (error) throw error
  return data
}

export type ExceptieNoua = {
  restaurantId: string
  data: string
  inchis: boolean
  oraDeschidere?: string | null
  oraInchidere?: string | null
  motiv?: string | null
}

/**
 * Upsert pe (restaurant_id, data): tabela are o constrangere de unicitate pe
 * ele, iar din interfata "adaug 25 decembrie" de doua ori trebuie sa insemne
 * "corectez", nu "eroare de cheie duplicata".
 */
export async function salveazaExceptie(exceptie: ExceptieNoua): Promise<ExceptieProgram> {
  const { data, error } = await supabase
    .from('program_exceptii')
    .upsert(
      {
        restaurant_id: exceptie.restaurantId,
        data: exceptie.data,
        inchis: exceptie.inchis,
        // CHECK-ul din schema cere orele cand ziua NU e inchisa; le golim
        // explicit in caz contrar, ca sa nu ramana ore fara sens pe un rand
        // marcat inchis.
        ora_deschidere: exceptie.inchis ? null : (exceptie.oraDeschidere ?? null),
        ora_inchidere: exceptie.inchis ? null : (exceptie.oraInchidere ?? null),
        motiv: exceptie.motiv?.trim() || null,
      },
      { onConflict: 'restaurant_id,data' },
    )
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function stergeExceptie(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('program_exceptii')
    .delete()
    .eq('id', id)
    .select('id')
  if (error) throw error

  // Politica de scriere cere is_manager(). Un DELETE respins de RLS NU intoarce
  // eroare: clauza USING filtreaza randul si PostgREST raspunde cu succes si
  // zero randuri. Fara verificarea asta, un ospatar care apeleaza direct API-ul
  // ar vedea "sters" pentru ceva ce a ramas pe loc. (Lectia din Faza 3.)
  if (!data?.length) {
    throw new Error('Excepția nu a fost stearsa: doar managerul poate schimba programul.')
  }
}
