import { Link } from 'react-router'
import { LogOutIcon, MoonIcon, SunIcon, UsersIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useNotificari } from '@/hooks/useNotificari'
import { useTema } from '@/hooks/useTema'
import { RUTE } from '@/lib/rute'

/**
 * Stub. Navbar-ul, sidebar-ul si calendarul propriu-zis vin in Faza 4;
 * pagina exista acum ca sa validam lantul auth -> garda -> profil.
 */
export function DashboardPage() {
  const { profil, utilizator, deconectare } = useAuth()
  const { temaEfectiva, comutaTema } = useTema()
  const notificari = useNotificari()

  if (!profil || profil.tip !== 'admin') return null

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold tracking-tight">
              Table<span className="text-primary">X</span>
            </span>
            <Badge variant="secondary">{profil.restaurant.nume}</Badge>
          </div>

          <div className="flex items-center gap-2">
            {profil.cont.rol === 'manager' && (
              <Button asChild variant="ghost" size="sm">
                <Link to={RUTE.appEchipa}>
                  <UsersIcon />
                  Echipa
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={comutaTema} aria-label="Comuta tema">
              {temaEfectiva === 'dark' ? <SunIcon /> : <MoonIcon />}
            </Button>
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
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Panou de control</CardTitle>
            <CardDescription>
              Calendarul, harta 2D si lista de rezervari se adauga in Faza 4.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Utilizator</dt>
                <dd className="font-medium">{profil.cont.nume ?? utilizator?.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Rol</dt>
                <dd className="font-medium capitalize">{profil.cont.rol}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Restaurant</dt>
                <dd className="font-medium">
                  {profil.restaurant.nume} <span className="text-muted-foreground">/{profil.restaurant.slug}</span>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="font-medium">
                  {profil.restaurant.plan === 'pro_floor' ? 'Pro (floor plan)' : 'Start'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
