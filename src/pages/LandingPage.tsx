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
  SmartphoneIcon,
  UserPlusIcon,
  UsersIcon,
  ZapIcon,
} from 'lucide-react'

import { HartaZona } from '@/components/floor-plan/HartaZona'
import { LegendaStatus } from '@/components/floor-plan/LegendaStatus'
import { useAuth } from '@/hooks/useAuth'
import { ruteDupaLogin } from '@/lib/rute'
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
  PILULA,
  type Problema,
  type RandFunctionalitate,
  type Testimonial,
} from '@/components/ui/landing-blocks'
import { SocialProof, type RecenzieScurta } from '@/components/ui/social-proof'
import { PricingSection, type PlanPreturi } from '@/components/ui/pricing-section'
import { BaraOrara } from '@/components/floor-plan/BaraOrara'
import { StepsSection, type PasFlux } from '@/components/ui/steps-section'
import { TimelineContent } from '@/components/ui/timeline-animation'
import { useSetariApp } from '@/hooks/useSetariApp'
import {
  MESE_DEMO,
  ORA_VARF_DEMO,
  PROGRAM_DEMO,
  STRUCTURA_DEMO,
  ZONE_DEMO,
  formateazaOra,
  statusuriLaOra,
} from '@/lib/harta-demo'
import { ETICHETE_STATUS } from '@/types/floor-plan'
import { RUTE } from '@/lib/rute'

/** Preturile din app_settings sunt numerice, fara moneda. Un singur loc. */
const MONEDA = '€'

const RECENZII: RecenzieScurta[] = [
  {
    nume: 'Alexandru Popa',
    locatie: 'General Manager',
    text: 'Am scăpat definitiv de caietul de hârtie. Nota 10!',
  },
  {
    nume: 'Marius Enache',
    locatie: 'Proprietar',
    text: 'Harta 2D pe tabletă ne-a salvat week-end-urile aglomerate. 🍕',
  },
  {
    nume: 'Elena Dumitrescu',
    locatie: 'Manager Operativ',
    text: 'Fără comisioane per rezervare. În sfârșit un sistem cinstit!',
  },
  {
    nume: 'Cristian Stoica',
    locatie: 'Administrator',
    text: 'Notificările pe WhatsApp au redus neprezentările la zero.',
  },
  {
    nume: 'Diana Moldovan',
    locatie: 'Șef de Sală',
    text: 'Echipa a învățat aplicația în mai puțin de 5 minute.',
  },
  {
    nume: 'Radu Ionescu',
    locatie: 'Co-owner',
    text: 'Cea mai bună investiție făcută anul acesta pentru locație. ✨',
  },
  {
    nume: 'Florin Vancea',
    locatie: 'Proprietar',
    text: 'Clienții își iau singuri mesele din Instagram, direct pe harta 2D.',
  },
  {
    nume: 'Andreea Marin',
    locatie: 'Manager General',
    text: 'Sistemul de unire al meselor pentru grupuri mari e genial.',
  },
  {
    nume: 'Bogdan Stanciu',
    locatie: 'Administrator',
    text: 'Reminderele pe WhatsApp cu 2 ore înainte fac minuni! 💬',
  },
  {
    nume: 'Gabriel Neagu',
    locatie: 'Manager',
    text: 'Harta spațiului arată pe iPad exact ca în realitate.',
  },
  {
    nume: 'Simona Gheorghiu',
    locatie: 'Proprietar',
    text: 'Ne-au desenat harta rapid, iar widget-ul pe site merge brici. 🚀',
  },
  {
    nume: 'Mihai Cojocaru',
    locatie: 'Director Operativ',
    text: 'Economisim sute de euro lunar scăpând de alte platforme.',
  },
  {
    nume: 'Raluca Constantin',
    locatie: 'Manager Evenimente',
    text: 'Vedem capacitatea rămasă pe fiecare zonă fără nicio suprapunere.',
  },
  {
    nume: 'Vlad Petrescu',
    locatie: 'Owner',
    text: 'Abonament fix și rezervări nelimitate. Fără comisioane ascunse!',
  },
  {
    nume: 'Ioana Rusu',
    locatie: 'Șef de Sală',
    text: 'Schimbarea de tură e super simplă, totul se vede clar pe ecran.',
  },
  {
    nume: 'Dan Burlacu',
    locatie: 'Co-owner',
    text: 'Confirmarea pe WhatsApp oferă un aer profi locației noastre.',
  },
  {
    nume: 'Cătălin Munteanu',
    locatie: 'Manager',
    text: 'Aplicația se mișcă impecabil pe tabletele noastre vechi.',
  },
  {
    nume: 'Anca Zaporojan',
    locatie: 'Proprietar',
    text: 'Gestionarea salonului a devenit extrem de intuitivă. ⭐',
  },
]

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
    text: 'Salonul, terasa și zona VIP, desenate vectorial de echipa noastră, cu mesele pe pozițiile lor reale. Culoarea unei mese nu e o setare, ci rezultatul rezervărilor din momentul afișat: liberă, ocupată sau se eliberează în 20 de minute. Muți mesele pe plan și le alipești pentru grupuri mari.',
    media: 'Video 5s: mutarea meselor (drag & drop) și unirea lor',
    actiuni: [
      { text: 'Creează cont', to: RUTE.signup },
      { text: 'Vezi demonstrația', to: RUTE.demoHarta, variant: 'outline' },
    ],
  },
  {
    eticheta: 'WhatsApp',
    // §14 — in v1 WhatsApp e interfata si jurnal simulat, fara Meta Cloud API.
    // Insigna e obligatorie cat timp nu pleaca mesaje reale: fara ea, randul
    // asta ar promite pe pagina publica ceva ce produsul inca nu face.
    insigna: 'În curând',
    titlu: 'Confirmări și remindere trimise singure',
    text: 'Clientul primește confirmarea rezervării pe WhatsApp și un reminder cu două ore înainte de oră. Fără telefoane date de la recepție și cu mult mai puține mese rezervate care rămân goale.',
    media: 'Mockup: ecran de telefon cu conversația de confirmare',
    actiuni: [
      { text: 'Creează cont', to: RUTE.signup },
      { text: 'Vezi prețurile', to: `${RUTE.acasa}#preturi`, variant: 'outline' },
    ],
  },
  {
    eticheta: 'Widget public',
    titlu: 'Formularul de rezervare, pe site-ul tău',
    text: 'Un iframe pe care îl lipești pe site, în bio-ul de Instagram sau pe pagina de Facebook. Clientul alege data, ora și numărul de persoane în câteva secunde, iar cererea intră direct în calendarul tău.',
    media: 'Previzualizare: widgetul de rezervare pe un smartphone',
    actiuni: [
      { text: 'Creează cont', to: RUTE.signup },
      { text: 'Vezi demonstrația', to: RUTE.demoHarta, variant: 'outline' },
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
    titlu: 'Îți înregistrezi locația',
    text: 'Completezi datele firmei și ale restaurantului, cât un formular scurt. Rezervările manuale, calendarul și CRM-ul funcționează din prima zi.',
  },
  {
    icoana: PencilRulerIcon,
    titlu: 'Îți activăm harta 2D',
    text: 'Ne trimiți o poză sau o schiță a sălii — atât. Echipa TableX desenează planul complet, cu salon, terasă și zone, și îl publică în contul tău.',
  },
  {
    icoana: SmartphoneIcon,
    titlu: 'Începi să primești rezervări',
    text: 'Pui link-ul pe Instagram sau pe site și conduci toată sala de pe tabletă ori de pe telefon.',
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

  /**
   * Ora demonstratiei se alege din ACEEASI bara ca in panoul restaurantului
   * (§28.12), nu dintr-un slider inventat pentru landing. Sectiunea promite „e
   * harta reala, nu o captura" — daca selectorul de ora ar fi altul decat cel
   * livrat, promisiunea ar fi falsa chiar in locul unde se face.
   *
   * 19:30 tine locul lui „acum": e ora de varf, singura la care se vad toate
   * cele cinci statusuri deodata.
   */
  const [oraDemo, setOraDemo] = useState<number | null>(null)
  const oraAfisata = oraDemo ?? ORA_VARF_DEMO
  const statusuri = useMemo(() => statusuriLaOra(oraAfisata, zona.id), [oraAfisata, zona.id])

  /**
   * §51.1 — demonstratia de pe landing e INTERACTIVA: clicul pe o masa arata
   * ce ar vedea personalul. Fara date reale; e chiar componenta din aplicatie,
   * nu o captura, deci ce se vede aici e ce primesti.
   */
  const [masaAleasa, setMasaAleasa] = useState<string | null>(null)
  const detaliiMasa = mese.find((m) => m.id === masaAleasa) ?? null

  /**
   * Navbarul stia deja sa schimbe „Autentificare" cu „Deschide panoul" pentru
   * cine e conectat; SUBSOLUL nu stia, fiindca pagina asta nu se uita deloc la
   * sesiune. Rezultatul era o pagina care se contrazicea singura: sus scria ca
   * esti conectat, jos te invita sa-ti faci cont.
   */
  const { esteAutentificat, profil } = useAuth()
  const numeCont =
    profil?.tip === 'admin'
      ? profil.restaurant.nume
      : profil?.tip === 'super_admin'
        ? 'echipa TableX'
        : null

  return (
    <div className="tema-landing min-h-svh bg-background">
      <Navbar />

      <main>
        {/* Hero — coregrafia completa: mana + telefon, atmosfera, text */}
        <Hero />

        {/* Social proof, imediat sub hero.
            FARA margine negativa: stratul telefonului are scroll: 0.38, deci
            urca pana la ~0.38 * inaltimea hero-ului pe masura ce sectiunea
            iese prin sus. Orice suprapunere fixata cu -mt e corecta doar la
            scroll 0 si se desface in gol alb imediat ce incepe derularea.
            Marginea de jos a fotografiei o ascunde masca din HandPhone, care
            calatoreste cu imaginea, deci tine la orice pozitie de scroll. */}
        <section aria-label="Recenzii clienți" className="overflow-hidden pb-10">
          <SocialProof recenzii={RECENZII} />
        </section>

        {/* Problema — titlu pe doua randuri, al doilea in accent, fara eticheta
            si fara subtitlu: afirmatia e destul de scurta cat sa se citeasca
            singura, iar cardurile de dedesubt sunt chiar detalierea ei. */}
        {/* Ritmul vertical NU e uniform, deliberat. Spatierea identica peste
            tot citeste a generat, fiindca nu exprima nicio judecata despre ce
            conteaza mai mult. Sectiunile-cheie (functionalitati, preturi)
            respira mai mult decat cele de sprijin (ce primesti, testimoniale). */}
        <section id="problema" className="wrap-landing scroll-mt-20 py-20">
          <SectionHeading
            titlu={
              <>
                <span className="block">Agenda de hârtie și telefonul</span>
                <span className="block text-primary">îți lasă mese goale</span>
              </>
            }
          />
          <div className="mt-12">
            <ProblemCards probleme={PROBLEME} />
          </div>
        </section>

        {/* Randuri de functionalitati */}
        <section id="functionalitati" className="wrap-landing scroll-mt-20 py-28">
          <SectionHeading
            eticheta="Funcționalități"
            titlu="Tot ce îți trebuie ca să pornești"
            subtitlu="Trei lucruri care schimbă serviciul de mâine, toate în același cont."
          />

          <div className="mt-14 grid gap-20">
            {RANDURI_FUNCTIONALITATI.map((rand, indice) => (
              <FeatureRow key={rand.eticheta} {...rand} inversat={indice % 2 === 1} />
            ))}
          </div>
        </section>

        {/* Harta 2D — demonstratie reala, nu substitut */}
        <section id="harta" className="wrap-landing scroll-mt-20 py-24">
          <SectionHeading
            eticheta="Demonstrație"
            titlu={
              <>
                Harta 2D,{' '}
                <span className="text-primary">la ora {formateazaOra(oraAfisata)}</span>
              </>
            }
            subtitlu="Nu e o captură de ecran. E harta reală, cu aceeași bară orară pe care o are panoul: alege o oră și vezi cum se schimbă sala. Dă click pe o masă ca să vezi ce arată personalului."
          />

          <LegendaStatus className="mt-8" />

          {/* §28.12 — chiar bara din panou, nu o copie: ora aleasa se aprinde,
              iar butonul de intoarcere apare doar cand ai plecat de la ea. */}
          <div className="mt-4">
            <BaraOrara
              program={PROGRAM_DEMO}
              oraAfisata={oraAfisata}
              oraLive={ORA_VARF_DEMO}
              urmarestePrezentul={oraDemo === null}
              onSchimba={setOraDemo}
            />
          </div>

          <HartaZona
            zona={zona}
            structura={STRUCTURA_DEMO[zona.id]}
            mese={mese}
            statusuri={statusuri}
            arataGrid={false}
            masaSelectata={masaAleasa}
            onSelecteazaMasa={(id) => setMasaAleasa((curent) => (curent === id ? null : id))}
            /**
             * FARA zoom si fara pan, deliberat. Aici planul e o vitrina, nu o
             * unealta: un vizitator care apuca harta o trage din cadru din
             * greseala, si ramane cu o sala pe jumatate iesita din ecran, fara
             * sa stie ca exista un buton de revenire — pentru ca nu exista.
             * Cine vrea sa se joace are „Deschide demonstrația completă", chiar
             * sub harta. Singurul gest de aici e clicul pe o masa (§51.1).
             */
            className="mt-3 w-full"
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
                {ETICHETE_STATUS[statusuri[detaliiMasa.id] ?? 'liber']} la{' '}
                {formateazaOra(oraAfisata)}
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
        <section className="wrap-landing py-14">
          <SectionHeading eticheta="Pe scurt" titlu="Ce primești" />
          <div ref={primestiRef} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CARACTERISTICI.map(({ icoana: Icoana, titlu, text }, indice) => (
              <TimelineContent
                key={titlu}
                animationNum={indice}
                timelineRef={primestiRef}
                className="h-full"
              >
                <div className="sticla h-full rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
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
          className="relative wrap-landing scroll-mt-20 py-24"
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
        <section id="preturi" className="wrap-landing scroll-mt-20 py-28">
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
        <section id="clienti" className="wrap-landing scroll-mt-20 py-4">
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
        <section id="intrebari" className="wrap-landing scroll-mt-20 py-20">
          <FAQ
            title="Întrebări frecvente"
            subtitle="Alege o categorie și deschide răspunsul care te interesează."
            categories={CATEGORII_INTREBARI}
            faqData={INTREBARI}
          />
        </section>

        {/* Chemare finala la actiune */}
        <section className="wrap-landing pt-8 pb-24">
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

      {/* Subsolul merge cap la cap, nu pe coloana de 60vw: e talpa paginii,
          iar o coloana ingusta acolo ar rupe banda in doua margini goale. */}
      <footer className="border-t border-border bg-card">
        <div className="w-full px-6 py-12 sm:px-10 lg:px-16">
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
                {esteAutentificat ? (
                  <li>
                    <Link
                      to={ruteDupaLogin(profil?.tip ?? null)}
                      className="font-medium text-foreground hover:underline"
                    >
                      Deschide panoul
                    </Link>
                    {numeCont && (
                      <span className="block text-xs">Conectat ca {numeCont}</span>
                    )}
                  </li>
                ) : (
                  <>
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
                  </>
                )}
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
