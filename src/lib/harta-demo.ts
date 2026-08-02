import type {
  ElementStructura,
  MasaHarta,
  StatusuriMese,
  ZonaHarta,
} from '@/types/floor-plan'

/**
 * Date de demonstratie pentru harta 2D. Coordonatele respecta exact schema
 * reala (zones.canvas_*, tables.pozitie_*, floor_plan_layers.continut), ca
 * viewer-ul sa fie testat pe aceeasi forma de date pe care o va primi din DB.
 */

type FormaMasa = MasaHarta['forma']

let contor = 0

function masa(
  numar: string,
  x: number,
  y: number,
  opt: {
    capacitate?: number
    forma?: FormaMasa
    latime?: number
    inaltime?: number
    rotatie?: number
    indisponibila?: boolean
    grup?: string | null
  } = {},
): MasaHarta {
  const rotunda = (opt.forma ?? 'rotunda') === 'rotunda'
  return {
    id: `demo-masa-${++contor}`,
    numar_masa: numar,
    capacitate: opt.capacitate ?? 4,
    forma: opt.forma ?? 'rotunda',
    pozitie_x: x,
    pozitie_y: y,
    latime: opt.latime ?? (rotunda ? 84 : 130),
    inaltime: opt.inaltime ?? (rotunda ? 84 : 74),
    rotatie: opt.rotatie ?? 0,
    activa: true,
    indisponibila: opt.indisponibila ?? false,
    grup_unire_id: opt.grup ?? null,
  }
}

export const ZONE_DEMO: ZonaHarta[] = [
  { id: 'demo-salon', nume: 'Salon interior', canvas_latime: 1200, canvas_inaltime: 800, grid_marime: 20 },
  { id: 'demo-terasa', nume: 'Terasă', canvas_latime: 1000, canvas_inaltime: 700, grid_marime: 20 },
]

const PERETI_SALON: ElementStructura[] = [
  { tip: 'perete', x: 0, y: 0, latime: 1200, inaltime: 14 },
  { tip: 'perete', x: 0, y: 786, latime: 1200, inaltime: 14 },
  { tip: 'perete', x: 0, y: 0, latime: 14, inaltime: 800 },
  { tip: 'perete', x: 1186, y: 0, latime: 14, inaltime: 800 },
]

export const STRUCTURA_DEMO: Record<string, ElementStructura[]> = {
  'demo-salon': [
    ...PERETI_SALON,
    { tip: 'bar', x: 60, y: 50, latime: 340, inaltime: 74, eticheta: 'Bar', z: 1 },
    { tip: 'bucatarie', x: 960, y: 40, latime: 200, inaltime: 150, eticheta: 'Bucătărie', z: 1 },
    { tip: 'vip', x: 880, y: 540, latime: 280, inaltime: 220, eticheta: 'Zona VIP', z: 0 },
    { tip: 'dj', x: 60, y: 660, latime: 130, inaltime: 100, eticheta: 'DJ', z: 1 },
    { tip: 'intrare', x: 520, y: 740, latime: 160, inaltime: 46, eticheta: 'Intrare', z: 1 },
    { tip: 'usa', x: 960, y: 200, latime: 90, inaltime: 14, z: 1 },
    { tip: 'planta', x: 440, y: 60, latime: 44, inaltime: 44, z: 2 },
    { tip: 'planta', x: 760, y: 700, latime: 44, inaltime: 44, z: 2 },
    { tip: 'planta', x: 250, y: 700, latime: 44, inaltime: 44, z: 2 },
  ],
  'demo-terasa': [
    { tip: 'perete', x: 0, y: 0, latime: 1000, inaltime: 14 },
    { tip: 'perete', x: 0, y: 0, latime: 14, inaltime: 700 },
    { tip: 'piscina', x: 560, y: 300, latime: 320, inaltime: 220, eticheta: 'Piscină', z: 0 },
    { tip: 'bar', x: 80, y: 40, latime: 260, inaltime: 66, eticheta: 'Bar terasă', z: 1 },
    { tip: 'intrare', x: 40, y: 620, latime: 150, inaltime: 44, eticheta: 'Acces salon', z: 1 },
    { tip: 'planta', x: 500, y: 80, latime: 46, inaltime: 46, z: 2 },
    { tip: 'planta', x: 900, y: 120, latime: 46, inaltime: 46, z: 2 },
    { tip: 'planta', x: 480, y: 580, latime: 46, inaltime: 46, z: 2 },
    { tip: 'planta', x: 920, y: 600, latime: 46, inaltime: 46, z: 2 },
  ],
}

export const MESE_DEMO: Record<string, MasaHarta[]> = {
  'demo-salon': [
    masa('1', 110, 230, { capacitate: 2, latime: 70, inaltime: 70 }),
    masa('2', 280, 230),
    masa('3', 450, 230),
    masa('4', 620, 230),
    masa('5', 110, 380),
    masa('6', 280, 380, { capacitate: 6, forma: 'dreptunghiulara' }),
    masa('7', 450, 380),
    masa('8', 620, 380, { capacitate: 2, latime: 70, inaltime: 70 }),
    masa('9', 110, 530, { forma: 'patrata', latime: 90, inaltime: 90 }),
    masa('10', 280, 530),
    masa('11', 450, 530, { capacitate: 6, forma: 'dreptunghiulara' }),
    masa('12', 700, 480, { capacitate: 8, forma: 'dreptunghiulara', latime: 150, inaltime: 84, rotatie: 90 }),
    // Doua mese unite pentru un grup mare (§28.6).
    masa('V1', 920, 590, { capacitate: 6, forma: 'dreptunghiulara', grup: 'demo-grup-vip' }),
    masa('V2', 920, 672, { capacitate: 6, forma: 'dreptunghiulara', grup: 'demo-grup-vip' }),
    masa('13', 1040, 300, { capacitate: 2, latime: 70, inaltime: 70, indisponibila: true }),
  ],
  'demo-terasa': [
    masa('T1', 100, 180),
    masa('T2', 260, 180),
    masa('T3', 420, 180, { capacitate: 2, latime: 70, inaltime: 70 }),
    masa('T4', 100, 340, { capacitate: 6, forma: 'dreptunghiulara' }),
    masa('T5', 280, 360),
    masa('T6', 100, 500),
    masa('T7', 280, 500, { capacitate: 2, latime: 70, inaltime: 70 }),
    masa('T8', 700, 120, { capacitate: 8, forma: 'dreptunghiulara', latime: 160 }),
  ],
}

/** Ora exprimata zecimal (19.5 = 19:30), ca sa fie simplu de comparat. */
type RezervareDemo = {
  masa: string
  de_la: number
  pana_la: number
  eveniment?: boolean
}

const REZERVARI_DEMO: RezervareDemo[] = [
  { masa: '2', de_la: 18, pana_la: 20 },
  { masa: '3', de_la: 19, pana_la: 21 },
  { masa: '6', de_la: 12, pana_la: 14 },
  { masa: '6', de_la: 19.5, pana_la: 21.5 },
  { masa: '7', de_la: 20, pana_la: 22 },
  { masa: '10', de_la: 13, pana_la: 15 },
  { masa: '11', de_la: 18.5, pana_la: 20.5 },
  { masa: '12', de_la: 19, pana_la: 23, eveniment: true },
  { masa: 'V1', de_la: 20, pana_la: 23, eveniment: true },
  { masa: 'V2', de_la: 20, pana_la: 23, eveniment: true },
  { masa: 'T2', de_la: 19, pana_la: 21 },
  { masa: 'T4', de_la: 20, pana_la: 22 },
  { masa: 'T8', de_la: 18, pana_la: 20 },
]

/** Pragul "se elibereaza in curand" din §7.4: 20 de minute. */
const PRAG_EXPIRARE_ORE = 20 / 60

/**
 * Reconstruieste statusurile pentru un moment dat — exact modelul din
 * migratia floor_plan: culoarea unei mese e o functie de timp, nu o coloana.
 */
export function statusuriLaOra(ora: number, zonaId: string): StatusuriMese {
  const mese = MESE_DEMO[zonaId] ?? []
  const dupaNumar = new Map(mese.map((m) => [m.numar_masa, m.id]))
  const statusuri: StatusuriMese = {}

  for (const rezervare of REZERVARI_DEMO) {
    const id = dupaNumar.get(rezervare.masa)
    if (!id) continue
    if (ora < rezervare.de_la || ora >= rezervare.pana_la) continue

    statusuri[id] = rezervare.eveniment
      ? 'eveniment'
      : rezervare.pana_la - ora <= PRAG_EXPIRARE_ORE
        ? 'expirare'
        : 'ocupat'
  }

  return statusuri
}

export function formateazaOra(ora: number): string {
  const h = Math.floor(ora)
  const m = Math.round((ora - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
