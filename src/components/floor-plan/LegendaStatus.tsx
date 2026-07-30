import { ETICHETE_STATUS, type StatusMasa } from '@/types/floor-plan'

const PASTILE: Array<{ status: StatusMasa; clasa: string }> = [
  { status: 'liber', clasa: 'bg-status-liber' },
  { status: 'ocupat', clasa: 'bg-status-ocupat' },
  { status: 'expirare', clasa: 'bg-status-expirare' },
  { status: 'eveniment', clasa: 'bg-status-eveniment' },
  { status: 'inactiv', clasa: 'bg-status-inactiv' },
]

export function LegendaStatus({ className }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs ${className ?? ''}`}>
      {PASTILE.map(({ status, clasa }) => (
        <li key={status} className="flex items-center gap-1.5">
          <span className={`size-2.5 rounded-full ${clasa}`} aria-hidden="true" />
          <span className="text-muted-foreground">{ETICHETE_STATUS[status]}</span>
        </li>
      ))}
    </ul>
  )
}
