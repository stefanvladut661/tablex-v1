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

// ── Incadrarea automata a hartii pe continut ─────────────────────────────

export type Dreptunghi = { x: number; y: number; latime: number; inaltime: number }

/**
 * Canvasul unei zone e 1200x800 implicit, dar o sala cu 6 mese le poate avea
 * pe toate intr-un colt. Randarea era corecta matematic, doar ca jumatate din
 * ecran ramanea gol (§6quater.5).
 *
 * Calculam dreptunghiul care cuprinde continutul si il folosim ca viewBox,
 * cu o marja in jur. Cateva reguli care nu sunt evidente:
 *  - fara continut => tot canvasul, altfel am imparti la zero
 *  - incadrarea nu iese NICIODATA din canvas: altfel s-ar vedea "in afara
 *    salii", iar grid-ul s-ar termina in gol
 *  - pastram raportul canvasului. Fara asta, o sala lunga si ingusta ar fi
 *    intinsa pe verticala de preserveAspectRatio si mesele rotunde ar parea
 *    ovale la prima privire.
 */
export function incadrareContinut(
  continut: Dreptunghi[],
  canvas: { latime: number; inaltime: number },
  marja = 40,
): Dreptunghi {
  const tot: Dreptunghi = { x: 0, y: 0, latime: canvas.latime, inaltime: canvas.inaltime }

  const valide = continut.filter(
    (d) =>
      Number.isFinite(d.x) && Number.isFinite(d.y) &&
      Number.isFinite(d.latime) && Number.isFinite(d.inaltime),
  )
  if (!valide.length) return tot

  const stanga = Math.min(...valide.map((d) => d.x))
  const sus = Math.min(...valide.map((d) => d.y))
  const dreapta = Math.max(...valide.map((d) => d.x + d.latime))
  const jos = Math.max(...valide.map((d) => d.y + d.inaltime))

  let x = stanga - marja
  let y = sus - marja
  let latime = dreapta - stanga + marja * 2
  let inaltime = jos - sus + marja * 2

  // Raportul canvasului, ca formele sa nu se deformeze.
  const raport = canvas.latime / canvas.inaltime
  if (latime / inaltime < raport) {
    const necesara = inaltime * raport
    x -= (necesara - latime) / 2
    latime = necesara
  } else {
    const necesara = latime / raport
    y -= (necesara - inaltime) / 2
    inaltime = necesara
  }

  // Daca extinderea a depasit canvasul, nu are rost sa incadram: aratam tot.
  if (latime >= canvas.latime || inaltime >= canvas.inaltime) return tot

  // Impingem inapoi inauntru, pastrand dimensiunea.
  x = Math.min(Math.max(0, x), canvas.latime - latime)
  y = Math.min(Math.max(0, y), canvas.inaltime - inaltime)

  return { x, y, latime, inaltime }
}
