import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import {
  ArrowRightIcon,
  CheckIcon,
  ImageIcon,
  QuoteIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { TimelineContent } from '@/components/ui/timeline-animation'
import { cn } from '@/lib/utils'

/**
 * Caramizile de landing page.
 *
 * Toate respecta acelasi ritm vizual: eticheta mica in culoarea de accent,
 * titlu scurt in doua tonuri, text, apoi actiuni. Butoanele de pe landing sunt
 * rounded-lg — abatere de la regula rounded-md din §50.2, deliberata: e
 * suprafata de marketing, nu unealta de lucru.
 */

/**
 * Raza butoanelor de pe landing. A fost `rounded-full`; nu mai e.
 * Pastila deplina ramane rezervata etichetelor mici (chips, insigne, buline de
 * iconita). Cand o poarta si butoanele, si cardurile, si insignele, pagina
 * capata acel „totul e o pastila" care citeste a sablon. `rounded-lg` e raza
 * deja documentata a landing-ului in CLAUDE.md.
 *
 * Numele a ramas PILULA fiindca e importat din patru locuri; ce descrie el e
 * „raza butoanelor de prezentare", nu forma.
 */
export const PILULA = 'rounded-lg'

/* ─────────────────────────── Eticheta de sectiune ─────────────────────── */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'font-mono text-xs font-medium tracking-[0.08em] text-primary uppercase',
        className,
      )}
    >
      {children}
    </p>
  )
}

/* ────────────────────────────── Titlu de sectiune ─────────────────────── */

interface SectionHeadingProps {
  eticheta?: ReactNode
  titlu: ReactNode
  subtitlu?: ReactNode
  /** Implicit centrat, ca in referinta. */
  aliniere?: 'centru' | 'stanga'
  /** Pe banda intunecata textul trebuie sa fie deschis. */
  peFundalInchis?: boolean
  className?: string
}

export function SectionHeading({
  eticheta,
  titlu,
  subtitlu,
  aliniere = 'centru',
  peFundalInchis = false,
  className,
}: SectionHeadingProps) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={ref}
      className={cn(
        aliniere === 'centru' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl',
        className,
      )}
    >
      {eticheta && (
        <TimelineContent animationNum={0} timelineRef={ref}>
          <Eyebrow className={peFundalInchis ? 'text-sidebar-primary' : undefined}>
            {eticheta}
          </Eyebrow>
        </TimelineContent>
      )}

      <TimelineContent
        as="h2"
        animationNum={1}
        timelineRef={ref}
        className={cn(
          // Majuscule si corp mare, ca in referinta: titlul e ancora sectiunii,
          // nu o propozitie de citit. Tracking-ul strans il tine compact.
          'text-4xl leading-[1.1] font-extrabold tracking-[-0.03em] text-balance uppercase sm:text-5xl',
          // Fara eticheta deasupra, mt-3 ar fi un spatiu care nu separa nimic.
          eticheta && 'mt-3',
          peFundalInchis && 'text-sidebar-foreground',
        )}
      >
        {titlu}
      </TimelineContent>

      {subtitlu && (
        <TimelineContent
          as="p"
          animationNum={2}
          timelineRef={ref}
          className={cn(
            'mt-4 text-pretty',
            peFundalInchis ? 'text-sidebar-foreground/75' : 'text-muted-foreground',
          )}
        >
          {subtitlu}
        </TimelineContent>
      )}
    </div>
  )
}

/* ──────────────────────── Substitut pentru imagini ────────────────────── */

interface MediaPlaceholderProps {
  /** Ce imagine urmeaza sa intre aici. Apare scris in chenar. */
  eticheta: string
  /** Raportul cadrului, ex. "16/10" sau "4/3". */
  raport?: string
  /** Rama intunecata, ca la capturile de produs din referinta. */
  inchis?: boolean
  className?: string
}

export function MediaPlaceholder({
  eticheta,
  raport = '16/10',
  inchis = false,
  className,
}: MediaPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={`Substitut de imagine: ${eticheta}`}
      style={{ aspectRatio: raport }}
      className={cn(
        // Bordura punctata ramane, umbra pleaca: aici conturul POARTA sens
        // („inca nu e imagine reala"), deci el e cel care se pastreaza cand
        // trebuie ales intre contur si elevatie.
        'grid w-full place-content-center gap-2 justify-items-center rounded-2xl border border-dashed p-6 text-center',
        inchis
          ? 'suprafata-spotlight border-sidebar-border bg-sidebar text-sidebar-foreground/75'
          : 'border-border bg-muted text-muted-foreground',
        className,
      )}
    >
      <ImageIcon className="size-8 opacity-60" />
      <span className="text-sm font-medium">{eticheta}</span>
      <span className="text-xs opacity-70">Imagine de inlocuit</span>
    </div>
  )
}

/* ──────────────────────────── Pastile de incredere ────────────────────── */

export function TrustChips({
  elemente,
  peFundalInchis = false,
  className,
}: {
  elemente: string[]
  peFundalInchis?: boolean
  className?: string
}) {
  return (
    <ul className={cn('flex flex-wrap justify-center gap-2', className)}>
      {elemente.map((text) => (
        <li
          key={text}
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium tracking-wide uppercase',
            peFundalInchis ? 'bg-sidebar-accent text-sidebar-foreground' : 'bg-muted text-foreground',
          )}
        >
          <span className="grid size-4 shrink-0 place-content-center rounded-full bg-status-liber">
            <CheckIcon className="size-3 text-status-liber-foreground" />
          </span>
          {text}
        </li>
      ))}
    </ul>
  )
}

/* ────────────────────────────── Card de problema ──────────────────────── */

export interface Problema {
  titlu: string
  text: string
  icoana: LucideIcon
}

export function ProblemCards({ probleme }: { probleme: Problema[] }) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div ref={ref} className="grid gap-4 md:grid-cols-3">
      {probleme.map(({ titlu, text, icoana: Icoana }, indice) => (
        <TimelineContent key={titlu} animationNum={indice} timelineRef={ref} className="h-full">
          <div className="sticla h-full rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <span className="grid size-11 place-content-center rounded-full bg-destructive">
              <Icoana className="size-5 text-destructive-foreground" />
            </span>
            <h3 className="mt-4 font-semibold">{titlu}</h3>
            <p className="mt-2 text-sm text-muted-foreground text-pretty">{text}</p>
          </div>
        </TimelineContent>
      ))}
    </div>
  )
}

/* ──────────────────── Vechile metode vs. TableX ───────────────────────── */

export interface PerechieComparatie {
  /** Cum se intampla azi, fara TableX. */
  inainte: string
  /** Ce se intampla in loc, cu TableX. */
  dupa: string
}

/**
 * Comparatia pe perechi. Fiecare rand e un card care tine cele doua jumatati
 * lipite, in loc de doua coloane paralele: pe telefon coloanele s-ar desface
 * una sub alta si nu s-ar mai vedea CE raspunde la CE. Asa perechea ramane
 * perechie pe orice latime.
 */
export function ComparatieMetode({ perechi }: { perechi: PerechieComparatie[] }) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div ref={ref}>
      {/* Capetele de coloana au acelasi grid ca randurile, ca sa cada peste ele. */}
      <div className="hidden px-5 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-6">
        <p className="text-sm font-semibold text-muted-foreground">Cum e acum</p>
        <span className="size-4" aria-hidden />
        <p className="text-sm font-semibold text-primary">Cu TableX</p>
      </div>

      <ul className="mt-3 grid gap-3">
        {perechi.map(({ inainte, dupa }, indice) => (
          <TimelineContent key={inainte} as="li" animationNum={indice} timelineRef={ref}>
            <div className="grid gap-4 rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-lg sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-6">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 grid size-6 shrink-0 place-content-center rounded-full bg-destructive"
                >
                  <XIcon className="size-3.5 text-destructive-foreground" />
                </span>
                <p className="text-sm text-muted-foreground text-pretty">{inainte}</p>
              </div>

              <ArrowRightIcon
                aria-hidden
                className="size-4 shrink-0 rotate-90 justify-self-center text-muted-foreground sm:rotate-0"
              />

              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 grid size-6 shrink-0 place-content-center rounded-full bg-status-liber"
                >
                  <CheckIcon className="size-3.5 text-status-liber-foreground" />
                </span>
                <p className="text-sm font-medium text-pretty">{dupa}</p>
              </div>
            </div>
          </TimelineContent>
        ))}
      </ul>
    </div>
  )
}

/* ───────────────────────── Rand de functionalitate ────────────────────── */

interface ActiuneRand {
  text: string
  to: string
  variant?: 'default' | 'outline' | 'secondary'
}

export interface RandFunctionalitate {
  eticheta: string
  titlu: string
  text: string
  media: string
  actiuni: ActiuneRand[]
  /**
   * Marcaj langa eticheta, pentru ce nu e inca live (ex. „În curând").
   * Exista ca sa nu fim nevoiti sa scriem la prezent despre ce nu functioneaza.
   */
  insigna?: string
}

export function FeatureRow({
  eticheta,
  titlu,
  text,
  media,
  actiuni,
  insigna,
  /** Alterneaza pozitia imaginii, ca sa nu iasa o coloana monotona. */
  inversat = false,
}: RandFunctionalitate & { inversat?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div ref={ref} className="grid items-center gap-8 md:grid-cols-2">
      <TimelineContent
        animationNum={0}
        timelineRef={ref}
        className={cn(inversat && 'md:order-2')}
      >
        <MediaPlaceholder eticheta={media} inchis />
      </TimelineContent>

      <TimelineContent animationNum={1} timelineRef={ref}>
        <div className="flex flex-wrap items-center gap-3">
          <Eyebrow>{eticheta}</Eyebrow>
          {insigna && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {insigna}
            </span>
          )}
        </div>
        <h3 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-balance sm:text-3xl">
          {titlu}
        </h3>
        <p className="mt-4 text-muted-foreground text-pretty">{text}</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {actiuni.map(({ text: textActiune, to, variant = 'default' }) => (
            <Button key={textActiune} asChild size="lg" variant={variant} className={PILULA}>
              <Link to={to}>{textActiune}</Link>
            </Button>
          ))}
        </div>
      </TimelineContent>
    </div>
  )
}

/* ─────────────────────────── Banda intunecata ─────────────────────────── */

export function DarkBand({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-sidebar px-6 py-14 text-sidebar-foreground sm:px-10',
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ──────────────────────────── Card de testimonial ─────────────────────── */

export interface Testimonial {
  citat: string
  autor: string
  locatie: string
}

export function QuoteCards({ testimoniale }: { testimoniale: Testimonial[] }) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div ref={ref} className="grid gap-4 md:grid-cols-3">
      {testimoniale.map(({ citat, autor, locatie }, indice) => (
        <TimelineContent key={autor} animationNum={indice} timelineRef={ref} className="h-full">
          <figure className="sticla flex h-full flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <QuoteIcon className="size-6 shrink-0 text-primary" />
            <blockquote className="mt-4 grow text-sm text-card-foreground text-pretty">
              {citat}
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
              <span className="size-10 shrink-0 rounded-full bg-muted" aria-hidden />
              <span className="text-sm">
                <span className="block font-semibold">{autor}</span>
                <span className="block text-muted-foreground">{locatie}</span>
              </span>
            </figcaption>
          </figure>
        </TimelineContent>
      ))}
    </div>
  )
}
