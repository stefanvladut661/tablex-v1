import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/lib/utils'

/**
 * Banda care se deruleaza continuu (magicui/marquee, adaptata la tokenii nostri).
 *
 * Cum functioneaza: acelasi set de copii e randat de `repeat` ori, iar animatia
 * muta fiecare set la stanga cu exact 100% + gap. Cand primul set a iesit
 * complet, urmatorul a ajuns fix pe pozitia lui — de aici bucla fara cusatura.
 * De aceea are nevoie de cel putin doua repetari: cu una singura s-ar vedea o
 * gaura la capatul benzii pe ecranele late.
 *
 * Duplicatele sunt `aria-hidden`: un cititor de ecran aude lista o singura data,
 * nu de patru ori. La `prefers-reduced-motion` banda ramane pe loc — nimic nu se
 * misca singur pe ecranul cuiva care a cerut liniste.
 *
 * Viteza si distanta dintre carduri se dau din afara, prin clase arbitrare:
 * `[--duration:38s]`, `[--gap:1rem]`.
 */
interface MarqueeProps extends ComponentPropsWithoutRef<'div'> {
  /** Deruleaza in sens invers — folosit ca al doilea rand sa mearga altfel. */
  reverse?: boolean
  /** Opreste derularea cat timp cursorul e pe banda, ca sa se poata citi. */
  pauseOnHover?: boolean
  /** De cate ori se repeta setul de copii. Minimum 2. */
  repeat?: number
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  repeat = 4,
  children,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      className={cn(
        'group flex overflow-hidden p-2 [--duration:40s] [--gap:1rem] [gap:var(--gap)]',
        className,
      )}
    >
      {Array.from({ length: Math.max(2, repeat) }, (_, indice) => (
        <div
          key={indice}
          aria-hidden={indice > 0 || undefined}
          className={cn(
            'flex shrink-0 flex-row justify-around [gap:var(--gap)]',
            'animate-marquee motion-reduce:animate-none',
            reverse && '[animation-direction:reverse]',
            pauseOnHover && 'group-hover:[animation-play-state:paused]',
          )}
        >
          {children}
        </div>
      ))}
    </div>
  )
}
