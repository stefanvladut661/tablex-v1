import { formatFus } from '@/lib/timp'
import type { Json } from '@/types/database'

/**
 * restaurants.program_standard e un jsonb cu cheile zilelor in romana:
 *   { "luni": {"deschis": true, "de_la": "10:00", "pana_la": "23:00"}, ... }
 * Aici il traducem in ore zecimale pentru grila de calendar. Fallback-ul
 * (10:00–24:00) se aplica doar daca jsonb-ul nu are forma asteptata.
 */

const ZILE = ['duminica', 'luni', 'marti', 'miercuri', 'joi', 'vineri', 'sambata'] as const

export type IntervalProgram = {
  deschis: boolean
  deLa: number
  panaLa: number
}

const IMPLICIT: IntervalProgram = { deschis: true, deLa: 10, panaLa: 24 }

function oraZecimalaDinText(text: unknown, implicit: number): number {
  if (typeof text !== 'string') return implicit
  const [ore, minute] = text.split(':').map(Number)
  if (Number.isNaN(ore)) return implicit
  const valoare = ore + (minute || 0) / 60
  // "23:59" inseamna practic pana la miezul nopții; rotunjim ca sa nu rămână
  // un rand de un minut in grila.
  return valoare > 23.9 ? 24 : valoare
}

export function programZilei(zi: Date, programStandard: Json, fus: string): IntervalProgram {
  const indexZi = Number(formatFus(zi, 'i', fus)) % 7 // 'i' = 1 (luni) .. 7 (duminica)
  const cheie = ZILE[indexZi]

  if (!programStandard || typeof programStandard !== 'object' || Array.isArray(programStandard)) {
    return IMPLICIT
  }

  const zilnic = (programStandard as Record<string, unknown>)[cheie]
  if (!zilnic || typeof zilnic !== 'object') return IMPLICIT

  const date = zilnic as Record<string, unknown>
  const deLa = oraZecimalaDinText(date.de_la, IMPLICIT.deLa)
  const panaLa = oraZecimalaDinText(date.pana_la, IMPLICIT.panaLa)

  return {
    deschis: date.deschis !== false,
    deLa: Math.min(deLa, panaLa),
    // Cel putin doua ore de grila, ca sa nu iasa un calendar degenerat.
    panaLa: Math.max(panaLa, deLa + 2),
  }
}
