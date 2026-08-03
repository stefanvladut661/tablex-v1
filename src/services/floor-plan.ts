import { supabase } from '@/lib/supabase'
import type { Enums, Tables, TablesUpdate } from '@/types/database'

export type CerereFloorPlan = Tables<'floor_plan_requests'>
export type StatusCerere = Enums<'fp_request_status'>

export const CHEI_FP = {
  cereriRestaurant: (restaurantId: string) => ['floor-plan', 'cereri', restaurantId] as const,
  /** Queue: doar cererile noi, cele pe care nu le-a atins inca nimeni. */
  queue: ['floor-plan', 'queue'] as const,
  /** Projects: cererile preluate — in lucru, publicate sau respinse. */
  proiecte: ['floor-plan', 'proiecte'] as const,
  /**
   * Contactele se cer pentru exact lista de restaurante afisata, deci cheia
   * trebuie sa contina lista. Sortarea o face stabila: aceleasi restaurante in
   * alta ordine inseamna acelasi raspuns, nu inca o cerere in retea.
   */
  contacte: (restaurantIds: string[]) =>
    ['floor-plan', 'contacte', [...restaurantIds].sort().join(',')] as const,
  schita: (cale: string) => ['floor-plan', 'schita', cale] as const,
}

/**
 * Cererile restaurantului curent. RLS le filtreaza oricum pe restaurant, dar
 * pastram filtrul explicit: e si documentatie, si foloseste indexul.
 *
 * ai_rezultat NU se selecteaza: e instrument intern al echipei (§14) si nu
 * trebuie sa ajunga nici accidental in bundle-ul restaurantului.
 *
 * motiv_respingere, in schimb, se selecteaza anume: e scris pentru Adminul care
 * a trimis cererea (vezi comentariul coloanei, migratia 20260908090000). Fara el
 * aici, respingerea ar ramane un refuz fara explicatie — exact lucrul pe care
 * migratia il facea imposibil in baza.
 */
export async function getCereriRestaurant(restaurantId: string): Promise<CerereFloorPlan[]> {
  const { data, error } = await supabase
    .from('floor_plan_requests')
    .select(
      'id, restaurant_id, zone_nume, descriere, status, schita_image_url, motiv_respingere, created_at, updated_at',
    )
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as CerereFloorPlan[]
}

export type CerereNoua = {
  restaurantId: string
  zoneNume: string
  descriere?: string | null
  /** Calea din bucket-ul privat, nu un URL (vezi incarcaSchita). */
  schitaCale?: string | null
}

export async function creeazaCerere(cerere: CerereNoua): Promise<CerereFloorPlan> {
  const { data, error } = await supabase
    .from('floor_plan_requests')
    .insert({
      restaurant_id: cerere.restaurantId,
      zone_nume: cerere.zoneNume.trim(),
      descriere: cerere.descriere?.trim() || null,
      schita_image_url: cerere.schitaCale ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

/**
 * In listele echipei cererea nu inseamna nimic fara restaurantul care a
 * trimis-o: planul se deseneaza pentru o sala anume. De aceea aici imbinam
 * numele, spre deosebire de lista restaurantului, unde e evident al cui e.
 *
 * setup_floor_plan_platit vine tot de aici pentru coloana „status plată" din
 * Projects: taxa de setup e a restaurantului, nu a cererii — un restaurant care
 * a platit-o o data nu o plateste la fiecare zona noua.
 */
export type CerereCuRestaurant = CerereFloorPlan & {
  restaurant: { nume: string; slug: string; setup_floor_plan_platit: boolean } | null
}

/**
 * Coloanele se scriu una cate una, nu `*`: ai_rezultat e geometria intreaga
 * produsa de Best Guess, un jsonb de ordinul zecilor de kiloocteti pe rand, si
 * nu se afiseaza nicaieri in cele doua tabele — se citeste o singura data, in
 * editor (services/studio-ai.ts). Cu `*`, deschiderea paginii ar trage planurile
 * complete ale tuturor proiectelor din istoric, ca sa afiseze o data si un nume.
 */
const SELECT_CERERE_ECHIPA =
  'id, restaurant_id, zone_nume, descriere, status, schita_image_url, motiv_respingere, preluat_la, publicat_la, created_at, updated_at, restaurant:restaurants(nume, slug, setup_floor_plan_platit)'

/**
 * Queue (§9.2.2, tab 1): DOAR cererile noi, cele mai vechi primele.
 *
 * Filtrul pe pending nu e cosmetic — el e tot rostul sectiunii: o cerere
 * preluata nu mai are nevoie de recunoastere rapida, ea se urmareste in
 * Projects. Cine preia o cerere o vede disparand de aici, deci lista scurta
 * inseamna mereu „atat a mai ramas de triat".
 */
export async function getCereriNoi(): Promise<CerereCuRestaurant[]> {
  const { data, error } = await supabase
    .from('floor_plan_requests')
    .select(SELECT_CERERE_ECHIPA)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as CerereCuRestaurant[]
}

/**
 * Projects: tot ce a fost preluat de echipa — in lucru, publicat sau respins.
 * Cele mai recent preluate primele; cererile respinse fara sa fi trecut prin
 * lucru nu au preluat_la, deci ordonarea cade pe data solicitarii ca sa nu
 * ajunga aleatoare.
 */
export async function getProiecteCereri(): Promise<CerereCuRestaurant[]> {
  const { data, error } = await supabase
    .from('floor_plan_requests')
    .select(SELECT_CERERE_ECHIPA)
    .in('status', ['in_progress', 'published', 'respins'])
    .order('preluat_la', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as CerereCuRestaurant[]
}

/**
 * Datele omului pe care echipa il suna cand schita nu se intelege.
 *
 * Nu stau pe cerere si nici nu au ce cauta acolo: numele si emailul sunt ale
 * contului de Admin (admin_users), iar telefonul e al restaurantului. Le
 * adunam aici, intr-un singur drum, ca sa nu ceara fiecare rand din tabel
 * propriul lui request.
 */
export type ContactAdmin = {
  restaurantId: string
  nume: string | null
  email: string | null
  telefon: string | null
}

export async function getContacteAdmini(
  restaurantIds: string[],
): Promise<Record<string, ContactAdmin>> {
  const unice = [...new Set(restaurantIds)]
  if (unice.length === 0) return {}

  const [manageri, restaurante] = await Promise.all([
    // Doar managerul: ospatarul nu decide nimic despre planul salii, iar un
    // cont dezactivat nu mai raspunde la telefon.
    supabase
      .from('admin_users')
      .select('restaurant_id, nume, email, created_at')
      .in('restaurant_id', unice)
      .eq('rol', 'manager')
      .eq('activ', true)
      .order('created_at', { ascending: true }),
    supabase.from('restaurants').select('id, telefon_contact').in('id', unice),
  ])
  if (manageri.error) throw manageri.error
  if (restaurante.error) throw restaurante.error

  const contacte: Record<string, ContactAdmin> = {}

  // Pornim de la restaurante, nu de la manageri: un restaurant fara manager
  // activ trebuie sa ramana cu telefonul lui afisat, nu sa dispara din lista
  // de contacte si sa lase randul gol.
  for (const restaurant of restaurante.data) {
    contacte[restaurant.id] = {
      restaurantId: restaurant.id,
      nume: null,
      email: null,
      telefon: restaurant.telefon_contact,
    }
  }

  for (const manager of manageri.data) {
    const contact = contacte[manager.restaurant_id]
    // Un restaurant poate avea mai multi manageri (§20.1 nu-i limiteaza la
    // unul). Il pastram pe cel mai vechi — de obicei proprietarul, cel care a
    // deschis contul si a trimis cererea.
    if (!contact || contact.nume !== null || contact.email !== null) continue
    contact.nume = manager.nume
    contact.email = manager.email
  }

  return contacte
}

/**
 * Un UPDATE respins de RLS raspunde 200 cu ZERO randuri, nu cu eroare: fara
 * `.select('id')` si numaratoarea de mai jos, interfata ar anunta „preluat" si
 * cererea ar ramane pe loc.
 */
async function scrieCerere(
  id: string,
  modificari: TablesUpdate<'floor_plan_requests'>,
): Promise<void> {
  const { data, error } = await supabase
    .from('floor_plan_requests')
    .update(modificari)
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data?.length) {
    throw new Error('Cererea nu a fost modificată: contul tău nu are acest drept.')
  }
}

/**
 * Cele trei tranzitii sunt functii separate, nu un singur `schimbaStatus`, ca
 * respingerea sa nu poata fi ceruta fara motiv nici din cod. Datele (preluat_la,
 * publicat_la) nu se trimit de aici: le stampileaza trigger-ul din migratia
 * 20260908090000, deci nu pot fi nici uitate, nici falsificate.
 */
export async function preiaCerere(id: string): Promise<void> {
  await scrieCerere(id, { status: 'in_progress' })
}

export async function publicaCerere(id: string): Promise<void> {
  await scrieCerere(id, { status: 'published' })
}

export async function respingeCerere(id: string, motiv: string): Promise<void> {
  const curatat = motiv.trim()
  // Baza refuza oricum respingerea fara motiv (P0001), dar mesajul de acolo e
  // ultima plasa de siguranta; aici oprim drumul inutil pana la server.
  if (!curatat) {
    throw new Error('Respingerea cere un motiv scris: Adminul trebuie să știe ce să corecteze.')
  }
  await scrieCerere(id, { status: 'respins', motiv_respingere: curatat })
}

/**
 * Schitele stau intr-un bucket PRIVAT, izolat pe folder: prima parte a caii e
 * restaurant_id, iar politicile din storage compara acel folder cu
 * current_restaurant_id(). Deci calea nu e un secret — accesul e verificat pe
 * server, nu obscurizat.
 *
 * In coloana schita_image_url salvam CALEA, nu un URL: URL-urile semnate expira,
 * deci un URL stocat ar deveni inutil. Se semneaza la afisare.
 */
const BUCKET_SCHITE = 'schite'

export async function incarcaSchita(restaurantId: string, fisier: File): Promise<string> {
  const extensie = fisier.name.split('.').pop()?.toLowerCase() ?? 'png'
  const cale = `${restaurantId}/${crypto.randomUUID()}.${extensie}`

  const { error } = await supabase.storage.from(BUCKET_SCHITE).upload(cale, fisier, {
    contentType: fisier.type || undefined,
    upsert: false,
  })
  if (error) throw error
  return cale
}

/** URL temporar pentru afisare; valabil o ora. */
export async function urlSchita(cale: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET_SCHITE)
    .createSignedUrl(cale, 60 * 60)
  if (error) {
    console.warn('Nu am putut semna URL-ul schitei:', error)
    return null
  }
  return data.signedUrl
}
