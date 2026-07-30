import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ro } from 'date-fns/locale'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'

/**
 * Toate datele din baza sunt timestamptz, adica instante absolute. Dar "ziua
 * de lucru" si bara orara (§28.12) sunt concepte LOCALE restaurantului, cu
 * fusul lui (restaurants.fus_orar). Orice grupare pe zi trece prin functiile
 * de aici, ca sa nu apara diferente de o zi pentru restaurantele care lucreaza
 * pana dupa miezul nopții.
 *
 * Convenția: un parametru numit "zi" e o Date care reprezinta o zi CALENDARISTICA
 * in fusul restaurantului (ora din ea e irelevanta); ce se trimite spre baza de
 * date sunt mereu instante absolute.
 */

const LUNI_CA_PRIMA_ZI = { weekStartsOn: 1 } as const

/** Instantul absolut al miezului nopții local, pentru ziua data. */
export function inceputZi(zi: Date, fus: string): Date {
  return fromZonedTime(startOfDay(toZonedTime(zi, fus)), fus)
}

export function sfarsitZi(zi: Date, fus: string): Date {
  return inceputZi(addDays(zi, 1), fus)
}

export function inceputSaptamana(zi: Date, fus: string): Date {
  return inceputZi(startOfWeek(toZonedTime(zi, fus), LUNI_CA_PRIMA_ZI), fus)
}

export function sfarsitSaptamana(zi: Date, fus: string): Date {
  return inceputZi(addDays(endOfWeek(toZonedTime(zi, fus), LUNI_CA_PRIMA_ZI), 1), fus)
}

/** Cele 7 zile ale saptamanii care contine ziua data. */
export function zileleSaptamanii(zi: Date, fus: string): Date[] {
  const local = toZonedTime(zi, fus)
  const start = startOfWeek(local, LUNI_CA_PRIMA_ZI)
  return eachDayOfInterval({ start, end: addDays(start, 6) })
}

/**
 * Grila lunii: incepe luni si acopera saptamani intregi, deci include si zile
 * din lunile vecine (afisate estompat).
 */
export function grilaLunii(zi: Date, fus: string): Date[] {
  const local = toZonedTime(zi, fus)
  const start = startOfWeek(startOfMonth(local), LUNI_CA_PRIMA_ZI)
  const end = endOfWeek(endOfMonth(local), LUNI_CA_PRIMA_ZI)
  return eachDayOfInterval({ start, end })
}

export function inceputLuna(zi: Date, fus: string): Date {
  return inceputZi(startOfMonth(toZonedTime(zi, fus)), fus)
}

export function sfarsitLuna(zi: Date, fus: string): Date {
  return inceputZi(addDays(endOfMonth(toZonedTime(zi, fus)), 1), fus)
}

/** Ora locala ca numar zecimal (19:30 → 19.5), pentru poziționarea pe grila. */
export function oraZecimala(instant: string | Date, fus: string): number {
  const ore = Number(formatInTimeZone(new Date(instant), fus, 'H'))
  const minute = Number(formatInTimeZone(new Date(instant), fus, 'm'))
  return ore + minute / 60
}

export function formatFus(instant: string | Date, sablon: string, fus: string): string {
  return formatInTimeZone(new Date(instant), fus, sablon, { locale: ro })
}

export function ora(instant: string | Date, fus: string): string {
  return formatFus(instant, 'HH:mm', fus)
}

/** "marti, 4 august 2026" */
export function etichetaZi(zi: Date, fus: string): string {
  return formatFus(zi, 'EEEE, d MMMM yyyy', fus)
}

export function etichetaLuna(zi: Date, fus: string): string {
  return formatFus(zi, 'LLLL yyyy', fus)
}

/** Construieste instantul absolut pentru o zi locala + ora "HH:mm". */
export function instantDinZiSiOra(zi: Date, oraText: string, fus: string): Date {
  const [ore, minute] = oraText.split(':').map(Number)
  const local = startOfDay(toZonedTime(zi, fus))
  local.setHours(ore || 0, minute || 0, 0, 0)
  return fromZonedTime(local, fus)
}

/** Ziua locala (ca Date) in care cade un instant. */
export function ziLocala(instant: string | Date, fus: string): Date {
  return startOfDay(toZonedTime(new Date(instant), fus))
}

export { addDays, addMonths, isSameDay, isSameMonth, toZonedTime }
