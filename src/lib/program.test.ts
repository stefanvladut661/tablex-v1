import { describe, expect, it } from 'vitest'

import { programZilei } from '@/lib/program'

const BUCURESTI = 'Europe/Bucharest'

// 2026-08-03 e o LUNI, 2026-08-09 o duminica. Verificam ca maparea zilei se
// face pe fusul restaurantului, nu pe cel al masinii (TZ=UTC in teste).
const LUNI = new Date('2026-08-03T12:00:00Z')
const DUMINICA = new Date('2026-08-09T12:00:00Z')

const PROGRAM = {
  luni: { deschis: true, de_la: '10:00', pana_la: '23:00' },
  duminica: { deschis: false, de_la: '10:00', pana_la: '22:00' },
}

describe('programZilei', () => {
  it('citeste intervalul zilei corecte', () => {
    expect(programZilei(LUNI, PROGRAM, BUCURESTI)).toEqual({ deschis: true, deLa: 10, panaLa: 23 })
  })

  it('respecta ziua inchisa', () => {
    expect(programZilei(DUMINICA, PROGRAM, BUCURESTI).deschis).toBe(false)
  })

  it('alege ziua dupa fusul restaurantului', () => {
    // 2026-08-03T22:30Z = deja marti 01:30 la Bucuresti, dar inca luni in UTC.
    const noapte = new Date('2026-08-03T22:30:00Z')
    const program = { marti: { deschis: false, de_la: '09:00', pana_la: '17:00' } }
    expect(programZilei(noapte, program, BUCURESTI).deschis).toBe(false)
    // In UTC ar fi tot luni, deci ar cadea pe implicit (deschis).
    expect(programZilei(noapte, program, 'UTC').deschis).toBe(true)
  })

  it('rotunjeste 23:59 la miezul nopții, ca sa nu ramana un rand de un minut', () => {
    const program = { luni: { deschis: true, de_la: '10:00', pana_la: '23:59' } }
    expect(programZilei(LUNI, program, BUCURESTI).panaLa).toBe(24)
  })

  it('accepta minute in interval', () => {
    const program = { luni: { deschis: true, de_la: '11:30', pana_la: '22:15' } }
    expect(programZilei(LUNI, program, BUCURESTI)).toEqual({
      deschis: true,
      deLa: 11.5,
      panaLa: 22.25,
    })
  })

  it('cade pe implicit cand jsonb-ul nu are forma asteptata', () => {
    const implicit = { deschis: true, deLa: 10, panaLa: 24 }
    expect(programZilei(LUNI, null, BUCURESTI)).toEqual(implicit)
    expect(programZilei(LUNI, 'text', BUCURESTI)).toEqual(implicit)
    expect(programZilei(LUNI, [], BUCURESTI)).toEqual(implicit)
    expect(programZilei(LUNI, {}, BUCURESTI)).toEqual(implicit)
    expect(programZilei(LUNI, { luni: 'aiurea' }, BUCURESTI)).toEqual(implicit)
  })

  it('nu produce niciodata o grila degenerata', () => {
    // Un interval inversat sau prea scurt ar da un calendar fara randuri.
    const inversat = { luni: { deschis: true, de_la: '22:00', pana_la: '09:00' } }
    const rezultat = programZilei(LUNI, inversat, BUCURESTI)
    expect(rezultat.panaLa - rezultat.deLa).toBeGreaterThanOrEqual(2)

    const scurt = { luni: { deschis: true, de_la: '10:00', pana_la: '10:30' } }
    const alDoilea = programZilei(LUNI, scurt, BUCURESTI)
    expect(alDoilea.panaLa - alDoilea.deLa).toBeGreaterThanOrEqual(2)
  })
})
