import { supabase } from '@/lib/supabase'
import type { Enums, Tables, TablesUpdate } from '@/types/database'

export type CampFormular = Tables<'formular_campuri'>
export type TipCamp = Enums<'camp_formular_tip'>

export const CHEI_CAMPURI = {
  lista: (restaurantId: string) => ['campuri-formular', restaurantId] as const,
}

export const ETICHETE_TIP: Record<TipCamp, string> = {
  text: 'Text',
  numar: 'Număr',
  checkbox: 'Bifă (da/nu)',
  dropdown: 'Listă de opțiuni',
}

/**
 * Campurile formularului public. Cele patru de sistem (nume, telefon, email,
 * nr_persoane) sunt create de `creeaza_restaurant` si NU se pot sterge: au
 * parametri dedicati in `rezerva_public` si coloane proprii in `reservations`.
 * Restul sunt intrebarile proprii ale restaurantului, salvate in
 * `reservations.campuri_custom`.
 */
export async function getCampuri(restaurantId: string): Promise<CampFormular[]> {
  const { data, error } = await supabase
    .from('formular_campuri')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('ordine', { ascending: true })
  if (error) throw error
  return data
}

export type CampNou = {
  restaurantId: string
  eticheta: string
  tip: TipCamp
  obligatoriu: boolean
  optiuni?: string[]
  placeholder?: string | null
}

/**
 * Cheia se deriva din eticheta si NU mai poate fi schimbata: ea e cheia din
 * jsonb-ul rezervarilor deja trimise. Daca s-ar redenumi, raspunsurile vechi ar
 * ramane sub o cheie pe care nimic nu o mai cauta.
 */
export function cheieDinEticheta(eticheta: string): string {
  return eticheta
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}

export async function creeazaCamp(camp: CampNou): Promise<CampFormular> {
  const existente = await getCampuri(camp.restaurantId)
  const cheie = cheieDinEticheta(camp.eticheta)

  if (!cheie) {
    throw new Error('Eticheta trebuie să conțină litere sau cifre.')
  }
  if (existente.some((c) => c.cheie === cheie)) {
    throw new Error('Există deja un câmp cu acest nume.')
  }

  const ordine = existente.reduce((maxim, c) => Math.max(maxim, c.ordine), -1) + 1

  const { data, error } = await supabase
    .from('formular_campuri')
    .insert({
      restaurant_id: camp.restaurantId,
      cheie,
      eticheta: camp.eticheta.trim(),
      tip: camp.tip,
      obligatoriu: camp.obligatoriu,
      optiuni: camp.tip === 'dropdown' ? (camp.optiuni ?? []) : [],
      placeholder: camp.placeholder?.trim() || null,
      sistem: false,
      ordine,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function actualizeazaCamp(
  id: string,
  modificari: Pick<TablesUpdate<'formular_campuri'>, 'eticheta' | 'obligatoriu' | 'activ' | 'placeholder' | 'optiuni'>,
): Promise<void> {
  const { data, error } = await supabase
    .from('formular_campuri')
    .update(modificari)
    .eq('id', id)
    .select('id')
  if (error) throw error
  // Politica de scriere cere is_manager(); un UPDATE filtrat de RLS raspunde
  // 200 cu zero randuri (lectia din Faza 3).
  if (!data?.length) {
    throw new Error('Modificarea nu a fost aplicată: doar managerul poate schimba formularul.')
  }
}

export async function stergeCamp(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('formular_campuri')
    .delete()
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data?.length) {
    throw new Error('Câmpul nu a fost șters: doar managerul poate schimba formularul.')
  }
}
