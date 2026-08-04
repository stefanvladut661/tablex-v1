/**
 * Orchestrator: gestiune useInView, useReducedMotion, bucla async,
 * toate MotionValues, și montarea BuilderCanvas.
 */

import { useEffect, useRef, useState } from 'react'
import { useMotionValue, useMotionValueEvent, animate } from 'motion/react'
import { useInView, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router'

import { SectionHeading, PILULA } from '@/components/ui/landing-blocks'
import { Button } from '@/components/ui/button'
import { RUTE } from '@/lib/rute'
import { TIMELINE, EASE, CANVAS, PALETTE, masaA, masaB } from './motion.config'
import { BuilderCanvas } from './BuilderCanvas'


export function BuilderPreview() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sceneRef, { amount: 0.4, once: false })
  const prefersReducedMotion = useReducedMotion()

  // Stări discrete (nu interpolate)
  const [capacitate, setCapacitate] = useState(2)
  const [showCapacityChip, setShowCapacityChip] = useState(false)
  const [showJoinChip, setShowJoinChip] = useState(false)
  const [joiningAnim, setJoiningAnim] = useState(false)
  const [stareFinala, setStareFinala] = useState(false)

  // MotionValues continue — cu subscribe la useState pentru props
  const cursorX = useMotionValue(PALETTE.x + PALETTE.latime / 2)
  const cursorY = useMotionValue(PALETTE.y + PALETTE.inaltime / 2)
  const cursorVisible = useMotionValue(0)
  const masaBX = useMotionValue(50)
  const masaBY = useMotionValue(CANVAS.inaltime / 2)
  const masaBRotatie = useMotionValue(0)

  const [cursorXState, setCursorXState] = useState(0)
  const [cursorYState, setCursorYState] = useState(0)
  const [cursorVisibleState, setCursorVisibleState] = useState(false)
  const [cursorClicking, setCursorClicking] = useState(false)
  const [masaBXState, setMasaBXState] = useState(50)
  const [masaBYState, setMasaBYState] = useState(CANVAS.inaltime / 2)
  const [masaBRotatieState, setMasaBRotatieState] = useState(0)

  useMotionValueEvent(cursorX as any, 'change', setCursorXState)
  useMotionValueEvent(cursorY as any, 'change', setCursorYState)
  useMotionValueEvent(cursorVisible as any, 'change', (v: any) => setCursorVisibleState(v > 0.5))
  useMotionValueEvent(masaBX as any, 'change', setMasaBXState)
  useMotionValueEvent(masaBY as any, 'change', setMasaBYState)
  useMotionValueEvent(masaBRotatie as any, 'change', setMasaBRotatieState)

  const anulat = useRef(false)
  const activeControls = useRef<any[]>([])

  function stopAll() {
    anulat.current = true
    activeControls.current.forEach((ctrl) => ctrl.stop())
    activeControls.current = []
  }

  function resetState() {
    setCapacitate(2)
    setShowCapacityChip(false)
    setShowJoinChip(false)
    setJoiningAnim(false)
    setStareFinala(false)
    setCursorClicking(false)

    cursorX.set(PALETTE.x + PALETTE.latime / 2)
    cursorY.set(PALETTE.y + PALETTE.inaltime / 2)
    cursorVisible.set(0)
    masaBX.set(50)
    masaBY.set(CANVAS.inaltime / 2)
    masaBRotatie.set(0)
  }

  async function ciclu() {
    anulat.current = false
    activeControls.current = []

    while (!anulat.current) {
      try {
        // Faza 0: Idle — cursorul apare
        await animateMotionValue(
          cursorVisible,
          1,
          TIMELINE.idle.fade_in * 1000,
        )

        // Faza 1: Apucă și plasează
        // 1a: Cursor → paletă (deja e acolo, fade-in doar)
        await delay(100)

        // 1b: Masa B apare la capacitate 2, la poziția paletei
        // (instant, deci nu animez) — poziția e top-left al mesei
        masaBX.set(PALETTE.x + 10)
        masaBY.set(PALETTE.y + 10)

        // 1c: Cursor + masa se mută pe canvas (cursor urmărește centrul mesei)
        const dragDuration =
          (TIMELINE.grab_and_place.drag_end -
            TIMELINE.grab_and_place.drag_start) *
          1000
        const centerX = 280 // Centrul mesei pe canvas
        const centerY = CANVAS.inaltime / 2

        const ctrl1 = animate(cursorX, centerX, {
          duration: dragDuration / 1000,
          ease: EASE.expo,
        })
        const ctrl2 = animate(masaBX, centerX - 40, {
          duration: dragDuration / 1000,
          ease: EASE.expo,
        })
        const ctrl3 = animate(masaBY, centerY - 40, {
          duration: dragDuration / 1000,
          ease: EASE.expo,
        })

        activeControls.current.push(ctrl1, ctrl2, ctrl3)
        await Promise.all([
          ctrl1,
          ctrl2,
          ctrl3,
        ])

        // 1d: Mini-bounce la aterizare (mică oscilație)
        const bounceDuration =
          (TIMELINE.grab_and_place.settle_bounce -
            TIMELINE.grab_and_place.drag_end) *
          1000
        const bounceCtrl = animate(masaBY, CANVAS.inaltime / 2 + 10, {
          duration: bounceDuration / 2000,
        })
        activeControls.current.push(bounceCtrl)
        await bounceCtrl
        await animate(masaBY, CANVAS.inaltime / 2, {
          duration: bounceDuration / 2000,
        })

        // Faza 2: Adaugă scaune
        // 2a: Chip de capacitate apare
        setShowCapacityChip(true)
        await delay(200)

        // 2b: Trei click-uri discrete: 2→4→6→8
        const capacitati = [4, 6, 8]
        for (const cap of capacitati) {
          if (anulat.current) break
          setCursorClicking(true)
          setCapacitate(cap)
          await delay(200)
          setCursorClicking(false)
          await delay(200)
        }

        // 2c: Chip dispare
        setShowCapacityChip(false)
        await delay(200)

        // Faza 3: Rotește
        await delay(200)
        const rotateDuration =
          (TIMELINE.rotate.rotate_end - TIMELINE.rotate.handle_appear) * 1000
        const rotateCtrl = animate(masaBRotatie, 130, {
          duration: rotateDuration / 1000,
          ease: EASE.inOut,
        })
        activeControls.current.push(rotateCtrl)
        await rotateCtrl

        // Faza 4: Trage și unește
        await delay(100)

        // 4a: Masa B se trage lângă masa A
        const joinDragDuration =
          (TIMELINE.drag_to_join.drag_end - TIMELINE.drag_to_join.drag_start) *
          1000
        // Masa A e la x=420, deci masa B (80 wide) se plasează lângă ea: center ~= 380
        const finalCenterX = 380
        const joinCtrl = animate(masaBX, finalCenterX - 40, {
          duration: joinDragDuration / 1000,
          ease: EASE.expo,
        })
        activeControls.current.push(joinCtrl)
        await joinCtrl

        // 4b: Chip „Unește" apare
        setShowJoinChip(true)
        await delay(200)

        // 4c: Click pe chip
        setCursorClicking(true)
        await delay(150)

        // Setează grup_unire_id pe ambele mese (triggering stare finală)
        setStareFinala(true)
        setJoiningAnim(true)
        setCursorClicking(false)

        // 4d: Puls de evidențiere
        await delay(400)
        setJoiningAnim(false)

        // Faza 5: Pauză pe cadrul final
        await delay(1200)

        // Faza 6: Fade + reset
        const fadeCtrl = animate(cursorVisible, 0, {
          duration: 0.5,
        })
        activeControls.current.push(fadeCtrl)
        await fadeCtrl

        // Reset instant pentru următoarea buclă
        resetState()

        if (!anulat.current) {
          await delay(500)
        }
      } catch (e) {
        if (!anulat.current) {
          console.error('Ciclu eroare:', e)
        }
      }
    }
  }

  useEffect(() => {
    if (prefersReducedMotion) {
      // Reduced motion: render starea finală, fără animație
      setCapacitate(8)
      setStareFinala(true)
      masaBX.set(340)
      masaBY.set(CANVAS.inaltime / 2)
      masaBRotatie.set(130)
      setCursorVisibleState(false)
      return
    }

    if (!inView) {
      stopAll()
      resetState()
      return
    }

    ciclu()

    return () => {
      stopAll()
    }
  }, [inView, prefersReducedMotion])

  // Fixture-urile celor două mese
  const masa_a = masaA()
  const masa_b = masaB({
    pozitie_x: masaBXState,
    pozitie_y: masaBYState,
    rotatie: masaBRotatieState,
    capacitate,
    grup_unire_id: stareFinala ? 'grup-demo' : null,
  })

  return (
    <section
      id="builder-preview"
      ref={sceneRef}
      className="wrap-landing scroll-mt-20 py-16"
    >
      <SectionHeading
        eticheta="Demonstrație"
        titlu="Construiește o masă în secunde"
        subtitlu="Drag pe canvas, rotire cu mouse, click pentru a adăuga scaune și a uni mese. Totul de la echipa TableX, nu de la tine — dar iată cât de precis și ușor e instrumentul nostru."
      />

      <div className="mt-10">
        <BuilderCanvas
          masaA={masa_a}
          masaB={masa_b}
          cursorX={cursorXState}
          cursorY={cursorYState}
          cursorVisible={cursorVisibleState}
          cursorClicking={cursorClicking}
          capacitate={capacitate}
          showCapacityChip={showCapacityChip}
          showJoinChip={showJoinChip}
          joiningAnim={joiningAnim}
        />
      </div>

      <div className="mt-6 flex justify-center">
        <Button asChild size="lg" variant="outline" className={PILULA}>
          <Link to={RUTE.demoHarta}>Deschide demonstrația completă</Link>
        </Button>
      </div>
    </section>
  )
}

/** Utilitar: animate MotionValue și returnează promise */
function animateMotionValue(
  value: any,
  target: number,
  duration: number,
): Promise<void> {
  return new Promise((resolve) => {
    animate(value, target, {
      duration: duration / 1000,
      onComplete: () => resolve(),
    })
  })
}

/** Utilitar: delay helper */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
