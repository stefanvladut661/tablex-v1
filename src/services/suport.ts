import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

/**
 * Support & Ticketing (§9.2.6, §46).
 *
 * Notele interne NU se filtreaza aici: politica RLS a restaurantului le
 * exclude singura (migratia support_ticketing), iar echipa le primeste pe
 * toate. Serviciul e acelasi pentru ambele parti — diferenta o face baza.
 */

export type Ticket = Tables<'support_tickets'> & {
  restaurant: { nume: string } | null
}
export type MesajTicket = Tables<'support_ticket_mesaje'>
export type SablonRaspuns = Tables<'support_response_templates'>

export const CHEI_SUPORT = {
  // Prefixul ['sa', 'suport'] e invalidat in bloc de canalul Realtime al
  // echipei (useRealtimeEchipa) — orice cheie noua intra sub el.
  inbox: ['sa', 'suport', 'inbox'] as const,
  fir: (ticketId: string) => ['sa', 'suport', 'fir', ticketId] as const,
  sabloane: ['sa', 'suport', 'sabloane'] as const,
  aleRestaurantului: (restaurantId: string) => ['suport', restaurantId] as const,
  firRestaurant: (ticketId: string) => ['suport', 'fir', ticketId] as const,
}

// ── Inbox-ul echipei (§46.1) ───────────────────────────────────────────────

/**
 * §46.3: sortare dupa prioritate, apoi vechime. Ordinea enum-ului
 * support_prioritate e 'normal' < 'nou' < 'urgent', deci descending da
 * urgent, nou, normal; in interiorul unei prioritati, cele vechi primele.
 */
export async function getInbox(): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*, restaurant:restaurants(nume)')
    .order('prioritate', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function getFir(ticketId: string): Promise<MesajTicket[]> {
  const { data, error } = await supabase
    .from('support_ticket_mesaje')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

/** Un UPDATE respins de RLS raspunde 200 cu zero randuri, nu cu eroare. */
function confirmaScriere(randuri: Array<{ id: string }> | null, mesaj: string) {
  if (!randuri?.length) throw new Error(mesaj)
}

export async function raspunde(
  ticketId: string,
  autor: string,
  continut: string,
  notaInterna: boolean,
): Promise<void> {
  const { data, error } = await supabase
    .from('support_ticket_mesaje')
    .insert({
      ticket_id: ticketId,
      autor,
      continut,
      de_la_echipa: true,
      nota_interna: notaInterna,
    })
    .select('id')
  if (error) throw error
  confirmaScriere(data, 'Mesajul nu a fost trimis: contul tau nu e in echipa de suport.')
}

export async function schimbaTicket(
  ticketId: string,
  modificari: Partial<Pick<Tables<'support_tickets'>, 'status' | 'prioritate'>>,
): Promise<void> {
  const { data, error } = await supabase
    .from('support_tickets')
    .update(modificari)
    .eq('id', ticketId)
    .select('id')
  if (error) throw error
  confirmaScriere(data, 'Tichetul nu s-a schimbat: doar echipa de suport ii schimba starea.')
}

// ── Sabloanele de raspuns rapid (§46.2) ────────────────────────────────────

export async function getSabloane(): Promise<SablonRaspuns[]> {
  const { data, error } = await supabase
    .from('support_response_templates')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function creeazaSablon(
  titlu: string,
  continut: string,
  /** null = global, pentru toata echipa (§46.2). */
  operatorId: string | null,
): Promise<void> {
  const { data, error } = await supabase
    .from('support_response_templates')
    .insert({ titlu, continut, super_admin_user_id: operatorId })
    .select('id')
  if (error) throw error
  confirmaScriere(data, 'Sablonul nu a fost salvat: contul tau nu e in echipa de suport.')
}

export async function stergeSablon(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('support_response_templates')
    .delete()
    .eq('id', id)
    .select('id')
  if (error) throw error
  confirmaScriere(data, 'Sablonul nu a fost sters: globalele se sterg doar de rolul super_admin.')
}

// ── Partea restaurantului (§46.1: tichete din dashboard-ul Admin-ilor) ─────

export type TicketRestaurant = Tables<'support_tickets'>

export async function getTicketeRestaurant(restaurantId: string): Promise<TicketRestaurant[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function deschideTicket(
  restaurantId: string,
  deschisDe: string,
  subiect: string,
  primulMesaj: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('support_tickets')
    .insert({ restaurant_id: restaurantId, deschis_de: deschisDe, subiect })
    .select('id')
    .single()
  if (error) throw error

  const { data: mesaj, error: eroareMesaj } = await supabase
    .from('support_ticket_mesaje')
    .insert({ ticket_id: data.id, autor: deschisDe, continut: primulMesaj })
    .select('id')
  if (eroareMesaj) throw eroareMesaj
  confirmaScriere(mesaj, 'Tichetul s-a deschis, dar mesajul nu s-a salvat. Scrie-l in conversatie.')
}

export async function raspundeCaRestaurant(
  ticketId: string,
  autor: string,
  continut: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('support_ticket_mesaje')
    .insert({ ticket_id: ticketId, autor, continut })
    .select('id')
  if (error) throw error
  confirmaScriere(data, 'Mesajul nu a fost trimis: doar managerul scrie in tichetele restaurantului.')
}
