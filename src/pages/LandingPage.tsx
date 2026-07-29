import { Link } from 'react-router'
import { CalendarClockIcon, LayoutGridIcon, UsersIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { RUTE, ruteDupaLogin } from '@/lib/rute'

const CARACTERISTICI = [
  {
    icoana: LayoutGridIcon,
    titlu: 'Harta 2D interactiva',
    text: 'Vezi salile si mesele exact ca in realitate, cu status in timp real.',
  },
  {
    icoana: CalendarClockIcon,
    titlu: 'Calendar si walk-in',
    text: 'Rezervari pe zi, saptamana sau luna, plus clienti sositi fara programare.',
  },
  {
    icoana: UsersIcon,
    titlu: 'CRM integrat',
    text: 'Istoric, preferinte si no-show-uri pentru fiecare client, automat.',
  },
]

/** Varianta minimala. Hero-ul complet, preturile si FAQ-ul vin in Faza 2. */
export function LandingPage() {
  const { esteAutentificat, profil } = useAuth()

  return (
    <div className="min-h-svh bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold tracking-tight">
          Table<span className="text-primary">X</span>
        </span>

        {esteAutentificat ? (
          <Button asChild size="sm">
            <Link to={ruteDupaLogin(profil?.tip ?? null)}>Deschide panoul</Link>
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to={RUTE.login}>Autentificare</Link>
            </Button>
            <Button asChild size="sm">
              <Link to={RUTE.signup}>Incepe gratuit</Link>
            </Button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20">
        <section className="py-16 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Rezervarile restaurantului tau, pe o singura harta
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground text-pretty">
            TableX inlocuieste agenda de la receptie: plan de sala 2D, rezervari in timp real si
            istoricul clientilor, intr-un singur ecran.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild>
              <Link to={RUTE.signup}>Creeaza cont</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={RUTE.login}>Am deja cont</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {CARACTERISTICI.map(({ icoana: Icoana, titlu, text }) => (
            <Card key={titlu}>
              <CardHeader>
                <Icoana className="size-5 text-primary" />
                <CardTitle className="mt-2">{titlu}</CardTitle>
                <CardDescription>{text}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </section>
      </main>
    </div>
  )
}
