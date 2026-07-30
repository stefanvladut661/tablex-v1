import { PlusIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatFus, isSameDay, ora, toZonedTime, ziLocala } from '@/lib/timp'
import type { Rezervare, StatusRezervare } from '@/services/rezervari'

const STATUSURI_ACTIVE: StatusRezervare[] = ['pending', 'confirmata', 'sosita']

const CLASE_CHIP: Record<string, string> = {
  pending: 'bg-status-expirare-soft text-foreground',
  confirmata: 'bg-status-liber-soft text-foreground',
  sosita: 'bg-status-liber text-status-liber-foreground',
}

type Props = {
  zile: Date[]
  rezervari: Rezervare[]
  fus: string
  onSelecteaza: (rezervare: Rezervare) => void
  onAlegeZi: (zi: Date) => void
  onCreeazaInZi: (zi: Date) => void
}

/**
 * Saptamana nu repeta grila orara a zilei: pe sapte coloane inguste, blocurile
 * proportionale devin ilizibile. Aratam liste compacte, ordonate pe ora — ce
 * are nevoie personalul cand se uita la saptamana e "cat de plin e", nu
 * poziția exacta pe axa timpului.
 */
export function VedereSaptamana({
  zile,
  rezervari,
  fus,
  onSelecteaza,
  onAlegeZi,
  onCreeazaInZi,
}: Props) {
  const active = rezervari.filter((r) => STATUSURI_ACTIVE.includes(r.status))
  const acum = toZonedTime(new Date(), fus)

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7 lg:gap-0 lg:overflow-hidden lg:rounded-lg lg:border lg:border-border">
      {zile.map((zi) => {
        const aleZilei = active.filter((r) => isSameDay(ziLocala(r.data_ora, fus), zi))
        const persoane = aleZilei.reduce((total, r) => total + r.nr_persoane, 0)
        const esteAzi = isSameDay(zi, acum)

        return (
          <div
            key={zi.toISOString()}
            className="flex min-h-40 flex-col rounded-lg border border-border bg-card lg:rounded-none lg:border-0 lg:border-r lg:border-border lg:last:border-r-0"
          >
            <div
              className={`flex items-center justify-between gap-1 border-b border-border px-2 py-1.5 ${
                esteAzi ? 'bg-accent' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => onAlegeZi(zi)}
                className="text-left hover:underline"
              >
                <div className="text-xs text-muted-foreground capitalize">
                  {formatFus(zi, 'EEE', fus)}
                </div>
                <div
                  className={`text-sm font-semibold tabular-nums ${esteAzi ? 'text-primary' : ''}`}
                >
                  {formatFus(zi, 'd MMM', fus)}
                </div>
              </button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Adauga rezervare pe ${formatFus(zi, 'd MMMM', fus)}`}
                onClick={() => onCreeazaInZi(zi)}
              >
                <PlusIcon />
              </Button>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto p-1.5">
              {aleZilei.length === 0 ? (
                <p className="px-1 py-2 text-xs text-muted-foreground">—</p>
              ) : (
                aleZilei.map((rezervare) => (
                  <button
                    key={rezervare.id}
                    type="button"
                    onClick={() => onSelecteaza(rezervare)}
                    className={`w-full rounded px-1.5 py-1 text-left text-xs ${
                      CLASE_CHIP[rezervare.status] ?? CLASE_CHIP.confirmata
                    }`}
                  >
                    <div className="flex items-center gap-1 font-medium">
                      <span className="tabular-nums">{ora(rezervare.data_ora, fus)}</span>
                      <span className="truncate">{rezervare.client_nume}</span>
                    </div>
                    <div className="opacity-80">
                      {rezervare.nr_persoane} pers.
                      {rezervare.masa ? ` · masa ${rezervare.masa.numar_masa}` : ''}
                    </div>
                  </button>
                ))
              )}
            </div>

            {aleZilei.length > 0 && (
              <div className="border-t border-border px-2 py-1 text-xs text-muted-foreground tabular-nums">
                {aleZilei.length} rezervari · {persoane} pers.
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
