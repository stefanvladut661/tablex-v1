import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { PlusIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * FAQ pe categorii: un rand de taburi sus, acordeonul dedesubt.
 *
 * Nota: originalul importa `framer-motion`. Proiectul are deja `motion` v12,
 * pachetul succesor cu acelasi API, deci folosim `motion/react` si nu mai
 * adaugam o dependenta paralela care ar dubla runtime-ul de animatie.
 */

export interface IntrebareFaq {
  intrebare: string
  raspuns: string
}

interface FAQProps {
  title?: string
  subtitle?: string
  /** Cheie interna -> eticheta afisata pe tab. Ordinea dicteaza ordinea taburilor. */
  categories: Record<string, string>
  /** Aceleasi chei ca in `categories`. */
  faqData: Record<string, IntrebareFaq[]>
  className?: string
}

export function FAQ({
  title = 'Intrebari frecvente',
  subtitle,
  categories,
  faqData,
  className,
}: FAQProps) {
  const cheiCategorii = Object.keys(categories)
  const [categorieActiva, setCategorieActiva] = useState(cheiCategorii[0])
  const [intrebareDeschisa, setIntrebareDeschisa] = useState<string | null>(null)

  const schimbaCategoria = (cheie: string) => {
    setCategorieActiva(cheie)
    // Acordeonul reincepe inchis: altfel ramane deschis un raspuns
    // care nu mai are legatura cu categoria afisata.
    setIntrebareDeschisa(null)
  }

  const intrebari = faqData[categorieActiva] ?? []

  return (
    <section className={cn('relative', className)}>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}

      <div role="tablist" aria-label="Categorii de intrebari" className="mt-6 flex flex-wrap gap-2">
        {cheiCategorii.map((cheie) => {
          const activ = cheie === categorieActiva
          return (
            <button
              key={cheie}
              type="button"
              role="tab"
              aria-selected={activ}
              onClick={() => schimbaCategoria(cheie)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                activ
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {categories[cheie]}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={categorieActiva}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="mt-4 divide-y divide-border rounded-md border border-border bg-card"
        >
          {intrebari.map(({ intrebare, raspuns }) => {
            const deschisa = intrebareDeschisa === intrebare
            return (
              <div key={intrebare}>
                <button
                  type="button"
                  aria-expanded={deschisa}
                  onClick={() => setIntrebareDeschisa(deschisa ? null : intrebare)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium',
                    'transition-colors hover:text-primary',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  )}
                >
                  {intrebare}
                  <PlusIcon
                    aria-hidden
                    className={cn(
                      'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                      deschisa && 'rotate-45 text-primary',
                    )}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {deschisa && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-3 text-sm text-muted-foreground">{raspuns}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

export default FAQ
