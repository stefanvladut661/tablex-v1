import { describe, expect, it } from 'vitest'

import {
  MAXIM_SCAUNE_DESENATE,
  geometrieScaune,
  imparteLaturi,
  razaScaun,
  type FormaMasa,
  type Scaun,
} from '@/lib/scaune'

/**
 * Testele astea nu apara o eroare aruncata — apara o eroare TACUTA. Scaunele
 * calculate gresit nu se plang: apar suprapuse, sau in mijlocul mesei, sau
 * intoarse cu spatele la ea, si nimeni nu observa pana nu se uita cineva atent
 * la planul unei sali reale.
 */

const DREPTUNGHIULARA: FormaMasa = 'dreptunghiulara'

/** Masa culcata, dimensiunile implicite din datele demo. */
const CULCATA = { latime: 130, inaltime: 74, forma: DREPTUNGHIULARA }
/** Masa in picioare, ca in modelul vizual al proprietarului. */
const IN_PICIOARE = { latime: 90, inaltime: 160, forma: DREPTUNGHIULARA }

const deasupra = (scaune: Scaun[]) => scaune.filter((s) => s.unghi === -90)
const dedesubt = (scaune: Scaun[]) => scaune.filter((s) => s.unghi === 90)
const laDreapta = (scaune: Scaun[]) => scaune.filter((s) => s.unghi === 0)
const laStanga = (scaune: Scaun[]) => scaune.filter((s) => s.unghi === 180)

/** Cate scaune sunt pe fiecare latura: sus, dreapta, jos, stanga. */
function peLaturi(scaune: Scaun[]): number[] {
  return [
    deasupra(scaune).length,
    laDreapta(scaune).length,
    dedesubt(scaune).length,
    laStanga(scaune).length,
  ]
}

describe('razaScaun', () => {
  it('creste cu masa, dar ramane intre limite', () => {
    expect(razaScaun(70, 70)).toBeCloseTo(7.7, 5)
    expect(razaScaun(130, 74)).toBeCloseTo(8.14, 2)
  })

  it('nu lasa scaunul sa dispara pe o masa mica, nici sa devina fotoliu pe una mare', () => {
    // Un scaun real are aceeasi marime indiferent de masa la care sta.
    expect(razaScaun(20, 20)).toBe(6)
    expect(razaScaun(400, 300)).toBe(11)
  })
})

describe('geometrieScaune — cazuri degenerate', () => {
  it('nu deseneaza nimic la capacitate zero sau negativa', () => {
    expect(geometrieScaune({ ...CULCATA, capacitate: 0 }).scaune).toHaveLength(0)
    expect(geometrieScaune({ ...CULCATA, capacitate: -3 }).scaune).toHaveLength(0)
  })

  it('nu produce NaN cand dimensiunile lipsesc sau sunt invalide', () => {
    const fara = geometrieScaune({ ...CULCATA, latime: 0, capacitate: 4 })
    expect(fara.scaune).toHaveLength(0)
    expect(Number.isFinite(fara.raza)).toBe(true)

    const nan = geometrieScaune({ ...CULCATA, inaltime: Number.NaN, capacitate: 4 })
    expect(nan.scaune).toHaveLength(0)

    const capacitateNan = geometrieScaune({ ...CULCATA, capacitate: Number.NaN })
    expect(capacitateNan.scaune).toHaveLength(0)
  })

  it('ignora partea zecimala a capacitatii', () => {
    expect(geometrieScaune({ ...CULCATA, capacitate: 4.7 }).scaune).toHaveLength(4)
  })
})

describe('geometrieScaune — masa dreptunghiulara', () => {
  it('aseaza singurul scaun pe latura lunga', () => {
    const { scaune } = geometrieScaune({ ...CULCATA, capacitate: 1 })
    expect(scaune).toHaveLength(1)
    expect(peLaturi(scaune)).toEqual([1, 0, 0, 0])
    expect(scaune[0].x).toBeCloseTo(65, 5)
    expect(scaune[0].y).toBeLessThan(0)
  })

  it('pune doi oameni fata in fata, nu in diagonala', () => {
    const { scaune } = geometrieScaune({ ...CULCATA, capacitate: 2 })
    expect(peLaturi(scaune)).toEqual([1, 0, 1, 0])
    // Aceeasi coloana, de o parte si de alta a mesei.
    expect(scaune[0].x).toBeCloseTo(scaune[1].x, 5)
    expect(scaune[0].y).toBeLessThan(0)
    expect(scaune[1].y).toBeGreaterThan(CULCATA.inaltime)
  })

  it('pune cate unul pe fiecare latura la masa patrata de patru', () => {
    const { scaune } = geometrieScaune({
      latime: 90,
      inaltime: 90,
      forma: 'patrata',
      capacitate: 4,
    })
    expect(peLaturi(scaune)).toEqual([1, 1, 1, 1])
    // Toate in mijlocul laturii lor.
    for (const scaun of scaune) {
      const peX = scaun.unghi === -90 || scaun.unghi === 90
      expect(peX ? scaun.x : scaun.y).toBeCloseTo(45, 5)
    }
  })

  it('imparte cei 6 la masa culcata in 2+2 pe laturile lungi si cate unul la capete', () => {
    const { scaune } = geometrieScaune({ ...CULCATA, capacitate: 6 })
    expect(scaune).toHaveLength(6)
    expect(peLaturi(scaune)).toEqual([2, 1, 2, 1])
  })

  it('imparte cei 6 la masa in picioare exact ca in modelul vizual: 1 sus, 1 jos, 2+2 lateral', () => {
    const { scaune } = geometrieScaune({ ...IN_PICIOARE, capacitate: 6 })
    expect(peLaturi(scaune)).toEqual([1, 2, 1, 2])

    // Cele doua de pe o latura lunga stau la sferturile ei, nu lipite.
    const dreapta = laDreapta(scaune).map((s) => s.y).sort((a, b) => a - b)
    expect(dreapta[0]).toBeCloseTo(40, 5)
    expect(dreapta[1]).toBeCloseTo(120, 5)
  })

  it('duce cei 8 la 3+3 pe laturile lungi si cate unul la capete', () => {
    const { scaune } = geometrieScaune({ ...CULCATA, capacitate: 8 })
    expect(scaune).toHaveLength(8)
    expect(peLaturi(scaune)).toEqual([3, 1, 3, 1])
  })

  it('pastreaza simetria laturilor opuse la numar par de locuri', () => {
    for (const capacitate of [2, 4, 6, 8, 10, 12]) {
      const { scaune } = geometrieScaune({ ...CULCATA, capacitate })
      const [nSus, nDreapta, nJos, nStanga] = peLaturi(scaune)
      expect(nSus).toBe(nJos)
      expect(nDreapta).toBe(nStanga)
    }
  })
})

describe('geometrieScaune — masa rotunda', () => {
  const ROTUNDA = { latime: 84, inaltime: 84, forma: 'rotunda' as FormaMasa }

  it('imparte egal cercul si porneste din varf', () => {
    const { scaune, raza } = geometrieScaune({ ...ROTUNDA, capacitate: 4 })
    expect(scaune).toHaveLength(4)

    const asteptat = 42 + raza + 4 // raza mesei + departarea centrului scaunului
    expect(scaune[0]).toMatchObject({ unghi: -90 })
    expect(scaune[0].x).toBeCloseTo(42, 5)
    expect(scaune[0].y).toBeCloseTo(42 - asteptat, 5)

    const unghiuri = scaune.map((s) => s.unghi).sort((a, b) => a - b)
    expect(unghiuri).toEqual([-90, 0, 90, 180])
  })

  it('tine toate scaunele la aceeasi distanta de centru', () => {
    const { scaune } = geometrieScaune({ ...ROTUNDA, capacitate: 7 })
    const distante = scaune.map((s) => Math.hypot(s.x - 42, s.y - 42))
    for (const distanta of distante) expect(distanta).toBeCloseTo(distante[0], 5)
  })

  it('nu inghesuie scaunele la capetele unei mese ovale', () => {
    // Pe elipsa, departarea se face pe normala: scaunele de la capete trebuie sa
    // ramana in afara mesei, nu pe blatul ei.
    const oval = { latime: 200, inaltime: 90, forma: 'rotunda' as FormaMasa, capacitate: 8 }
    const { scaune, raza } = geometrieScaune(oval)
    for (const scaun of scaune) {
      const normalizat =
        ((scaun.x - 100) / (100 + raza)) ** 2 + ((scaun.y - 45) / (45 + raza)) ** 2
      expect(normalizat).toBeGreaterThan(1)
    }
  })

  it('aseaza doi oameni fata in fata', () => {
    const { scaune } = geometrieScaune({ ...ROTUNDA, capacitate: 2 })
    expect(scaune).toHaveLength(2)
    expect(scaune[0].x).toBeCloseTo(scaune[1].x, 5)
    expect(scaune[0].y).toBeLessThan(0)
    expect(scaune[1].y).toBeGreaterThan(84)
  })
})

describe('geometrieScaune — plafonul de desen', () => {
  it('se opreste la plafon, oricat de mare ar fi capacitatea din baza', () => {
    const { scaune } = geometrieScaune({ latime: 300, inaltime: 120, forma: DREPTUNGHIULARA, capacitate: 40 })
    expect(scaune).toHaveLength(MAXIM_SCAUNE_DESENATE)
  })

  it('deseneaza mai putine scaune decat plafonul cand masa e prea mica pentru ele', () => {
    // 12 scaune in jurul unei mese de 30x30 ar fi 12 cercuri suprapuse.
    const { scaune } = geometrieScaune({ latime: 30, inaltime: 30, forma: 'patrata', capacitate: 12 })
    expect(scaune.length).toBeLessThan(12)
    expect(scaune.length).toBeGreaterThan(0)
  })
})

describe('imparteLaturi', () => {
  it('imparte fix cate scaune a primit', () => {
    for (let numar = 1; numar <= 16; numar += 1) {
      const laturi = imparteLaturi(numar, 130, 74)
      expect(laturi.reduce((s, n) => s + n, 0)).toBe(numar)
    }
  })

  it('nu imparte la zero cand masa n-are dimensiuni', () => {
    expect(imparteLaturi(4, 0, 0)).toEqual([4, 0, 0, 0])
  })
})

// ── Invariantii: ce nu trebuie sa se intample niciodata ───────────────────

const MESE_DE_INCERCAT = [
  { latime: 60, inaltime: 60 },
  { latime: 70, inaltime: 70 },
  { latime: 84, inaltime: 84 },
  { latime: 90, inaltime: 160 },
  { latime: 130, inaltime: 74 },
  { latime: 200, inaltime: 90 },
  { latime: 300, inaltime: 120 },
  { latime: 40, inaltime: 40 },
]

describe('invarianti pe toate combinatiile', () => {
  it('niciun scaun nu cade in interiorul mesei', () => {
    for (const dimensiuni of MESE_DE_INCERCAT) {
      for (let capacitate = 1; capacitate <= 16; capacitate += 1) {
        for (const forma of ['dreptunghiulara', 'patrata', 'rotunda'] as FormaMasa[]) {
          const masa = { ...dimensiuni, forma, capacitate }
          const { scaune, raza } = geometrieScaune(masa)

          for (const scaun of scaune) {
            const context = `${forma} ${dimensiuni.latime}x${dimensiuni.inaltime}, ${capacitate} locuri`

            if (forma === 'rotunda') {
              // Masa e elipsa inscrisa: centrul scaunului trebuie sa fie in afara ei.
              const rx = dimensiuni.latime / 2
              const ry = dimensiuni.inaltime / 2
              const normalizat = ((scaun.x - rx) / rx) ** 2 + ((scaun.y - ry) / ry) ** 2
              expect(normalizat, context).toBeGreaterThan(1)
              continue
            }

            // Dreptunghiul mesei e [0, latime] x [0, inaltime]. Nu cerem doar ca
            // CENTRUL sa fie afara: cerem ca tot discul sezutului sa fie afara,
            // altfel scaunul ar parea urcat pe blat.
            const dx = Math.max(0 - scaun.x, 0, scaun.x - dimensiuni.latime)
            const dy = Math.max(0 - scaun.y, 0, scaun.y - dimensiuni.inaltime)
            expect(Math.hypot(dx, dy), context).toBeGreaterThanOrEqual(raza)
          }
        }
      }
    }
  })

  it('niciun scaun nu se suprapune peste altul', () => {
    for (const dimensiuni of MESE_DE_INCERCAT) {
      for (let capacitate = 1; capacitate <= 16; capacitate += 1) {
        for (const forma of ['dreptunghiulara', 'patrata', 'rotunda'] as FormaMasa[]) {
          const { scaune, raza } = geometrieScaune({ ...dimensiuni, forma, capacitate })

          for (let i = 0; i < scaune.length; i += 1) {
            for (let j = i + 1; j < scaune.length; j += 1) {
              const distanta = Math.hypot(scaune[i].x - scaune[j].x, scaune[i].y - scaune[j].y)
              expect(
                distanta,
                `${forma} ${dimensiuni.latime}x${dimensiuni.inaltime}, ${capacitate} locuri`,
              ).toBeGreaterThanOrEqual(2 * raza - 1e-9)
            }
          }
        }
      }
    }
  })

  it('fiecare scaun priveste spre masa', () => {
    for (const dimensiuni of MESE_DE_INCERCAT) {
      for (const forma of ['dreptunghiulara', 'rotunda'] as FormaMasa[]) {
        const { scaune } = geometrieScaune({ ...dimensiuni, forma, capacitate: 9 })
        const centruX = dimensiuni.latime / 2
        const centruY = dimensiuni.inaltime / 2

        for (const scaun of scaune) {
          // `unghi` arata dinspre masa spre scaun (acolo se pune spatarul).
          // Deci proiectia vectorului scaun→centru pe directia asta e negativa.
          const radiani = (scaun.unghi * Math.PI) / 180
          const spreCentru =
            (centruX - scaun.x) * Math.cos(radiani) + (centruY - scaun.y) * Math.sin(radiani)
          expect(spreCentru).toBeLessThan(0)
        }
      }
    }
  })

  it('numarul desenat nu depaseste niciodata capacitatea reala', () => {
    for (const dimensiuni of MESE_DE_INCERCAT) {
      for (let capacitate = 1; capacitate <= 16; capacitate += 1) {
        const { scaune } = geometrieScaune({ ...dimensiuni, forma: DREPTUNGHIULARA, capacitate })
        // Un scaun in plus ar fi o minciuna: harta ar arata un loc care nu exista.
        expect(scaune.length).toBeLessThanOrEqual(capacitate)
      }
    }
  })
})
