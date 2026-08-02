import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GripVerticalIcon, UsersIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CHEI_ASTEPTARE,
  getListaAsteptare,
  type IntrareAsteptare,
} from '@/services/lista-asteptare'

/** Minutele de asteptare se recalculeaza singure, altfel raman inghetate. */
function minuteDeLa(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
}

/**
 * Lista de asteptare, langa harta (§28.7).
 *
 * Spec-ul o cere ca panou PERMANENT langa plan, nu ca pagina separata, si are
 * dreptate din motive de flux: cele doua se citesc impreuna. Se elibereaza masa
 * 7 → cine urmeaza? Cu doua ecrane, raspunsul cere un drum dus-intors si tinerea
 * minte a unui nume.
 *
 * Asezarea NU marcheaza doar intrarea ca rezolvata: deschide walk-in-ul
 * precompletat, iar oaspetele iese din coada abia DUPA ce rezervarea exista
 * (decizia din §6septdecies). Altfel masa lui ar aparea libera pe harta si ar
 * putea fi data altcuiva — coada si sala ar spune lucruri diferite.
 */
export function PanouAsteptare({
  restaurantId,
  onAsazaPeMasa,
  onAsaza,
}: {
  restaurantId: string
  /** Tras si lasat pe o masa: apelantul deschide walk-in-ul cu masa aceea. */
  onAsazaPeMasa: (intrare: IntrareAsteptare, tableId: string) => void
  /** Fara tragere: walk-in fara masa aleasa dinainte. */
  onAsaza: (intrare: IntrareAsteptare) => void
}) {
  const [tras, setTras] = useState<{ intrare: IntrareAsteptare; x: number; y: number } | null>(null)
  const refTras = useRef<{ intrare: IntrareAsteptare; pointerId: number } | null>(null)

  const lista = useQuery({
    queryKey: CHEI_ASTEPTARE.lista(restaurantId),
    queryFn: () => getListaAsteptare(restaurantId),
    enabled: Boolean(restaurantId),
    // Minutele de asteptare imbatranesc singure; fara asta ar ramane la valoarea
    // de la incarcare, iar panoul ar minti linistit toata seara.
    refetchInterval: 60_000,
  })

  /**
   * Ascultatorii stau pe FEREASTRA, nu pe panou: tragerea porneste dintr-un
   * element HTML si se termina pe canvasul SVG, deci nu exista un parinte comun
   * pe care sa prinzi tot gestul.
   *
   * Se ataseaza IMEDIAT, in pointerdown — nu dintr-un `useEffect` pe stare.
   * Diferenta nu e stilistica: efectul ruleaza abia dupa re-randare, iar un
   * gest scurt (apasare si ridicare in acelasi cadru) s-ar termina inainte ca
   * ascultatorii sa existe. Prins la prima verificare, unde tragerea nu facea
   * absolut nimic si nici macar nu se plangea.
   */
  const refCuratare = useRef<(() => void) | null>(null)

  function porneste(intrare: IntrareAsteptare, e: ReactPointerEvent) {
    refTras.current = { intrare, pointerId: e.pointerId }
    setTras({ intrare, x: e.clientX, y: e.clientY })

    const laMove = (ev: PointerEvent) => {
      if (refTras.current?.pointerId !== ev.pointerId) return
      setTras((t) => (t ? { ...t, x: ev.clientX, y: ev.clientY } : null))
    }

    const laUp = (ev: PointerEvent) => {
      const gest = refTras.current
      if (gest?.pointerId !== ev.pointerId) return
      refTras.current = null
      setTras(null)
      refCuratare.current?.()

      // Aceeasi metoda ca la mutarea rezervarii: intrebam DOM-ul ce e sub deget.
      const sub = document.elementFromPoint(ev.clientX, ev.clientY)
      const masa = sub?.closest('[data-masa-id]')?.getAttribute('data-masa-id')
      if (masa) onAsazaPeMasa(gest.intrare, masa)
    }

    window.addEventListener('pointermove', laMove)
    window.addEventListener('pointerup', laUp)
    window.addEventListener('pointercancel', laUp)
    refCuratare.current = () => {
      window.removeEventListener('pointermove', laMove)
      window.removeEventListener('pointerup', laUp)
      window.removeEventListener('pointercancel', laUp)
      refCuratare.current = null
    }
  }

  // Demontare in mijlocul unui gest (schimbarea zonei, navigare): ascultatorii
  // de pe fereastra nu au voie sa supravietuiasca panoului.
  useEffect(() => () => refCuratare.current?.(), [])

  const asteapta = lista.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Așteaptă
          {asteapta.length > 0 && (
            <span className="ml-1.5 text-sm text-muted-foreground tabular-nums">
              {asteapta.length}
            </span>
          )}
        </CardTitle>
        <CardDescription>Trage un oaspete pe o masă liberă ca să-l așezi.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {lista.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : asteapta.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nimeni la coadă. Oaspeții veniți fără rezervare, când nu e masă liberă, se adaugă din
            pagina Așteptare.
          </p>
        ) : (
          <ul className="grid gap-1.5">
            {asteapta.map((intrare, indice) => (
              <li
                key={intrare.id}
                className="flex items-center gap-2 rounded-md border border-border p-2"
              >
                <button
                  type="button"
                  aria-label={`Trage-l pe ${intrare.nume} pe o masă`}
                  className="cursor-grab touch-none text-muted-foreground"
                  onPointerDown={(e) => porneste(intrare, e)}
                >
                  <GripVerticalIcon className="size-4" />
                </button>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground tabular-nums">{indice + 1}.</span>
                    <span className="truncate text-sm font-medium">{intrare.nume}</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 tabular-nums">
                      <UsersIcon className="size-3" />
                      {intrare.nr_persoane}
                    </span>
                    <span className="tabular-nums">
                      de {minuteDeLa(intrare.created_at)} min
                    </span>
                  </span>
                </span>

                <Button size="xs" variant="outline" onClick={() => onAsaza(intrare)}>
                  Așază
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {/* Urma trasa: pozitionata fix, deasupra a tot, si transparenta la
          pointer — altfel ar fi ea insasi elementul de sub deget la ridicare. */}
      {tras && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-md bg-canvas-selectie px-2 py-1 text-xs font-medium text-background shadow-md"
          style={{ left: tras.x, top: tras.y }}
        >
          {tras.intrare.nume} · {tras.intrare.nr_persoane} pers.
        </div>
      )}
    </Card>
  )
}
