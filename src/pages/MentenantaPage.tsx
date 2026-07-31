import { Loader2Icon, WrenchIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useSetariApp } from '@/hooks/useSetariApp'

/**
 * Ecranul de mentenanta (§47.2). Mesajul vine din `app_settings`, scris de
 * echipa TableX din Setari globale — nu e hardcodat aici, altfel comutatorul
 * din panou ar fi din nou decorativ.
 *
 * Butonul de reincercare exista fiindca altfel omul ramane blocat aici si
 * dupa ce mentenanta s-a terminat: garda il trimite incoace o singura data,
 * iar de la sine nimic nu-l intoarce.
 */
export function MentenantaPage() {
  const setari = useSetariApp()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <WrenchIcon className="size-6 text-status-expirare" />
      <h1 className="text-2xl font-semibold tracking-tight">Revenim imediat</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {setari.data?.mesaj_mentenanta ?? 'TableX este in mentenanta. Revenim in scurt timp.'}
      </p>
      <p className="max-w-md text-xs text-muted-foreground">
        Rezervarile deja confirmate nu sunt afectate.
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={setari.isFetching}
        onClick={() => void setari.refetch()}
      >
        {setari.isFetching && <Loader2Icon className="animate-spin" />}
        Reincearca
      </Button>
    </div>
  )
}
