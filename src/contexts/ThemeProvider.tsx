import type { ReactNode } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * Tema se tine cu next-themes, nu cu un context propriu: componenta
 * src/components/ui/sonner.tsx (shadcn) citeste deja useTheme() de acolo,
 * iar doua surse de adevar pentru tema ar diverge inevitabil.
 *
 * attribute="class" pune clasa .dark pe <html>, exact ce asteapta
 * @custom-variant dark din src/index.css.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="tablex-tema"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
