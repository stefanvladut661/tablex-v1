import { useTheme } from 'next-themes'

export type Tema = 'light' | 'dark' | 'system'

export function useTema() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme()

  return {
    tema: (theme ?? 'system') as Tema,
    temaEfectiva: (resolvedTheme ?? systemTheme ?? 'light') as 'light' | 'dark',
    seteazaTema: (tema: Tema) => setTheme(tema),
    comutaTema: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
  }
}
