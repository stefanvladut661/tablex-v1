import { supabase } from '@/lib/supabase'

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

/** §41.3 — acelasi apel si pentru prima generare, si pentru „Reincearca":
 *  rezultatul anterior se suprascrie complet. */
export async function genereazaPlanAI(cerereId: string): Promise<RezultatGenerareAI> {
  const { data, error } = await supabase.functions.invoke('genereaza-plan-ai', {
    body: { cerere_id: cerereId },
  })
  if (error) throw new Error('Generarea AI a esuat. Incearca din nou.')
  if (data?.eroare) throw new Error(data.eroare)
  if (data?.ok) return { ok: true, elemente: data.elemente ?? 0, mese: data.mese ?? 0 }
  return { ok: false, simulat: data?.simulat, motiv: data?.motiv ?? 'Generarea nu a rulat.' }
}
