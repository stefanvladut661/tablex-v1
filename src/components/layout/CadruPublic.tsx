import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router'

import { Navbar } from '@/components/hero/Navbar'
import { SubsolPublic } from '@/components/layout/SubsolPublic'

/**
 * Invelisul comun al paginilor publice: aceeasi bara sus, acelasi subsol jos,
 * acelasi font si aceeasi coloana.
 *
 * Exista fiindca pana acum fiecare pagina publica isi purta propriul cadru —
 * landing avea bara si subsol, /demo n-avea niciunul, iar autentificarea
 * folosea CadruAuth. Trecerea dintre ele arata a trei site-uri lipite, nu a
 * unul singur.
 *
 * `tema-landing` sta AICI, nu pe fiecare pagina: altfel /demo ar fi ramas pe
 * Inter in timp ce landing-ul e pe Albert Sans, si tocmai schimbarea de font
 * intre pagini e cusatura pe care o simte ochiul cel mai tare.
 */

interface CadruPublicProps {
  children: ReactNode
  /** Doar landing-ul are hero, deci doar acolo bara asteapta coregrafia. */
  cuIntro?: boolean
  /** Paginile cu continut propriu isi pun singure coloana; landing-ul o are pe sectiuni. */
  incadrat?: boolean
}

export function CadruPublic({ children, cuIntro = false, incadrat = false }: CadruPublicProps) {
  const { hash } = useLocation()

  /**
   * Ancorele din bara si din subsol trimit acum `/#preturi` din orice pagina.
   * Cand navigarea vine de pe alta ruta, browserul nu deruleaza singur: la
   * momentul in care se schimba URL-ul, sectiunea inca nu e in DOM. De-aia
   * cautam tinta dupa montare.
   */
  useEffect(() => {
    if (!hash) return
    const tinta = document.querySelector(hash)
    if (tinta) tinta.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  return (
    <div className="tema-landing flex min-h-svh flex-col bg-background">
      <Navbar cuIntro={cuIntro} />
      <main className={incadrat ? 'wrap-landing grow py-16' : 'grow'}>{children}</main>
      <SubsolPublic />
    </div>
  )
}
