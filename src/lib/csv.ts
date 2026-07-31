/**
 * Export CSV (§22.2). Scris de mana, nu cu o librarie: sunt treizeci de randuri
 * si evita o dependinta noua.
 *
 * Doua decizii care par mici si nu sunt:
 *
 * 1. SEPARATORUL E PUNCT-SI-VIRGULA, nu virgula. Excel pe Windows cu setari
 *    romanesti citeste virgula ca separator ZECIMAL, deci un fisier cu virgule
 *    ajunge tot pe o singura coloana. Restaurantele deschid exporturile in
 *    Excel, nu in editor de text.
 * 2. FISIERUL INCEPE CU BOM (﻿). Fara el, acelasi Excel citeste UTF-8 ca
 *    ANSI, iar diacriticele din numele clientilor devin mojibake — „Ștefan"
 *    ajunge „Ĺ˘tefan". BOM-ul e singurul mod de a i-o spune.
 */

/** Ghilimelele din interior se dubleaza; RFC 4180. */
function scapa(valoare: unknown): string {
  if (valoare === null || valoare === undefined) return ''
  const text = String(valoare)
  // Ghilimelele nu strica nimic pe o valoare simpla, dar sunt obligatorii cand
  // textul contine separatorul, ghilimele sau rand nou. Le punem mereu: e mai
  // ieftin decat sa gresim conditia.
  return `"${text.replace(/"/g, '""')}"`
}

export type ColoanaCsv<T> = {
  titlu: string
  valoare: (rand: T) => unknown
}

export function construiesteCsv<T>(randuri: T[], coloane: Array<ColoanaCsv<T>>): string {
  const antet = coloane.map((c) => scapa(c.titlu)).join(';')
  const continut = randuri.map((rand) => coloane.map((c) => scapa(c.valoare(rand))).join(';'))
  // CRLF: acelasi motiv ca BOM-ul — Excel il asteapta.
  return `﻿${[antet, ...continut].join('\r\n')}\r\n`
}

/**
 * Declanseaza descarcarea in browser. Separata de constructie ca sa poata fi
 * testata partea care are logica: construirea.
 */
export function descarcaCsv(numeFisier: string, continut: string): void {
  const blob = new Blob([continut], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = numeFisier
  link.click()
  URL.revokeObjectURL(url)
}
