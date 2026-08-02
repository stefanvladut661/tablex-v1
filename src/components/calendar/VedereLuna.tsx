import { formatFus, isSameDay, isSameMonth, toZonedTime, ziLocala } from '@/lib/timp'
import type { Rezervare, StatusRezervare } from '@/services/rezervari'

const STATUSURI_ACTIVE: StatusRezervare[] = ['pending', 'confirmata', 'sosita']
const CAPETE = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sa', 'Du']

type Props = {
  zile: Date[]
  luna: Date
  rezervari: Rezervare[]
  fus: string
  onAlegeZi: (zi: Date) => void
}

export function VedereLuna({ zile, luna, rezervari, fus, onAlegeZi }: Props) {
  const active = rezervari.filter((r) => STATUSURI_ACTIVE.includes(r.status))
  const acum = toZonedTime(new Date(), fus)
  const lunaLocala = toZonedTime(luna, fus)

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border">
        {CAPETE.map((eticheta) => (
          <div
            key={eticheta}
            className="px-2 py-1.5 text-center text-xs font-medium text-muted-foreground"
          >
            {eticheta}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {zile.map((zi) => {
          const aleZilei = active.filter((r) => isSameDay(ziLocala(r.data_ora, fus), zi))
          const persoane = aleZilei.reduce((total, r) => total + r.nr_persoane, 0)
          const inLuna = isSameMonth(zi, lunaLocala)
          const esteAzi = isSameDay(zi, acum)
          const inAsteptare = aleZilei.filter((r) => r.status === 'pending').length

          return (
            <button
              key={zi.toISOString()}
              type="button"
              onClick={() => onAlegeZi(zi)}
              className={`flex min-h-20 flex-col items-start gap-1 border-r border-b border-border p-2 text-left transition-colors last:border-r-0 hover:bg-accent/50 ${
                inLuna ? '' : 'bg-muted/40 text-muted-foreground'
              }`}
            >
              <span
                className={`text-sm tabular-nums ${
                  esteAzi
                    ? 'flex size-6 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground'
                    : 'font-medium'
                }`}
              >
                {formatFus(zi, 'd', fus)}
              </span>

              {aleZilei.length > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {aleZilei.length} rez. · {persoane} pers.
                </span>
              )}

              {inAsteptare > 0 && (
                <span className="rounded bg-status-expirare-soft px-1 text-[11px] font-medium text-foreground tabular-nums">
                  {inAsteptare} în așteptare
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
