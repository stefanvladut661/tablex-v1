import { useEffect, useRef } from 'react'
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
 * Iesirea din prezent NU mai e o alarma. Avea o banda portocalie cu text, adica
 * exact culoarea pe care Traffic Light-ul (§3, §7.4) o rezerva meselor care se
 * elibereaza — pe un ecran unde tocmai culoarea e informatia, o banda portocalie
 * care nu spune nimic despre mese e zgomot. Si nu era nici o greseala: alegerea
 * altei ore e chiar ce cere bara sa faci. A ramas doar butonul de intoarcere, iar
 * ora aleasa se vede oricum aprinsa in bara.
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

  /**
   * Ora aleasa se aduce singura in mijlocul barei.
   *
   * Bara tine o zi intreaga si se deruleaza pe orizontala, deci slotul aprins
   * poate cadea in afara ferestrei — la deschidere, cand „acum" e seara, sau
   * dupa ce butonul de intoarcere apare si ingusteaza bara. O ora aleasa pe
   * care n-o vezi arata ca si cum nu s-ar fi intamplat nimic.
   *
   * `scrollTo` pe container, nu `scrollIntoView` pe buton: al doilea ar putea
   * misca si pagina de sub el.
   *
   * Distanta se ia din dreptunghiuri, nu din `offsetLeft`: acela se masoara
   * fata de `offsetParent`, adica primul stramos POZITIONAT — bara nu e unul,
   * deci valoarea venea din alt sistem de referinta si derularea ateriza mereu
   * la zero. (Prima incercare a facut exact asta.)
   */
  const refBara = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const bara = refBara.current
    const ales = bara?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!bara || !ales) return
    const cadru = bara.getBoundingClientRect()
    const slot = ales.getBoundingClientRect()
    const ideal = bara.scrollLeft + (slot.left - cadru.left) - cadru.width / 2 + slot.width / 2

    /**
     * Pozitia se ROTUNJESTE la inceputul celui mai apropiat slot, ca marginea
     * din stanga sa nu taie niciodata o ora in doua („15:00" injumatatit se
     * citeste „5:00"). `scroll-snap` singur nu ajunge: pe o derulare pornita
     * din cod, Chrome nu o aplica de fiecare data — verificat, cateva ore
     * ramaneau taiate. Snap-ul ramane pentru derularea cu degetul.
     */
    let tinta = ideal
    let ceaMaiMica = Infinity
    for (const copil of bara.children) {
      const pozitie = bara.scrollLeft + (copil.getBoundingClientRect().left - cadru.left)
      const distanta = Math.abs(pozitie - ideal)
      if (distanta < ceaMaiMica) {
        ceaMaiMica = distanta
        tinta = pozitie
      }
    }

    // Instantaneu, nu `smooth`: derularea lina s-a dovedit inerta la testare
    // (cererea pleaca, pozitia nu se schimba), iar pe o bara de sloturi n-ar
    // adauga nimic — ora aleasa trebuie sa fie acolo cand te uiti, nu peste
    // trei sute de milisecunde.
    bara.scrollTo({ left: tinta })
  }, [oraAfisata, urmarestePrezentul])

  return (
    /**
     * Grid cu `minmax(0, 1fr)`, nu un rand flex.
     *
     * Intr-un rand flex, latimea min-content a randului ramane suma sloturilor
     * (~1100px) chiar si cu `min-w-0` pe bara — iar cand bara sta intr-o coloana
     * de grid `1fr`, minimul automat al coloanei devine tocmai acela si intreaga
     * pagina capata bara de derulare orizontala. `minmax(0, 1fr)` spune explicit
     * ca prima coloana are voie sa coboare la zero; bara isi deruleaza sloturile
     * pe orizontala, cum a facut mereu.
     */
    /**
     * Aceeasi tema inchisa ca harta de sub ea, si din acelasi motiv (vezi
     * HartaZona): bara si planul se citesc impreuna, dintr-o privire, de la
     * distanta, in sala. O bara alba lipita de un plan de noapte taia ecranul
     * in doua si arunca lumina in ochi exact acolo unde se uita ospatarul cel
     * mai des. Clasa `dark` rescrie tokenii doar inauntru, deci nicio culoare
     * nu se scrie de mana (regula 2).
     *
     * `text-foreground` de aici NU e decorativ, e obligatoriu. `dark` schimba
     * doar VARIABILELE; o proprietate mostenita a fost deja rezolvata mai sus,
     * pe `body`, cu valorile temei deschise, si coboara ca atare in subarbore.
     * Butonul „Revino la ora curentă" nu-si pune singur o culoare de text, deci
     * mostenea #0f172a — exact fundalul barei. Buton invizibil, gasit in browser.
     */
    <div
      className={`dark grid items-center gap-2 rounded-lg border border-border bg-card p-1.5 text-foreground shadow-sm ${
        urmarestePrezentul ? '' : 'grid-cols-[minmax(0,1fr)_auto]'
      }`}
    >
      <div
        ref={refBara}
        role="group"
        aria-label="Ora afișată pe hartă"
        /**
         * Se deruleaza, dar FARA bara de derulare vizibila. Bara aia taia o
         * dunga gri peste sloturi si arata a defect intr-un rand de butoane
         * care oricum se aduce singur la ora aleasa: nimeni nu trebuie s-o
         * apuce ca sa ajunga undeva. Derularea cu rotita si cu degetul ramane.
         */
        className="flex min-w-0 snap-x snap-mandatory gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        /**
         * Doua masuri impotriva aceleiasi urate: ora taiata in doua la marginea
         * ferestrei. „15:00" injumatatit se citea „5:00", adica fix ca o eroare
         * de randare.
         *
         * Alinierea (`snap-x snap-mandatory` + `snap-start` pe sloturi) face ca
         * bara sa se opreasca mereu cu un slot INTREG lipit de marginea din
         * stanga. Estomparea de la capete acopera restul si spune „mai e ceva
         * acolo" — ce faceau inainte capetele barei de derulare.
         */
        style={{
          maskImage:
            'linear-gradient(to right, transparent 0, #000 14px, #000 calc(100% - 22px), transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0, #000 14px, #000 calc(100% - 22px), transparent 100%)',
        }}
      >
        {sloturi.map((slot) => {
          const ales = Math.abs(slot - oraAfisata) < PAS_ORE / 2
          const acum = Math.abs(slot - oraLive) < PAS_ORE / 2
          const trecut = slot < oraLive
          // Orele intregi poarta eticheta; jumatatile raman liniute, ca bara sa
          // fie citibila dintr-o privire pe o tableta tinuta in mana.
          const intreaga = Number.isInteger(slot)
          return (
            <button
              key={slot}
              type="button"
              aria-pressed={ales}
              aria-label={`Arată sala la ora ${formateazaOra(slot)}${acum ? ' (ora curentă)' : ''}`}
              onClick={() => onSchimba(slot)}
              className={`shrink-0 snap-start rounded-md px-3 py-1.5 text-sm font-medium tabular-nums transition-colors ${
                ales
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : trecut
                    ? // Orele trecute raman mai stinse decat restul, dar nu
                      // sterse: si ele se pot alege, ca sa vezi cum a fost sala.
                      'text-foreground/60 hover:bg-muted hover:text-foreground'
                    : // Orele care urmeaza se scriu cu culoarea textului, nu cu
                      // cea „stinsa": pe fundalul inchis, restul zilei trebuie
                      // sa se citeasca de la distanta, nu doar sa se ghiceasca.
                      'text-foreground hover:bg-muted'
              } ${
                // Reperul „acum", cat timp privirea e in alta parte a zilei. E un
                // inel, nu o umplere: umplerea e rezervata slotului ALES, iar
                // doua sloturi umplute diferit s-ar citi ca doua selectii.
                acum && !ales ? 'ring-1 ring-primary ring-inset' : ''
              } ${intreaga ? '' : 'px-1 text-muted-foreground'}`}
            >
              {intreaga ? formateazaOra(slot) : '·'}
            </button>
          )
        })}
      </div>

      {!urmarestePrezentul && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={() => onSchimba(null)}
          title={`Harta arată ora ${formateazaOra(oraAfisata)}. Revino la ${formateazaOra(oraLive)}.`}
        >
          <RotateCcwIcon className="size-3.5" />
          Revino la ora curentă
        </Button>
      )}
    </div>
  )
}
