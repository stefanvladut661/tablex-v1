import { Link } from 'react-router'

import { useAuth } from '@/hooks/useAuth'
import { RUTE, ruteDupaLogin } from '@/lib/rute'

/**
 * Subsolul paginilor publice. A stat pana acum scris direct in LandingPage,
 * deci /demo si /confidentialitate se terminau brusc, fara nimic — una din
 * cusaturile care faceau site-ul sa para trei site-uri diferite.
 *
 * Ancorele poarta ruta in fata (`/#preturi`), nu doar hash-ul: din /demo un
 * `#preturi` gol ar schimba hash-ul paginii curente fara sa duca nicaieri.
 */

const SECTIUNI = [
  { text: 'Problema', sectiune: 'problema' },
  { text: 'Ce primești', sectiune: 'functionalitati' },
  { text: 'Harta 2D', sectiune: 'harta' },
  { text: 'Cum pornești', sectiune: 'cum-functioneaza' },
  { text: 'Prețuri', sectiune: 'preturi' },
  { text: 'Întrebări frecvente', sectiune: 'intrebari' },
] as const

export function SubsolPublic() {
  const { esteAutentificat, profil } = useAuth()

  const numeCont =
    profil?.tip === 'admin'
      ? profil.restaurant.nume
      : profil?.tip === 'super_admin'
        ? 'echipa TableX'
        : null

  return (
    <footer className="mt-auto border-t border-border">
      <div className="w-full px-6 py-14 sm:px-10 lg:px-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
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
              {SECTIUNI.map(({ text, sectiune }) => (
                <li key={sectiune}>
                  <Link to={`${RUTE.acasa}#${sectiune}`} className="hover:text-foreground">
                    {text}
                  </Link>
                </li>
              ))}
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
                  {numeCont && <span className="block text-xs">Conectat ca {numeCont}</span>}
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

        <div className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
          Table<span className="text-primary">X</span> — management de rezervări pentru
          restaurante.
        </div>
      </div>
    </footer>
  )
}
