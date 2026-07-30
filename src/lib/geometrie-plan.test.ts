import { describe, expect, it } from 'vitest'

import { aliniazaLaGrid, inCanvas, incadrareContinut, pozitieFinala } from '@/lib/geometrie-plan'

const CANVAS = { latime: 1200, inaltime: 800 }
const MASA = { latime: 80, inaltime: 80 }

describe('aliniazaLaGrid', () => {
  it('duce la cel mai apropiat multiplu', () => {
    expect(aliniazaLaGrid(477, 20)).toBe(480)
    expect(aliniazaLaGrid(353, 20)).toBe(360)
    expect(aliniazaLaGrid(462, 20)).toBe(460)
    expect(aliniazaLaGrid(0, 20)).toBe(0)
  })

  it('lasa neatinsa o valoare deja pe grid', () => {
    expect(aliniazaLaGrid(460, 20)).toBe(460)
    expect(aliniazaLaGrid(480, 20)).toBe(480)
  })

  it('rotunjeste exact la jumatate de pas in SUS, consecvent', () => {
    // 470 e la mijloc intre 460 si 480; Math.round urca. Conteaza doar sa fie
    // previzibil — o tragere repetata trebuie sa dea mereu acelasi rezultat.
    expect(aliniazaLaGrid(470, 20)).toBe(480)
    expect(aliniazaLaGrid(10, 20)).toBe(20)
    expect(aliniazaLaGrid(9.99, 20)).toBe(0)
  })

  it('nu corupe pozitia cand pasul de grid e invalid', () => {
    // Mai bine nealiniat decat NaN/Infinity scris in baza.
    expect(aliniazaLaGrid(123, 0)).toBe(123)
    expect(aliniazaLaGrid(123, -5)).toBe(123)
    expect(aliniazaLaGrid(123, Number.NaN)).toBe(123)
  })

  it('trateaza o valoare invalida ca zero', () => {
    expect(aliniazaLaGrid(Number.NaN, 20)).toBe(0)
    expect(aliniazaLaGrid(Number.POSITIVE_INFINITY, 20)).toBe(0)
  })
})

describe('inCanvas', () => {
  it('lasa neatinsa o pozitie valida', () => {
    expect(inCanvas(MASA, CANVAS, { x: 500, y: 300 })).toEqual({ x: 500, y: 300 })
  })

  it('opreste obiectul INTREG inauntru, nu doar coltul', () => {
    // 1200 - 80 = 1120 e ultima pozitie in care masa incape complet.
    expect(inCanvas(MASA, CANVAS, { x: 1190, y: 790 })).toEqual({ x: 1120, y: 720 })
  })

  it('nu lasa coordonate negative', () => {
    expect(inCanvas(MASA, CANVAS, { x: -40, y: -10 })).toEqual({ x: 0, y: 0 })
  })

  it('lipeste de coltul stanga-sus un obiect mai mare decat canvasul', () => {
    // Fara Math.max(0, ...), limita ar fi negativa si intervalul s-ar inversa,
    // dand o pozitie negativa in loc de 0.
    const urias = { latime: 2000, inaltime: 1500 }
    expect(inCanvas(urias, CANVAS, { x: 300, y: 300 })).toEqual({ x: 0, y: 0 })
  })
})

describe('pozitieFinala', () => {
  it('reproduce mutarea verificata in browser', () => {
    // Tragere reala din editor: coltul brut (477, 353), grid 20 → (480, 360).
    expect(pozitieFinala(MASA, CANVAS, 20, { x: 477, y: 353 })).toEqual({ x: 480, y: 360 })
  })

  it('alinierea nu are voie sa impinga obiectul peste margine', () => {
    // Cazul subtil: limita e 1120, iar alinierea lui 1115 ar da 1120 — bine.
    // Dar cu un canvas de 1190 limita devine 1110, iar 1108 aliniat da 1120,
    // adica in AFARA. De aceea se limiteaza si DUPA aliniere.
    const canvasIngust = { latime: 1190, inaltime: 800 }
    const rezultat = pozitieFinala(MASA, canvasIngust, 20, { x: 1108, y: 100 })
    expect(rezultat.x).toBeLessThanOrEqual(canvasIngust.latime - MASA.latime)
  })

  it('INVARIANT: rezultatul e mereu in canvas, pentru intrari arbitrare', () => {
    const intrari = [
      { x: -500, y: -500 },
      { x: 0, y: 0 },
      { x: 599, y: 401 },
      { x: 5000, y: 5000 },
      { x: 1119, y: 719 },
      { x: 1121, y: 721 },
    ]
    for (const grid of [1, 5, 20, 50, 100]) {
      for (const intrare of intrari) {
        const { x, y } = pozitieFinala(MASA, CANVAS, grid, intrare)
        expect(x, `grid ${grid}, x din ${intrare.x}`).toBeGreaterThanOrEqual(0)
        expect(y, `grid ${grid}, y din ${intrare.y}`).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(CANVAS.latime - MASA.latime)
        expect(y).toBeLessThanOrEqual(CANVAS.inaltime - MASA.inaltime)
      }
    }
  })
})

describe('incadrareContinut', () => {
  const CANVAS_MARE = { latime: 1200, inaltime: 800 }

  it('fara continut arata tot canvasul', () => {
    expect(incadrareContinut([], CANVAS_MARE)).toEqual({
      x: 0, y: 0, latime: 1200, inaltime: 800,
    })
  })

  it('strange incadrarea pe cateva mese dintr-un colt', () => {
    const mese = [
      { x: 100, y: 100, latime: 80, inaltime: 80 },
      { x: 220, y: 100, latime: 80, inaltime: 80 },
      { x: 100, y: 220, latime: 80, inaltime: 80 },
    ]
    const incadrare = incadrareContinut(mese, CANVAS_MARE)

    // Mai stransa decat tot canvasul — asta e tot rostul.
    expect(incadrare.latime).toBeLessThan(CANVAS_MARE.latime)
    // Tot continutul trebuie sa incapa inauntru.
    for (const masa of mese) {
      expect(masa.x).toBeGreaterThanOrEqual(incadrare.x)
      expect(masa.y).toBeGreaterThanOrEqual(incadrare.y)
      expect(masa.x + masa.latime).toBeLessThanOrEqual(incadrare.x + incadrare.latime)
      expect(masa.y + masa.inaltime).toBeLessThanOrEqual(incadrare.y + incadrare.inaltime)
    }
  })

  it('pastreaza raportul canvasului, ca mesele rotunde sa nu para ovale', () => {
    // Continut lung si ingust: fara corectie, raportul ar fi complet diferit.
    const incadrare = incadrareContinut(
      [{ x: 100, y: 380, latime: 900, inaltime: 40 }],
      CANVAS_MARE,
    )
    const raportCanvas = CANVAS_MARE.latime / CANVAS_MARE.inaltime
    expect(incadrare.latime / incadrare.inaltime).toBeCloseTo(raportCanvas, 5)
  })

  it('nu iese niciodata din canvas, nici pentru continut lipit de margine', () => {
    const incadrare = incadrareContinut(
      [{ x: 0, y: 0, latime: 80, inaltime: 80 }],
      CANVAS_MARE,
    )
    expect(incadrare.x).toBeGreaterThanOrEqual(0)
    expect(incadrare.y).toBeGreaterThanOrEqual(0)
    expect(incadrare.x + incadrare.latime).toBeLessThanOrEqual(CANVAS_MARE.latime + 0.001)
    expect(incadrare.y + incadrare.inaltime).toBeLessThanOrEqual(CANVAS_MARE.inaltime + 0.001)
  })

  it('cade inapoi pe tot canvasul cand continutul il umple oricum', () => {
    const incadrare = incadrareContinut(
      [{ x: 10, y: 10, latime: 1180, inaltime: 780 }],
      CANVAS_MARE,
    )
    expect(incadrare).toEqual({ x: 0, y: 0, latime: 1200, inaltime: 800 })
  })

  it('ignora valorile corupte in loc sa produca NaN', () => {
    const incadrare = incadrareContinut(
      [
        { x: 100, y: 100, latime: 80, inaltime: 80 },
        { x: Number.NaN, y: 0, latime: 80, inaltime: 80 },
      ],
      CANVAS_MARE,
    )
    expect(Number.isFinite(incadrare.x)).toBe(true)
    expect(Number.isFinite(incadrare.latime)).toBe(true)
  })

  it('INVARIANT: incadrarea contine tot continutul si sta in canvas', () => {
    const cazuri = [
      [{ x: 0, y: 0, latime: 40, inaltime: 40 }],
      [{ x: 1100, y: 700, latime: 80, inaltime: 80 }],
      [
        { x: 60, y: 60, latime: 80, inaltime: 80 },
        { x: 1000, y: 640, latime: 80, inaltime: 80 },
      ],
      [{ x: 500, y: 400, latime: 10, inaltime: 10 }],
    ]

    for (const continut of cazuri) {
      const i = incadrareContinut(continut, CANVAS_MARE)
      expect(i.x).toBeGreaterThanOrEqual(-0.001)
      expect(i.y).toBeGreaterThanOrEqual(-0.001)
      expect(i.x + i.latime).toBeLessThanOrEqual(CANVAS_MARE.latime + 0.001)
      expect(i.y + i.inaltime).toBeLessThanOrEqual(CANVAS_MARE.inaltime + 0.001)
      for (const d of continut) {
        expect(d.x).toBeGreaterThanOrEqual(i.x - 0.001)
        expect(d.x + d.latime).toBeLessThanOrEqual(i.x + i.latime + 0.001)
        expect(d.y).toBeGreaterThanOrEqual(i.y - 0.001)
        expect(d.y + d.inaltime).toBeLessThanOrEqual(i.y + i.inaltime + 0.001)
      }
    }
  })
})
