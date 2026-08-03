/**
 * Potrivirea zonei cerute de Admin cu zonele care exista deja.
 *
 * Builderul nu mai alege zona: lucreaza pe cea scrisa in cerere
 * (`floor_plan_requests.zone_nume`), iar daca ea nu exista o creeaza singur.
 * De aici vine nevoia unei comparatii tolerante — numele e scris de mana, in
 * doua momente diferite, de doi oameni diferiti. „Terasă", „terasa " si
 * „TERASA" sunt aceeasi sala; daca le-am compara brut, fiecare deschidere a
 * builderului ar mai crea o zona goala, iar mesele s-ar imprastia intre
 * duplicate — o pagubă tacuta, care se vede abia in panoul restaurantului.
 *
 * Comparam FARA diacritice intentionat: „Terasa" tastat repede, fara diacritice,
 * trebuie sa nimereasca aceeasi zona ca „Terasă". Numele PASTRAT ramane insa cel
 * din cerere, cu diacritice — normalizarea e doar cheia de cautare.
 */
export function normalizeazaNumeZona(nume: string): string {
  return (
    nume
      // Dupa NFD, fiecare litera cu semn devine litera + semn combinat separat
      // (ă → a + semn, ș → s + semn), deci `\p{M}` (orice semn combinat) le
      // scoate pe toate cu o singura regula, nu cu o lista de perechi.
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  )
}

/** Prima zona cu acelasi nume, dupa normalizare. null cand nu exista. */
export function gasesteZonaDupaNume<T extends { nume: string }>(
  zone: readonly T[],
  nume: string,
): T | null {
  const cautat = normalizeazaNumeZona(nume)
  if (!cautat) return null
  return zone.find((zona) => normalizeazaNumeZona(zona.nume) === cautat) ?? null
}
