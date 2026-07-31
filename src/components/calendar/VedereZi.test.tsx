import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { VedereZi } from '@/components/calendar/VedereZi'
import type { Rezervare } from '@/services/rezervari'

const BUCURESTI = 'Europe/Bucharest'
const PROGRAM = { deschis: true, deLa: 10, panaLa: 24 }

type MutaLaOra = (rezervare: Rezervare, oraNoua: number) => void

/** Pixeli pe ora din VedereZi. Testul depinde de el ca sa poata trage exact. */
const PX_PE_ORA = 68

/**
 * Tragerea rezervarilor pe calendar a fost singura interactiune ramasa
 * neverificata (§6septies): instrumentul de browser emite evenimente HTML5 de
 * drag, care nu trec prin handler-ul de POINTER folosit aici. Testul asta ii ia
 * locul, si e mai bun decat o verificare manuala: se repeta la fiecare rulare.
 *
 * jsdom nu implementeaza captura de pointer, deci o punem noi. Componenta
 * prinde deja exceptia de la setPointerCapture, dar `hasPointerCapture` lipsa
 * ar arunca la pointerup — adica testul ar cadea pe lipsa jsdom-ului, nu pe un
 * defect al aplicatiei.
 */
function pregatestePointerCapture(element: Element) {
  const capturate = new Set<number>()
  Object.assign(element, {
    setPointerCapture: (id: number) => capturate.add(id),
    releasePointerCapture: (id: number) => capturate.delete(id),
    hasPointerCapture: (id: number) => capturate.has(id),
  })
}

function trage(element: Element, dyPixeli: number, pasi = 3) {
  pregatestePointerCapture(element)
  const optiuni = { pointerId: 1, button: 0, bubbles: true, cancelable: true }

  element.dispatchEvent(new PointerEvent('pointerdown', { ...optiuni, clientY: 0 }))
  for (let i = 1; i <= pasi; i++) {
    element.dispatchEvent(
      new PointerEvent('pointermove', { ...optiuni, clientY: (dyPixeli * i) / pasi }),
    )
  }
  element.dispatchEvent(new PointerEvent('pointerup', { ...optiuni, clientY: dyPixeli }))
}

/** Vara, Bucurestiul e la +03:00: ora locala 19:00 = 16:00Z. */
function rezervare(oraLocala: number, durataOre: number): Rezervare {
  const laUtc = (o: number) =>
    `2026-08-04T${String(Math.floor(o) - 3).padStart(2, '0')}:${String(
      Math.round((o % 1) * 60),
    ).padStart(2, '0')}:00Z`
  return {
    id: 'r1',
    client_nume: 'Ion Popescu',
    nr_persoane: 2,
    status: 'confirmata',
    data_ora: laUtc(oraLocala),
    se_termina_la: laUtc(oraLocala + durataOre),
    masa: { numar_masa: '4', capacitate: 2 },
    zona: null,
  } as unknown as Rezervare
}

function randeaza(optiuni: { onMutaLaOra?: MutaLaOra } = {}) {
  const onSelecteaza = vi.fn()
  render(
    <VedereZi
      rezervari={[rezervare(19, 2)]}
      fus={BUCURESTI}
      program={PROGRAM}
      onSelecteaza={onSelecteaza}
      onCreeazaLaOra={vi.fn()}
      onMutaLaOra={optiuni.onMutaLaOra}
    />,
  )
  // Blocul e singurul buton cu numele clientului in el.
  const bloc = screen.getByRole('button', { name: /Ion Popescu/ })
  return { bloc, onSelecteaza }
}

describe('VedereZi — mutarea prin tragere', () => {
  it('tragerea in jos cu o ora muta rezervarea de la 19:00 la 20:00', () => {
    const onMutaLaOra = vi.fn<MutaLaOra>()
    const { bloc, onSelecteaza } = randeaza({ onMutaLaOra })

    trage(bloc, PX_PE_ORA)

    expect(onMutaLaOra).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }), 20)
    // O mutare nu e si un click: altfel s-ar deschide si dialogul de detalii.
    expect(onSelecteaza).not.toHaveBeenCalled()
  })

  it('rotunjeste la pasul de 15 minute, nu la pixelul tras', () => {
    const onMutaLaOra = vi.fn<MutaLaOra>()
    const { bloc } = randeaza({ onMutaLaOra })

    // 20 de pixeli = 0,294 ore: cel mai apropiat pas e 0,25 (15 minute).
    trage(bloc, 20)

    expect(onMutaLaOra).toHaveBeenCalledWith(expect.anything(), 19.25)
  })

  it('un gest sub pragul de tragere ramane click, nu mutare', () => {
    const onMutaLaOra = vi.fn<MutaLaOra>()
    const { bloc, onSelecteaza } = randeaza({ onMutaLaOra })

    trage(bloc, 2, 1)

    expect(onMutaLaOra).not.toHaveBeenCalled()
    expect(onSelecteaza).toHaveBeenCalledTimes(1)
  })

  it('nu lasa rezervarea sa iasa din grila: tragerea mult in sus o opreste la deschidere', () => {
    const onMutaLaOra = vi.fn<MutaLaOra>()
    const { bloc } = randeaza({ onMutaLaOra })

    trage(bloc, -50 * PX_PE_ORA)

    expect(onMutaLaOra).toHaveBeenCalledWith(expect.anything(), PROGRAM.deLa)
  })

  it('nici pe dedesubt: ultima ora posibila tine cont de durata rezervarii', () => {
    const onMutaLaOra = vi.fn<MutaLaOra>()
    const { bloc } = randeaza({ onMutaLaOra })

    trage(bloc, 50 * PX_PE_ORA)

    // Programul se termina la 24:00, rezervarea tine 2 ore.
    expect(onMutaLaOra).toHaveBeenCalledWith(expect.anything(), 22)
  })

  it('un pointerup din alta secventa nu confirma mutarea', () => {
    const onMutaLaOra = vi.fn<MutaLaOra>()
    const { bloc } = randeaza({ onMutaLaOra })
    pregatestePointerCapture(bloc)

    const optiuni = { button: 0, bubbles: true, cancelable: true }
    bloc.dispatchEvent(new PointerEvent('pointerdown', { ...optiuni, pointerId: 1, clientY: 0 }))
    bloc.dispatchEvent(
      new PointerEvent('pointermove', { ...optiuni, pointerId: 1, clientY: PX_PE_ORA }),
    )
    // Alt pointer (al doilea deget, sau un eveniment ramas de la un gest vechi).
    bloc.dispatchEvent(
      new PointerEvent('pointerup', { ...optiuni, pointerId: 2, clientY: PX_PE_ORA }),
    )

    expect(onMutaLaOra).not.toHaveBeenCalled()
  })

  it('fara onMutaLaOra, tragerea nu face nimic si blocul rămâne un buton simplu', () => {
    const { bloc, onSelecteaza } = randeaza()

    trage(bloc, PX_PE_ORA)
    bloc.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onSelecteaza).toHaveBeenCalledTimes(1)
  })
})
