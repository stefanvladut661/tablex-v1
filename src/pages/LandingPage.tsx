import { useMemo, useRef } from 'react'
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
import { RUTE } from '@/lib/rute'

/** Preturile din app_settings sunt numerice, fara moneda. Un singur loc. */
const MONEDA = '€'

const PROBLEME: Problema[] = [
  {
    icoana: PhoneCallIcon,
    titlu: 'Telefonul suna in mijlocul serviciului',
    text: 'Nu poti raspunde la telefon, sa notezi in agenda si sa servesti la mese in acelasi timp. Asa apar rezervarile pierdute si mesele date de doua ori.',
  },
  {
    icoana: EyeOffIcon,
    titlu: 'Nimeni nu stie ce e liber acum',
    text: 'Ospatarul intreaba la receptie, receptia rasfoieste agenda, clientul asteapta in usa. Intre timp o masa buna sta goala fara ca cineva sa observe.',
  },
  {
    icoana: CalendarX2Icon,
    titlu: 'Doua rezervari pe aceeasi masa',
    text: 'Suprapunerile scrise de mana se vad abia cand ambii clienti sunt in fata ta. Atunci nu mai ai ce sa repari, doar cui sa-i ceri scuze.',
  },
]

const RANDURI_FUNCTIONALITATI: RandFunctionalitate[] = [
  {
    eticheta: 'Harta 2D',
    titlu: 'Sala ta, desenata la scara',
    text: 'Planul real al locatiei, cu mesele pe pozitiile lor. Culoarea unei mese nu e o setare, ci rezultatul rezervarilor din momentul afisat: libera, ocupata sau se elibereaza in 20 de minute.',
    media: 'Captura: harta 2D cu mese colorate pe status',
    actiuni: [
      { text: 'Creeaza cont', to: RUTE.signup },
      { text: 'Vezi demonstratia', to: RUTE.demoHarta, variant: 'outline' },
    ],
  },
  {
    eticheta: 'Calendar',
    titlu: 'Rezervarile in trei perspective',
    text: 'Zi, saptamana si luna, cu drag & drop intre mese si intervale. Muti o rezervare cu degetul, iar sala se actualizeaza pe toate ecranele deschise.',
    media: 'Captura: calendarul pe zi, cu rezervari pe intervale',
    actiuni: [
      { text: 'Creeaza cont', to: RUTE.signup },
      { text: 'Vezi preturile', to: `${RUTE.acasa}#preturi`, variant: 'outline' },
    ],
  },
  {
    eticheta: 'Walk-in',
    titlu: 'Clientul intra fara rezervare',
    text: 'Alegi masa direct pe harta, notezi numarul de persoane si gata. Daca nu e nimic liber, intra pe lista de asteptare si il chemi cand se elibereaza ceva.',
    media: 'Captura: walk-in si lista de asteptare',
    actiuni: [
      { text: 'Creeaza cont', to: RUTE.signup },
      { text: 'Vezi demonstratia', to: RUTE.demoHarta, variant: 'outline' },
    ],
  },
  {
    eticheta: 'CRM clienti',
    titlu: 'Fiecare client, cu istoricul lui',
    text: 'Vizite, preferinte, alergii, no-show-uri — construite automat din rezervarile de zi cu zi. Cand suna acelasi om de pe alt numar, fisele se pot contopi intr-una singura.',
    media: 'Captura: fisa unui client, cu istoricul vizitelor',
    actiuni: [
      { text: 'Creeaza cont', to: RUTE.signup },
      { text: 'Vezi preturile', to: `${RUTE.acasa}#preturi`, variant: 'outline' },
    ],
  },
]

const CARACTERISTICI = [
  {
    icoana: LayoutGridIcon,
    titlu: 'Harta 2D a salii',
    text: 'Planul real al locatiei, cu mese pe pozitiile lor si status vizibil dintr-o privire.',
  },
  {
    icoana: CalendarClockIcon,
    titlu: 'Calendar pe zi, saptamana si luna',
    text: 'Rezervarile in trei perspective, cu drag & drop intre mese si intervale.',
  },
  {
    icoana: ZapIcon,
    titlu: 'Walk-in in doua atingeri',
    text: 'Alegi masa pe harta, notezi numarul de persoane si gata.',
  },
  {
    icoana: UsersIcon,
    titlu: 'CRM automat',
    text: 'Istoric, preferinte, numar de vizite si no-show-uri, din rezervarile de zi cu zi.',
  },
  {
    icoana: BellRingIcon,
    titlu: 'Notificari in timp real',
    text: 'Rezervare noua, masa care expira, cerere in asteptare — pe toate ecranele deschise.',
  },
  {
    icoana: CombineIcon,
    titlu: 'Mese unite pentru grupuri',
    text: 'Alipesti mese pentru o masa mare si le desparti la loc cand serviciul s-a terminat.',
  },
]

const PASI: PasFlux[] = [
  {
    icoana: UserPlusIcon,
    titlu: 'Creezi contul',
    text: 'Rezervarile manuale, calendarul si CRM-ul functioneaza imediat dupa inregistrare. Nu astepti nimic ca sa incepi.',
  },
  {
    icoana: PencilRulerIcon,
    titlu: 'Ne trimiti schita salii',
    text: 'O poza sau un desen pe hartie e de ajuns. Echipa TableX construieste planul 2D si il publica in contul tau.',
  },
  {
    icoana: LayoutGridIcon,
    titlu: 'Vezi sala pe ecran',
    text: 'Fiecare masa cu statusul ei, in timp real: libera, ocupata sau se elibereaza in 20 de minute.',
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
      'Substitut — aici intra citatul unui client real despre ce s-a schimbat de cand foloseste TableX.',
    autor: 'Nume client',
    locatie: 'Restaurant, oras',
  },
  {
    citat:
      'Substitut — al doilea citat, de preferat despre harta 2D sau despre rezervarile duble care au disparut.',
    autor: 'Nume client',
    locatie: 'Restaurant, oras',
  },
  {
    citat:
      'Substitut — al treilea citat, de preferat de la o locatie cu terasa sau cu mai multe zone.',
    autor: 'Nume client',
    locatie: 'Restaurant, oras',
  },
]

const CATEGORII_INTREBARI = {
  inceput: 'Inceput',
  functionalitati: 'Functionalitati',
  preturi: 'Preturi',
  date: 'Date si securitate',
}

const INTREBARI: Record<string, IntrebareFaq[]> = {
  inceput: [
    {
      intrebare: 'Cat dureaza pana pornesc?',
      raspuns:
        'Contul si rezervarile manuale functioneaza imediat dupa inregistrare. Harta 2D apare dupa ce echipa publica planul salii.',
    },
    {
      intrebare: 'Cine imi deseneaza planul salii?',
      raspuns:
        'Tu trimiti o schita sau o poza a salii, iar echipa TableX construieste planul 2D si il publica in contul tau. Nu trebuie sa desenezi nimic si nu se plateste separat: e inclus in abonamentul Pro.',
    },
  ],
  functionalitati: [
    {
      intrebare: 'Ce diferenta e intre Start si Pro?',
      raspuns:
        'Start acopera rezervarile nelimitate, calendarul, walk-in-ul cu lista de asteptare, CRM-ul de clienti si widgetul public. Pro adauga harta 2D a salii cu status in timp real, alocarea meselor direct pe plan, mesele unite pentru grupuri si zonele multiple — plus planul desenat de echipa noastra.',
    },
    {
      intrebare: 'Pot lucra mai multi ospatari in acelasi timp?',
      raspuns:
        'Da. Managerul invita personalul pe email, fiecare cu rolul lui. Un cont apartine unui singur restaurant, iar ospatarii nu au acces la setari sau la facturare.',
    },
    {
      intrebare: 'Ce se intampla cu rezervarile daca doi angajati modifica aceeasi masa?',
      raspuns:
        'Baza de date refuza suprapunerile pe aceeasi masa, inclusiv timpul de buffer dintre rezervari. Conflictul e imposibil, nu doar improbabil.',
    },
  ],
  preturi: [
    {
      intrebare: 'Cum se factureaza?',
      raspuns:
        'Exclusiv lunar. Nu exista plata anuala si nici contract pe termen lung — poti schimba planul oricand.',
    },
    {
      intrebare: 'Planul 2D al salii costa separat?',
      raspuns:
        'Nu. Desenarea planului de catre echipa TableX intra in abonamentul Pro, fara taxa de configurare si fara tarif pe masa.',
    },
  ],
  date: [
    {
      intrebare: 'Datele clientilor sunt in siguranta?',
      raspuns:
        'Fiecare restaurant vede exclusiv datele lui, impuse prin politici la nivel de rand in baza de date. Perioada de retentie e configurabila, intre 1 si 10 ani.',
    },
  ],
}

function Preturi() {
  const { data: setari, isLoading, isError } = useSetariApp()

  if (isError) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Preturile nu au putut fi incarcate. Scrie-ne si ti le trimitem.
      </p>
    )
  }

  // Cat timp se incarca, lasam preturile nedefinite: sectiunea arata skeleton.
  const valoare = (numar: number | undefined) => (isLoading ? undefined : numar)

  const planuri: PlanPreturi[] = [
    {
      id: 'start',
      nume: 'Start',
      descriere: 'Pentru locatii care vor sa scape de agenda de hartie.',
      pretLunar: valoare(setari?.pret_plan_start),
      buton: { text: 'Incepe cu Start', to: RUTE.signup },
      evidentiate: [
        { text: 'Rezervari nelimitate', icoana: CalendarClockIcon },
        { text: 'Walk-in si lista de asteptare', icoana: ZapIcon },
        { text: 'CRM clienti', icoana: UsersIcon },
      ],
      include: {
        titlu: 'Planul Start mai include:',
        linii: ['Calendar zi / saptamana / luna', 'Widget public de rezervare'],
      },
    },
    {
      id: 'pro',
      nume: 'Pro',
      descriere: 'Cu harta 2D interactiva a salii, desenata de noi.',
      pretLunar: valoare(setari?.pret_plan_pro),
      recomandat: true,
      buton: { text: 'Incepe cu Pro', to: RUTE.signup },
      evidentiate: [
        { text: 'Planul 2D desenat de echipa TableX, inclus', icoana: PencilRulerIcon },
        { text: 'Harta 2D cu status in timp real', icoana: LayoutGridIcon },
        { text: 'Alocare mese direct pe plan', icoana: MousePointerClickIcon },
        { text: 'Mese unite pentru grupuri', icoana: CombineIcon },
      ],
      include: {
        titlu: 'Tot ce include Start, plus:',
        linii: ['Zone multiple (salon, terasa, etaj)'],
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
                Agenda de hartie si telefonul{' '}
                <span className="text-primary">iti lasa mese goale</span>
              </>
            }
            subtitlu="Trei lucruri se intampla in fiecare serviciu aglomerat, si toate trei costa bani."
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
              eticheta="Solutia"
              titlu={
                <>
                  Toata sala, in timp real,{' '}
                  <span className="text-sidebar-primary">pe un singur ecran</span>
                </>
              }
              subtitlu="TableX inlocuieste agenda de la receptie cu planul 2D al locatiei tale. Fiecare masa isi arata singura statusul, calculat din rezervarile momentului. Suprapunerile sunt refuzate de baza de date, nu de atentia ospatarului."
            />
            <TrustChips
              peFundalInchis
              elemente={['Fara comision', 'Fara contract', 'Planul 2D inclus in Pro']}
              className="mt-8"
            />
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg" className={PILULA}>
                <Link to={RUTE.signup}>
                  Creeaza cont
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
            </div>
          </DarkBand>
        </section>

        {/* Randuri de functionalitati */}
        <section id="functionalitati" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16">
          <SectionHeading
            eticheta="Cum functioneaza"
            titlu="Tot ce iti trebuie ca sa pornesti"
            subtitlu="Patru lucruri pe care le faci zilnic, toate in acelasi ecran."
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
            eticheta="Demonstratie"
            titlu={
              <>
                Harta 2D, <span className="text-primary">la ora 19:30</span>
              </>
            }
            subtitlu="Nu e o captura de ecran. E harta reala, cu date fictive: deruleaza ziua si vezi cum se schimba sala."
          />

          <LegendaStatus className="mt-8" />

          <HartaZona
            zona={zona}
            structura={STRUCTURA_DEMO[zona.id]}
            mese={mese}
            statusuri={statusuri}
            arataGrid={false}
            className="mt-3 aspect-[3/2] w-full"
          />

          <div className="mt-6 flex justify-center">
            <Button asChild size="lg" variant="outline" className={PILULA}>
              <Link to={RUTE.demoHarta}>Deschide demonstratia completa</Link>
            </Button>
          </div>
        </section>

        {/* Ce primesti — grila scurta, cu reveal in cascada si hover lift */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <SectionHeading eticheta="Pe scurt" titlu="Ce primesti" />
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
            titlu="Cum pornesti"
            subtitlu="Trei pasi, iar primul dureaza cat sa completezi un formular."
            pasi={PASI}
          />
          <div className="mt-12 flex justify-center">
            <Button asChild size="lg" className={PILULA}>
              <Link to={RUTE.signup}>
                Creeaza cont
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Preturi */}
        <section id="preturi" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16">
          <SectionHeading
            eticheta="Preturi"
            titlu={
              <>
                Pret fix pe luna, <span className="text-primary">fara comision</span>
              </>
            }
            subtitlu="Doua planuri, facturate lunar. Fara contract pe termen lung — poti schimba planul oricand."
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
              eticheta="Ce spun clientii"
              titlu="Restaurante care si-au mutat sala pe ecran"
            />
            <div className="mt-10">
              <QuoteCards testimoniale={TESTIMONIALE} />
            </div>
          </DarkBand>
        </section>

        {/* Intrebari */}
        <section id="intrebari" className="mx-auto max-w-3xl scroll-mt-20 px-6 py-16">
          <FAQ
            title="Intrebari frecvente"
            subtitle="Alege o categorie si deschide raspunsul care te intereseaza."
            categories={CATEGORII_INTREBARI}
            faqData={INTREBARI}
          />
        </section>

        {/* Chemare finala la actiune */}
        <section className="mx-auto max-w-6xl px-6 pt-4 pb-16">
          <CtaBand
            titlu="Sala ta, pe ecran, incepand de azi"
            subtitlu="Creezi contul si iei prima rezervare in aceeasi zi. Planul 2D vine de la noi."
            actiuni={[
              { text: 'Creeaza cont', to: RUTE.signup, icoana: ArrowRightIcon },
              { text: 'Vezi demonstratia', to: RUTE.demoHarta, variant: 'outline' },
            ]}
            nota="Facturare lunara, fara contract pe termen lung."
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
                Management de rezervari pentru restaurante, baruri si terase, construit in jurul
                planului real al salii.
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
                    Ce primesti
                  </a>
                </li>
                <li>
                  <a href="#harta" className="hover:text-foreground">
                    Harta 2D
                  </a>
                </li>
                <li>
                  <a href="#cum-functioneaza" className="hover:text-foreground">
                    Cum pornesti
                  </a>
                </li>
                <li>
                  <a href="#preturi" className="hover:text-foreground">
                    Preturi
                  </a>
                </li>
                <li>
                  <a href="#intrebari" className="hover:text-foreground">
                    Intrebari frecvente
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-medium">Cont</p>
              <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                <li>
                  <Link to={RUTE.demoHarta} className="hover:text-foreground">
                    Demonstratie
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
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
            Table<span className="text-primary">X</span> — management de rezervari pentru
            restaurante.
          </div>
        </div>
      </footer>
    </div>
  )
}
