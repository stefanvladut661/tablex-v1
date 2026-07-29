import { LogOutIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useNotificari } from '@/hooks/useNotificari'

/** Stub. Panoul echipei TableX (§43) se construieste dupa MVP-ul de restaurant. */
export function SuperAdminPage() {
  const { profil, utilizator, deconectare } = useAuth()
  const notificari = useNotificari()

  if (!profil || profil.tip !== 'super_admin') return null

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold tracking-tight">TableX · echipa</span>
            <Badge variant="secondary">{profil.cont.rol}</Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void deconectare().catch(notificari.eroare)
            }}
          >
            <LogOutIcon />
            Iesi
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Salut, {profil.cont.nume ?? utilizator?.email}</CardTitle>
            <CardDescription>
              Administrarea restaurantelor, preturile si cererile de floor plan se adauga ulterior.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    </div>
  )
}
