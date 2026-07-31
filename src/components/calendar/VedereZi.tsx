import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent as EvenimentPointer } from 'react'
import { GripVerticalIcon, UsersIcon } from 'lucide-react'

import { aranjeazaInBenzi } from '@/components/calendar/aranjare'
import type { IntervalProgram } from '@/lib/program'
import { ora } from '@/lib/timp'
import type { Rezervare, StatusRezervare } from '@/services/rezervari'

const PX_PE_ORA = 68

/** Rezervarile se muta din 15 in 15 minute; nimeni nu rezerva la 19:07. */
const PAS_ORE = 0.25

/** Sub atatia pixeli, gestul e un click, nu o mutare. */
const PRAG_TRAGERE_PX = 4

/** Doar statusurile care ocupa efectiv masa apar pe grila (vezi table_allocations). */
const STATUSURI_ACTIVE: StatusRezervare[] = ['pending', 'confirmata', 'sosita']

const CLASE_BLOC: Record<string, string> = {
  pending: 'bg-status-expirare-soft border-status-expirare text-foreground',
  confirmata: 'bg-status-liber-soft border-status-liber text-foreground',
  sosita: 'bg-status-liber border-status-liber text-status-liber-foreground',
}

function rotunjesteLaPas(ore: number): number {
  return Math.round(ore / PAS_ORE) * PAS_ORE
}

function formateazaOra(oraZecim: number): string {
  const h = Math.floor(oraZecim)
  const m = Math.round((oraZecim - h) * 60)
  return `${String(((h % 24) + 24) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

type Props = {
  rezervari: Rezervare[]
  fus: string
  program: IntervalProgram
  onSelecteaza: (rezervare: Rezervare) => void
  onCreeazaLaOra: (oraZecimala: number) => void
  /** Ora noua, in zecimale locale. Lipsa ei dezactiveaza mutarea. */
  onMutaLaOra?: (rezervare: Rezervare, oraNoua: number) => void
}

export function VedereZi({
  rezervari,
  fus,
  program,
  onSelecteaza,
  onCreeazaLaOra,
  onMutaLaOra,
}: Props) {
  const active = useMemo(
    () => rezervari.filter((r) => STATUSURI_ACTIVE.includes(r.status)),
    [rezervari],
  )
  const blocuri = useMemo(() => aranjeazaInBenzi(active, fus), [active, fus])

  /**
   * Sursa de adevar a gestului e ref-ul, nu starea. Starea exista doar pentru
   * randare (previzualizarea blocului mutat).
   *
   * De ce: un setState nu e vizibil in handler-ul urmator daca React nu a
   * randat inca. Verificat pe o tragere scurta, cu un singur pointermove:
   * conditia pe stare o rata complet, iar gestul era interpretat ca un click.
   *
   * yInitial e in coordonate de PAGINA (pageY), nu de fereastra (clientY): daca
   * pagina deruleaza in timpul tragerii — si un calendar inalt deruleaza des,
   * mai ales pe touch — clientY se schimba fara ca degetul sa se miste, iar
   * delta iese greșita. Verificat: cu clientY, o rezervare trasa in jos ajungea
   * mai sus decat pornise.
   */
  const gest = useRef<{
    id: string
    pointerId: number
    yInitial: number
    delta: number
    aMutat: boolean
  } | null>(null)
  const [tragere, setTragere] = useState<{ id: string; deltaOre: number } | null>(null)

  const oreVizibile: number[] = []
  for (let h = Math.floor(program.deLa); h < Math.ceil(program.panaLa); h++) oreVizibile.push(h)

  const inaltime = (Math.ceil(program.panaLa) - Math.floor(program.deLa)) * PX_PE_ORA
  const oraGrila = Math.floor(program.deLa)

  /** Limiteaza ora noua la grila vizibila, ca blocul sa nu iasa din ecran. */
  function limiteaza(oraNoua: number, durataOre: number): number {
    const maxim = Math.ceil(program.panaLa) - durataOre
    return Math.min(Math.max(oraNoua, oraGrila), Math.max(maxim, oraGrila))
  }

  function laPointerDown(eveniment: EvenimentPointer<HTMLButtonElement>, id: string) {
    if (!onMutaLaOra || eveniment.button !== 0) return
    // Blocul e deasupra grilei de ore; fara asta, click-ul ar deschide si
    // dialogul de rezervare noua.
    eveniment.stopPropagation()
    gest.current = {
      id,
      pointerId: eveniment.pointerId,
      yInitial: eveniment.pageY,
      delta: 0,
      aMutat: false,
    }
    setTragere({ id, deltaOre: 0 })

    // Captura pointerului tine evenimentele pe bloc si dupa ce cursorul iese
    // din el. Daca browserul o refuza (pointer deja eliberat), tragerea
    // functioneaza in continuare cat timp cursorul rămâne deasupra blocului —
    // deci nu lasam o excepție sa rupa interacțiunea.
    try {
      eveniment.currentTarget.setPointerCapture(eveniment.pointerId)
    } catch {
      /* fara captura */
    }
  }

  function laPointerMove(eveniment: EvenimentPointer<HTMLButtonElement>) {
    const g = gest.current
    // Numai pointerul care a inceput gestul il poate continua.
    if (!g || g.pointerId !== eveniment.pointerId) return

    const dy = eveniment.pageY - g.yInitial
    if (Math.abs(dy) > PRAG_TRAGERE_PX) g.aMutat = true

    const delta = rotunjesteLaPas(dy / PX_PE_ORA)
    if (delta === g.delta) return
    g.delta = delta
    setTragere({ id: g.id, deltaOre: delta })
  }

  function laPointerUp(
    eveniment: EvenimentPointer<HTMLButtonElement>,
    bloc: { rezervare: Rezervare; start: number; sfarsit: number },
  ) {
    const g = gest.current

    // Fara gest inceput aici nu avem ce confirma, iar deschiderea detaliilor e
    // treaba lui onClick. Prins de testul de tragere: cand mutarea e
    // dezactivata, pointerup-ul si click-ul chemau amandoua onSelecteaza.
    if (!g) return

    // Un pointerup din alta secventa nu are voie sa confirme o mutare.
    // Verificat: dupa un hot-reload cu butonul inca apasat, un eveniment
    // strain comita o mutare pe care nimeni nu o ceruse.
    if (g.pointerId !== eveniment.pointerId) return

    const delta = g.delta
    gest.current = null
    setTragere(null)

    if (eveniment.currentTarget.hasPointerCapture(eveniment.pointerId)) {
      eveniment.currentTarget.releasePointerCapture(eveniment.pointerId)
    }

    // Gest scurt fara deplasare = click: deschide detaliile.
    if (!g.aMutat || delta === 0 || !onMutaLaOra) {
      onSelecteaza(bloc.rezervare)
      return
    }

    const durata = bloc.sfarsit - bloc.start
    onMutaLaOra(bloc.rezervare, limiteaza(bloc.start + delta, durata))
  }

  /** Alternativa de la tastatura: Shift + sus/jos muta cu 15 minute. */
  function laTasta(
    eveniment: KeyboardEvent<HTMLButtonElement>,
    bloc: { rezervare: Rezervare; start: number; sfarsit: number },
  ) {
    if (!onMutaLaOra || !eveniment.shiftKey) return
    if (eveniment.key !== 'ArrowUp' && eveniment.key !== 'ArrowDown') return
    eveniment.preventDefault()
    const semn = eveniment.key === 'ArrowUp' ? -1 : 1
    const durata = bloc.sfarsit - bloc.start
    onMutaLaOra(bloc.rezervare, limiteaza(bloc.start + semn * PAS_ORE, durata))
  }

  return (
    <div className="flex overflow-hidden rounded-lg border border-border bg-card">
      {/* Rigla orelor */}
      <div className="w-14 shrink-0 border-r border-border pt-2">
        {oreVizibile.map((h) => (
          <div
            key={h}
            style={{ height: PX_PE_ORA }}
            className="relative border-b border-border/60 last:border-b-0"
          >
            <span className="absolute -top-2 right-1.5 text-xs text-muted-foreground tabular-nums">
              {String(h % 24).padStart(2, '0')}:00
            </span>
          </div>
        ))}
      </div>

      {/* Grila + blocuri */}
      <div className="relative flex-1 pt-2" style={{ height: inaltime + 8 }}>
        {oreVizibile.map((h) => (
          <button
            key={h}
            type="button"
            style={{ height: PX_PE_ORA }}
            onClick={() => onCreeazaLaOra(h)}
            aria-label={`Adauga rezervare la ora ${String(h % 24).padStart(2, '0')}:00`}
            className="block w-full border-b border-border/60 transition-colors last:border-b-0 hover:bg-accent/40"
          />
        ))}

        {blocuri.map((bloc) => {
          const { rezervare, start, sfarsit, banda, benzi } = bloc
          const seTrage = tragere?.id === rezervare.id
          const delta = seTrage ? tragere.deltaOre : 0
          const durata = sfarsit - start
          const startAfisat = seTrage ? limiteaza(start + delta, durata) : start

          const sus = (startAfisat - oraGrila) * PX_PE_ORA
          const inaltimeBloc = Math.max(durata * PX_PE_ORA - 3, 24)
          const latime = 100 / benzi

          return (
            <button
              key={rezervare.id}
              type="button"
              onPointerDown={(e) => laPointerDown(e, rezervare.id)}
              onPointerMove={laPointerMove}
              onPointerUp={(e) => laPointerUp(e, bloc)}
              onPointerCancel={(e) => laPointerUp(e, bloc)}
              onClick={() => {
                // Fara suport de pointer (sau cu mutarea dezactivata) rămâne
                // comportamentul simplu de click.
                if (!onMutaLaOra) onSelecteaza(rezervare)
              }}
              onKeyDown={(e) => laTasta(e, bloc)}
              style={{
                top: sus,
                height: inaltimeBloc,
                left: `calc(${banda * latime}% + 3px)`,
                width: `calc(${latime}% - 6px)`,
              }}
              className={`absolute touch-none overflow-hidden rounded-md border-l-3 px-2 py-1 text-left text-xs shadow-sm ${
                seTrage
                  ? 'z-20 cursor-grabbing opacity-90 ring-2 ring-canvas-selectie'
                  : `transition-transform hover:z-10 hover:scale-[1.01] ${onMutaLaOra ? 'cursor-grab' : ''}`
              } ${CLASE_BLOC[rezervare.status] ?? CLASE_BLOC.confirmata}`}
            >
              <div className="flex items-center gap-1.5 font-medium">
                {onMutaLaOra && <GripVerticalIcon className="size-3 opacity-50" />}
                <span className="tabular-nums">
                  {seTrage && delta !== 0
                    ? formateazaOra(startAfisat)
                    : ora(rezervare.data_ora, fus)}
                </span>
                <span className="truncate">{rezervare.client_nume}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 opacity-80">
                <span className="flex items-center gap-0.5">
                  <UsersIcon className="size-3" />
                  {rezervare.nr_persoane}
                </span>
                {rezervare.masa && <span>Masa {rezervare.masa.numar_masa}</span>}
                {!rezervare.masa && <span className="italic">fara masa</span>}
              </div>
            </button>
          )
        })}

        {blocuri.length === 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-6 text-center text-sm text-muted-foreground">
            Nicio rezervare activa. Click pe o ora pentru a adauga una.
          </p>
        )}
      </div>
    </div>
  )
}
