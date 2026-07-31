import { supabase } from '@/lib/supabase'

/**
 * Preferinta PERSONALA de afisare in List View (§26.2): ce informatii apar pe
 * cardul unei rezervari. Se salveaza pe contul care o alege, nu pe restaurant —
 * managerul si ospatarul se uita la aceleasi rezervari cu ochi diferiti.
 *
 * Coloana `admin_users.list_view_columns_config` exista din Faza 1b si nu era
 * folosita de nimic.
 *
 * Stocam ce e ASCUNS, nu ce e vizibil. Asa, un camp adaugat mai tarziu apare
 * automat tuturor: cu lista inversa ar fi ramas invizibil pentru toti cei care
 * si-au salvat vreodata o preferinta.
 */
export type CampCard = 'telefon' | 'masa' | 'persoane' | 'sursa' | 'zona' | 'note'

export const CAMPURI_CARD: Array<{ cheie: CampCard; eticheta: string }> = [
  { cheie: 'telefon', eticheta: 'Telefon' },
  { cheie: 'masa', eticheta: 'Masa' },
  { cheie: 'persoane', eticheta: 'Numar de persoane' },
  { cheie: 'sursa', eticheta: 'Sursa' },
  { cheie: 'zona', eticheta: 'Zona' },
  { cheie: 'note', eticheta: 'Note' },
]

export const CHEIE_PREFERINTE = (userId: string) => ['preferinte', userId] as const

/** Citeste configuratia bruta si o curata: jsonb-ul poate contine orice. */
export function campuriAscunse(config: unknown): Set<CampCard> {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return new Set()
  const brut = (config as { ascunse?: unknown }).ascunse
  if (!Array.isArray(brut)) return new Set()
  const cunoscute = new Set(CAMPURI_CARD.map((c) => c.cheie as string))
  return new Set(brut.filter((c): c is CampCard => typeof c === 'string' && cunoscute.has(c)))
}

/**
 * Scrierea trece prin politica `admin_users_actualizare_propriu`. Din migratia
 * 28, un trigger o ingusteaza la exact campurile personale: aceeasi politica
 * permitea, pana atunci, si `rol = 'manager'`.
 */
export async function salveazaCampuriAscunse(
  adminUserId: string,
  ascunse: CampCard[],
): Promise<void> {
  const { data, error } = await supabase
    .from('admin_users')
    .update({ list_view_columns_config: { ascunse } })
    .eq('id', adminUserId)
    .select('id')
  if (error) throw error
  if (!data?.length) {
    throw new Error('Preferinta nu a fost salvata: contul tau nu are acest drept.')
  }
}
