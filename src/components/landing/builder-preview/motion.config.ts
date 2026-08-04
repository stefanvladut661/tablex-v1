/**
 * Configul timpilor și constantelor pentru animația Builder Drag & Drop.
 * O singură sursă de adevăr pentru bătăile timeline-ului, ca în hero/motion.config.ts.
 */

import type { MasaHarta } from '@/types/floor-plan'

export const EASE = {
  /** expo out — mișcări mari (tragerea mesei) */
  expo: [0.16, 1, 0.3, 1],
  /** in-out — rotații netede */
  inOut: [0.65, 0, 0.35, 1],
} as const

/**
 * Toate bătăile secvenței, în secunde. t=0 = mount-ul componentei.
 * Buclă totală: ~8.3s.
 */
export const TIMELINE = {
  idle: { fade_in: 0.3 },
  grab_and_place: {
    cursor_to_palette: 0.25,
    table_appear: 0.3,
    drag_start: 0.55,
    drag_end: 1.3,
    settle_bounce: 1.45,
  },
  add_chairs: {
    chip_fade_in: 1.6,
    click_1: 2.0,
    click_2: 2.4,
    click_3: 2.8,
    chip_fade_out: 3.4,
  },
  rotate: {
    handle_appear: 3.4,
    rotate_end: 4.6,
  },
  drag_to_join: {
    cursor_to_table: 4.6,
    drag_start: 4.85,
    drag_end: 5.5,
    join_chip_fade_in: 5.5,
    click: 6.0,
    pulse_end: 6.4,
  },
  hold: { until: 7.6 },
  reset: { duration: 0.7, at: 7.6 },
} as const

/** Dimensiunile canvasului SVG. ViewBox aspect TREBUIE să fie exact 3/2. */
export const CANVAS = {
  latime: 600,
  inaltime: 400,
  grid_marime: 20,
} as const

/** Palette (stânga): dimensiunile regiunii din care se trage masa demo. */
export const PALETTE = {
  x: 30,
  y: 150,
  latime: 100,
  inaltime: 100,
} as const

/**
 * Masa A (statică, pe canvasul principal). Rotundă, 4 locuri, neatinsă.
 * Forma reală MasaHarta — se randează prin <Masa>.
 */
export function masaA(): MasaHarta {
  return {
    id: 'masa-a-demo',
    numar_masa: 1 as any,
    capacitate: 4,
    forma: 'rotunda' as const,
    pozitie_x: 420,
    pozitie_y: 160,
    latime: 80,
    inaltime: 80,
    rotatie: 0 as any,
    activa: true,
    indisponibila: false,
    grup_unire_id: null,
  }
}

/**
 * Masa B (animată, construită pe ecran). Inițial din paletă,
 * apoi mutată și transformată. ReactiveState cere o fabrică, nu o constantă,
 * ca să resetul să pot crea referințe noi.
 */
export function masaB(
  config: Partial<MasaHarta> = {}
): MasaHarta {
  return {
    id: 'masa-b-demo',
    numar_masa: 2 as any,
    capacitate: 2,
    forma: 'rotunda' as const,
    pozitie_x: 50,
    pozitie_y: 160,
    latime: 80,
    inaltime: 80,
    rotatie: 0 as any,
    activa: true,
    indisponibila: false,
    grup_unire_id: null,
    ...config,
  }
}
