/**
 * Aritmetica editorului de floor plan, separata de componenta ca sa poata fi
 * testata direct.
 *
 * E cea mai buna candidata la stricare tacuta din tot editorul: o greseala aici
 * nu arunca nicio eroare, doar aseaza obiectele cu cativa pixeli alaturi — iar
 * asta se observa greu intr-o sala cu 20 de mese.
 */

export type Dimensiuni = { latime: number; inaltime: number }
export type Punct = { x: number; y: number }

/**
 * Precizia bazei: `pozitie_x`, `latime` etc. sunt numeric(10,2). O tragere
 * libera produce 137.42134..., Postgres scrie 137.42, iar randul reimprospatat
 * nu mai e cel din cache — masa tresare cu o zecime de pixel dupa fiecare
 * mutare. Rotunjim la scriere, sa fie aceeasi valoare in ambele parti.
 */
export function laPreciziaBazei(valoare: number): number {
  if (!Number.isFinite(valoare)) return 0
  return Math.round(valoare * 100) / 100
}

/** Cel mai apropiat multiplu al pasului de grid. */
export function aliniazaLaGrid(valoare: number, grid: number): number {
  if (!Number.isFinite(valoare)) return 0
  // Un grid invalid ar face impartirea sa dea Infinity/NaN; fara aliniere e
  // mai bine decat cu o pozitie corupta.
  if (!Number.isFinite(grid) || grid <= 0) return valoare
  return Math.round(valoare / grid) * grid
}

/**
 * Tine obiectul INTREG in canvas: limita superioara e marginea canvasului minus
 * dimensiunea lui, nu marginea canvasului.
 *
 * Cand obiectul e mai mare decat canvasul, limita ar deveni negativa si ar
 * inversa intervalul — atunci il lipim de coltul stanga-sus, singura pozitie
 * care il tine macar cu originea inauntru.
 */
export function inCanvas(
  obiect: Dimensiuni,
  canvas: { latime: number; inaltime: number },
  pozitie: Punct,
): Punct {
  const maximX = Math.max(0, canvas.latime - obiect.latime)
  const maximY = Math.max(0, canvas.inaltime - obiect.inaltime)

  return {
    x: Math.min(Math.max(0, pozitie.x), maximX),
    y: Math.min(Math.max(0, pozitie.y), maximY),
  }
}

/** Pozitia finala a unui obiect tras: aliniata la grid SI limitata in canvas. */
export function pozitieFinala(
  obiect: Dimensiuni,
  canvas: { latime: number; inaltime: number },
  grid: number,
  pozitieBruta: Punct,
): Punct {
  // Limitam intai, aliniem, apoi limitam din nou: alinierea poate impinge
  // obiectul inapoi peste margine (ex. la 795 cu grid 20 → 800).
  const limitat = inCanvas(obiect, canvas, pozitieBruta)
  return inCanvas(obiect, canvas, {
    x: aliniazaLaGrid(limitat.x, grid),
    y: aliniazaLaGrid(limitat.y, grid),
  })
}

// ── Redimensionarea prin manere ──────────────────────────────────────────

export type Cutie = Punct & Dimensiuni

/**
 * Manerul de care se trage, in roza vanturilor: N = nord (sus), S = sud (jos),
 * E = est (dreapta), V = vest (stanga). Colturile se scriu vertical-orizontal,
 * ca `ancora.includes('n')` sa raspunda si pentru „nord-vest".
 */
export type Ancora = 'nv' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sv' | 'v'

export const ANCORE: Ancora[] = ['nv', 'n', 'ne', 'e', 'se', 's', 'sv', 'v']

/** Latura minima a unui obiect redimensionat, in unitati de canvas. */
export const LATURA_MINIMA = 20

/** Roteste un punct in jurul unui centru, in grade, conventia SVG (y creste in jos). */
function roteste(punct: Punct, centru: Punct, grade: number): Punct {
  if (!grade) return punct
  const radiani = (grade * Math.PI) / 180
  const cos = Math.cos(radiani)
  const sin = Math.sin(radiani)
  const dx = punct.x - centru.x
  const dy = punct.y - centru.y
  return {
    x: centru.x + dx * cos - dy * sin,
    y: centru.y + dx * sin + dy * cos,
  }
}

export type OptiuniRedimensionare = {
  canvas: { latime: number; inaltime: number }
  /** Pasul de aliniere; 0 sau negativ inseamna redimensionare libera. */
  grid?: number
  minim?: number
  /** Rotatia obiectului, in grade. SVG-ul o aplica in jurul CENTRULUI. */
  rotatie?: number
  /** Shift tinut apasat: colturile pastreaza raportul laturilor. */
  pastreazaRaport?: boolean
}

/**
 * Cutia noua dupa ce s-a tras de un maner pana in `punct`.
 *
 * Doua lucruri nu sunt evidente si de aceea calculul sta aici, testabil:
 *
 * 1. **Rotatia.** In baza pastram o cutie ALINIATA la axe, iar SVG-ul o roteste
 *    in jurul centrului ei. Deci pointerul se aduce intai in sistemul nerotit al
 *    obiectului (`roteste` cu -rotatie): acolo „trag de marginea de sus"
 *    inseamna chiar y. Dar micsorarea muta centrul, iar rotatia se face in jurul
 *    lui — asa ca latura care trebuia sa stea pe loc ar aluneca vizibil. De aceea
 *    la final cutia se translateaza inapoi cu exact cat s-a deplasat, in ecran,
 *    coltul care trebuia sa ramana fix.
 *
 * 2. **Marginile se aliniaza, nu dimensiunile.** Se aliniaza doar laturile TRASE;
 *    cea opusa ramane neatinsa. Altfel un obiect cu latimea 74 ar sari la 80 din
 *    prima miscare, desi nimeni nu i-a cerut asta.
 */
export function redimensioneaza(
  cutie: Cutie,
  ancora: Ancora,
  punct: Punct,
  optiuni: OptiuniRedimensionare,
): Cutie {
  const {
    canvas,
    grid = 0,
    minim = LATURA_MINIMA,
    rotatie = 0,
    pastreazaRaport = false,
  } = optiuni

  const masuri = [cutie.x, cutie.y, cutie.latime, cutie.inaltime, punct.x, punct.y]
  // O masura corupta ar scrie NaN in baza; mai bine cutia neschimbata.
  if (!masuri.every((masura) => Number.isFinite(masura))) return cutie

  const centru = { x: cutie.x + cutie.latime / 2, y: cutie.y + cutie.inaltime / 2 }
  const local = roteste(punct, centru, -rotatie)

  const mutaV = ancora.includes('v')
  const mutaE = ancora.includes('e')
  const mutaN = ancora.includes('n')
  const mutaS = ancora.includes('s')

  const aliniaza = (valoare: number) => (grid > 0 ? aliniazaLaGrid(valoare, grid) : valoare)

  let stanga = mutaV ? aliniaza(local.x) : cutie.x
  let dreapta = mutaE ? aliniaza(local.x) : cutie.x + cutie.latime
  let sus = mutaN ? aliniaza(local.y) : cutie.y
  let jos = mutaS ? aliniaza(local.y) : cutie.y + cutie.inaltime

  // Marginea trasa ramane in canvas si nu trece dincolo de cea opusa: fara
  // asta, o tragere peste obiect ar da latimi negative.
  if (mutaV) stanga = Math.min(Math.max(0, stanga), dreapta - minim)
  if (mutaE) dreapta = Math.max(Math.min(canvas.latime, dreapta), stanga + minim)
  if (mutaN) sus = Math.min(Math.max(0, sus), jos - minim)
  if (mutaS) jos = Math.max(Math.min(canvas.inaltime, jos), sus + minim)

  if (
    pastreazaRaport &&
    (mutaV || mutaE) &&
    (mutaN || mutaS) &&
    cutie.latime > 0 &&
    cutie.inaltime > 0
  ) {
    const raport = cutie.latime / cutie.inaltime
    let latime = dreapta - stanga
    let inaltime = jos - sus
    // Dimensiunea care a crescut mai mult o comanda pe cealalta: asa coltul
    // urmareste degetul, in loc sa fuga inaintea lui.
    if (latime / inaltime > raport) inaltime = latime / raport
    else latime = inaltime * raport
    if (mutaV) stanga = dreapta - latime
    else dreapta = stanga + latime
    if (mutaN) sus = jos - inaltime
    else jos = sus + inaltime
  }

  let noua: Cutie = { x: stanga, y: sus, latime: dreapta - stanga, inaltime: jos - sus }

  if (rotatie) {
    // Coltul care TREBUIE sa stea pe loc: cel opus manerului. Pe manerele de
    // latura, axa neatinsa nu-si schimba centrul, deci contributia ei e zero.
    const fix = {
      x: mutaV ? cutie.x + cutie.latime : mutaE ? cutie.x : centru.x,
      y: mutaN ? cutie.y + cutie.inaltime : mutaS ? cutie.y : centru.y,
    }
    const centruNou = { x: noua.x + noua.latime / 2, y: noua.y + noua.inaltime / 2 }
    const inainte = roteste(fix, centru, rotatie)
    const dupa = roteste(fix, centruNou, rotatie)
    noua = { ...noua, x: noua.x + inainte.x - dupa.x, y: noua.y + inainte.y - dupa.y }
  }

  const dimensiuni = {
    latime: Math.min(noua.latime, canvas.latime),
    inaltime: Math.min(noua.inaltime, canvas.inaltime),
  }
  return { ...dimensiuni, ...inCanvas(dimensiuni, canvas, noua) }
}

/** Obiectul incape INTREG in canvas? Ce nu incape nu se vede la publicare. */
export function esteInCanvas(
  cutie: Cutie,
  canvas: { latime: number; inaltime: number },
): boolean {
  return (
    cutie.x >= 0 &&
    cutie.y >= 0 &&
    cutie.x + cutie.latime <= canvas.latime &&
    cutie.y + cutie.inaltime <= canvas.inaltime
  )
}

/** Transformarea aplicata continutului canvasului: `translate(x y) scale(s)`. */
export type Vedere = { scara: number; x: number; y: number }
