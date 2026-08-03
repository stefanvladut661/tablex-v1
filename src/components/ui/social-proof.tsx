import { StarIcon } from 'lucide-react'

import { Marquee } from '@/components/ui/marquee'
import { cn } from '@/lib/utils'

/**
 * Social proof-ul de sub hero: doua benzi care se deruleaza in sensuri opuse,
 * cu recenzii scurte de la restaurante.
 *
 * De ce doua randuri si nu o grila: sectiunea sta imediat sub hero, unde inca
 * nu s-a castigat dreptul la atentie. O grila statica cere sa fie citita; banda
 * se citeste din colt, ca un panou, si arata din prima ca sunt multe voci, nu
 * trei. Nu are butoane si nu opreste derularea decat la hover — nimic de facut
 * aici, doar de vazut.
 */

export interface RecenzieScurta {
  nume: string
  /** Restaurantul si orasul, pe un singur rand. */
  locatie: string
  text: string
  /** Implicit 5. Se afiseaza si ca text pentru cititoarele de ecran. */
  stele?: number
}

/** Initialele tin loc de poza: nu inventam chipuri si nu cerem fisiere externe. */
function initiale(nume: string) {
  return nume
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((cuvant) => cuvant[0]?.toUpperCase() ?? '')
    .join('')
}

function CardRecenzie({ nume, locatie, text, stele = 5 }: RecenzieScurta) {
  return (
    <figure className="w-72 shrink-0 rounded-xl border border-border bg-card p-5 transition-colors duration-300 hover:border-primary/40 sm:w-80">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-content-center rounded-full bg-muted text-xs font-semibold text-foreground"
        >
          {initiale(nume)}
        </span>
        <figcaption className="min-w-0">
          <span className="block truncate text-sm font-semibold">{nume}</span>
          <span className="block truncate text-xs text-muted-foreground">{locatie}</span>
        </figcaption>
      </div>

      <div className="mt-3 flex gap-0.5" role="img" aria-label={`${stele} din 5 stele`}>
        {Array.from({ length: 5 }, (_, indice) => (
          <StarIcon
            key={indice}
            aria-hidden
            className={cn(
              'size-3.5',
              indice < stele
                ? 'fill-status-expirare text-status-expirare'
                : 'text-muted-foreground/40',
            )}
          />
        ))}
      </div>

      <blockquote className="mt-2 text-sm text-muted-foreground text-pretty">{text}</blockquote>
    </figure>
  )
}

export function SocialProof({
  recenzii,
  className,
}: {
  recenzii: RecenzieScurta[]
  className?: string
}) {
  // Randul de sus si cel de jos poarta jumatati diferite: altfel s-ar vedea
  // acelasi card de doua ori, unul sub altul, la fiecare moment.
  const mijloc = Math.ceil(recenzii.length / 2)
  const randSus = recenzii.slice(0, mijloc)
  const randJos = recenzii.slice(mijloc)

  return (
    <div className={cn('relative flex w-full flex-col items-center gap-2', className)}>
      {/* Cheia e indicele: recenziile pot avea acelasi nume (si chiar au, cat
          timp sunt substitute), iar lista nu se reordoneaza niciodata. */}
      <Marquee pauseOnHover className="w-full [--duration:44s]">
        {randSus.map((recenzie, indice) => (
          <CardRecenzie key={indice} {...recenzie} />
        ))}
      </Marquee>

      <Marquee reverse pauseOnHover className="w-full [--duration:52s]">
        {randJos.map((recenzie, indice) => (
          <CardRecenzie key={indice} {...recenzie} />
        ))}
      </Marquee>

      {/* Marginile se sting in fundal, ca sa nu se vada cardurile taiate brusc. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background sm:w-32"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background sm:w-32"
      />
    </div>
  )
}
