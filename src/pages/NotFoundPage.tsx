import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { RUTE } from '@/lib/rute'

export function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">Eroare 404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Pagina nu exista</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Linkul e gresit sau pagina a fost mutata.
      </p>
      <Button asChild variant="outline">
        <Link to={RUTE.acasa}>Inapoi la pagina principala</Link>
      </Button>
    </div>
  )
}
