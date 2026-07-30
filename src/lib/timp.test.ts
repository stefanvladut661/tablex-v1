import { describe, expect, it } from 'vitest'

import { inceputZi, instantDinZiSiOra, oraZecimala, sfarsitZi, ziLocala } from '@/lib/timp'

/**
 * Testele ruleaza cu TZ=UTC (vezi vite.config.ts), iar restaurantul e in
 * Europe/Bucharest. Diferenta e intentionata: daca vreo functie ar folosi din
 * greseala fusul masinii in loc de cel al restaurantului, se vede aici.
 *
 * Miza reala: un restaurant deschis pana la 01:00 nu are voie sa-si piarda
 * rezervarile de dupa miezul nopții intr-o alta zi de lucru.
 */
const BUCURESTI = 'Europe/Bucharest'

describe('inceputZi / sfarsitZi', () => {
  it('miezul nopții LOCAL, nu UTC (vara, +03:00)', () => {
    const zi = new Date('2026-08-04T12:00:00Z')
    // 4 august 2026, 00:00 la Bucuresti = 3 august 21:00 UTC
    expect(inceputZi(zi, BUCURESTI).toISOString()).toBe('2026-08-03T21:00:00.000Z')
    expect(sfarsitZi(zi, BUCURESTI).toISOString()).toBe('2026-08-04T21:00:00.000Z')
  })

  it('tine cont de ora de iarna (+02:00)', () => {
    const zi = new Date('2026-01-15T12:00:00Z')
    expect(inceputZi(zi, BUCURESTI).toISOString()).toBe('2026-01-14T22:00:00.000Z')
  })

  it('un instant de dupa miezul nopții local apartine zilei urmatoare', () => {
    // 00:30 la Bucuresti pe 5 august = 21:30 UTC pe 4 august.
    const dupaMiezulNoptii = new Date('2026-08-04T21:30:00Z')
    const ziua = ziLocala(dupaMiezulNoptii, BUCURESTI)
    // ziLocala intoarce o Date "locala"; ne uitam la componenta calendaristica.
    expect(ziua.getDate()).toBe(5)
    expect(ziua.getMonth()).toBe(7) // august
  })

  it('acelasi instant cade in ZILE diferite in fusuri diferite', () => {
    const instant = new Date('2026-08-04T21:30:00Z')
    expect(ziLocala(instant, BUCURESTI).getDate()).toBe(5)
    expect(ziLocala(instant, 'UTC').getDate()).toBe(4)
  })
})

describe('oraZecimala', () => {
  it('converteste ora locala in numar', () => {
    // 19:30 la Bucuresti (vara) = 16:30 UTC
    expect(oraZecimala('2026-08-04T16:30:00Z', BUCURESTI)).toBe(19.5)
    expect(oraZecimala('2026-08-04T16:00:00Z', BUCURESTI)).toBe(19)
    expect(oraZecimala('2026-08-04T16:15:00Z', BUCURESTI)).toBe(19.25)
  })

  it('foloseste fusul restaurantului, nu pe al masinii', () => {
    const instant = '2026-08-04T16:30:00Z'
    expect(oraZecimala(instant, BUCURESTI)).toBe(19.5)
    expect(oraZecimala(instant, 'UTC')).toBe(16.5)
  })
})

describe('instantDinZiSiOra', () => {
  it('construieste instantul absolut pentru o ora locala', () => {
    const zi = new Date('2026-08-04T00:00:00Z')
    expect(instantDinZiSiOra(zi, '19:30', BUCURESTI).toISOString()).toBe('2026-08-04T16:30:00.000Z')
  })

  it('e inversul lui oraZecimala', () => {
    const zi = new Date('2026-08-04T00:00:00Z')
    for (const text of ['10:00', '13:45', '19:30', '23:15']) {
      const instant = instantDinZiSiOra(zi, text, BUCURESTI)
      const [ore, minute] = text.split(':').map(Number)
      expect(oraZecimala(instant, BUCURESTI)).toBeCloseTo(ore + minute / 60, 5)
    }
  })
})
