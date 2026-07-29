import { Loader2Icon } from 'lucide-react'

export function EcranIncarcare({ mesaj = 'Se incarca...' }: { mesaj?: string }) {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background"
      role="status"
      aria-live="polite"
    >
      <Loader2Icon className="size-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{mesaj}</p>
    </div>
  )
}
