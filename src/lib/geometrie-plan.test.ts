import { describe, expect, it } from 'vitest'

import { aliniazaLaGrid, inCanvas, pozitieFinala } from '@/lib/geometrie-plan'

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
