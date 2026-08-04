import { supabase } from '@/lib/supabase'
import type { ElementStructura } from '@/types/floor-plan'

/**
 * Generarea Automata AI (§9.2.2 pasul 1, §41.3) — SERVICIU SEPARAT de
 * floor-plan.ts, cu intentie: acela e folosit si de portalul Admin si evita
 * deliberat coloana ai_rezultat. Tot ce tine de AI sta aici si se importa
 * DOAR din paginile echipei. Functia Edge oricum refuza pe oricine nu e
 * super_admin deplin sau designer_architect.
 */

export type RezultatGenerareAI =
  | { ok: true; elemente: number; mese: number }
  | { ok: false; simulat?: boolean; motiv: string }

export type MasaEstimataAI = {
  forma: string
  x: number
  y: number
  latime: number
  inaltime: number
  capacitate: number
}

export type RezultatAI = {
  structura: ElementStructura[]
  mese: MasaEstimataAI[]
}

export type CerereStudio = {
  id: string
  zone_nume: string
  schita_image_url: string | null
  ai_rezultat: RezultatAI | null
  ai_generat_la: string | null
}

export const CHEI_STUDIO_AI = {
  cerere: (restaurantId: string) => ['studio-ai', 'cerere', restaurantId] as const,
}

/**
 * Cea mai recenta cerere ACTIVA a restaurantului. Pe ea se ancoreaza tot
 * builderul: ZONA la care se lucreaza (`zone_nume`), fundalul-schita si Best
 * Guess-ul (§42.5). Aici e SINGURUL loc din client care citeste ai_rezultat.
 *
 * Filtrul „numai cu schita" a fost SCOS deliberat: din el se alegea zona, iar o
 * cerere fara schita (schita e optionala la trimitere) ar fi trimis builderul sa
 * deseneze alta sala decat cea ceruta ultima data. Mai bine o cerere fara schita
 * de calc — atunci nu se afiseaza fundalul si nici generarea AI, ceea ce e
 * corect: nu exista ce genera.
 */
export async function getCerereStudio(restaurantId: string): Promise<CerereStudio | null> {
  const { data, error } = await supabase
    .from('floor_plan_requests')
    .select('id, zone_nume, schita_image_url, ai_rezultat, ai_generat_la')
    .eq('restaurant_id', restaurantId)
    .in('status', ['pending', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    ...data,
    ai_rezultat: (data.ai_rezultat as unknown as RezultatAI | null) ?? null,
  }
}

/** §41.3 — acelasi apel si pentru prima generare, si pentru „Reincearca":
 *  rezultatul anterior se suprascrie complet. */
export async function genereazaPlanAI(cerereId: string): Promise<RezultatGenerareAI> {
  const { data, error } = await supabase.functions.invoke('genereaza-plan-ai', {
    body: { cerere_id: cerereId },
  })
  if (error) throw new Error('Generarea AI a eșuat. Încearcă din nou.')
  if (data?.eroare) throw new Error(data.eroare)
  if (data?.ok) return { ok: true, elemente: data.elemente ?? 0, mese: data.mese ?? 0 }
  return { ok: false, simulat: data?.simulat, motiv: data?.motiv ?? 'Generarea nu a rulat.' }
}
