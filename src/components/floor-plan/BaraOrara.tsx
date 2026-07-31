import { useEffect, useState } from 'react'
import { RotateCcwIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { IntervalProgram } from '@/lib/program'
import { oraZecimala } from '@/lib/timp'

/** Un slot la 30 de minute: destul de fin ca sa prinzi un schimb de tura. */
const PAS_ORE = 0.5

function formateazaOra(oraZecim: number): string {
  const h = Math.floor(oraZecim)
  const m = Math.round((oraZecim - h) * 60)
  return `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Selectorul orar de deasupra hartii (§28.12 — marcat in spec drept „functie
 * critica, obligatorie").
 *
 * De ce conteaza: harta arata implicit ACUM, iar „acum" raspunde la o singura
 * intrebare — cine sta la masa in clipa asta. Intrebarea pe care o pune de fapt
 * receptia, de zece ori pe seara, e alta: „la 21:00 mai am unde sa pun patru
 * oameni?". Fara bara, raspunsul cere deschiderea calendarului si socoteala in
 * cap peste durate si buffere.
 *
 * Ora curenta se reactualizeaza singura din minut in minut. Cat timp esti pe
 * „acum", harta te urmeaza; din clipa in care alegi alta ora, nu se mai misca
 * sub tine — altfel previzualizarea ar sari inapoi in mijlocul unei decizii.
 */
export function BaraOrara({
  program,
  fus,
  oraAfisata,
  onSchimba,
}: {
  program: IntervalProgram
  fus: string
  oraAfisata: number
  onSchimba: (ora: number) => void
}) {
  const [acum, setAcum] = useState(() => oraZecimala(new Date(), fus))

  useEffect(() => {
    const id = setInterval(() => setAcum(oraZecimala(new Date(), fus)), 60_000)
    return () => clearInterval(id)
  }, [fus])

  const oraLive = Math.min(Math.max(acum, program.deLa), program.panaLa)
  // Toleranta de o secunda: comparatia pe numere in virgula mobila nu are voie
  // sa decida daca esti „pe acum" sau in previzualizare.
  const pePrezent = Math.abs(oraAfisata - oraLive) < 1 / 3600

  const sloturi: number[] = []
  for (let o = Math.floor(program.deLa); o <= program.panaLa; o += PAS_ORE) sloturi.push(o)

  return (
    <div className="grid gap-2">
      <div
        role="group"
        aria-label="Ora afisata pe harta"
        className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1.5"
      >
        {sloturi.map((slot) => {
          const ales = Math.abs(slot - oraAfisata) < PAS_ORE / 2
          const trecut = slot < oraLive
          // Orele intregi poarta eticheta; jumatatile raman liniute, ca bara sa
          // fie citibila dintr-o privire pe o tableta tinuta in mana.
          const intreaga = Number.isInteger(slot)
          return (
            <button
              key={slot}
              type="button"
              aria-pressed={ales}
              aria-label={`Arata sala la ora ${formateazaOra(slot)}`}
              onClick={() => onSchimba(slot)}
              className={`shrink-0 rounded-md px-2 py-1 text-xs tabular-nums transition-colors ${
                ales
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : trecut
                    ? 'text-muted-foreground hover:bg-muted'
                    : 'hover:bg-muted'
              } ${intreaga ? '' : 'opacity-70'}`}
            >
              {intreaga ? formateazaOra(slot) : '·'}
            </button>
          )
        })}
      </div>

      {!pePrezent && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-status-expirare bg-status-expirare-soft px-3 py-2">
          <p className="text-sm">
            <span className="font-medium">Previzualizare pentru ora {formateazaOra(oraAfisata)}</span>
            <span className="text-muted-foreground">
              {' '}
              — mesele arata cum vor fi atunci, nu cum sunt acum.
            </span>
          </p>
          <Button size="xs" variant="outline" onClick={() => onSchimba(oraLive)}>
            <RotateCcwIcon className="size-3.5" />
            Revino la acum
          </Button>
        </div>
      )}
    </div>
  )
}
