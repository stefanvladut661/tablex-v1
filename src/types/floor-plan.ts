import type { Tables } from '@/types/database'

/**
 * Statusul unei mese NU exista in baza de date (vezi comentariul din
 * migratia floor_plan): e o functie de timp, calculata din table_allocations.
 * Harta primeste asadar un dictionar de statusuri pentru un moment dat.
 */
export type StatusMasa = 'liber' | 'ocupat' | 'expirare' | 'eveniment' | 'inactiv'

export type StatusuriMese = Record<string, StatusMasa>

/** Tipurile de element din Layer 1 (continut jsonb al floor_plan_layers). */
export type TipStructura =
  | 'perete'
  | 'usa'
  | 'bar'
  | 'dj'
  | 'vip'
  | 'intrare'
  | 'bucatarie'
  | 'planta'
  | 'piscina'

/** Forma unui element Layer 1, exact cum e documentata in migratie. */
export type ElementStructura = {
  tip: TipStructura
  x: number
  y: number
  latime: number
  inaltime: number
  rotatie?: number
  /** Pentru pereti in linie franta: puncte absolute in coordonatele canvasului. */
  puncte?: Array<[number, number]>
  eticheta?: string
  z?: number
}

/** Doar coloanele de care are nevoie randarea; restul nu intra in componenta. */
export type MasaHarta = Pick<
  Tables<'tables'>,
  | 'id'
  | 'numar_masa'
  | 'capacitate'
  | 'forma'
  | 'pozitie_x'
  | 'pozitie_y'
  | 'latime'
  | 'inaltime'
  | 'rotatie'
  | 'activa'
  | 'indisponibila'
  | 'grup_unire_id'
>

export type ZonaHarta = Pick<
  Tables<'zones'>,
  'id' | 'nume' | 'canvas_latime' | 'canvas_inaltime' | 'grid_marime'
> & {
  /**
   * Incadrarea fixata de echipa TableX (§9.2.2). Optionala in tip fiindca
   * datele demo si zonele vechi nu o poarta — atunci planul se afiseaza la
   * scara 1, adica exact cum a fost desenat.
   */
  zoom_implicit?: number
}

export const ETICHETE_STATUS: Record<StatusMasa, string> = {
  liber: 'Libera',
  ocupat: 'Ocupata',
  expirare: 'Se elibereaza',
  eveniment: 'Eveniment',
  inactiv: 'Indisponibila',
}
