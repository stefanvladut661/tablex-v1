/**
 * Geometria scaunelor din jurul unei mese.
 *
 * Specificatia cere acelasi lucru in patru locuri (§8.4, §9.2.2, §28.5, §42.7):
 * scaunele se GENEREAZA din capacitate si se distanteaza automat in jurul
 * mesei, in vedere de sus. Pana acum harta desena doar forma si textul „6 loc.",
 * adica exact numarul, dar nu si sala.
 *
 * Calculul sta separat de componenta fiindca aici greseala e INVIZIBILA: nimic
 * nu arunca eroare daca doua scaune se suprapun sau daca un scaun cade in
 * mijlocul mesei. Se vede doar cu ochiul, pe planul unui restaurant, tarziu.
 */

import type { Enums } from '@/types/database'

/** Legat de enum-ul din baza: o forma noua de masa trebuie sa treaca si pe aici. */
export type FormaMasa = Enums<'masa_forma'>

export type MasaCuScaune = {
  latime: number
  inaltime: number
  capacitate: number
  forma: FormaMasa
}

/**
 * Un scaun in coordonatele LOCALE ale mesei: originea e coltul din stanga-sus,
 * exact sistemul din `<g transform="translate(pozitie_x pozitie_y)">`. Asa
 * rotatia mesei duce scaunele cu ea, fara niciun calcul in plus.
 */
export type Scaun = {
  x: number
  y: number
  /**
   * Grade, in conventia SVG (0 = spre dreapta, 90 = in JOS, fiindca axa y creste
   * in jos): directia dinspre masa catre scaun. Spatarul se deseneaza pe partea
   * asta, deci sezutul ramane orientat spre masa.
   */
  unghi: number
}

export type GeometrieScaune = {
  /** Raza sezutului; spatarul si grosimea liniei se scaleaza dupa ea. */
  raza: number
  scaune: Scaun[]
}

/**
 * Plafonul de DESEN, nu de capacitate. §17.4 pune limita implicita la 12 scaune
 * pe masa (`restaurants.max_scaune_masa`), dar un restaurant si-o poate ridica
 * din config. Desenul se opreste oricum la 12: peste atat silueta devine un
 * colier de cercuri lipite din care nu mai numeri nimic, iar numarul exact de
 * locuri e oricum scris pe masa, in text. Mai bine o silueta lizibila plus o
 * cifra exacta decat o pata de cercuri.
 */
export const MAXIM_SCAUNE_DESENATE = 12

/** Scaunul are dimensiune aproape fixa: un scaun real nu creste cu masa. */
const RAZA_MINIMA = 6
const RAZA_MAXIMA = 11
const RAZA_DIN_MASA = 0.11

/** Golul dintre marginea mesei si marginea sezutului. */
const SPATIU_FATA_DE_MASA = 4

/**
 * Cat loc cere un scaun de-a lungul laturii, masurat in raze. 2 raze inseamna
 * cercuri exact lipite; 2.8 lasa aer si, mai important, pastreaza distanta si
 * dupa ce impartirea pe laturi rotunjeste in sus una dintre ele.
 */
const PAS_MINIM_IN_RAZE = 2.8

function limiteaza(valoare: number, minim: number, maxim: number): number {
  return Math.min(Math.max(valoare, minim), maxim)
}

/** Raza sezutului pentru o masa: proportionala, dar limitata la ambele capete. */
export function razaScaun(latime: number, inaltime: number): number {
  return limiteaza(Math.min(latime, inaltime) * RAZA_DIN_MASA, RAZA_MINIMA, RAZA_MAXIMA)
}

/**
 * Cate scaune incap fizic in jurul mesei fara sa se atinga.
 *
 * Nu e acelasi lucru cu plafonul din §17.4: acela e o regula de business, asta e
 * o constatare geometrica. O masa de 40x40 cu 12 locuri e valida in baza, dar pe
 * harta cele 12 cercuri s-ar suprapune.
 */
function scauneCareIncap(masa: MasaCuScaune, raza: number, departare: number): number {
  const { latime, inaltime, forma } = masa

  const perimetru =
    forma === 'rotunda'
      ? // Inelul pe care stau CENTRELE scaunelor. Aproximarea π(a+b) e exacta pe
        // cerc si destul de buna pe elipsele aproape rotunde dintr-o sala.
        Math.PI * (latime / 2 + departare + (inaltime / 2 + departare))
      : // Pe masa dreptunghiulara scaunele se insira pe LATURI, nu pe inelul din
        // jur — colturile raman libere — deci perimetrul util e chiar al mesei.
        2 * (latime + inaltime)

  return Math.max(1, Math.floor(perimetru / (PAS_MINIM_IN_RAZE * raza)))
}

/** Ordinea laturilor peste tot in fisier: sus, dreapta, jos, stanga. */
const SUS = 0
const DREAPTA = 1
const JOS = 2
const STANGA = 3

/**
 * Imparte scaunele pe cele patru laturi, proportional cu lungimea fiecareia
 * (metoda resturilor celor mai mari). Pe modelul proprietarului — masa in
 * picioare, 6 scaune — asta da 1 sus, 1 jos si cate 2 pe laturile lungi; pe o
 * masa culcata de 130x74, acelasi calcul da clasicul 2+2 pe laturile lungi si
 * cate unul la capete.
 */
export function imparteLaturi(numar: number, latime: number, inaltime: number): number[] {
  const greutati = [latime, inaltime, latime, inaltime]
  const total = greutati.reduce((suma, g) => suma + g, 0)
  if (total <= 0) return [numar, 0, 0, 0]

  const cote = greutati.map((g) => (numar * g) / total)
  const peLaturi = cote.map((cota) => Math.floor(cota))
  let ramase = numar - peLaturi.reduce((suma, c) => suma + c, 0)

  // Resturile se dau intai laturii cu fractia cea mai mare. La egalitate
  // (masa patrata) decide ordinea de mai jos: sus si jos inaintea laturilor
  // laterale, fiindca asimetria stanga-dreapta sare in ochi prima.
  const ordine = [SUS, JOS, DREAPTA, STANGA].sort(
    (a, b) => cote[b] - peLaturi[b] - (cote[a] - peLaturi[a]),
  )

  for (let i = 0; ramase > 0; i += 1) {
    peLaturi[ordine[i % ordine.length]] += 1
    ramase -= 1
  }

  return peLaturi
}

function scauneRotunda(masa: MasaCuScaune, numar: number, departare: number): Scaun[] {
  const rx = masa.latime / 2
  const ry = masa.inaltime / 2
  const scaune: Scaun[] = []

  for (let i = 0; i < numar; i += 1) {
    // Pornim din varf (-90°) ca o masa de doi sa aiba scaunele fata in fata pe
    // verticala, cum se aseaza lumea in realitate, nu in diagonala.
    const teta = -Math.PI / 2 + (i * 2 * Math.PI) / numar

    // Departarea se face pe NORMALA elipsei, nu pe raza. Pe cerc cele doua
    // coincid; pe o masa ovala, deplasarea radiala ar lasa scaunele de la
    // capete prea aproape si le-ar si roti gresit.
    const nx = Math.cos(teta) / rx
    const ny = Math.sin(teta) / ry
    const lungime = Math.hypot(nx, ny)

    scaune.push({
      x: rx + rx * Math.cos(teta) + (departare * nx) / lungime,
      y: ry + ry * Math.sin(teta) + (departare * ny) / lungime,
      unghi: (Math.atan2(ny, nx) * 180) / Math.PI,
    })
  }

  return scaune
}

function scauneDreptunghi(masa: MasaCuScaune, numar: number, departare: number): Scaun[] {
  const { latime: w, inaltime: h } = masa
  const peLaturi = imparteLaturi(numar, w, h)

  const laturi = [
    { indice: SUS, unghi: -90, punct: (t: number) => ({ x: t * w, y: -departare }) },
    { indice: DREAPTA, unghi: 0, punct: (t: number) => ({ x: w + departare, y: t * h }) },
    { indice: JOS, unghi: 90, punct: (t: number) => ({ x: t * w, y: h + departare }) },
    { indice: STANGA, unghi: 180, punct: (t: number) => ({ x: -departare, y: t * h }) },
  ]

  const scaune: Scaun[] = []
  for (const latura of laturi) {
    const cate = peLaturi[latura.indice]
    for (let j = 0; j < cate; j += 1) {
      // (j + 0.5) / cate: fiecare scaun sta in mijlocul feliei lui de latura.
      // Asa raman simetrice fata de centru si niciunul nu ajunge in colt.
      const { x, y } = latura.punct((j + 0.5) / cate)
      scaune.push({ x, y, unghi: latura.unghi })
    }
  }

  return scaune
}

export function geometrieScaune(masa: MasaCuScaune): GeometrieScaune {
  const { latime, inaltime, capacitate, forma } = masa

  const dimensiuniValide =
    Number.isFinite(latime) && Number.isFinite(inaltime) && latime > 0 && inaltime > 0
  // Fara dimensiuni nu exista in jurul a ce sa asezam scaunele. Raza intoarsa e
  // cea minima, ca apelantul sa nu trebuiasca sa se apere de NaN.
  if (!dimensiuniValide) return { raza: RAZA_MINIMA, scaune: [] }

  const raza = razaScaun(latime, inaltime)
  const departare = raza + SPATIU_FATA_DE_MASA

  const cerute = Number.isFinite(capacitate) ? Math.floor(capacitate) : 0
  if (cerute < 1) return { raza, scaune: [] }

  const numar = Math.min(
    cerute,
    MAXIM_SCAUNE_DESENATE,
    scauneCareIncap(masa, raza, departare),
  )

  return {
    raza,
    scaune:
      forma === 'rotunda'
        ? scauneRotunda(masa, numar, departare)
        : scauneDreptunghi(masa, numar, departare),
  }
}
