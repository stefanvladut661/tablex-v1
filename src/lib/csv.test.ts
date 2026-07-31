import { describe, expect, it } from 'vitest'

import { construiesteCsv } from '@/lib/csv'

type Rand = { nume: string; persoane: number; telefon: string | null }

const COLOANE = [
  { titlu: 'Client', valoare: (r: Rand) => r.nume },
  { titlu: 'Persoane', valoare: (r: Rand) => r.persoane },
  { titlu: 'Telefon', valoare: (r: Rand) => r.telefon },
]

describe('construiesteCsv', () => {
  it('separa cu punct-si-virgula, nu cu virgula', () => {
    // Excel cu setari romanesti citeste virgula ca separator zecimal: un fisier
    // cu virgule ajunge tot pe o singura coloana. Testul exista ca nimeni sa nu
    // „repare" separatorul inapoi la virgula.
    const csv = construiesteCsv([{ nume: 'Ion', persoane: 2, telefon: '0722' }], COLOANE)
    expect(csv).toContain('"Client";"Persoane";"Telefon"')
    expect(csv).toContain('"Ion";"2";"0722"')
  })

  it('incepe cu BOM, ca Excel sa nu strice diacriticele', () => {
    const csv = construiesteCsv([{ nume: 'Ștefan', persoane: 4, telefon: null }], COLOANE)
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain('Ștefan')
  })

  it('dubleaza ghilimelele din interiorul valorii', () => {
    const csv = construiesteCsv([{ nume: 'Ion "Nelu" Popescu', persoane: 2, telefon: null }], COLOANE)
    expect(csv).toContain('"Ion ""Nelu"" Popescu"')
  })

  it('nu rupe randul cand valoarea contine separatorul sau un rand nou', () => {
    const csv = construiesteCsv(
      [{ nume: 'Popescu; Ion\nla geam', persoane: 2, telefon: null }],
      COLOANE,
    )
    // Un singur rand de date: antetul plus continutul, fara linii orfane.
    const randuriFizice = csv.trimEnd().split('\r\n')
    expect(randuriFizice).toHaveLength(2)
    expect(csv).toContain('"Popescu; Ion\nla geam"')
  })

  it('valorile lipsa devin celule goale, nu „null"', () => {
    // Celula lipsa iese complet neincadrata, nu ca `""`: asa se deosebeste
    // „nu exista valoare" (walk-in fara telefon, §25.6) de „text gol". Ambele
    // se citesc gol in Excel, dar diferenta se pastreaza pentru cine
    // reimporta fisierul.
    const csv = construiesteCsv([{ nume: 'Walk-in', persoane: 2, telefon: null }], COLOANE)
    expect(csv).toContain('"Walk-in";"2";')
    expect(csv).not.toContain('null')
  })

  it('o lista goala produce doar antetul', () => {
    const csv = construiesteCsv([], COLOANE)
    expect(csv.trimEnd()).toBe('﻿"Client";"Persoane";"Telefon"')
  })
})
