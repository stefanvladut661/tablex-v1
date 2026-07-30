import { useMemo } from 'react'
import { Link } from 'react-router'
import {
  BellRingIcon,
  CalendarClockIcon,
  CheckIcon,
  ChevronDownIcon,
  LayoutGridIcon,
  MoonIcon,
  SunIcon,
  UsersIcon,
  ZapIcon,
} from 'lucide-react'

import { HartaZona } from '@/components/floor-plan/HartaZona'
import { LegendaStatus } from '@/components/floor-plan/LegendaStatus'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useSetariApp } from '@/hooks/useSetariApp'
import { useTema } from '@/hooks/useTema'
import { MESE_DEMO, STRUCTURA_DEMO, ZONE_DEMO, statusuriLaOra } from '@/lib/harta-demo'
import { RUTE, ruteDupaLogin } from '@/lib/rute'

/** Preturile din app_settings sunt numerice, fara moneda. Un singur loc. */
const MONEDA = '€'

const CARACTERISTICI = [
  {
    icoana: LayoutGridIcon,
    titlu: 'Harta 2D a salii',
    text: 'Planul real al locatiei, cu mese pe pozitiile lor. Vezi dintr-o privire ce e liber, ce e ocupat si ce se elibereaza in 20 de minute.',
  },
  {
    icoana: CalendarClockIcon,
    titlu: 'Calendar pe zi, saptamana si luna',
    text: 'Rezervarile in trei perspective, cu drag & drop intre mese si intervale.',
  },
  {
    icoana: ZapIcon,
    titlu: 'Walk-in in doua atingeri',
    text: 'Clientul intra fara rezervare: alegi masa pe harta, notezi numarul de persoane si gata.',
  },
  {
    icoana: UsersIcon,
    titlu: 'CRM automat',
    text: 'Istoric, preferinte, numar de vizite si no-show-uri, construite din rezervarile de zi cu zi.',
  },
  {
    icoana: BellRingIcon,
    titlu: 'Notificari in timp real',
    text: 'Rezervare noua, masa care expira, cerere in asteptare — ajung pe toate ecranele deschise.',
  },
]

const INTREBARI = [
  {
    q: 'Cine imi deseneaza planul salii?',
    a: 'Tu trimiti o schita sau o poza a salii, iar echipa TableX construieste planul 2D si il publica in contul tau. Nu trebuie sa desenezi nimic.',
  },
  {
    q: 'Pot lucra mai multi ospatari in acelasi timp?',
    a: 'Da. Managerul invita personalul pe email, fiecare cu rolul lui. Un cont aparține unui singur restaurant, iar ospatarii nu au acces la setari sau la facturare.',
  },
  {
    q: 'Ce se intampla cu rezervarile daca doi angajati modifica aceeasi masa?',
    a: 'Baza de date refuza suprapunerile pe aceeasi masa, inclusiv timpul de buffer dintre rezervari. Conflictul e imposibil, nu doar improbabil.',
  },
  {
    q: 'Datele clientilor sunt in siguranta?',
    a: 'Fiecare restaurant vede exclusiv datele lui, impuse prin politici la nivel de rand in baza de date. Perioada de retentie e configurabila, intre 1 si 10 ani.',
  },
  {
    q: 'Cat dureaza pana pornesc?',
    a: 'Contul si rezervarile manuale functioneaza imediat dupa inregistrare. Harta 2D apare dupa ce echipa publica planul salii.',
  },
]

function Preturi() {
  const { data: setari, isLoading, isError } = useSetariApp()

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Preturile nu au putut fi incarcate. Scrie-ne si ti le trimitem.
      </p>
    )
  }

  const pret = (valoare: number | undefined) =>
    isLoading || valoare === undefined ? (
      <Skeleton className="h-9 w-24" />
    ) : (
      <span className="text-3xl font-semibold tabular-nums">
        {valoare.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} {MONEDA}
      </span>
    )

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Start</CardTitle>
          <CardDescription>Pentru locatii care vor sa scape de agenda de hartie.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-baseline gap-1">
            {pret(setari?.pret_plan_start)}
            <span className="text-sm text-muted-foreground">/ luna</span>
          </div>
          <ul className="grid gap-2 text-sm">
            {[
              'Rezervari nelimitate',
              'Calendar zi / saptamana / luna',
              'Walk-in si lista de asteptare',
              'CRM clienti',
              'Widget public de rezervare',
            ].map((linie) => (
              <li key={linie} className="flex gap-2">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                {linie}
              </li>
            ))}
          </ul>
          <Button asChild variant="outline">
            <Link to={RUTE.signup}>Incepe cu Start</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pro</CardTitle>
            <Badge>Recomandat</Badge>
          </div>
          <CardDescription>Cu harta 2D interactiva a salii.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-baseline gap-1">
            {pret(setari?.pret_plan_pro)}
            <span className="text-sm text-muted-foreground">/ luna</span>
          </div>
          <ul className="grid gap-2 text-sm">
            {[
              'Tot ce include Start',
              'Harta 2D cu status in timp real',
              'Alocare mese direct pe plan',
              'Mese unite pentru grupuri',
              'Zone multiple (salon, terasa, etaj)',
            ].map((linie) => (
              <li key={linie} className="flex gap-2">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                {linie}
              </li>
            ))}
          </ul>
          <Button asChild>
            <Link to={RUTE.signup}>Incepe cu Pro</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurare plan 2D</CardTitle>
          <CardDescription>Serviciu unic, la cerere.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-baseline gap-1">
            {pret(setari?.setup_floor_plan_pret)}
            <span className="text-sm text-muted-foreground">o singura data</span>
          </div>
          <ul className="grid gap-2 text-sm">
            <li className="flex gap-2">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              Planul desenat de echipa TableX din schita ta
            </li>
            <li className="flex gap-2">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              {isLoading || !setari
                ? 'Include un numar de mese, apoi tarif pe masa suplimentara'
                : `Include pana la ${setari.setup_prag_mese} mese; peste, ${setari.setup_pret_masa_extra} ${MONEDA} pe masa`}
            </li>
            <li className="flex gap-2">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              Revizuiri pana cand planul e corect
            </li>
          </ul>
          <Button asChild variant="outline">
            <Link to={RUTE.signup}>Cere o oferta</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function LandingPage() {
  const { esteAutentificat, profil } = useAuth()
  const { temaEfectiva, comutaTema } = useTema()

  const zona = ZONE_DEMO[0]
  const mese = MESE_DEMO[zona.id]
  // Ora de varf: harta arata interesant, cu toate cele cinci statusuri.
  const statusuri = useMemo(() => statusuriLaOra(19.5, zona.id), [zona.id])

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="text-lg font-semibold tracking-tight">
            Table<span className="text-primary">X</span>
          </span>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#functionalitati" className="hover:text-foreground">
              Functionalitati
            </a>
            <a href="#harta" className="hover:text-foreground">
              Harta 2D
            </a>
            <a href="#preturi" className="hover:text-foreground">
              Preturi
            </a>
            <a href="#intrebari" className="hover:text-foreground">
              Intrebari
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" onClick={comutaTema} aria-label="Comuta tema">
              {temaEfectiva === 'dark' ? <SunIcon /> : <MoonIcon />}
            </Button>
            {esteAutentificat ? (
              <Button asChild size="sm">
                <Link to={ruteDupaLogin(profil?.tip ?? null)}>Deschide panoul</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to={RUTE.login}>Autentificare</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to={RUTE.signup}>Incepe gratuit</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-12 text-center">
          <Badge variant="secondary" className="mb-4">
            Pentru restaurante, baruri si terase
          </Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Rezervarile restaurantului tau, pe planul real al salii
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground text-pretty">
            TableX inlocuieste agenda de la receptie cu o harta 2D a locatiei: fiecare masa cu
            statusul ei, calendar complet, walk-in si istoricul clientilor — intr-un singur ecran.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to={RUTE.signup}>Creeaza cont</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to={RUTE.demoHarta}>Vezi harta in actiune</Link>
            </Button>
          </div>
        </section>

        {/* Functionalitati */}
        <section id="functionalitati" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-12">
          <h2 className="text-2xl font-semibold tracking-tight">Ce primesti</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CARACTERISTICI.map(({ icoana: Icoana, titlu, text }) => (
              <Card key={titlu}>
                <CardHeader>
                  <Icoana className="size-5 text-primary" />
                  <CardTitle className="mt-2 text-base">{titlu}</CardTitle>
                  <CardDescription>{text}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* Harta 2D */}
        <section id="harta" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Harta 2D, la ora 19:30</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Culoarea unei mese nu e o setare, ci rezultatul rezervarilor din momentul afisat.
                In demonstratie poti derula ziua si vedea cum se schimba sala.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={RUTE.demoHarta}>Deschide demonstratia</Link>
            </Button>
          </div>

          <LegendaStatus className="mt-4" />

          <HartaZona
            zona={zona}
            structura={STRUCTURA_DEMO[zona.id]}
            mese={mese}
            statusuri={statusuri}
            arataGrid={false}
            className="mt-3 aspect-[3/2] w-full"
          />
        </section>

        {/* Preturi */}
        <section id="preturi" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-12">
          <h2 className="text-2xl font-semibold tracking-tight">Preturi</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fara contract pe termen lung. Poti schimba planul oricand.
          </p>
          <div className="mt-6">
            <Preturi />
          </div>
        </section>

        {/* Intrebari */}
        <section id="intrebari" className="mx-auto max-w-3xl scroll-mt-20 px-6 py-12">
          <h2 className="text-2xl font-semibold tracking-tight">Intrebari frecvente</h2>
          <div className="mt-6 divide-y divide-border rounded-lg border border-border">
            {INTREBARI.map(({ q, a }) => (
              <details key={q} className="group px-4 py-3">
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium marker:content-none">
                  {q}
                  <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Table<span className="text-primary">X</span> — management de rezervari pentru
            restaurante.
          </span>
          <div className="flex gap-4">
            <Link to={RUTE.demoHarta} className="hover:text-foreground">
              Demonstratie
            </Link>
            <Link to={RUTE.login} className="hover:text-foreground">
              Autentificare
            </Link>
            <Link to={RUTE.signup} className="hover:text-foreground">
              Cont nou
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
