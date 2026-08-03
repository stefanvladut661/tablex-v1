import type { ElementStructura, TipStructura } from '@/types/floor-plan'
import type { Enums } from '@/types/database'

/**
 * Import de geometrie in Canvas Builder — alternativa la Generarea AI (§41.3)
 * pentru cine nu are cheie de API: acelasi format, dar produs oriunde.
 *
 * De ce validare atat de stricta. Geometria intra ca text lipit de mana, iar o
 * greseala in ea NU arata a greseala: un `latime: null` devine NaN, elementul se
 * deseneaza cu dimensiune zero sau dispare cu totul, iar planul pare doar
 * „incomplet". La fel, o coordonata de zece ori mai mare aseaza masa in afara
 * canvasului, unde nimeni n-o cauta. Amandoua trec tacut prin orice cod care se
 * increde in JSON, si se descopera abia in sala.
 *
 * Regula aplicata peste tot: ce nu se poate verifica se REFUZA, nu se ghiceste.
 * Singura exceptie sunt valorile in afara canvasului, care se semnaleaza ca
 * avertisment — planul poate fi legitim mai mare decat canvasul curent, iar
 * decizia e a omului care importa.
 */

const TIPURI: readonly TipStructura[] = [
  'perete',
  'usa',
  'bar',
  'dj',
  'vip',
  'intrare',
  'bucatarie',
  'planta',
  'piscina',
]

const FORME: ReadonlyArray<Enums<'masa_forma'>> = ['rotunda', 'patrata', 'dreptunghiulara']

/** Peste atat, aproape sigur e o unitate gresita, nu o sala. */
const CAPACITATE_MAXIMA = 30

export type MasaImportata = {
  forma: Enums<'masa_forma'>
  x: number
  y: number
  latime: number
  inaltime: number
  capacitate: number
}

export type GeometrieImportata = {
  structura: ElementStructura[]
  mese: MasaImportata[]
}

export type RezultatImport =
  | { ok: true; date: GeometrieImportata; avertismente: string[] }
  | { ok: false; erori: string[] }

/** Numar real, finit. Exclude NaN si Infinity, pe care JSON.parse le poate produce. */
function numar(valoare: unknown): number | null {
  return typeof valoare === 'number' && Number.isFinite(valoare) ? valoare : null
}

function obiect(valoare: unknown): Record<string, unknown> | null {
  return typeof valoare === 'object' && valoare !== null && !Array.isArray(valoare)
    ? (valoare as Record<string, unknown>)
    : null
}

function citesteElement(brut: unknown, indice: number, erori: string[]): ElementStructura | null {
  const sursa = obiect(brut)
  if (!sursa) {
    erori.push(`structura[${indice}]: nu e un obiect.`)
    return null
  }

  const tip = sursa.tip
  if (typeof tip !== 'string' || !TIPURI.includes(tip as TipStructura)) {
    erori.push(`structura[${indice}]: tip necunoscut „${String(tip)}". Acceptate: ${TIPURI.join(', ')}.`)
    return null
  }

  // Peretii in linie franta se descriu prin puncte, nu prin dreptunghi.
  const puncteBrute = sursa.puncte
  let puncte: Array<[number, number]> | undefined
  if (puncteBrute !== undefined) {
    if (!Array.isArray(puncteBrute) || puncteBrute.length < 2) {
      erori.push(`structura[${indice}]: „puncte" cere cel putin doua perechi.`)
      return null
    }
    puncte = []
    for (const [i, pereche] of puncteBrute.entries()) {
      const px = Array.isArray(pereche) ? numar(pereche[0]) : null
      const py = Array.isArray(pereche) ? numar(pereche[1]) : null
      if (px === null || py === null) {
        erori.push(`structura[${indice}].puncte[${i}]: nu e o pereche de numere.`)
        return null
      }
      puncte.push([px, py])
    }
  }

  const x = numar(sursa.x)
  const y = numar(sursa.y)
  const latime = numar(sursa.latime)
  const inaltime = numar(sursa.inaltime)

  // Cu puncte, dreptunghiul e optional: il deducem din anvelopa lor, ca sa
  // ramana un singur format mai jos in aplicatie.
  if (puncte) {
    const xs = puncte.map(([px]) => px)
    const ys = puncte.map(([, py]) => py)
    return {
      tip: tip as TipStructura,
      x: x ?? Math.min(...xs),
      y: y ?? Math.min(...ys),
      latime: latime ?? Math.max(...xs) - Math.min(...xs),
      inaltime: inaltime ?? Math.max(...ys) - Math.min(...ys),
      puncte,
      ...(typeof sursa.eticheta === 'string' ? { eticheta: sursa.eticheta } : {}),
      ...(numar(sursa.rotatie) !== null ? { rotatie: numar(sursa.rotatie)! } : {}),
      ...(numar(sursa.z) !== null ? { z: numar(sursa.z)! } : {}),
    }
  }

  if (x === null || y === null || latime === null || inaltime === null) {
    erori.push(`structura[${indice}]: x, y, latime si inaltime trebuie sa fie numere.`)
    return null
  }
  if (latime <= 0 || inaltime <= 0) {
    erori.push(`structura[${indice}]: latimea si inaltimea trebuie sa fie peste zero.`)
    return null
  }

  return {
    tip: tip as TipStructura,
    x,
    y,
    latime,
    inaltime,
    ...(typeof sursa.eticheta === 'string' ? { eticheta: sursa.eticheta } : {}),
    ...(numar(sursa.rotatie) !== null ? { rotatie: numar(sursa.rotatie)! } : {}),
    ...(numar(sursa.z) !== null ? { z: numar(sursa.z)! } : {}),
  }
}

function citesteMasa(brut: unknown, indice: number, erori: string[]): MasaImportata | null {
  const sursa = obiect(brut)
  if (!sursa) {
    erori.push(`mese[${indice}]: nu e un obiect.`)
    return null
  }

  const forma = sursa.forma
  if (typeof forma !== 'string' || !FORME.includes(forma as Enums<'masa_forma'>)) {
    erori.push(`mese[${indice}]: forma necunoscuta „${String(forma)}". Acceptate: ${FORME.join(', ')}.`)
    return null
  }

  const x = numar(sursa.x)
  const y = numar(sursa.y)
  const latime = numar(sursa.latime)
  const inaltime = numar(sursa.inaltime)
  const capacitate = numar(sursa.capacitate)

  if (x === null || y === null || latime === null || inaltime === null) {
    erori.push(`mese[${indice}]: x, y, latime si inaltime trebuie sa fie numere.`)
    return null
  }
  if (latime <= 0 || inaltime <= 0) {
    erori.push(`mese[${indice}]: latimea si inaltimea trebuie sa fie peste zero.`)
    return null
  }
  if (capacitate === null || !Number.isInteger(capacitate) || capacitate < 1) {
    erori.push(`mese[${indice}]: capacitatea trebuie sa fie un numar intreg, cel putin 1.`)
    return null
  }
  if (capacitate > CAPACITATE_MAXIMA) {
    erori.push(
      `mese[${indice}]: capacitate ${capacitate} — peste ${CAPACITATE_MAXIMA} e aproape sigur o greseala de unitate.`,
    )
    return null
  }

  return { forma: forma as Enums<'masa_forma'>, x, y, latime, inaltime, capacitate }
}

/**
 * Citeste geometria dintr-un text lipit. Accepta trei forme, fiindca sursa
 * poate fi orice: obiectul complet `{structura, mese}`, aliasul `{elemente}`
 * folosit de stratul salvat, sau un array gol de context — interpretat ca
 * structura, fiindca acolo se ajunge cel mai des.
 */
export function importaGeometrie(
  text: string,
  canvas?: { latime: number; inaltime: number },
): RezultatImport {
  const curatat = text.trim()
  if (!curatat) return { ok: false, erori: ['Nu ai lipit nimic.'] }

  let brut: unknown
  try {
    brut = JSON.parse(curatat)
  } catch {
    return {
      ok: false,
      erori: ['Textul nu e JSON valid. Lipeste exact ce ai primit, fara explicatii in jur.'],
    }
  }

  let structuraBruta: unknown = []
  let meseBrute: unknown = []

  if (Array.isArray(brut)) {
    structuraBruta = brut
  } else {
    const sursa = obiect(brut)
    if (!sursa) {
      return { ok: false, erori: ['JSON-ul trebuie sa fie un obiect sau o lista.'] }
    }
    structuraBruta = sursa.structura ?? sursa.elemente ?? []
    meseBrute = sursa.mese ?? []
  }

  if (!Array.isArray(structuraBruta)) {
    return { ok: false, erori: ['„structura" trebuie sa fie o lista.'] }
  }
  if (!Array.isArray(meseBrute)) {
    return { ok: false, erori: ['„mese" trebuie sa fie o lista.'] }
  }
  if (structuraBruta.length === 0 && meseBrute.length === 0) {
    return { ok: false, erori: ['JSON-ul e valid, dar nu contine nici structura, nici mese.'] }
  }

  const erori: string[] = []
  const structura = structuraBruta
    .map((element, i) => citesteElement(element, i, erori))
    .filter((element): element is ElementStructura => element !== null)
  const mese = meseBrute
    .map((masa, i) => citesteMasa(masa, i, erori))
    .filter((masa): masa is MasaImportata => masa !== null)

  if (erori.length) return { ok: false, erori }

  // In afara canvasului nu e eroare: planul poate fi legitim mai mare, iar
  // zona se poate largi. Dar trebuie SPUS, altfel elementul pare pierdut.
  const avertismente: string[] = []
  if (canvas) {
    const iese = (x: number, y: number, l: number, h: number) =>
      x < 0 || y < 0 || x + l > canvas.latime || y + h > canvas.inaltime
    const elementeIesite = structura.filter((e) => iese(e.x, e.y, e.latime, e.inaltime)).length
    const meseIesite = mese.filter((m) => iese(m.x, m.y, m.latime, m.inaltime)).length
    if (elementeIesite) {
      avertismente.push(
        `${elementeIesite} element(e) de structura ies din canvasul de ${canvas.latime}x${canvas.inaltime}.`,
      )
    }
    if (meseIesite) {
      avertismente.push(
        `${meseIesite} masa/mese ies din canvasul de ${canvas.latime}x${canvas.inaltime}.`,
      )
    }
  }

  return { ok: true, date: { structura, mese }, avertismente }
}
