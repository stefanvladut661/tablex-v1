import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import {
  CalendarDaysIcon,
  ClockIcon,
  ContactIcon,
  FileTextIcon,
  HouseIcon,
  LayoutGridIcon,
  ListIcon,
  SettingsIcon,
  MenuIcon,
  MoonIcon,
  SunIcon,
  TicketIcon,
} from 'lucide-react'

import { ClopotelNotificari } from '@/components/ClopotelNotificari'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { MeniuCont } from '@/components/layout/MeniuCont'
import { useAuth } from '@/hooks/useAuth'
import { useRealtimeRestaurant } from '@/hooks/useRealtime'
import { useTema } from '@/hooks/useTema'
import { RUTE } from '@/lib/rute'

type ElementNav = {
  cale: string
  eticheta: string
  icoana: typeof CalendarDaysIcon
  doarManager?: boolean
}

const NAVIGATIE: ElementNav[] = [
  { cale: RUTE.app, eticheta: 'Acasă', icoana: HouseIcon },
  { cale: RUTE.appCalendar, eticheta: 'Calendar', icoana: CalendarDaysIcon },
  { cale: RUTE.appRezervari, eticheta: 'Lista rezervări', icoana: ListIcon },
  { cale: RUTE.appHarta, eticheta: 'Harta sălii', icoana: LayoutGridIcon },
  { cale: RUTE.appAsteptare, eticheta: 'Așteptare', icoana: ClockIcon },
  { cale: RUTE.appClienti, eticheta: 'Clienți', icoana: ContactIcon },
  { cale: RUTE.appFormular, eticheta: 'Formular', icoana: FileTextIcon, doarManager: true },
  { cale: RUTE.appEvenimente, eticheta: 'Evenimente', icoana: TicketIcon },
  { cale: RUTE.appSetari, eticheta: 'Setări', icoana: SettingsIcon, doarManager: true },
]

function Meniu({ laNavigare }: { laNavigare?: () => void }) {
  const { esteManager } = useAuth()

  return (
    <nav className="grid gap-1">
      {NAVIGATIE.filter((element) => !element.doarManager || esteManager).map(
        ({ cale, eticheta, icoana: Icoana }) => (
          <NavLink
            key={cale}
            to={cale}
            end={cale === RUTE.app}
            onClick={laNavigare}
            className={({ isActive }) =>
              [
                'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              ].join(' ')
            }
          >
            <Icoana className="size-4" />
            {eticheta}
          </NavLink>
        ),
      )}
    </nav>
  )
}

/**
 * Sidebar-ul e purtatorul celor 30% din regula 60-30-10 (§3), de aceea
 * foloseste tokenii --sidebar-* si nu fundalul obisnuit.
 */
export function LayoutApp() {
  const { profil, utilizator } = useAuth()
  const { temaEfectiva, comutaTema } = useTema()
  const [meniuDeschis, setMeniuDeschis] = useState(false)

  // Trebuie apelat necondiționat: hook-urile nu au voie sa depinda de un return.
  useRealtimeRestaurant(
    profil?.tip === 'admin' ? profil.restaurant.id : undefined,
    profil?.tip === 'admin' ? profil.cont.user_id : undefined,
  )

  if (profil?.tip !== 'admin') return null

  const antetSidebar = (
    <Link to={RUTE.app} className="flex items-center gap-2 px-2.5 py-1">
      <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
        Table<span className="text-sidebar-primary">X</span>
      </span>
    </Link>
  )

  return (
    <div className="min-h-svh bg-background lg:grid lg:grid-cols-[15rem_1fr]">
      {/* Sidebar fix, doar pe ecrane mari */}
      <aside className="hidden border-r border-sidebar-border bg-sidebar p-3 lg:flex lg:flex-col lg:gap-4">
        {antetSidebar}
        <Meniu />

        <div className="mt-auto grid gap-2 border-t border-sidebar-border pt-3">
          <div className="px-2.5">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {profil.cont.nume ?? utilizator?.email}
            </p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{profil.cont.rol}</p>
          </div>
          <MeniuCont />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {/* Meniu-drawer pe mobil: personalul lucreaza des de pe telefon. */}
            <Sheet open={meniuDeschis} onOpenChange={setMeniuDeschis}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Meniu">
                  <MenuIcon />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-64 flex-col gap-4 bg-sidebar p-3">
                <SheetTitle className="sr-only">Navigare</SheetTitle>
                {antetSidebar}
                <Meniu laNavigare={() => setMeniuDeschis(false)} />

                {/* Aceleasi actiuni de cont ca pe desktop. Lipseau complet din
                    sertar, deci de pe telefon nu se putea nici iesi din cont —
                    exact dispozitivul de pe care lucreaza ospatarul (§32.1). */}
                <div className="mt-auto grid gap-2 border-t border-sidebar-border pt-3">
                  <div className="px-2.5">
                    <p className="truncate text-sm font-medium text-sidebar-foreground">
                      {profil.cont.nume ?? utilizator?.email}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60 capitalize">
                      {profil.cont.rol}
                    </p>
                  </div>
                  <MeniuCont />
                </div>
              </SheetContent>
            </Sheet>

            <span className="truncate font-semibold tracking-tight">{profil.restaurant.nume}</span>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {profil.restaurant.plan === 'pro_floor' ? 'Pro' : 'Start'}
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            <ClopotelNotificari
              restaurantId={profil.restaurant.id}
              userId={profil.cont.user_id}
              fus={profil.restaurant.fus_orar}
            />
            <Button variant="ghost" size="icon-sm" onClick={comutaTema} aria-label="Comută tema">
              {temaEfectiva === 'dark' ? <SunIcon /> : <MoonIcon />}
            </Button>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
