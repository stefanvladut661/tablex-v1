import { supabase } from '@/lib/supabase'
import type { Enums, Tables } from '@/types/database'

export type MembruEchipa = Tables<'admin_users'>
export type Invitatie = Tables<'staff_invitations'>

export const CHEI_ECHIPA = {
  membri: (restaurantId: string) => ['echipa', 'membri', restaurantId] as const,
  invitatii: (restaurantId: string) => ['echipa', 'invitatii', restaurantId] as const,
}

// Politicile RLS filtreaza deja pe restaurant; filtrul explicit de aici e
// pentru claritate si pentru a folosi indexul.
export async function getMembri(restaurantId: string): Promise<MembruEchipa[]> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function getInvitatii(restaurantId: string): Promise<Invitatie[]> {
  const { data, error } = await supabase
    .from('staff_invitations')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export type DateInvitatie = {
  restaurantId: string
  email: string
  rol: Enums<'admin_rol'>
  invitatDe: string
}

/**
 * Token-ul se genereaza in baza de date (default pe coloana), deci il citim
 * din randul inserat — de acolo se construieste linkul de invitatie.
 */
export async function invitaMembru(date: DateInvitatie): Promise<Invitatie> {
  const { data, error } = await supabase
    .from('staff_invitations')
    .insert({
      restaurant_id: date.restaurantId,
      email: date.email.trim().toLowerCase(),
      rol: date.rol,
      invited_by: date.invitatDe,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

/**
 * Un UPDATE pe care RLS nu il permite NU intoarce eroare: clauza USING doar
 * filtreaza randul, deci PostgREST raspunde 200 cu zero randuri (verificat pe
 * proiect, cu un cont de ospatar). Fara verificarea de mai jos, interfata ar
 * arata "salvat" desi nu s-a schimbat nimic — exact tipul de eroare silentioasa
 * pe care nu vrem sa o avem in aplicatie.
 */
async function confirmaModificare(
  randuri: Array<{ id: string }> | null,
  actiune: string,
): Promise<void> {
  if (!randuri || randuri.length === 0) {
    throw new Error(`${actiune} nu a fost aplicată: contul tău nu are acest drept.`)
  }
}

export async function anuleazaInvitatie(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('staff_invitations')
    .update({ status: 'anulata' })
    .eq('id', id)
    .select('id')
  if (error) throw error
  await confirmaModificare(data, 'Anularea invitației')
}

export async function seteazaActivMembru(id: string, activ: boolean): Promise<void> {
  const { data, error } = await supabase
    .from('admin_users')
    .update({ activ })
    .eq('id', id)
    .select('id')
  if (error) throw error
  await confirmaModificare(data, 'Schimbarea accesului')
}

export async function schimbaRolMembru(id: string, rol: Enums<'admin_rol'>): Promise<void> {
  const { data, error } = await supabase
    .from('admin_users')
    .update({ rol })
    .eq('id', id)
    .select('id')
  if (error) throw error
  await confirmaModificare(data, 'Schimbarea rolului')
}

/**
 * Resetarea parolei unui Ospatar de catre Manager (§49.8, §52). Trece printr-o
 * Edge Function: schimbarea parolei ALTUI cont cere service_role, care nu are
 * ce cauta in browser. Functia verifica relatia manager→ospatar in baza si
 * intoarce parola generata O SINGURA data.
 */
export async function reseteazaParolaOspatar(
  adminUserId: string,
): Promise<{ parola: string; ospatar: string | null }> {
  const { data, error } = await supabase.functions.invoke('reseteaza-parola-ospatar', {
    body: { admin_user_id: adminUserId },
  })
  if (error) throw new Error('Resetarea parolei a eșuat. Încearcă din nou.')
  if (!data?.ok) throw new Error(data?.eroare ?? 'Resetarea parolei a eșuat.')
  return { parola: data.parola as string, ospatar: (data.ospatar as string | null) ?? null }
}

/**
 * Stergerea unui cont de Ospatar (§30.3). Definitiv, spre deosebire de
 * dezactivare: randul dispare din admin_users, iar contul nu mai apartine
 * restaurantului. Interfata o ofera doar pentru Ospatar; propriul cont e
 * aparat si in baza (migratia protejeaza_contul_propriu).
 */
export async function stergeMembru(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('admin_users')
    .delete()
    .eq('id', id)
    .select('id')
  if (error) throw error
  await confirmaModificare(data, 'Ștergerea contului')
}
