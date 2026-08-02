import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { SearchIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { RUTE } from '@/lib/rute'
import { CHEI_SA, getRestaurante } from '@/services/super-admin'

/**
 * Tenant Switcher (§9.1, §38.1): command palette pe Cmd+K / Ctrl+K, cautare
 * live dupa numele restaurantului. Click pe rezultat deschide modalul View
 * Details al restaurantului — NU intrarea in dashboard-ul lui: Impersonate e
 * eliminat complet din specificatie (§38.2).
 *
 * Deschiderea View Details se face prin query param (?detalii=<id>) pe pagina
 * Restaurant Management: paleta e disponibila din orice sectiune, iar modalul
 * are o singura implementare, acolo.
 */
export function CommandPalette() {
  const [deschis, setDeschis] = useState(false)
  const navigheaza = useNavigate()

  // Lista e deja in cache-ul React Query daca s-a deschis vreo sectiune care
  // o foloseste; altfel se incarca la prima deschidere a paletei.
  const restaurante = useQuery({
    queryKey: CHEI_SA.restaurante,
    queryFn: getRestaurante,
    enabled: deschis,
  })

  useEffect(() => {
    const laTasta = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setDeschis((d) => !d)
      }
    }
    document.addEventListener('keydown', laTasta)
    return () => document.removeEventListener('keydown', laTasta)
  }, [])

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden gap-2 text-muted-foreground sm:inline-flex"
        onClick={() => setDeschis(true)}
      >
        <SearchIcon className="size-3.5" />
        Caut restaurant...
        <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">
          Ctrl K
        </kbd>
      </Button>

      <CommandDialog open={deschis} onOpenChange={setDeschis}>
        <CommandInput placeholder="Numele restaurantului..." />
        <CommandList>
          <CommandEmpty>
            {restaurante.isLoading ? 'Se încarcă...' : 'Niciun restaurant găsit.'}
          </CommandEmpty>
          <CommandGroup heading="Restaurante">
            {(restaurante.data ?? []).map((restaurant) => (
              <CommandItem
                key={restaurant.id}
                // Numele + slug + orasul intra toate in potrivire.
                value={`${restaurant.nume} ${restaurant.slug} ${restaurant.oras ?? ''}`}
                onSelect={() => {
                  setDeschis(false)
                  navigheaza(`${RUTE.superadminRestaurante}?detalii=${restaurant.id}`)
                }}
              >
                <span className="min-w-0 flex-1 truncate">{restaurant.nume}</span>
                <span className="text-xs text-muted-foreground">
                  /r/{restaurant.slug}
                  {restaurant.oras ? ` · ${restaurant.oras}` : ''}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
