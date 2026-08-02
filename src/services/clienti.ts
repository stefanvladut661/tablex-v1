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
/**
 * Fisa clientului dupa telefon — pentru Red Flag-ul din §7.2: la crearea unei
 * rezervari, numarul cu 2+ neprezentari primeste un avertisment VIZUAL, atat.
 * Decizia ramane a personalului (§19.1 interzice auto-blocarea).
 */
export async function getClientDupaTelefon(
  restaurantId: string,
  telefon: string,
): Promise<Client | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('telefon', telefon.trim())
    .maybeSingle()
  if (error) throw error
  return data
}

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
 * Contopirea a doua fise ale aceleiasi persoane (§16.3).
 *
 * Duplicatele apar singure, fiindca fisa are drept cheie telefonul: acelasi om
 * suna o data de pe „0722...", o data de pe „+40722..." si rezerva a treia oara
 * din widget cu numarul de acasa.
 *
 * Fisa absorbita NU dispare: ramane ca alias al numarului ei, iar un trigger
 * duce rezervarile viitoare venite de pe el la fisa pastrata. Stearsa, numarul
 * s-ar fi eliberat si prima rezervare de pe el ar fi desfacut contopirea.
 *
 * Intoarce cate rezervari au fost mutate.
 */
export async function contopesteClienti(
  principalId: string,
  duplicatId: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('contopeste_clienti', {
    p_principal_id: principalId,
    p_duplicat_id: duplicatId,
  })
  if (error) throw error
  return data ?? 0
}

/**
 * Stergerea datelor la cerere (§22.1).
 *
 * NU e un simplu delete: `reservations` pastreaza copii ale numelui,
 * telefonului si emailului, iar legatura e ON DELETE SET NULL. Sterse doar din
 * `customers`, datele personale ar fi supravietuit in fiecare rezervare.
 * RPC-ul face totul atomic si intoarce cate rezervari a curatat.
 *
 * Sterge si aliasurile lasate de contopiri, plus instantaneele din audit:
 * altfel numele si telefonul aceleiasi persoane ar fi supravietuit exact
 * stergerii cerute de ea.
 */
export async function stergeDateleClientului(customerId: string): Promise<number> {
  const { data, error } = await supabase.rpc('anonimizeaza_client', {
    p_customer_id: customerId,
  })
  if (error) throw error
  return data ?? 0
}
