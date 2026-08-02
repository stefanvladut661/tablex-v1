import { describe, expect, it } from 'vitest'

import { mesajEroare } from '@/lib/erori'

/**
 * Testul care conteaza cel mai mult din acest fisier e primul grup.
 *
 * Verificarea initiala era `eroare instanceof Error`. Dar supabase-js intoarce
 * erorile PostgREST ca OBIECTE SIMPLE {message, details, hint, code}, deci
 * conditia pica si ORICE eroare venita din baza ajungea la utilizator ca
 * "A aparut o eroare neasteptata": CHECK-urile, conflictul EXCLUDE de la
 * double-booking, refuzurile RLS si mesajele scrise anume in triggere.
 * Defectul a trait nedetectat pana la editorul de floor plan.
 */
describe('mesajEroare — forma obiectului de eroare', () => {
  it('citeste mesajul dintr-un obiect PostgREST, care NU e instanta de Error', () => {
    const dinPostgrest = {
      message: 'Masa 2 are 1 rezervari viitoare. Dezactiveaz-o in loc sa o stergi.',
      details: null,
      hint: null,
      code: 'P0002',
    }

    expect(dinPostgrest instanceof Error).toBe(false)
    expect(mesajEroare(dinPostgrest)).toBe(
      'Masa 2 are 1 rezervari viitoare. Dezactiveaz-o in loc sa o stergi.',
    )
  })

  it('gaseste numele constrangerii chiar cand apare doar in `details`', () => {
    // PostgREST pune adesea numele constrangerii in details, nu in message.
    // Daca am cauta doar in message, tiparele traduse ar rata.
    const eroare = {
      message: 'duplicate key value violates unique constraint',
      details: 'Key (restaurant_id, numar_masa)=(...) already exists. tables_restaurant_id_numar_masa_key',
      hint: null,
      code: '23505',
    }

    expect(mesajEroare(eroare)).toBe(
      'Există deja o masă cu acest număr în restaurant. Alege alt număr.',
    )
  })

  it('accepta si instante de Error, si siruri', () => {
    expect(mesajEroare(new Error('Invalid login credentials'))).toBe('Email sau parolă greșită.')
    expect(mesajEroare('Invalid login credentials')).toBe('Email sau parolă greșită.')
  })

  it('cade pe mesajul generic doar cand nu are nimic de spus', () => {
    const generic = 'A apărut o eroare neașteptată. Încearcă din nou.'
    expect(mesajEroare(null)).toBe(generic)
    expect(mesajEroare(undefined)).toBe(generic)
    expect(mesajEroare({})).toBe(generic)
    expect(mesajEroare('')).toBe(generic)
  })

  it('nu scurge in interfata textul din details cand exista un message propriu', () => {
    // details e util pentru POTRIVIRE, dar utilizatorul nu trebuie sa vada
    // fragmente de SQL cand mesajul principal e deja lizibil.
    const eroare = {
      message: 'Zona "Salon" are 3 rezervari viitoare. Dezactiveaz-o in loc sa o stergi.',
      details: 'PL/pgSQL function protejeaza_stergerea_zonei() line 12 at RAISE',
      hint: null,
      code: 'P0002',
    }

    const rezultat = mesajEroare(eroare)
    expect(rezultat).toBe('Zona "Salon" are 3 rezervari viitoare. Dezactiveaz-o in loc sa o stergi.')
    expect(rezultat).not.toContain('PL/pgSQL')
  })
})

describe('mesajEroare — traduceri', () => {
  it.each([
    ['Email not confirmed', 'Trebuie să confirmi adresa de email înainte de autentificare.'],
    ['User already registered', 'Există deja un cont cu acest email.'],
    ['over_email_send_rate_limit', 'Prea multe emailuri trimise. Încearcă din nou peste câteva minute.'],
    ['Failed to fetch', 'Nu am putut contacta serverul. Verifică-ți conexiunea.'],
    [
      'new row violates row-level security policy for table "restaurants"',
      'Nu ai dreptul să faci această modificare cu rolul tău.',
    ],
    ['permission denied for function creeaza_restaurant', 'Operația nu este permisă pentru contul tău.'],
  ])('traduce %s', (brut, asteptat) => {
    expect(mesajEroare({ message: brut })).toBe(asteptat)
  })

  it('traduce conflictul EXCLUDE, singura regula anti-double-booking (§15.3)', () => {
    const eroare = {
      message: 'conflicting key value violates exclusion constraint "table_allocations_fara_suprapunere"',
      code: '23P01',
    }
    expect(mesajEroare(eroare)).toBe(
      'Masa este deja ocupată în intervalul ales (buffer-ul dintre rezervări inclus).',
    )
  })

  it('traduce CHECK-urile din schema, cu care interfata trebuie sa rămână sincronizata', () => {
    expect(mesajEroare({ message: 'violates check constraint "restaurants_buffer_minute_check"' })).toBe(
      'Buffer-ul trebuie să fie între 0 și 60 de minute.',
    )
    expect(mesajEroare({ message: 'violates check constraint "restaurants_slug_check"' })).toBe(
      'Adresa publică poate avea 3-50 caractere: litere mici, cifre și cratime.',
    )
  })
})
