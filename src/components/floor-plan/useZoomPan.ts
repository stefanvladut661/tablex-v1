import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as EvenimentPointer } from 'react'

import type { Vedere } from '@/lib/geometrie-plan'

export const SCARA_MIN = 0.4
export const SCARA_MAX = 4
const PAS = 1.25

type Punct = { x: number; y: number }

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
/**
 * @param scaraInitiala Incadrarea cu care porneste harta. Vine din
 *   `zones.zoom_implicit`, fixata de echipa TableX — restul aplicatiei o
 *   afiseaza, nu o schimba.
 * @param interactiv Cand e fals, gesturile de zoom/pan sunt inerte: harta
 *   ramane exact la incadrarea primita. Doar editorul echipei o porneste.
 */
export function useZoomPan(scaraInitiala = 1, interactiv = true) {
  const refSvg = useRef<SVGSVGElement | null>(null)
  const [vedere, setVedere] = useState<Vedere>({
    scara: limiteaza(scaraInitiala),
    x: 0,
    y: 0,
  })

  // Nu mai exista o incadrare salvata pe zona care sa fie preluata din mers:
  // canvasul E incadrarea, si el nu se schimba sub ochii utilizatorului. Efectul
  // care resincroniza scara a fost scos odata cu `zones.zoom_implicit`.

  /** Ultimul punct atins in timpul unei trageri; null cand nu se trage. */
  const ultimulPunct = useRef<Punct | null>(null)

  /**
   * Pinch-to-zoom (§32.3): pointerii activi, in coordonate de ECRAN. Distanta
   * dintre degete se masoara pe ecran, nu in spatiul user — acolo scala pe
   * care tocmai o schimbam ar intra in propria masuratoare si zoom-ul ar fugi.
   * Doar ancora (mijlocul dintre degete) se converteste in user, la aplicare.
   */
  const pointeriActivi = useRef<Map<number, Punct>>(new Map())
  const distantaPinch = useRef<number | null>(null)

  const punctUser = useCallback((clientX: number, clientY: number): Punct | null => {
    const svg = refSvg.current
    const ctm = svg?.getScreenCTM()
    if (!ctm) return null
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }, [])

  /** Scaleaza pastrand fix punctul-ancora (implicit: centrul viewBox-ului). */
  const scaleaza = useCallback((factor: number, ancora?: Punct) => {
    if (!interactiv) return
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
  }, [interactiv])

  // preventDefault pe wheel cere un listener ne-pasiv, deci nu poate fi
  // atasat prin onWheel din React.
  useEffect(() => {
    const svg = refSvg.current
    if (!svg || !interactiv) return

    function laWheel(eveniment: WheelEvent) {
      eveniment.preventDefault()
      scaleaza(
        eveniment.deltaY < 0 ? PAS : 1 / PAS,
        punctUser(eveniment.clientX, eveniment.clientY) ?? undefined,
      )
    }

    svg.addEventListener('wheel', laWheel, { passive: false })
    return () => svg.removeEventListener('wheel', laWheel)
  }, [punctUser, scaleaza, interactiv])

  const laPointerDown = useCallback(
    (eveniment: EvenimentPointer<SVGSVGElement>) => {
      if (!interactiv) return
      if (eveniment.button !== 0 && eveniment.button !== 1) return
      pointeriActivi.current.set(eveniment.pointerId, {
        x: eveniment.clientX,
        y: eveniment.clientY,
      })

      // Al doilea deget transforma gestul in pinch; pan-ul se opreste.
      if (pointeriActivi.current.size === 2) {
        const [a, b] = [...pointeriActivi.current.values()]
        distantaPinch.current = Math.hypot(b.x - a.x, b.y - a.y)
        ultimulPunct.current = null
      } else {
        const punct = punctUser(eveniment.clientX, eveniment.clientY)
        if (punct) ultimulPunct.current = punct
      }

      eveniment.currentTarget.setPointerCapture(eveniment.pointerId)
    },
    // `interactiv` lipsea din lista: handler-ul se oprea pe steagul de la prima
    // randare, deci o harta care devine interactiva mai tarziu ar fi ramas
    // inerta la pan pana la remontare.
    [punctUser, interactiv],
  )

  // Pan incremental (delta fata de ultima poziție), ca sa nu fie nevoie de
  // offsetul de la inceputul tragerii. Cu doua degete: pinch, nu pan.
  const laPointerMove = useCallback(
    (eveniment: EvenimentPointer<SVGSVGElement>) => {
      if (!interactiv) return
      if (pointeriActivi.current.has(eveniment.pointerId)) {
        pointeriActivi.current.set(eveniment.pointerId, {
          x: eveniment.clientX,
          y: eveniment.clientY,
        })
      }

      if (pointeriActivi.current.size >= 2 && distantaPinch.current !== null) {
        const [a, b] = [...pointeriActivi.current.values()]
        const distanta = Math.hypot(b.x - a.x, b.y - a.y)
        if (distanta > 0 && distantaPinch.current > 0) {
          const ancora = punctUser((a.x + b.x) / 2, (a.y + b.y) / 2) ?? undefined
          scaleaza(distanta / distantaPinch.current, ancora)
        }
        distantaPinch.current = distanta
        return
      }

      const anterior = ultimulPunct.current
      if (!anterior) return
      const acum = punctUser(eveniment.clientX, eveniment.clientY)
      if (!acum) return
      ultimulPunct.current = acum
      setVedere((v) => ({ ...v, x: v.x + (acum.x - anterior.x), y: v.y + (acum.y - anterior.y) }))
    },
    [punctUser, scaleaza, interactiv],
  )

  const laPointerUp = useCallback(
    (eveniment: EvenimentPointer<SVGSVGElement>) => {
      pointeriActivi.current.delete(eveniment.pointerId)
      if (pointeriActivi.current.size < 2) distantaPinch.current = null

      // A ramas un singur deget: pan-ul continua de unde e el acum.
      if (pointeriActivi.current.size === 1) {
        const [ramas] = [...pointeriActivi.current.values()]
        ultimulPunct.current = punctUser(ramas.x, ramas.y)
      } else {
        ultimulPunct.current = null
      }

      if (eveniment.currentTarget.hasPointerCapture(eveniment.pointerId)) {
        eveniment.currentTarget.releasePointerCapture(eveniment.pointerId)
      }
    },
    [punctUser],
  )

  const mareste = useCallback(() => scaleaza(PAS), [scaleaza])
  const micsoreaza = useCallback(() => scaleaza(1 / PAS), [scaleaza])

  /** Dimensiunile viewBox-ului — spatiul in care traieste toata aritmetica. */
  const masuraViewBox = useCallback(() => {
    const svg = refSvg.current
    if (!svg) return null
    return { latime: svg.viewBox.baseVal.width, inaltime: svg.viewBox.baseVal.height }
  }, [])

  /**
   * Sare la o scara ANUME (slider-ul manual, butonul „100%"), pastrand fix
   * centrul viewport-ului. Fara ancora, trecerea de la 250% la 100% ar arunca
   * privirea in coltul stanga-sus — exact „saritura" pe care proprietarul o
   * reclama la butoanele vechi.
   */
  const laScara = useCallback(
    (scaraCeruta: number) => {
      if (!interactiv) return
      const masura = masuraViewBox()
      const centru = masura ? { x: masura.latime / 2, y: masura.inaltime / 2 } : { x: 0, y: 0 }
      setVedere((v) => {
        const scaraNoua = limiteaza(scaraCeruta)
        if (scaraNoua === v.scara) return v
        const raport = scaraNoua / v.scara
        return {
          scara: scaraNoua,
          x: centru.x - (centru.x - v.x) * raport,
          y: centru.y - (centru.y - v.y) * raport,
        }
      })
    },
    [interactiv, masuraViewBox],
  )

  /**
   * Revine la incadrarea de pornire — adica la CANVASUL intreg, fiindca
   * viewBox-ul e chiar canvasul zonei: scara 1, fara translatie. E si ce vede
   * restaurantul dupa publicare, deci butonul are un inteles verificabil.
   */
  const reseteaza = useCallback(
    () => setVedere({ scara: limiteaza(scaraInitiala), x: 0, y: 0 }),
    [scaraInitiala],
  )

  /**
   * Pan cu delta explicita, in coordonatele viewBox-ului — pentru gazde care
   * isi tin singure gesturile (EditorZona imparte pointerdown-ul intre
   * tragerea meselor si tragerea vederii, deci nu poate folosi `handlers`).
   */
  const deplaseaza = useCallback((dx: number, dy: number) => {
    setVedere((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
  }, [])

  return {
    refSvg,
    vedere,
    mareste,
    micsoreaza,
    laScara,
    reseteaza,
    deplaseaza,
    handlers: {
      onPointerDown: laPointerDown,
      onPointerMove: laPointerMove,
      onPointerUp: laPointerUp,
      onPointerCancel: laPointerUp,
    },
  }
}
