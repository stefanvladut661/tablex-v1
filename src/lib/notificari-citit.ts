/**
 * Starea de citit a notificarilor e PERSONALA (§33).
 *
 * Vederea `notificari_mele` intoarce `citita_la` din tabelul de legatura
 * `notificari_citite`, filtrat pe auth.uid(): NULL inseamna „necitita DE MINE",
 * nu „necitita de nimeni". Aici sta singura definitie a lui „necitit" si
 * singura interpretare a raspunsului bazei — daca ar exista cate una in fiecare
 * clopotel, una dintre ele ar da tacut alt numar.
 */

export type StareCitire = { citita_la: string | null }

export function esteNecitita(notificare: StareCitire): boolean {
  return !notificare.citita_la
}

export function necititeDin<T extends StareCitire>(lista: T[]): T[] {
  return lista.filter(esteNecitita)
}

/**
 * Functiile de marcare din baza intorc cate notificari au RAMAS necitite,
 * nu cate au fost marcate. 0 = s-a aplicat.
 *
 * `null` (raspuns gol) se trateaza ca ESEC, nu ca succes: intre „nu stiu" si
 * „gata", interfata nu are voie sa aleaga „gata". E aceeasi lectie ca regula 6
 * din CLAUDE.md — un refuz al RLS vine ca raspuns fara continut, nu ca eroare,
 * si daca il citim optimist scriem „Salvat" peste ceva ce nu s-a intamplat.
 */
export function marcareaSAplicat(ramase: number | null): boolean {
  return ramase === 0
}

/** §24.5 — bulina arata numarul, dar nu se lateste peste doua caractere. */
export function etichetaBulina(numar: number): string {
  if (numar <= 0) return ''
  return numar > 9 ? '9+' : String(numar)
}
