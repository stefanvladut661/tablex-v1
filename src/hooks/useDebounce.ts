import { useEffect, useState } from 'react'

/**
 * Intarzie propagarea unei valori. Folosit pentru verificarea slug-ului:
 * altfel fiecare tasta ar declansa un apel la baza de date.
 */
export function useDebounce<T>(valoare: T, intarziereMs = 400): T {
  const [intarziata, setIntarziata] = useState(valoare)

  useEffect(() => {
    const timer = setTimeout(() => setIntarziata(valoare), intarziereMs)
    return () => clearTimeout(timer)
  }, [valoare, intarziereMs])

  return intarziata
}
