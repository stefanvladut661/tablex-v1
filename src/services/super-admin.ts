import { supabase } from '@/lib/supabase'
import type { Enums, Tables, TablesUpdate } from '@/types/database'

export type Restaurant = Tables<'restaurants'>
export type IntrareAudit = Tables<'audit_super_admin'>
export type SetariGlobale = Tables<'app_settings'>

export const CHEI_SA = {
  restaurante: ['sa', 'restaurante'] as const,
  audit: (restaurantId?: string) => ['sa', 'audit', restaurantId ?? 'global'] as const,
  setari: ['sa', 'setari-globale'] as const,
  sanatate: ['sa', 'sanatate-servicii'] as const,
}

/** Politicile RLS dau echipei TableX acces la toate restaurantele. */
export async function getRestaurante(): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/**
 * Intervențiile privilegiate (plan, status, discount, trial, deblocare floor
 * plan) sunt permise doar echipei — trigger-ul din migratia 13 le refuza
 * oricui altcuiva, iar auditul se scrie automat, deci nu trebuie sa-l scriem
 * noi de aici.
 */
export async function intervine(
  restaurantId: string,
  modificari: TablesUpdate<'restaurants'>,
): Promise<void> {
  const { data, error } = await supabase
    .from('restaurants')
    .update(modificari)
    .eq('id', restaurantId)
    .select('id')
  if (error) throw error
  if (!data?.length) {
    throw new Error('Modificarea nu a fost aplicata: contul tau nu are acest drept.')
  }
}

/**
 * Registrul global sau, cu restaurantId, istoricul unui singur restaurant —
 * tab-ul Audit Log din View Details (§43.2). Indexul pe (restaurant_id,
 * created_at) exista din migratia 13 exact pentru filtrarea asta.
 */
export async function getAudit(restaurantId?: string, limita = 40): Promise<IntrareAudit[]> {
  let cerere = supabase
    .from('audit_super_admin')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limita)
  if (restaurantId) cerere = cerere.eq('restaurant_id', restaurantId)
  const { data, error } = await cerere
  if (error) throw error
  return data
}

// ── Overview / Dashboard Global (§9.2.1, §39) ──────────────────────────────

export type Perioada = 'azi' | 'saptamana' | 'luna' | 'an'

export const CHEI_OVERVIEW = {
  kpi: (perioada: Perioada) => ['sa', 'overview', 'kpi', perioada] as const,
  feed: ['sa', 'overview', 'feed'] as const,
}

export interface KpiGlobal {
  /** MRR curent: suma preturilor lunare ale restaurantelor active, cu discount. */
  mrrTotal: number
  restauranteStart: number
  restaurantePro: number
  /** Incasari din pachete de credite in perioada (demonstrativ, §14). */
  incasariCredite: number
  /** Volumul biletelor platite in perioada + comisionul TableX din ele. */
  volumEvenimente: number
  comisioaneEvenimente: number
}

function inceputPerioada(perioada: Perioada): string {
  const acum = new Date()
  if (perioada === 'azi') {
    acum.setHours(0, 0, 0, 0)
  } else if (perioada === 'saptamana') {
    acum.setDate(acum.getDate() - 7)
  } else if (perioada === 'luna') {
    acum.setMonth(acum.getMonth() - 1)
  } else {
    acum.setFullYear(acum.getFullYear() - 1)
  }
  return acum.toISOString()
}

/**
 * KPI-urile din Top Metric Bar (§39.2). MRR-ul e starea CURENTA (abonamentele
 * sunt lunare — nu are sens pe „azi"); perioada taie doar fluxurile: credite
 * vandute si bilete platite. Selectorul le recalculeaza pe toate — cele
 * independente de perioada raman pur si simplu constante.
 */
export async function getKpiGlobal(perioada: Perioada): Promise<KpiGlobal> {
  const dinData = inceputPerioada(perioada)

  const [restaurante, setari, tranzactii, bilete] = await Promise.all([
    supabase.from('restaurants').select('plan, status, discount_procent'),
    supabase.from('app_settings').select('pret_plan_start, pret_plan_pro').single(),
    supabase
      .from('whatsapp_tranzactii')
      .select('pret_eur')
      .eq('tip', 'reincarcare')
      .gte('created_at', dinData),
    supabase
      .from('tickets')
      .select('pret_eur, comision_eur, platit_la')
      .not('platit_la', 'is', null)
      .gte('platit_la', dinData),
  ])

  if (restaurante.error) throw restaurante.error
  if (setari.error) throw setari.error
  if (tranzactii.error) throw tranzactii.error
  if (bilete.error) throw bilete.error

  const active = restaurante.data.filter((r) => r.status === 'activ')
  const mrrTotal = active.reduce((suma, r) => {
    const baza = r.plan === 'pro_floor' ? setari.data.pret_plan_pro : setari.data.pret_plan_start
    return suma + baza * (1 - (r.discount_procent ?? 0) / 100)
  }, 0)

  return {
    mrrTotal,
    restauranteStart: active.filter((r) => r.plan === 'start').length,
    restaurantePro: active.filter((r) => r.plan === 'pro_floor').length,
    incasariCredite: tranzactii.data.reduce((suma, t) => suma + (t.pret_eur ?? 0), 0),
    volumEvenimente: bilete.data.reduce((suma, b) => suma + b.pret_eur, 0),
    comisioaneEvenimente: bilete.data.reduce((suma, b) => suma + b.comision_eur, 0),
  }
}

export interface IntrareFeed {
  id: string
  restaurant_nume: string
  client_nume: string
  nr_persoane: number
  data_ora: string
  status: Enums<'rezervare_status'>
  created_at: string
}

/**
 * Harta Live a Rezervarilor (§39.1): NU e o harta geografica — e un flux
 * animat cu rezervarile din toata reteaua, pe masura ce apar (Realtime).
 * Aici e doar incarcarea initiala; abonarea o face pagina.
 */
export async function getFeedRezervari(limita = 25): Promise<IntrareFeed[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select('id, client_nume, nr_persoane, data_ora, status, created_at, restaurant:restaurants(nume)')
    .order('created_at', { ascending: false })
    .limit(limita)
  if (error) throw error
  return data.map((r) => ({
    id: r.id,
    restaurant_nume: r.restaurant?.nume ?? 'Restaurant',
    client_nume: r.client_nume,
    nr_persoane: r.nr_persoane,
    data_ora: r.data_ora,
    status: r.status,
    created_at: r.created_at,
  }))
}

// ── Starea serviciilor externe (§38.3) ─────────────────────────────────────

export type StatusServiciu = Tables<'statusuri_servicii'>

/**
 * RPC, nu SELECT: apelul insusi E verificarea pentru Supabase — daca a
 * raspuns, baza functioneaza, iar timestamp-ul se scrie in acelasi drum.
 * Stripe si Meta raman marcate simulat (§14).
 */
export async function verificaSanatateServicii(): Promise<StatusServiciu[]> {
  const { data, error } = await supabase.rpc('verifica_sanatate_servicii')
  if (error) throw error
  return data ?? []
}

export async function getSetariGlobale(): Promise<SetariGlobale> {
  const { data, error } = await supabase.from('app_settings').select('*').single()
  if (error) throw error
  return data
}

/** app_settings e singleton: un singur rand, cu id = true. */
export async function actualizeazaSetariGlobale(
  modificari: TablesUpdate<'app_settings'>,
): Promise<void> {
  const { data, error } = await supabase
    .from('app_settings')
    .update(modificari)
    .eq('id', true)
    .select('id')
  if (error) throw error
  if (!data?.length) {
    throw new Error('Setarile globale se schimba doar de rolul super_admin.')
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Echipa TableX (§9.2.7)
//
// Pana acum, singurul mod de a adauga pe cineva in echipa era un INSERT manual
// in super_admin_users, din SQL, cu user_id-ul copiat de mana din auth.users.
// Tabela de invitatii exista de la inceput; ii lipsea drumul.
// ═══════════════════════════════════════════════════════════════════════════

export type MembruTableX = Tables<'super_admin_users'>
export type InvitatieEchipa = Tables<'super_admin_invitations'>

export const CHEI_ECHIPA_TX = {
  membri: ['sa', 'echipa', 'membri'] as const,
  invitatii: ['sa', 'echipa', 'invitatii'] as const,
}

export async function getMembriEchipa(): Promise<MembruTableX[]> {
  const { data, error } = await supabase
    .from('super_admin_users')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function getInvitatiiEchipa(): Promise<InvitatieEchipa[]> {
  const { data, error } = await supabase
    .from('super_admin_invitations')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/**
 * Tokenul se genereaza in baza (default pe coloana), deci il citim din randul
 * inserat: din el se construieste linkul, ca la invitatiile de restaurant.
 */
export async function invitaInEchipa(
  email: string,
  rol: Enums<'super_admin_rol'>,
  invitatDe: string,
): Promise<InvitatieEchipa> {
  const { data, error } = await supabase
    .from('super_admin_invitations')
    .insert({ email: email.trim().toLowerCase(), rol, invited_by: invitatDe })
    .select('*')
    .single()
  if (error) throw error
  return data
}

/** Un UPDATE respins de RLS raspunde 200 cu zero randuri, nu cu eroare. */
async function confirmaScriere(randuri: Array<{ id: string }> | null, actiune: string) {
  if (!randuri?.length) {
    throw new Error(`${actiune} nu a fost aplicata: doar rolul super_admin poate face asta.`)
  }
}

export async function anuleazaInvitatiaEchipa(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('super_admin_invitations')
    .update({ status: 'anulata' })
    .eq('id', id)
    .select('id')
  if (error) throw error
  await confirmaScriere(data, 'Anularea invitatiei')
}

/**
 * Rolul si accesul unui membru. Ultimul super admin deplin nu se poate
 * dezactiva sau retrograda — garda e in baza, nu doar aici: altfel panoul
 * echipei s-ar putea inchide pentru toata lumea, iar reintrarea ar cere SQL.
 */
export async function actualizeazaMembruEchipa(
  id: string,
  modificari: Pick<TablesUpdate<'super_admin_users'>, 'rol' | 'activ' | 'nume'>,
): Promise<void> {
  const { data, error } = await supabase
    .from('super_admin_users')
    .update(modificari)
    .eq('id', id)
    .select('id')
  if (error) throw error
  await confirmaScriere(data, 'Modificarea membrului')
}
