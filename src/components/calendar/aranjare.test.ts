import { describe, expect, it } from 'vitest'

import { aranjeazaInBenzi } from '@/components/calendar/aranjare'
import type { Rezervare } from '@/services/rezervari'

const BUCURESTI = 'Europe/Bucharest'

/**
 * Vara, Bucurestiul e la +03:00, deci ora locala 19:00 = 16:00Z.
 * Construim rezervari minimale: aranjarea foloseste doar data_ora si
 * se_termina_la.
 */
function rezervare(oraLocala: number, durataOre: number, id = `r${oraLocala}`): Rezervare {
  const laUtc = (ora: number) => {
    const ore = Math.floor(ora) - 3
    const minute = Math.round((ora % 1) * 60)
    return `2026-08-04T${String(ore).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`
  }
  return {
    id,
    data_ora: laUtc(oraLocala),
    se_termina_la: laUtc(oraLocala + durataOre),
  } as unknown as Rezervare
}

describe('aranjeazaInBenzi', () => {
  it('o rezervare singura ocupa toata latimea', () => {
    const [bloc] = aranjeazaInBenzi([rezervare(19, 2)], BUCURESTI)
    expect(bloc.banda).toBe(0)
    expect(bloc.benzi).toBe(1)
    expect(bloc.start).toBe(19)
    expect(bloc.sfarsit).toBe(21)
  })

  it('doua rezervari suprapuse stau alaturi, nu una peste alta', () => {
    const blocuri = aranjeazaInBenzi([rezervare(19, 2, 'a'), rezervare(20, 2, 'b')], BUCURESTI)
    expect(blocuri.map((b) => b.banda).sort()).toEqual([0, 1])
    expect(blocuri.every((b) => b.benzi === 2)).toBe(true)
  })

  it('doua rezervari care NU se suprapun folosesc aceeasi banda', () => {
    const blocuri = aranjeazaInBenzi([rezervare(12, 2, 'a'), rezervare(19, 2, 'b')], BUCURESTI)
    expect(blocuri.every((b) => b.banda === 0)).toBe(true)
    expect(blocuri.every((b) => b.benzi === 1)).toBe(true)
  })

  it('o rezervare care incepe exact cand se termina alta NU e suprapunere', () => {
    const blocuri = aranjeazaInBenzi([rezervare(19, 2, 'a'), rezervare(21, 2, 'b')], BUCURESTI)
    expect(blocuri.every((b) => b.benzi === 1)).toBe(true)
  })

  /**
   * Comportamentul care da valoare intregii functii: grupurile de suprapunere
   * se inchid separat. Fara asta, o aglomerare la 20:00 ar subtia si blocurile
   * de la pranz, pentru ca numarul de coloane ar fi calculat pe toata ziua.
   */
  it('grupurile de suprapunere se inchid separat', () => {
    const blocuri = aranjeazaInBenzi(
      [
        rezervare(12, 1, 'pranz'),
        rezervare(19, 2, 'seara1'),
        rezervare(19.5, 2, 'seara2'),
        rezervare(20, 2, 'seara3'),
      ],
      BUCURESTI,
    )

    const pranz = blocuri.find((b) => b.rezervare.id === 'pranz')!
    expect(pranz.benzi).toBe(1)

    const seara = blocuri.filter((b) => b.rezervare.id.startsWith('seara'))
    expect(seara.every((b) => b.benzi === 3)).toBe(true)
    expect(seara.map((b) => b.banda).sort()).toEqual([0, 1, 2])
  })

  it('refoloseste o banda eliberata in interiorul aceluiasi grup', () => {
    // a: 19-20, b: 19-22 (se suprapun), c: 20-21 incape pe banda lui a.
    const blocuri = aranjeazaInBenzi(
      [rezervare(19, 1, 'a'), rezervare(19, 3, 'b'), rezervare(20, 1, 'c')],
      BUCURESTI,
    )
    const a = blocuri.find((b) => b.rezervare.id === 'a')!
    const c = blocuri.find((b) => b.rezervare.id === 'c')!
    expect(c.banda).toBe(a.banda)
    expect(blocuri.every((b) => b.benzi === 2)).toBe(true)
  })

  it('o rezervare peste miezul nopții se intinde pana la capatul zilei', () => {
    // 23:00 → 01:00 local: ora de sfarsit ar fi 1, mai mica decat startul.
    const [bloc] = aranjeazaInBenzi([rezervare(23, 2)], BUCURESTI)
    expect(bloc.start).toBe(23)
    expect(bloc.sfarsit).toBe(24)
  })

  it('nu pierde nicio rezervare', () => {
    const intrare = [
      rezervare(12, 1, 'a'),
      rezervare(19, 2, 'b'),
      rezervare(19.5, 2, 'c'),
      rezervare(23, 2, 'd'),
    ]
    const blocuri = aranjeazaInBenzi(intrare, BUCURESTI)
    expect(blocuri).toHaveLength(intrare.length)
    expect(blocuri.map((b) => b.rezervare.id).sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('lista goala nu arunca', () => {
    expect(aranjeazaInBenzi([], BUCURESTI)).toEqual([])
  })

  it('INVARIANT: doua blocuri suprapuse nu stau niciodata pe aceeasi banda', () => {
    const blocuri = aranjeazaInBenzi(
      [
        rezervare(18, 3, 'a'),
        rezervare(18.5, 1, 'b'),
        rezervare(19, 2.5, 'c'),
        rezervare(19.25, 0.5, 'd'),
        rezervare(20, 1, 'e'),
        rezervare(12, 2, 'f'),
      ],
      BUCURESTI,
    )

    for (const unu of blocuri) {
      for (const altul of blocuri) {
        if (unu === altul) continue
        const seSuprapun = unu.start < altul.sfarsit && altul.start < unu.sfarsit
        if (seSuprapun) {
          expect(
            unu.banda,
            `${unu.rezervare.id} si ${altul.rezervare.id} se suprapun pe banda ${unu.banda}`,
          ).not.toBe(altul.banda)
        }
      }
    }
  })
})
