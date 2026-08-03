import { marcareaSAplicat } from '@/lib/notificari-citit'
import { supabase } from '@/lib/supabase'
import type { Enums, Tables } from '@/types/database'

/**
 * Notificarea, plus starea de citit A CONTULUI CURENT.
 *
 * `citita_la` nu mai e coloana a notificarii — ar fi comuna pe tot restaurantul
 * (§33) — ci vine din vederea `notificari_mele`, care face left join cu
 * `notificari_citite` pe auth.uid(). NULL inseamna „necitita DE MINE".
 */
export type Notificare = Tables<'notificari'> & { citita_la: string | null }

export const CHEI_NOTIFICARI = {
  // Cheile poarta si utilizatorul: starea de citit e personala, iar dupa un
  // logout/login in acelasi tab cache-ul contului anterior n-are voie sa se
  // arate contului nou.
  lista: (restaurantId: string, userId: string) =>
    ['notificari', restaurantId, userId] as const,
  echipa: (userId: string) => ['notificari', 'echipa', userId] as const,
}

/**
 * Vederile au toate coloanele nullable — asa le descrie Postgres, fiindca
 * un left join le poate lasa goale — dar coloanele tabelei de baza sunt NOT
 * NULL. Normalizam o singura data, aici, ca restul aplicatiei sa lucreze cu
 * tipul real al notificarii.
 */
function normalizeaza(randuri: Tables<'notificari_mele'>[]): Notificare[] {
  return randuri.map((rand) => ({
    id: rand.id!,
    restaurant_id: rand.restaurant_id,
    destinatie: rand.destinatie!,
    tip: rand.tip!,
    urgenta: rand.urgenta!,
    titlu: rand.titlu!,
    mesaj: rand.mesaj,
    reservation_id: rand.reservation_id,
    created_at: rand.created_at!,
    citita_la: rand.citita_la,
  }))
}

/** Ultimele notificari ale restaurantului; clopotelul nu are nevoie de arhiva. */
export async function getNotificari(restaurantId: string): Promise<Notificare[]> {
  const { data, error } = await supabase
    .from('notificari_mele')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return normalizeaza(data ?? [])
}

// ═══════════════════════════════════════════════════════════════════════════
// Clopotelul echipei TableX (§9.1, §38.4)
//
// Notificarile echipei au destinatie = 'super_admin'. Unele poarta si un
// restaurant_id (ex. creditele epuizate), dar politica de citire a
// restaurantului filtreaza destinatie = 'admin', deci randurile astea nu ajung
// niciodata in clopotelul restaurantului.
// ═══════════════════════════════════════════════════════════════════════════

/** §9.1: grupate pe urgenta in componenta — rosu, galben, albastru. */
export async function getNotificariEchipa(): Promise<Notificare[]> {
  const { data, error } = await supabase
    .from('notificari_mele')
    .select('*')
    .eq('destinatie', 'super_admin')
    .order('created_at', { ascending: false })
    .limit(60)
  if (error) throw error
  return normalizeaza(data ?? [])
}

// ═══════════════════════════════════════════════════════════════════════════
// Marcarea (§33) — aceleasi doua functii pentru ambele clopotele
//
// Scrierea nu mai atinge randul notificarii, ci insereaza un rand personal in
// `notificari_citite`. Trece prin RPC fiindca „insereaza cate un rand pentru
// fiecare notificare pe care o vad" nu se poate exprima in PostgREST, iar
// varianta „trimite din client id-urile incarcate" ar lasa necitit tot ce e
// dincolo de fereastra de 30.
//
// Regula 6: RLS respinge cu 200 si ZERO randuri, nu cu eroare. Aici refuzul e
// cu atat mai tacut cu cat INSERT-ul e alimentat de un SELECT deja filtrat de
// RLS — nu arunca nimic, doar insereaza mai putin. De aceea ambele functii din
// baza intorc cate au RAMAS necitite, iar noi verificam.
// ═══════════════════════════════════════════════════════════════════════════

export async function marcheazaCitita(id: string): Promise<void> {
  const { data, error } = await supabase.rpc('marcheaza_notificari_citite', { p_ids: [id] })
  if (error) throw error
  if (!marcareaSAplicat(data)) {
    throw new Error('Notificarea nu a fost marcată ca citită. Reîncarcă pagina.')
  }
}

export async function marcheazaToateCitite(
  destinatie: Enums<'notificare_destinatie'>,
): Promise<void> {
  const { data, error } = await supabase.rpc('marcheaza_toate_citite', {
    p_destinatie: destinatie,
  })
  if (error) throw error
  if (!marcareaSAplicat(data)) {
    throw new Error('Notificările nu au fost marcate ca citite. Reîncarcă pagina.')
  }
}
