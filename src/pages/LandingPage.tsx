import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowRightIcon,
  BellRingIcon,
  CalendarClockIcon,
  CalendarX2Icon,
  CombineIcon,
  EyeOffIcon,
  LayoutGridIcon,
  MousePointerClickIcon,
  PencilRulerIcon,
  PhoneCallIcon,
  UserPlusIcon,
  UsersIcon,
  ZapIcon,
} from 'lucide-react'

import { HartaZona } from '@/components/floor-plan/HartaZona'
import { LegendaStatus } from '@/components/floor-plan/LegendaStatus'
import { Button } from '@/components/ui/button'
import { CtaBand } from '@/components/ui/cta-band'
import { FAQ, type IntrebareFaq } from '@/components/ui/faq-tabs'
import { Hero } from '@/components/hero/Hero'
import { Navbar } from '@/components/hero/Navbar'
import {
  DarkBand,
  FeatureRow,
  ProblemCards,
  QuoteCards,
  SectionHeading,
  TrustChips,
  PILULA,
  type Problema,
  type RandFunctionalitate,
  type Testimonial,
} from '@/components/ui/landing-blocks'
import { PricingSection, type PlanPreturi } from '@/components/ui/pricing-section'
import { StepsSection, type PasFlux } from '@/components/ui/steps-section'
import { TimelineContent } from '@/components/ui/timeline-animation'
import { useSetariApp } from '@/hooks/useSetariApp'
import { MESE_DEMO, STRUCTURA_DEMO, ZONE_DEMO, statusuriLaOra } from '@/lib/harta-demo'
import { ETICHETE_STATUS } from '@/types/floor-plan'
import { RUTE } from '@/lib/rute'

/** Preturile din app_settings sunt numerice, fara moneda. Un singur loc. */
const MONEDA = '€'

const PROBLEME: Problema[] = [
  {
    icoana: PhoneCallIcon,
    titlu: 'Telefonul sună în mijlocul serviciului',
    text: 'Nu poți răspunde la telefon, să notezi în agendă și să servești la mese în același timp. Așa apar rezervările pierdute și mesele date de două ori.',
  },
  {
    icoana: EyeOffIcon,
    titlu: 'Nimeni nu știe ce e liber acum',
    text: 'Ospătarul întreabă la recepție, recepția răsfoiește agenda, clientul așteaptă în ușă. Între timp o masă bună stă goală fără ca cineva să observe.',
  },
  {
    icoana: CalendarX2Icon,
    titlu: 'Două rezervări pe aceeași masă',
    text: 'Suprapunerile scrise de mână se văd abia când ambii clienți sunt în fața ta. Atunci nu mai ai ce să repari, doar cui să-i ceri scuze.',
  },
]

const RANDURI_FUNCTIONALITATI: RandFunctionalitate[] = [
  {
    eticheta: 'Harta 2D',
    titlu: 'Sala ta, desenată la scară',
    text: 'Planul real al locației, cu mesele pe pozițiile lor. Culoarea unei mese nu e o setare, ci rezultatul rezervărilor din momentul afișat: liberă, ocupată sau se eliberează în 20 de minute.',
    media: 'Captură: harta 2D cu mese colorate pe status',
    actiuni: [
      { text: 'Creează cont', to: RUTE.signup },
      { text: 'Vezi demonstrația', to: RUTE.demoHarta, variant: 'outline' },
    ],
  },
  {
    eticheta: 'Calendar',
    titlu: 'Rezervările în trei perspective',
    text: 'Zi, săptămână și lună, cu drag & drop între mese și intervale. Muți o rezervare cu degetul, iar sala se actualizează pe toate ecranele deschise.',
    media: 'Captură: calendarul pe zi, cu rezervări pe intervale',
    actiuni: [
      { text: 'Creează cont', to: RUTE.signup },
      { text: 'Vezi prețurile', to: `${RUTE.acasa}#preturi`, variant: 'outline' },
    ],
  },
  {
    eticheta: 'Walk-in',
    titlu: 'Clientul intră fără rezervare',
    text: 'Alegi masa direct pe hartă, notezi numărul de persoane și gata. Dacă nu e nimic liber, intră pe lista de așteptare și îl chemi când se eliberează ceva.',
    media: 'Captură: walk-in și lista de așteptare',
    actiuni: [
      { text: 'Creează cont', to: RUTE.signup },
      { text: 'Vezi demonstrația', to: RUTE.demoHarta, variant: 'outline' },
    ],
  },
  {
    eticheta: 'CRM clienti',
    titlu: 'Fiecare client, cu istoricul lui',
    text: 'Vizite, preferințe, alergii, no-show-uri — construite automat din rezervările de zi cu zi. Când sună același om de pe alt număr, fișele se pot contopi într-una singură.',
    media: 'Captură: fișa unui client, cu istoricul vizitelor',
    actiuni: [
      { text: 'Creează cont', to: RUTE.signup },
      { text: 'Vezi prețurile', to: `${RUTE.acasa}#preturi`, variant: 'outline' },
    ],
  },
]

const CARACTERISTICI = [
  {
    icoana: LayoutGridIcon,
    titlu: 'Harta 2D a sălii',
    text: 'Planul real al locației, cu mese pe pozițiile lor și status vizibil dintr-o privire.',
  },
  {
    icoana: CalendarClockIcon,
    titlu: 'Calendar pe zi, săptămână și lună',
    text: 'Rezervările în trei perspective, cu drag & drop între mese și intervale.',
  },
  {
    icoana: ZapIcon,
    titlu: 'Walk-in în două atingeri',
    text: 'Alegi masa pe hartă, notezi numărul de persoane și gata.',
  },
  {
    icoana: UsersIcon,
    titlu: 'CRM automat',
    text: 'Istoric, preferințe, număr de vizite și no-show-uri, din rezervările de zi cu zi.',
  },
  {
    icoana: BellRingIcon,
    titlu: 'Notificări în timp real',
    text: 'Rezervare nouă, masă care expiră, cerere în așteptare — pe toate ecranele deschise.',
  },
  {
    icoana: CombineIcon,
    titlu: 'Mese unite pentru grupuri',
    text: 'Alipești mese pentru o masă mare și le desparți la loc când serviciul s-a terminat.',
  },
]

const PASI: PasFlux[] = [
  {
    icoana: UserPlusIcon,
    titlu: 'Creezi contul',
    text: 'Rezervările manuale, calendarul și CRM-ul funcționează imediat după înregistrare. Nu aștepți nimic ca să începi.',
  },
  {
    icoana: PencilRulerIcon,
    titlu: 'Ne trimiți schița sălii',
    text: 'O poză sau un desen pe hârtie e de ajuns. Echipa TableX construiește planul 2D și îl publică în contul tău.',
  },
  {
    icoana: LayoutGridIcon,
    titlu: 'Vezi sala pe ecran',
    text: 'Fiecare masă cu statusul ei, în timp real: liberă, ocupată sau se eliberează în 20 de minute.',
  },
]

/**
 * ATENTIE — continut de inlocuit inainte de lansare.
 * Sunt substitute de asezare in pagina, nu clienti reali. Nu publica pagina
 * cu ele: un testimonial inventat e o afirmatie comerciala falsa.
 */
const TESTIMONIALE: Testimonial[] = [
  {
    citat:
      'Substitut — aici intră citatul unui client real despre ce s-a schimbat de când folosește TableX.',
    autor: 'Nume client',
    locatie: 'Restaurant, oraș',
  },
  {
    citat:
      'Substitut — al doilea citat, de preferat despre harta 2D sau despre rezervările duble care au dispărut.',
    autor: 'Nume client',
    locatie: 'Restaurant, oraș',
  },
  {
    citat:
      'Substitut — al treilea citat, de preferat de la o locație cu terasă sau cu mai multe zone.',
    autor: 'Nume client',
    locatie: 'Restaurant, oraș',
  },
]

const CATEGORII_INTREBARI = {
  inceput: 'Început',
  functionalitati: 'Funcționalități',
  preturi: 'Prețuri',
  date: 'Date și securitate',
}

const INTREBARI: Record<string, IntrebareFaq[]> = {
  inceput: [
    {
      intrebare: 'Cât durează până pornesc?',
      raspuns:
        'Contul și rezervările manuale funcționează imediat după înregistrare. Harta 2D apare după ce echipa publică planul sălii.',
    },
    {
      intrebare: 'Cine îmi desenează planul sălii?',
      raspuns:
        'Tu trimiți o schiță sau o poză a sălii, iar echipa TableX construiește planul 2D și îl publică în contul tău. Nu trebuie să desenezi nimic. Desenarea se plătește o singură dată, la configurare, separat de abonament — suma exactă se calculează după numărul de mese și ți se arată la înregistrare, înainte să confirmi ceva.',
    },
  ],
  functionalitati: [
    {
      intrebare: 'Ce diferență e între Start și Pro?',
      raspuns:
        'Start acoperă rezervările nelimitate, calendarul, walk-in-ul cu lista de așteptare, CRM-ul de clienți și widgetul public. Pro adaugă harta 2D a sălii cu status în timp real, alocarea meselor direct pe plan, mesele unite pentru grupuri și zonele multiple — plus planul desenat de echipa noastră.',
    },
    {
      intrebare: 'Pot lucra mai mulți ospătari în același timp?',
      raspuns:
        'Da. Managerul invită personalul pe email, fiecare cu rolul lui. Un cont aparține unui singur restaurant, iar ospătarii nu au acces la setări sau la facturare.',
    },
    {
      intrebare: 'Ce se întâmplă cu rezervările dacă doi angajați modifică aceeași masă?',
      raspuns:
        'Baza de date refuză suprapunerile pe aceeași masă, inclusiv timpul de buffer dintre rezervări. Conflictul e imposibil, nu doar improbabil.',
    },
  ],
  preturi: [
    {
      intrebare: 'Cum se facturează?',
      raspuns:
        'Exclusiv lunar. Nu există plată anuală și nici contract pe termen lung — poți schimba planul oricând.',
    },
    {
      intrebare: 'Planul 2D al sălii costă separat?',
      raspuns:
        'Da, o singură dată. Abonamentul Pro acoperă folosirea hărții; desenarea inițială a sălii de către echipa TableX are o taxă de configurare, plus un tarif pe masă peste un anumit număr de mese. Totul se calculează și se afișează la înregistrare, înainte de confirmare — nu apare nimic pe factură fără să fi văzut suma întâi.',
    },
  ],
  date: [
    {
      intrebare: 'Datele clienților sunt în siguranță?',
      raspuns:
        'Fiecare restaurant vede exclusiv datele lui, impuse prin politici la nivel de rând în baza de date. Perioada de retenție e configurabilă, între 1 și 10 ani.',
    },
  ],
}

function Preturi() {
  const { data: setari, isLoading, isError } = useSetariApp()

  if (isError) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Prețurile nu au putut fi încărcate. Scrie-ne și ți le trimitem.
      </p>
    )
  }

  // Cat timp se incarca, lasam preturile nedefinite: sectiunea arata skeleton.
  const valoare = (numar: number | undefined) => (isLoading ? undefined : numar)

  const planuri: PlanPreturi[] = [
    {
      id: 'start',
      nume: 'Start',
      descriere: 'Pentru locații care vor să scape de agenda de hârtie.',
      pretLunar: valoare(setari?.pret_plan_start),
      buton: { text: 'Începe cu Start', to: RUTE.signup },
      evidentiate: [
        { text: 'Rezervări nelimitate', icoana: CalendarClockIcon },
        { text: 'Walk-in și lista de așteptare', icoana: ZapIcon },
        { text: 'CRM clienți', icoana: UsersIcon },
      ],
      include: {
        titlu: 'Planul Start mai include:',
        linii: ['Calendar zi / săptămână / lună', 'Widget public de rezervare'],
      },
    },
    {
      id: 'pro',
      nume: 'Pro',
      descriere: 'Cu harta 2D interactivă a sălii, desenată de noi.',
      pretLunar: valoare(setari?.pret_plan_pro),
      recomandat: true,
      buton: { text: 'Începe cu Pro', to: RUTE.signup },
      evidentiate: [
        { text: 'Planul 2D desenat de echipa TableX, inclus', icoana: PencilRulerIcon },
        { text: 'Harta 2D cu status în timp real', icoana: LayoutGridIcon },
        { text: 'Alocare mese direct pe plan', icoana: MousePointerClickIcon },
        { text: 'Mese unite pentru grupuri', icoana: CombineIcon },
      ],
      include: {
        titlu: 'Tot ce include Start, plus:',
        linii: ['Zone multiple (salon, terasă, etaj)'],
      },
    },
  ]

  return <PricingSection planuri={planuri} moneda={MONEDA} />
}

export function LandingPage() {
  const primestiRef = useRef<HTMLDivElement>(null)

  const zona = ZONE_DEMO[0]
  const mese = MESE_DEMO[zona.id]
  // Ora de varf: harta arata interesant, cu toate cele cinci statusuri.
  const statusuri = useMemo(() => statusuriLaOra(19.5, zona.id), [zona.id])

  /**
   * §51.1 — demonstratia de pe landing e INTERACTIVA: clicul pe o masa arata
   * ce ar vedea personalul. Fara date reale; e chiar componenta din aplicatie,
   * nu o captura, deci ce se vede aici e ce primesti.
   */
  const [masaAleasa, setMasaAleasa] = useState<string | null>(null)
  const detaliiMasa = mese.find((m) => m.id === masaAleasa) ?? null

  return (
    <div className="min-h-svh bg-background">
      <Navbar />

      <main>
        {/* Hero — coregrafia completa: mana + telefon, atmosfera, text */}
        <Hero />

        {/* Problema */}
        <section id="problema" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16">
          <SectionHeading
            eticheta="Problema"
            titlu={
              <>
                Agenda de hârtie și telefonul{' '}
                <span className="text-primary">îți lasă mese goale</span>
              </>
            }
            subtitlu="Trei lucruri se întâmplă în fiecare serviciu aglomerat, și toate trei costă bani."
          />
          <div className="mt-10">
            <ProblemCards probleme={PROBLEME} />
          </div>
        </section>

        {/* Solutia — banda intunecata */}
        <section className="mx-auto max-w-6xl px-6 py-4">
          <DarkBand>
            <SectionHeading
              peFundalInchis
              eticheta="Soluția"
              titlu={
                <>
                  Toată sala, în timp real,{' '}
                  <span className="text-sidebar-primary">pe un singur ecran</span>
                </>
              }
              subtitlu="TableX înlocuiește agenda de la recepție cu planul 2D al locației tale. Fiecare masă își arată singură statusul, calculat din rezervările momentului. Suprapunerile sunt refuzate de baza de date, nu de atenția ospătarului."
            />
            <TrustChips
              peFundalInchis
              elemente={['Fără comision', 'Fără contract', 'Planul 2D inclus în Pro']}
              className="mt-8"
            />
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg" className={PILULA}>
                <Link to={RUTE.signup}>
                  Creează cont
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
            </div>
          </DarkBand>
        </section>

        {/* Randuri de functionalitati */}
        <section id="functionalitati" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16">
          <SectionHeading
            eticheta="Cum funcționează"
            titlu="Tot ce îți trebuie ca să pornești"
            subtitlu="Patru lucruri pe care le faci zilnic, toate în același ecran."
          />

          <div className="mt-14 grid gap-20">
            {RANDURI_FUNCTIONALITATI.map((rand, indice) => (
              <FeatureRow key={rand.eticheta} {...rand} inversat={indice % 2 === 1} />
            ))}
          </div>
        </section>

        {/* Harta 2D — demonstratie reala, nu substitut */}
        <section id="harta" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16">
          <SectionHeading
            eticheta="Demonstrație"
            titlu={
              <>
                Harta 2D, <span className="text-primary">la ora 19:30</span>
              </>
            }
            subtitlu="Nu e o captură de ecran. E harta reală, cu date fictive: derulează ziua și vezi cum se schimbă sala."
          />

          <LegendaStatus className="mt-8" />

          <HartaZona
            zona={zona}
            structura={STRUCTURA_DEMO[zona.id]}
            mese={mese}
            statusuri={statusuri}
            arataGrid={false}
            masaSelectata={masaAleasa}
            onSelecteazaMasa={(id) => setMasaAleasa((curent) => (curent === id ? null : id))}
            className="mt-3 aspect-[3/2] w-full"
          />

          {/* Tooltip-ul cerut de §51.1: apare la clic si spune exact ce vede
              personalul in sala — numar, capacitate, stare la ora afisata. */}
          <p
            className="mt-3 text-center text-sm text-muted-foreground"
            aria-live="polite"
          >
            {detaliiMasa ? (
              <>
                <span className="font-medium text-foreground">
                  Masa {detaliiMasa.numar_masa}
                </span>{' '}
                · {detaliiMasa.capacitate} locuri ·{' '}
                {ETICHETE_STATUS[statusuri[detaliiMasa.id] ?? 'liber']} la 19:30
              </>
            ) : (
              'Dă click pe o masă ca să vezi ce arată personalului.'
            )}
          </p>

          <div className="mt-6 flex justify-center">
            <Button asChild size="lg" variant="outline" className={PILULA}>
              <Link to={RUTE.demoHarta}>Deschide demonstrația completă</Link>
            </Button>
          </div>
        </section>

        {/* Ce primesti — grila scurta, cu reveal in cascada si hover lift */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <SectionHeading eticheta="Pe scurt" titlu="Ce primești" />
          <div ref={primestiRef} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CARACTERISTICI.map(({ icoana: Icoana, titlu, text }, indice) => (
              <TimelineContent
                key={titlu}
                animationNum={indice}
                timelineRef={primestiRef}
                className="h-full"
              >
                <div className="h-full rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <Icoana className="size-5 text-primary" />
                  <h3 className="mt-3 font-semibold">{titlu}</h3>
                  <p className="mt-1 text-sm text-muted-foreground text-pretty">{text}</p>
                </div>
              </TimelineContent>
            ))}
          </div>
        </section>

        {/* Cum pornesti — pasii, pe grid-ul discret al hero-ului */}
        <section
          id="cum-functioneaza"
          className="relative mx-auto max-w-6xl scroll-mt-20 px-6 py-16"
        >
          <div aria-hidden className="hero-grid pointer-events-none absolute inset-0 -z-10 opacity-70" />
          <StepsSection
            titlu="Cum pornești"
            subtitlu="Trei pași, iar primul durează cât să completezi un formular."
            pasi={PASI}
          />
          <div className="mt-12 flex justify-center">
            <Button asChild size="lg" className={PILULA}>
              <Link to={RUTE.signup}>
                Creează cont
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Preturi */}
        <section id="preturi" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16">
          <SectionHeading
            eticheta="Prețuri"
            titlu={
              <>
                Preț fix pe lună, <span className="text-primary">fără comision</span>
              </>
            }
            subtitlu="Două planuri, facturate lunar, de până la 10 ori mai ieftine decât platformele care îți iau comision din fiecare rezervare. Fără contract pe termen lung — poți schimba planul oricând."
          />
          <div className="mt-10 flex justify-center">
            <Preturi />
          </div>
        </section>

        {/* Testimoniale — banda intunecata */}
        <section id="clienti" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-4">
          <DarkBand>
            <SectionHeading
              peFundalInchis
              eticheta="Ce spun clienții"
              titlu="Restaurante care și-au mutat sala pe ecran"
            />
            <div className="mt-10">
              <QuoteCards testimoniale={TESTIMONIALE} />
            </div>
          </DarkBand>
        </section>

        {/* Intrebari */}
        <section id="intrebari" className="mx-auto max-w-3xl scroll-mt-20 px-6 py-16">
          <FAQ
            title="Întrebări frecvente"
            subtitle="Alege o categorie și deschide răspunsul care te interesează."
            categories={CATEGORII_INTREBARI}
            faqData={INTREBARI}
          />
        </section>

        {/* Chemare finala la actiune */}
        <section className="mx-auto max-w-6xl px-6 pt-4 pb-16">
          <CtaBand
            titlu="Sala ta, pe ecran, începând de azi"
            subtitlu="Creezi contul și iei prima rezervare în aceeași zi. Planul 2D vine de la noi."
            actiuni={[
              { text: 'Creează cont', to: RUTE.signup, icoana: ArrowRightIcon },
              { text: 'Vezi demonstrația', to: RUTE.demoHarta, variant: 'outline' },
            ]}
            nota="Facturare lunară, fără contract pe termen lung."
          />
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <span className="text-lg font-semibold tracking-tight">
                Table<span className="text-primary">X</span>
              </span>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground text-pretty">
                Management de rezervări pentru restaurante, baruri și terase, construit în jurul
                planului real al sălii.
              </p>
            </div>

            <div>
              <p className="text-sm font-medium">Produs</p>
              <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                <li>
                  <a href="#problema" className="hover:text-foreground">
                    Problema
                  </a>
                </li>
                <li>
                  <a href="#functionalitati" className="hover:text-foreground">
                    Ce primești
                  </a>
                </li>
                <li>
                  <a href="#harta" className="hover:text-foreground">
                    Harta 2D
                  </a>
                </li>
                <li>
                  <a href="#cum-functioneaza" className="hover:text-foreground">
                    Cum pornești
                  </a>
                </li>
                <li>
                  <a href="#preturi" className="hover:text-foreground">
                    Prețuri
                  </a>
                </li>
                <li>
                  <a href="#intrebari" className="hover:text-foreground">
                    Întrebări frecvente
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-medium">Cont</p>
              <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                <li>
                  <Link to={RUTE.demoHarta} className="hover:text-foreground">
                    Demonstrație
                  </Link>
                </li>
                <li>
                  <Link to={RUTE.login} className="hover:text-foreground">
                    Autentificare
                  </Link>
                </li>
                <li>
                  <Link to={RUTE.signup} className="hover:text-foreground">
                    Cont nou
                  </Link>
                </li>
                <li>
                  <Link to={RUTE.confidentialitate} className="hover:text-foreground">
                    Confidențialitate
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
            Table<span className="text-primary">X</span> — management de rezervări pentru
            restaurante.
          </div>
        </div>
      </footer>
    </div>
  )
}
