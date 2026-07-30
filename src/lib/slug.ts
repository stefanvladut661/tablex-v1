/**
 * Slug-ul restaurantului devine adresa lui publica (/r/<slug>) si e validat
 * in baza de date de constrangerea:
 *   ^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])$
 * adica: 3–50 caractere, doar litere mici, cifre si cratime, fara cratima la
 * capete. Generatorul de aici produce mereu ceva ce trece acel check.
 */

export const SLUG_MIN = 3
export const SLUG_MAX = 50

const TIPAR_SLUG = /^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])$/

/**
 * Diacriticele romanesti, transliterate explicit. NFD + eliminarea semnelor
 * combinate rezolva "ă"/"â"/"î", dar "ș" si "ț" apar in practica si in forma
 * cu sedila (U+015F, U+0163), care NU se descompune — de aici maparea.
 */
const DIACRITICE: Record<string, string> = {
  ă: 'a',
  â: 'a',
  î: 'i',
  ș: 's',
  ş: 's',
  ț: 't',
  ţ: 't',
}

// Blocul Unicode "Combining Diacritical Marks", rezultat din normalizarea NFD.
// Verificat prin coduri, nu prin literali intr-un regex: un interval scris cu
// caractere combinate e prea fragil la salvarea fisierului.
const COMBINAT_MIN = 0x0300
const COMBINAT_MAX = 0x036f

function esteSemnCombinat(caracter: string): boolean {
  const cod = caracter.codePointAt(0) ?? 0
  return cod >= COMBINAT_MIN && cod <= COMBINAT_MAX
}

export function genereazaSlug(text: string): string {
  const transliterat = [...text.trim().toLowerCase()]
    .map((caracter) => DIACRITICE[caracter] ?? caracter)
    .join('')
    .normalize('NFD')

  const faraSemne = [...transliterat].filter((c) => !esteSemnCombinat(c)).join('')

  return faraSemne
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/, '')
}

export function slugValid(slug: string): boolean {
  return TIPAR_SLUG.test(slug)
}
