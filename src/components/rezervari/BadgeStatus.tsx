import { ETICHETE_STATUS_REZERVARE } from '@/lib/etichete'
import type { StatusRezervare } from '@/services/rezervari'

/**
 * Aceleasi culori ca pe harta 2D (Traffic Light System, §3): amber pentru ce
 * cere atentie, verde pentru confirmat, rosu pentru problema.
 */
const CLASE: Record<StatusRezervare, string> = {
  pending: 'bg-status-expirare-soft text-foreground',
  confirmata: 'bg-status-liber-soft text-foreground',
  sosita: 'bg-status-liber text-status-liber-foreground',
  anulata: 'bg-status-inactiv-soft text-foreground',
  no_show: 'bg-status-ocupat-soft text-foreground',
  respinsa: 'bg-status-inactiv-soft text-foreground',
}

export function BadgeStatus({
  status,
  className,
}: {
  status: StatusRezervare
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${CLASE[status]} ${className ?? ''}`}
    >
      {ETICHETE_STATUS_REZERVARE[status]}
    </span>
  )
}
