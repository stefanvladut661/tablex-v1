import { describe, expect, it } from 'vitest'

import {
  ANCORE,
  aliniazaLaGrid,
  esteInCanvas,
  inCanvas,
  pozitieFinala,
  redimensioneaza,
  type Cutie,
} from '@/lib/geometrie-plan'

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

describe('redimensioneaza', () => {
  const CUTIE: Cutie = { x: 200, y: 100, latime: 130, inaltime: 74 }
  const LIBER = { canvas: CANVAS, grid: 0, minim: 20 }

  /** Unde ajunge pe ECRAN un punct al cutiei, dupa rotatia din jurul centrului. */
  function peEcran(punct: { x: number; y: number }, cutie: Cutie, grade: number) {
    const centru = { x: cutie.x + cutie.latime / 2, y: cutie.y + cutie.inaltime / 2 }
    const radiani = (grade * Math.PI) / 180
    const dx = punct.x - centru.x
    const dy = punct.y - centru.y
    return {
      x: centru.x + dx * Math.cos(radiani) - dy * Math.sin(radiani),
      y: centru.y + dx * Math.sin(radiani) + dy * Math.cos(radiani),
    }
  }

  it('trage coltul SE si lasa coltul NV pe loc', () => {
    const noua = redimensioneaza(CUTIE, 'se', { x: 400, y: 300 }, LIBER)
    expect(noua).toEqual({ x: 200, y: 100, latime: 200, inaltime: 200 })
  })

  it('trage coltul NV si lasa coltul SE pe loc', () => {
    const noua = redimensioneaza(CUTIE, 'nv', { x: 250, y: 130 }, LIBER)
    expect(noua.x + noua.latime).toBe(CUTIE.x + CUTIE.latime)
    expect(noua.y + noua.inaltime).toBe(CUTIE.y + CUTIE.inaltime)
    expect(noua).toEqual({ x: 250, y: 130, latime: 80, inaltime: 44 })
  })

  it('manerul de latura schimba o singura dimensiune', () => {
    const est = redimensioneaza(CUTIE, 'e', { x: 500, y: 999 }, LIBER)
    expect(est.inaltime).toBe(CUTIE.inaltime)
    expect(est.y).toBe(CUTIE.y)
    expect(est.latime).toBe(300)

    const nord = redimensioneaza(CUTIE, 'n', { x: -999, y: 140 }, LIBER)
    expect(nord.latime).toBe(CUTIE.latime)
    expect(nord.x).toBe(CUTIE.x)
    expect(nord).toMatchObject({ y: 140, inaltime: 34 })
  })

  it('aliniaza DOAR marginea trasa, nu si pe cea opusa', () => {
    // Cutia porneste la x=205 (nealiniat). Tragand de est cu grid 20, marginea
    // din dreapta ajunge pe grid, dar stanga trebuie sa ramana exact 205 —
    // altfel obiectul ar sari desi nimeni nu l-a apucat de acolo.
    const nealiniata: Cutie = { x: 205, y: 100, latime: 130, inaltime: 74 }
    const noua = redimensioneaza(nealiniata, 'e', { x: 471, y: 100 }, { canvas: CANVAS, grid: 20 })
    expect(noua.x).toBe(205)
    expect(noua.x + noua.latime).toBe(480)
  })

  it('nu coboara sub latura minima, oricat de departe s-ar trage', () => {
    const stransa = redimensioneaza(CUTIE, 'se', { x: -5000, y: -5000 }, LIBER)
    expect(stransa.latime).toBe(20)
    expect(stransa.inaltime).toBe(20)
    // Coltul fix ramane tot NV.
    expect(stransa.x).toBe(CUTIE.x)
    expect(stransa.y).toBe(CUTIE.y)
  })

  it('INVARIANT: rezultatul sta in canvas si are laturi pozitive', () => {
    const puncte = [
      { x: -900, y: -900 },
      { x: 0, y: 0 },
      { x: 260, y: 130 },
      { x: 9000, y: 9000 },
      { x: 1199, y: 799 },
    ]
    for (const ancora of ANCORE) {
      for (const grid of [0, 20]) {
        for (const punct of puncte) {
          const noua = redimensioneaza(CUTIE, ancora, punct, { canvas: CANVAS, grid })
          const unde = `${ancora}, grid ${grid}, punct ${punct.x}/${punct.y}`
          expect(noua.latime, unde).toBeGreaterThanOrEqual(20)
          expect(noua.inaltime, unde).toBeGreaterThanOrEqual(20)
          expect(esteInCanvas(noua, CANVAS), unde).toBe(true)
        }
      }
    }
  })

  it('pe un obiect rotit, coltul opus ramane fix PE ECRAN', () => {
    // Fara corectia de translatie, micsorarea muta centrul, iar rotatia din
    // jurul lui ar plimba vizibil latura care trebuia sa stea pe loc.
    for (const rotatie of [30, 90, 200]) {
      const noua = redimensioneaza(CUTIE, 'se', { x: 260, y: 140 }, { ...LIBER, rotatie })
      const inainte = peEcran({ x: CUTIE.x, y: CUTIE.y }, CUTIE, rotatie)
      const dupa = peEcran({ x: noua.x, y: noua.y }, noua, rotatie)
      expect(dupa.x, `rotatie ${rotatie}`).toBeCloseTo(inainte.x, 6)
      expect(dupa.y, `rotatie ${rotatie}`).toBeCloseTo(inainte.y, 6)
    }
  })

  it('cu Shift pastreaza raportul laturilor', () => {
    const noua = redimensioneaza(CUTIE, 'se', { x: 600, y: 200 }, { ...LIBER, pastreazaRaport: true })
    expect(noua.latime / noua.inaltime).toBeCloseTo(CUTIE.latime / CUTIE.inaltime, 6)
  })

  it('nu strica nimic pe masuri corupte', () => {
    expect(redimensioneaza(CUTIE, 'se', { x: Number.NaN, y: 100 }, LIBER)).toEqual(CUTIE)
  })
})

describe('esteInCanvas', () => {
  it('recunoaste obiectul care iese, chiar si cu un pixel', () => {
    expect(esteInCanvas({ x: 0, y: 0, latime: 1200, inaltime: 800 }, CANVAS)).toBe(true)
    expect(esteInCanvas({ x: 1121, y: 0, latime: 80, inaltime: 80 }, CANVAS)).toBe(false)
    expect(esteInCanvas({ x: -1, y: 0, latime: 80, inaltime: 80 }, CANVAS)).toBe(false)
  })
})
