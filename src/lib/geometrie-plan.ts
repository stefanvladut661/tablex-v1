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
