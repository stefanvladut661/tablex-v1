import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CHEI_SA, verificaSanatateServicii } from '@/services/super-admin'
import type { Enums } from '@/types/database'

/**
 * Server Health Indicator (§9.1, §38.3): punct verde/rosu in header, click
 * deschide un popover cu statusul fiecarui serviciu + ora ultimului check.
 *
 * Verificarea Supabase e reala — chiar apelul RPC care aduce lista. Stripe si
 * Meta raman 'degradat'/simulate cat timp §14 le tine deconectate: un punct
 * verde fals ar fi o minciuna in panoul echipei.
 */

const NUME_SERVICIU: Record<Enums<'serviciu_extern'>, string> = {
  supabase: 'Supabase',
  stripe: 'Stripe',
  meta_whatsapp: 'Meta WhatsApp Cloud API',
}

const ETICHETA_STATUS: Record<Enums<'serviciu_status'>, string> = {
  ok: 'Functioneaza',
  degradat: 'Simulat (v1)',
  indisponibil: 'Indisponibil',
}

/** Doar variabilele Traffic Light din index.css (§3) — nicio culoare directa. */
const CULOARE_STATUS: Record<Enums<'serviciu_status'>, string> = {
  ok: 'bg-status-liber',
  degradat: 'bg-status-expirare',
  indisponibil: 'bg-status-ocupat',
}

function oraCheck(iso: string): string {
  return new Date(iso).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
}

export function ServerHealth() {
  const stare = useQuery({
    queryKey: CHEI_SA.sanatate,
    queryFn: verificaSanatateServicii,
    refetchInterval: 5 * 60_000,
    retry: 1,
  })

  // Daca RPC-ul insusi a esuat, chiar baza e cea care nu raspunde.
  const bazaCazuta = stare.isError
  const servicii = stare.data ?? []
  const totulOk = !bazaCazuta && servicii.every((s) => s.status === 'ok')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Starea serviciilor">
          <span
            className={`size-2.5 rounded-full ${
              bazaCazuta ? 'bg-status-ocupat' : totulOk ? 'bg-status-liber' : 'bg-status-expirare'
            }`}
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-3 py-2">
          <p className="text-sm font-medium">Starea serviciilor</p>
        </div>

        {bazaCazuta ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            Verificarea nu a raspuns — conexiunea la Supabase pare intrerupta.
          </p>
        ) : stare.isLoading ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">Se verifica...</p>
        ) : (
          <ul className="divide-y divide-border">
            {servicii.map((serviciu) => (
              <li key={serviciu.serviciu} className="flex items-center gap-2.5 px-3 py-2.5">
                <span
                  className={`size-2 shrink-0 rounded-full ${CULOARE_STATUS[serviciu.status]}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {NUME_SERVICIU[serviciu.serviciu]}
                  </span>
                  {serviciu.detaliu && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {serviciu.detaliu}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-xs font-medium">
                    {ETICHETA_STATUS[serviciu.status]}
                  </span>
                  <span className="block text-xs text-muted-foreground tabular-nums">
                    verificat {oraCheck(serviciu.verificat_la)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
