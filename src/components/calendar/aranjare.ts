import { oraZecimala } from '@/lib/timp'
import type { Rezervare } from '@/services/rezervari'

export type BlocRezervare = {
  rezervare: Rezervare
  /** Ore zecimale locale restaurantului. */
  start: number
  sfarsit: number
  /** Coloana in interiorul grupului de suprapuneri si numarul total de coloane. */
  banda: number
  benzi: number
}

/**
 * Impacheteaza rezervarile in benzi verticale, ca doua rezervari suprapuse sa
 * apara una langa alta si nu una peste alta.
 *
 * Grupurile se inchid cand apare o rezervare care nu se suprapune cu NICIUNA
 * din cele deja deschise — asa numarul de coloane e calculat per grup, nu pe
 * toata ziua (altfel o singura aglomerare la 20:00 ar subtia toata grila).
 */
export function aranjeazaInBenzi(rezervari: Rezervare[], fus: string): BlocRezervare[] {
  const elemente = rezervari
    .map((rezervare) => {
      const start = oraZecimala(rezervare.data_ora, fus)
      const sfarsitBrut = oraZecimala(rezervare.se_termina_la, fus)
      return {
        rezervare,
        start,
        // O rezervare care trece peste miezul nopții are ora de sfarsit mai
        // mica decat cea de start; o intindem pana la capatul zilei.
        sfarsit: sfarsitBrut > start ? sfarsitBrut : 24,
      }
    })
    .sort((a, b) => a.start - b.start || a.sfarsit - b.sfarsit)

  const rezultat: BlocRezervare[] = []
  let grup: Array<{ rezervare: Rezervare; start: number; sfarsit: number; banda: number }> = []
  let sfarsitGrup = -Infinity
  let sfarsitPeBanda: number[] = []

  function inchideGrupul() {
    if (!grup.length) return
    const benzi = Math.max(...grup.map((element) => element.banda)) + 1
    for (const element of grup) rezultat.push({ ...element, benzi })
    grup = []
    sfarsitPeBanda = []
  }

  for (const element of elemente) {
    if (grup.length && element.start >= sfarsitGrup) {
      inchideGrupul()
      sfarsitGrup = -Infinity
    }

    let banda = sfarsitPeBanda.findIndex((sfarsit) => sfarsit <= element.start)
    if (banda === -1) banda = sfarsitPeBanda.length
    sfarsitPeBanda[banda] = element.sfarsit

    grup.push({ ...element, banda })
    sfarsitGrup = Math.max(sfarsitGrup, element.sfarsit)
  }

  inchideGrupul()
  return rezultat
}
