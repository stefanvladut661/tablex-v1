import { useMemo } from 'react'
import { UsersIcon } from 'lucide-react'

import { aranjeazaInBenzi } from '@/components/calendar/aranjare'
import type { IntervalProgram } from '@/lib/program'
import { ora } from '@/lib/timp'
import type { Rezervare, StatusRezervare } from '@/services/rezervari'

const PX_PE_ORA = 68

/** Doar statusurile care ocupa efectiv masa apar pe grila (vezi table_allocations). */
const STATUSURI_ACTIVE: StatusRezervare[] = ['pending', 'confirmata', 'sosita']

const CLASE_BLOC: Record<string, string> = {
  pending: 'bg-status-expirare-soft border-status-expirare text-foreground',
  confirmata: 'bg-status-liber-soft border-status-liber text-foreground',
  sosita: 'bg-status-liber border-status-liber text-status-liber-foreground',
}

type Props = {
  rezervari: Rezervare[]
  fus: string
  program: IntervalProgram
  onSelecteaza: (rezervare: Rezervare) => void
  onCreeazaLaOra: (oraZecimala: number) => void
}

export function VedereZi({ rezervari, fus, program, onSelecteaza, onCreeazaLaOra }: Props) {
  const active = useMemo(
    () => rezervari.filter((r) => STATUSURI_ACTIVE.includes(r.status)),
    [rezervari],
  )
  const blocuri = useMemo(() => aranjeazaInBenzi(active, fus), [active, fus])

  const oreVizibile: number[] = []
  for (let h = Math.floor(program.deLa); h < Math.ceil(program.panaLa); h++) oreVizibile.push(h)

  const inaltime = (Math.ceil(program.panaLa) - Math.floor(program.deLa)) * PX_PE_ORA
  const oraGrila = Math.floor(program.deLa)

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

        {blocuri.map(({ rezervare, start, sfarsit, banda, benzi }) => {
          const sus = (start - oraGrila) * PX_PE_ORA
          const inaltimeBloc = Math.max((sfarsit - start) * PX_PE_ORA - 3, 24)
          const latime = 100 / benzi

          return (
            <button
              key={rezervare.id}
              type="button"
              onClick={() => onSelecteaza(rezervare)}
              style={{
                top: sus,
                height: inaltimeBloc,
                left: `calc(${banda * latime}% + 3px)`,
                width: `calc(${latime}% - 6px)`,
              }}
              className={`absolute overflow-hidden rounded-md border-l-3 px-2 py-1 text-left text-xs shadow-sm transition-transform hover:z-10 hover:scale-[1.01] ${
                CLASE_BLOC[rezervare.status] ?? CLASE_BLOC.confirmata
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium">
                <span className="tabular-nums">{ora(rezervare.data_ora, fus)}</span>
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
