/**
 * Regula de parola (§49.1), intr-un modul FARA dependinte.
 *
 * De ce separat de `validari.ts`: acolo totul se sprijina pe zod, iar
 * `validari.ts` e importat de formularele lazy. Meniul de cont din bara
 * laterala e insa incarcat de la primul cadru (face parte din LayoutApp), deci
 * un import din validari ar fi tras zod in pachetul de intrare — 75 kB in plus
 * pentru toata lumea, ca sa validam o parola pe care majoritatea n-o schimba
 * niciodata. (Masurat: intrarea sarise de la 435 la 512 kB.)
 *
 * `validari.ts` isi construieste schema din functia asta, deci regula ramane
 * scrisa o singura data.
 */

export const PAROLA_MIN = 8
export const PAROLA_MAX = 72

/**
 * null cand parola e buna; altfel mesajul de aratat omului.
 *
 * §49.1 cere minim 8 caractere, o majuscula si o cifra — la signup SI la orice
 * resetare. Pana acum se verifica doar lungimea, iar ecranele care promiteau
 * „o litera mare si o cifra" spuneau ceva ce nimeni nu impunea.
 */
export function verificaParola(parola: string): string | null {
  if (parola.length < PAROLA_MIN) {
    return `Parola trebuie sa aiba cel putin ${PAROLA_MIN} caractere.`
  }
  if (parola.length > PAROLA_MAX) {
    return `Parola poate avea cel mult ${PAROLA_MAX} de caractere.`
  }
  if (!/[A-ZĂÂÎȘȚ]/.test(parola)) {
    return 'Parola trebuie sa contina cel putin o litera mare.'
  }
  if (!/\d/.test(parola)) {
    return 'Parola trebuie sa contina cel putin o cifra.'
  }
  return null
}
