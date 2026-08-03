import { describe, expect, it } from 'vitest'

import {
  esteNecitita,
  etichetaBulina,
  marcareaSAplicat,
  necititeDin,
} from '@/lib/notificari-citit'

/**
 * Bulina clopotelului e unul dintre putinele locuri unde o greseala nu se vede
 * ca greseala: arata un numar, si orice numar pare plauzibil. Dupa §33 exista
 * si un al doilea drum tacut — raspunsul functiei de marcare, care intoarce
 * cate au RAMAS necitite. Interpretat pe dos, interfata ar spune „gata" pentru
 * o scriere pe care RLS a refuzat-o.
 */

describe('esteNecitita', () => {
  it('citita_la lipsa inseamna necitita', () => {
    expect(esteNecitita({ citita_la: null })).toBe(true)
  })

  it('orice moment scris inseamna citita', () => {
    expect(esteNecitita({ citita_la: '2026-08-03T09:00:00Z' })).toBe(false)
  })
})

describe('necititeDin', () => {
  const lista = [
    { id: 'a', citita_la: null },
    { id: 'b', citita_la: '2026-08-03T09:00:00Z' },
    { id: 'c', citita_la: null },
  ]

  it('pastreaza doar necititele, in ordinea originala', () => {
    expect(necititeDin(lista).map((n) => n.id)).toEqual(['a', 'c'])
  })

  it('nu intoarce niciodata ceva cu citita_la setat', () => {
    expect(necititeDin(lista).every((n) => n.citita_la === null)).toBe(true)
  })

  it('citite + necitite dau intotdeauna totalul', () => {
    const necitite = necititeDin(lista).length
    const citite = lista.length - necitite
    expect(necitite + citite).toBe(lista.length)
  })

  it('lista goala nu are necitite', () => {
    expect(necititeDin([])).toEqual([])
  })
})

describe('marcareaSAplicat', () => {
  it('zero ramase inseamna reusita', () => {
    expect(marcareaSAplicat(0)).toBe(true)
  })

  it('orice a ramas necitit inseamna esec', () => {
    expect(marcareaSAplicat(1)).toBe(false)
    expect(marcareaSAplicat(30)).toBe(false)
  })

  /**
   * Testul care conteaza cel mai mult: varianta gresita (`ramase !== null` sau
   * `!ramase`) ar transforma un raspuns gol in „salvat", adica exact simptomul
   * pe care regula 6 il descrie — interfata confirma o scriere care n-a avut loc.
   */
  it('raspunsul gol NU inseamna reusita', () => {
    expect(marcareaSAplicat(null)).toBe(false)
  })
})

describe('etichetaBulina', () => {
  it('nu scrie nimic cand nu e nimic necitit', () => {
    expect(etichetaBulina(0)).toBe('')
  })

  it('scrie numarul pana la noua inclusiv', () => {
    expect(etichetaBulina(1)).toBe('1')
    expect(etichetaBulina(9)).toBe('9')
  })

  it('de la zece in sus se trunchiaza, ca bulina sa ramana rotunda', () => {
    expect(etichetaBulina(10)).toBe('9+')
    expect(etichetaBulina(137)).toBe('9+')
  })

  it('un numar negativ nu ajunge sa se afiseze', () => {
    expect(etichetaBulina(-1)).toBe('')
  })
})
