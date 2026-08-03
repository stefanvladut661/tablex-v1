import { RotateCcwIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { IntervalProgram } from '@/lib/program'

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
 * Cat timp esti pe „acum", harta te urmeaza; din clipa in care alegi alta ora,
 * nu se mai misca sub tine — altfel previzualizarea ar sari inapoi in mijlocul
 * unei decizii.
 *
 * Bara NU-si mai tine propriul ceas. „Acum" vine de sus, din acelasi hook din
 * care il ia si harta: cand fiecare si-l calcula singur, cele doua divergeau
 * dupa un minut si bara declara „previzualizare" o harta pe care n-o atinsese
 * nimeni. La fel, „esti pe prezent" nu se mai deduce comparand numere in
 * virgula mobila, ci se stie: `urmarestePrezentul` e adevarat exact cat timp
 * nu s-a fixat nicio ora.
 */
export function BaraOrara({
  program,
  oraAfisata,
  oraLive,
  urmarestePrezentul,
  onSchimba,
}: {
  program: IntervalProgram
  oraAfisata: number
  /** Ora reala, acum, deja incadrata in programul zilei. */
  oraLive: number
  urmarestePrezentul: boolean
  /** `null` inseamna „revino la acum si urmareste-l mai departe". */
  onSchimba: (ora: number | null) => void
}) {
  const sloturi: number[] = []
  for (let o = Math.floor(program.deLa); o <= program.panaLa; o += PAS_ORE) sloturi.push(o)

  return (
    <div className="grid gap-2">
      <div
        role="group"
        aria-label="Ora afișată pe hartă"
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
              aria-label={`Arată sala la ora ${formateazaOra(slot)}`}
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

      {!urmarestePrezentul && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-status-expirare bg-status-expirare-soft px-3 py-2">
          <p className="text-sm">
            <span className="font-medium">Previzualizare pentru ora {formateazaOra(oraAfisata)}</span>
            <span className="text-muted-foreground">
              {' '}
              — mesele arată cum vor fi atunci, nu cum sunt acum.
            </span>
          </p>
          <Button size="xs" variant="outline" onClick={() => onSchimba(null)}>
            <RotateCcwIcon className="size-3.5" />
            Revino la acum
          </Button>
        </div>
      )}
    </div>
  )
}
