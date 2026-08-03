import { useEffect, useState } from 'react'

import { oraZecimala } from '@/lib/timp'

/**
 * Ora curenta a restaurantului, ca numar zecimal, reactualizata din minut in
 * minut (§28.12).
 *
 * Sta intr-un hook, nu in componenta hartii, fiindca „acum" trebuie sa aiba o
 * SINGURA sursa: bara orara si harta il citeau separat, fiecare cu ceasul ei,
 * si divergeau. Consecinta era ca harta ramanea la ora incarcarii paginii, iar
 * bara — care isi avansa ceasul — o declara „previzualizare" si aprindea un
 * banner de avertisment pe care nimeni nu-l ceruse.
 *
 * Reactualizam si la revenirea in prim-plan, nu doar pe interval: browserele
 * incetinesc sau opresc setInterval in taburile ascunse, iar tableta de la
 * receptie sta stinsa intre doua grupuri. Fara asta, prima privire dupa trezire
 * ar arata sala de acum o ora — exact cazul pe care il reparam.
 */
export function useOraCurenta(fus: string): number {
  const [acum, setAcum] = useState(() => oraZecimala(new Date(), fus))

  useEffect(() => {
    const citeste = () => setAcum(oraZecimala(new Date(), fus))

    // Fusul se poate schimba din Setari cat timp pagina e deschisa.
    citeste()

    const id = setInterval(citeste, 60_000)
    const laVizibilitate = () => {
      if (document.visibilityState === 'visible') citeste()
    }
    document.addEventListener('visibilitychange', laVizibilitate)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', laVizibilitate)
    }
  }, [fus])

  return acum
}
