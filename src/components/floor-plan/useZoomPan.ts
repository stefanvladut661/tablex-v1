import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as EvenimentPointer } from 'react'

const SCARA_MIN = 0.4
const SCARA_MAX = 4
const PAS = 1.25

type Punct = { x: number; y: number }
type Vedere = { scara: number; x: number; y: number }

function limiteaza(scara: number) {
  return Math.min(SCARA_MAX, Math.max(SCARA_MIN, scara))
}

/**
 * Zoom si pan pentru un <svg> cu viewBox fix.
 *
 * Toate calculele se fac in coordonatele viewBox-ului (spatiul "user"),
 * obtinute prin getScreenCTM().inverse(): asa matematica nu depinde de
 * dimensiunea la care browserul a intins SVG-ul, nici de preserveAspectRatio.
 *
 * Scara si translatia stau in aceeasi bucata de stare, ca sa poata fi
 * actualizate atomic dintr-un singur updater functional — altfel zoom-ul cu
 * ancora ar citi un offset invechit.
 */
export function useZoomPan() {
  const refSvg = useRef<SVGSVGElement | null>(null)
  const [vedere, setVedere] = useState<Vedere>({ scara: 1, x: 0, y: 0 })

  /** Ultimul punct atins in timpul unei trageri; null cand nu se trage. */
  const ultimulPunct = useRef<Punct | null>(null)

  const punctUser = useCallback((clientX: number, clientY: number): Punct | null => {
    const svg = refSvg.current
    const ctm = svg?.getScreenCTM()
    if (!ctm) return null
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }, [])

  /** Scaleaza pastrand fix punctul-ancora (implicit: centrul viewBox-ului). */
  const scaleaza = useCallback((factor: number, ancora?: Punct) => {
    const svg = refSvg.current
    const centru =
      ancora ??
      (svg
        ? { x: svg.viewBox.baseVal.width / 2, y: svg.viewBox.baseVal.height / 2 }
        : { x: 0, y: 0 })

    setVedere((v) => {
      const scaraNoua = limiteaza(v.scara * factor)
      if (scaraNoua === v.scara) return v
      const raport = scaraNoua / v.scara
      return {
        scara: scaraNoua,
        x: centru.x - (centru.x - v.x) * raport,
        y: centru.y - (centru.y - v.y) * raport,
      }
    })
  }, [])

  // preventDefault pe wheel cere un listener ne-pasiv, deci nu poate fi
  // atasat prin onWheel din React.
  useEffect(() => {
    const svg = refSvg.current
    if (!svg) return

    function laWheel(eveniment: WheelEvent) {
      eveniment.preventDefault()
      scaleaza(
        eveniment.deltaY < 0 ? PAS : 1 / PAS,
        punctUser(eveniment.clientX, eveniment.clientY) ?? undefined,
      )
    }

    svg.addEventListener('wheel', laWheel, { passive: false })
    return () => svg.removeEventListener('wheel', laWheel)
  }, [punctUser, scaleaza])

  const laPointerDown = useCallback(
    (eveniment: EvenimentPointer<SVGSVGElement>) => {
      if (eveniment.button !== 0 && eveniment.button !== 1) return
      const punct = punctUser(eveniment.clientX, eveniment.clientY)
      if (!punct) return
      ultimulPunct.current = punct
      eveniment.currentTarget.setPointerCapture(eveniment.pointerId)
    },
    [punctUser],
  )

  // Pan incremental (delta fata de ultima poziție), ca sa nu fie nevoie de
  // offsetul de la inceputul tragerii.
  const laPointerMove = useCallback(
    (eveniment: EvenimentPointer<SVGSVGElement>) => {
      const anterior = ultimulPunct.current
      if (!anterior) return
      const acum = punctUser(eveniment.clientX, eveniment.clientY)
      if (!acum) return
      ultimulPunct.current = acum
      setVedere((v) => ({ ...v, x: v.x + (acum.x - anterior.x), y: v.y + (acum.y - anterior.y) }))
    },
    [punctUser],
  )

  const laPointerUp = useCallback((eveniment: EvenimentPointer<SVGSVGElement>) => {
    ultimulPunct.current = null
    if (eveniment.currentTarget.hasPointerCapture(eveniment.pointerId)) {
      eveniment.currentTarget.releasePointerCapture(eveniment.pointerId)
    }
  }, [])

  const mareste = useCallback(() => scaleaza(PAS), [scaleaza])
  const micsoreaza = useCallback(() => scaleaza(1 / PAS), [scaleaza])
  const reseteaza = useCallback(() => setVedere({ scara: 1, x: 0, y: 0 }), [])

  return {
    refSvg,
    vedere,
    mareste,
    micsoreaza,
    reseteaza,
    handlers: {
      onPointerDown: laPointerDown,
      onPointerMove: laPointerMove,
      onPointerUp: laPointerUp,
      onPointerCancel: laPointerUp,
    },
  }
}
