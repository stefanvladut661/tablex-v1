/**
 * Sunetul scurt de alerta (§24.6) — doua tonuri din WebAudio, fara niciun
 * fisier audio: un asset ar fi inca o cerere de retea pentru doua note.
 *
 * Best-effort prin design: pana la primul gest al utilizatorului, browserul
 * poate refuza autoplay-ul — atunci ramane doar toast-ul, iar functia tace.
 */
export function sunetAlerta(): void {
  try {
    const contextAudio = new AudioContext()
    const acum = contextAudio.currentTime

    for (const [start, frecventa] of [
      [0, 880],
      [0.12, 1175],
    ] as const) {
      const oscilator = contextAudio.createOscillator()
      const volum = contextAudio.createGain()
      oscilator.type = 'sine'
      oscilator.frequency.value = frecventa
      volum.gain.setValueAtTime(0.0001, acum + start)
      volum.gain.exponentialRampToValueAtTime(0.12, acum + start + 0.02)
      volum.gain.exponentialRampToValueAtTime(0.0001, acum + start + 0.18)
      oscilator.connect(volum)
      volum.connect(contextAudio.destination)
      oscilator.start(acum + start)
      oscilator.stop(acum + start + 0.2)
    }

    // Contextul se inchide singur dupa ce notele s-au stins.
    setTimeout(() => void contextAudio.close(), 600)
  } catch {
    // fara sunet — toast-ul ramane
  }
}
