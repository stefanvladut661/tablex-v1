import { useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router'
import {
  BarChart3Icon,
  Building2Icon,
  CoinsIcon,
  LogOutIcon,
  MenuIcon,
  MessageSquareIcon,
  MoonIcon,
  PaletteIcon,
  SettingsIcon,
  SunIcon,
  TicketIcon,
} from 'lucide-react'

import { ClopotelEchipa } from '@/components/superadmin/ClopotelEchipa'
import { CommandPalette } from '@/components/superadmin/CommandPalette'
import { ServerHealth } from '@/components/superadmin/ServerHealth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/hooks/useAuth'
import { useNotificari } from '@/hooks/useNotificari'
import { useRealtimeEchipa } from '@/hooks/useRealtime'
import { useTema } from '@/hooks/useTema'
import { RUTE } from '@/lib/rute'
import type { Enums } from '@/types/database'

/**
 * Command Center-ul echipei TableX (§9.2): sidebar cu 7 sectiuni, header cu
 * Tenant Switcher (Cmd+K), Server Health si notificari interne (§9.1), footer
 * cu versiunea si indicatorul Realtime (§9.3).
 *
 * Sectiunile se filtreaza pe ROL (§47.4) — dar filtrarea din sidebar e doar
 * politetea interfetei: refuzul real sta in politicile RLS din baza (migratia
 * roluri_echipa_interna). Un designer care scrie /superadmin/restaurante in
 * bara de adrese e redirectat; unul care cheama REST-ul direct primeste zero
 * randuri la orice interventie.
 */

type RolIntern = Enums<'super_admin_rol'>

type Sectiune = {
  cale: string
  eticheta: string
  icoana: typeof BarChart3Icon
  roluri: RolIntern[]
}

const SECTIUNI: Sectiune[] = [
  { cale: RUTE.superadmin, eticheta: 'Overview', icoana: BarChart3Icon, roluri: ['super_admin'] },
  {
    cale: RUTE.superadminStudio,
    eticheta: 'Floor Plan Studio',
    icoana: PaletteIcon,
    roluri: ['super_admin', 'designer_architect'],
  },
  {
    cale: RUTE.superadminRestaurante,
    eticheta: 'Restaurante',
    icoana: Building2Icon,
    // Suportul vede datele de contact (§47.4) — pagina isi ascunde singura
    // interventiile pentru el, iar baza le refuza oricum.
    roluri: ['super_admin', 'support'],
  },
  { cale: RUTE.superadminFinante, eticheta: 'Finante', icoana: CoinsIcon, roluri: ['super_admin'] },
  {
    cale: RUTE.superadminComunicari,
    eticheta: 'Comunicari',
    icoana: MessageSquareIcon,
    roluri: ['super_admin'],
  },
  {
    cale: RUTE.superadminSuport,
    eticheta: 'Suport',
    icoana: TicketIcon,
    roluri: ['super_admin', 'support'],
  },
  {
    cale: RUTE.superadminSetari,
    eticheta: 'Setari',
    icoana: SettingsIcon,
    roluri: ['super_admin', 'designer_architect', 'support'],
  },
]

const ETICHETE_ROL: Record<RolIntern, string> = {
  super_admin: 'Super Admin',
  designer_architect: 'Designer / Architect',
  support: 'Support',
}

function sectiuniPentru(rol: RolIntern): Sectiune[] {
  return SECTIUNI.filter((s) => s.roluri.includes(rol))
}

function Meniu({ rol, laNavigare }: { rol: RolIntern; laNavigare?: () => void }) {
  return (
    <nav className="grid gap-1">
      {sectiuniPentru(rol).map(({ cale, eticheta, icoana: Icoana }) => (
        <NavLink
          key={cale}
          to={cale}
          end={cale === RUTE.superadmin}
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
      ))}
    </nav>
  )
}

export function LayoutSuperAdmin() {
  const { profil, utilizator, deconectare } = useAuth()
  const { temaEfectiva, comutaTema } = useTema()
  const notificariUi = useNotificari()
  const locatie = useLocation()
  const [meniuDeschis, setMeniuDeschis] = useState(false)

  // Hook-urile nu au voie sa depinda de un return: apel neconditionat.
  const realtimeConectat = useRealtimeEchipa(profil?.tip === 'super_admin')

  if (!profil || profil.tip !== 'super_admin') return null
  const rol = profil.cont.rol

  // Garda de sectiune pe rol (§47.4): calea curenta trebuie sa fie una dintre
  // sectiunile permise rolului. Editorul de plan are propria garda in router.
  const permise = sectiuniPentru(rol)
  const sectiuneaCurenta = SECTIUNI.find((s) =>
    s.cale === RUTE.superadmin
      ? locatie.pathname === s.cale
      : locatie.pathname.startsWith(s.cale),
  )
  if (sectiuneaCurenta && !permise.some((s) => s.cale === sectiuneaCurenta.cale)) {
    return <Navigate to={permise[0]?.cale ?? RUTE.superadmin} replace />
  }

  const antetSidebar = (
    <Link to={permise[0]?.cale ?? RUTE.superadmin} className="flex items-center gap-2 px-2.5 py-1">
      <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
        Table<span className="text-sidebar-primary">X</span>
      </span>
      <Badge variant="secondary" className="text-[10px] uppercase">
        Super-Admin
      </Badge>
    </Link>
  )

  return (
    <div className="min-h-svh bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Sidebar-ul poarta cei 30% din regula 60-30-10 (§3). */}
      <aside className="hidden border-r border-sidebar-border bg-sidebar p-3 lg:flex lg:flex-col lg:gap-4">
        {antetSidebar}
        <Meniu rol={rol} />

        <div className="mt-auto grid gap-2 border-t border-sidebar-border pt-3">
          <div className="px-2.5">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {profil.cont.nume ?? utilizator?.email}
            </p>
            <p className="text-xs text-sidebar-foreground/60">{ETICHETE_ROL[rol]}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-sidebar-foreground/80"
            onClick={() => {
              void deconectare().catch((eroare) => notificariUi.eroare(eroare))
            }}
          >
            <LogOutIcon />
            Iesi din cont
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={meniuDeschis} onOpenChange={setMeniuDeschis}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Meniu">
                  <MenuIcon />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-64 flex-col gap-4 bg-sidebar p-3">
                <SheetTitle className="sr-only">Navigare</SheetTitle>
                {antetSidebar}
                <Meniu rol={rol} laNavigare={() => setMeniuDeschis(false)} />
              </SheetContent>
            </Sheet>

            {/* Tenant Switcher-ul cauta date de restaurante — §47.4 il tine
                departe de designer, care n-are acces la Restaurant Management. */}
            {rol !== 'designer_architect' && <CommandPalette />}
          </div>

          <div className="flex items-center gap-1">
            <ServerHealth />
            <ClopotelEchipa />
            <Button variant="ghost" size="icon-sm" onClick={comutaTema} aria-label="Comuta tema">
              {temaEfectiva === 'dark' ? <SunIcon /> : <MoonIcon />}
            </Button>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>

        {/* Footer §9.3: versiunea + confirmarea conexiunii Realtime. */}
        <footer className="flex items-center justify-end gap-3 border-t border-border px-4 py-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className={`size-1.5 rounded-full ${
                realtimeConectat ? 'bg-status-liber' : 'bg-status-ocupat'
              }`}
              aria-hidden="true"
            />
            Realtime {realtimeConectat ? 'conectat' : 'deconectat'}
          </span>
          <span className="tabular-nums">TableX v1.0.0 (Production)</span>
        </footer>
      </div>
    </div>
  )
}
