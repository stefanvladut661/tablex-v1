import { WrenchIcon } from 'lucide-react'

/**
 * Placeholder. Mesajul real vine din app_settings.mesaj_mentenanta,
 * odata cu comutatorul global de mentenanta (§47, Faza 5).
 */
export function MentenantaPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <WrenchIcon className="size-6 text-status-expirare" />
      <h1 className="text-2xl font-semibold tracking-tight">Revenim imediat</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        TableX este in mentenanta. Rezervarile deja confirmate nu sunt afectate.
      </p>
    </div>
  )
}
