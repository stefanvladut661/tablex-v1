import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/types/database'

export type Client = Tables<'customers'>

export const CHEI_CLIENTI = {
  lista: (restaurantId: string) => ['clienti', restaurantId] as const,
  rezervari: (customerId: string) => ['clienti', 'rezervari', customerId] as const,
}

/**
 * Fisele de client se creeaza singure, din RPC-ul de rezervare (§16.1): cheia
 * e telefonul, iar contoarele le intretine un trigger la tranzitia de status.
 * Pagina asta doar le arata — nu exista "adauga client", fiindca un client
 * fara nicio rezervare nu inseamna nimic.
 *
 * Excludem randurile arhivate si pe cele contopite in altele (merged_into_id):
 * un client contopit e acelasi om, iar afisarea ambelor ar dubla statisticile.
 */
export async function getClienti(restaurantId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('arhivat', false)
    .is('merged_into_id', null)
    // Cei mai recenti primii; cine n-a fost niciodata la final.
    .order('data_ultima_vizita', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export type RezervareClient = Pick<
  Tables<'reservations'>,
  'id' | 'data_ora' | 'nr_persoane' | 'status' | 'sursa' | 'anonimizat_la'
>

/** Istoricul unui client, pentru panoul de detaliu. */
export async function getRezervariClient(customerId: string): Promise<RezervareClient[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select('id, data_ora, nr_persoane, status, sursa, anonimizat_la')
    .eq('customer_id', customerId)
    .order('data_ora', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

/**
 * Notele si etichetele sunt singurele campuri pe care le scrie personalul;
 * contoarele raman treaba trigger-ului, ca sa nu poata fi falsificate din
 * interfata.
 */
export async function actualizeazaClient(
  id: string,
  modificari: Pick<TablesUpdate<'customers'>, 'note' | 'taguri' | 'nume' | 'email'>,
): Promise<void> {
  const { data, error } = await supabase
    .from('customers')
    .update(modificari)
    .eq('id', id)
    .select('id')
  if (error) throw error
  // Un UPDATE respins de RLS raspunde 200 cu zero randuri (lectia din Faza 3).
  if (!data?.length) {
    throw new Error('Modificarea nu a fost aplicata: contul tau nu are acest drept.')
  }
}

/**
 * Stergerea datelor la cerere (§22.1).
 *
 * NU e un simplu delete: `reservations` pastreaza copii ale numelui,
 * telefonului si emailului, iar legatura e ON DELETE SET NULL. Sterse doar din
 * `customers`, datele personale ar fi supravietuit in fiecare rezervare.
 * RPC-ul face totul atomic si intoarce cate rezervari a curatat.
 */
export async function stergeDateleClientului(customerId: string): Promise<number> {
  const { data, error } = await supabase.rpc('anonimizeaza_client', {
    p_customer_id: customerId,
  })
  if (error) throw error
  return data ?? 0
}
