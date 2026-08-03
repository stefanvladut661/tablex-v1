import { describe, expect, it } from 'vitest'

import { importaGeometrie } from '@/lib/import-geometrie'

/**
 * Importul de geometrie e exact locul unde o greseala NU arata a greseala:
 * intra text lipit de mana, iar un `latime: null` devine NaN si elementul se
 * deseneaza cu dimensiune zero — planul pare doar „incomplet", nu stricat.
 * De aceea testele de aici insista pe valorile care trec tacut prin orice cod
 * care se increde in JSON: null, string, NaN, Infinity, zero, negativ.
 */

const CANVAS = { latime: 1200, inaltime: 800 }

function reuseste(text: string) {
  const rezultat = importaGeometrie(text, CANVAS)
  if (!rezultat.ok) throw new Error(`Asteptam reusita, am primit: ${rezultat.erori.join(' | ')}`)
  return rezultat
}

describe('text care nu e geometrie', () => {
  it('refuza textul gol', () => {
    expect(importaGeometrie('   ', CANVAS).ok).toBe(false)
  })

  it('refuza ce nu e JSON', () => {
    expect(importaGeometrie('uite planul: {structura...', CANVAS).ok).toBe(false)
  })

  it('refuza JSON valid dar gol de continut', () => {
    expect(importaGeometrie('{"structura": [], "mese": []}', CANVAS).ok).toBe(false)
  })

  it('refuza un numar sau un sir in loc de obiect', () => {
    expect(importaGeometrie('42', CANVAS).ok).toBe(false)
    expect(importaGeometrie('"perete"', CANVAS).ok).toBe(false)
  })
})

describe('formele acceptate de intrare', () => {
  it('citeste obiectul complet', () => {
    const r = reuseste(
      '{"structura":[{"tip":"bar","x":10,"y":20,"latime":100,"inaltime":40}],"mese":[]}',
    )
    expect(r.date.structura).toHaveLength(1)
    expect(r.date.structura[0].tip).toBe('bar')
  })

  it('accepta o lista goala de context ca fiind structura', () => {
    const r = reuseste('[{"tip":"perete","x":0,"y":0,"latime":500,"inaltime":10}]')
    expect(r.date.structura).toHaveLength(1)
    expect(r.date.mese).toHaveLength(0)
  })

  it('accepta aliasul „elemente", cum e salvat stratul', () => {
    const r = reuseste('{"elemente":[{"tip":"usa","x":5,"y":5,"latime":40,"inaltime":10}]}')
    expect(r.date.structura).toHaveLength(1)
  })
})

describe('numere care trec tacut prin cod naiv', () => {
  const cazuri: Array<[string, string]> = [
    ['null', '{"structura":[{"tip":"bar","x":0,"y":0,"latime":null,"inaltime":40}]}'],
    ['sir', '{"structura":[{"tip":"bar","x":0,"y":0,"latime":"100","inaltime":40}]}'],
    ['lipsa', '{"structura":[{"tip":"bar","x":0,"y":0,"inaltime":40}]}'],
    ['zero', '{"structura":[{"tip":"bar","x":0,"y":0,"latime":0,"inaltime":40}]}'],
    ['negativ', '{"structura":[{"tip":"bar","x":0,"y":0,"latime":-100,"inaltime":40}]}'],
  ]

  it.each(cazuri)('refuza latimea %s', (_eticheta, text) => {
    expect(importaGeometrie(text, CANVAS).ok).toBe(false)
  })

  /** JSON.parse nu produce NaN/Infinity, dar un generator care concateneaza da. */
  it('refuza valorile ne-finite scrise ca text', () => {
    expect(importaGeometrie('{"structura":[{"tip":"bar","x":NaN,"y":0,"latime":10,"inaltime":10}]}', CANVAS).ok).toBe(false)
  })
})

describe('tipuri si forme necunoscute', () => {
  it('refuza un tip de structura inventat', () => {
    const r = importaGeometrie('{"structura":[{"tip":"scena","x":0,"y":0,"latime":10,"inaltime":10}]}', CANVAS)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erori[0]).toContain('scena')
  })

  it('refuza o forma de masa inexistenta in baza', () => {
    const r = importaGeometrie(
      '{"mese":[{"forma":"ovala","x":0,"y":0,"latime":60,"inaltime":60,"capacitate":4}]}',
      CANVAS,
    )
    expect(r.ok).toBe(false)
  })

  it('accepta cele trei forme reale', () => {
    for (const forma of ['rotunda', 'patrata', 'dreptunghiulara']) {
      const r = reuseste(
        `{"mese":[{"forma":"${forma}","x":0,"y":0,"latime":60,"inaltime":60,"capacitate":4}]}`,
      )
      expect(r.date.mese[0].forma).toBe(forma)
    }
  })
})

describe('capacitatea', () => {
  it('refuza zero, fractionar si peste plafon', () => {
    const cu = (cap: string) =>
      importaGeometrie(
        `{"mese":[{"forma":"rotunda","x":0,"y":0,"latime":60,"inaltime":60,"capacitate":${cap}}]}`,
        CANVAS,
      ).ok
    expect(cu('0')).toBe(false)
    expect(cu('2.5')).toBe(false)
    expect(cu('400')).toBe(false)
    expect(cu('4')).toBe(true)
  })
})

describe('pereti descrisi prin puncte', () => {
  it('deduce dreptunghiul din anvelopa punctelor', () => {
    const r = reuseste('{"structura":[{"tip":"perete","puncte":[[10,20],[110,20],[110,90]]}]}')
    const perete = r.date.structura[0]
    expect(perete.x).toBe(10)
    expect(perete.y).toBe(20)
    expect(perete.latime).toBe(100)
    expect(perete.inaltime).toBe(70)
    expect(perete.puncte).toHaveLength(3)
  })

  it('refuza un singur punct sau perechi stricate', () => {
    expect(importaGeometrie('{"structura":[{"tip":"perete","puncte":[[10,20]]}]}', CANVAS).ok).toBe(false)
    expect(
      importaGeometrie('{"structura":[{"tip":"perete","puncte":[[10,20],[null,30]]}]}', CANVAS).ok,
    ).toBe(false)
  })
})

describe('in afara canvasului: avertisment, nu refuz', () => {
  it('accepta dar semnaleaza o masa asezata dincolo de margine', () => {
    const r = reuseste(
      '{"mese":[{"forma":"patrata","x":5000,"y":10,"latime":60,"inaltime":60,"capacitate":2}]}',
    )
    expect(r.avertismente).toHaveLength(1)
    expect(r.avertismente[0]).toContain('1200x800')
  })

  it('nu semnaleaza nimic pentru geometrie care incape', () => {
    const r = reuseste('{"mese":[{"forma":"patrata","x":10,"y":10,"latime":60,"inaltime":60,"capacitate":2}]}')
    expect(r.avertismente).toEqual([])
  })

  it('semnaleaza si coordonatele negative', () => {
    const r = reuseste('{"structura":[{"tip":"bar","x":-50,"y":10,"latime":60,"inaltime":60}]}')
    expect(r.avertismente).toHaveLength(1)
  })
})

describe('raportarea erorilor', () => {
  it('aduna toate problemele, nu doar prima', () => {
    const r = importaGeometrie(
      '{"structura":[{"tip":"scena","x":0,"y":0,"latime":10,"inaltime":10},{"tip":"bar","x":0,"y":0,"latime":null,"inaltime":10}]}',
      CANVAS,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erori.length).toBeGreaterThanOrEqual(2)
  })

  it('un singur element stricat anuleaza tot importul', () => {
    const r = importaGeometrie(
      '{"structura":[{"tip":"bar","x":0,"y":0,"latime":10,"inaltime":10},{"tip":"bar","x":0,"y":0,"latime":"x","inaltime":10}]}',
      CANVAS,
    )
    expect(r.ok).toBe(false)
  })
})
