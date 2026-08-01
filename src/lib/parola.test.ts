import { describe, expect, it } from 'vitest'

import { verificaParola } from '@/lib/parola'

describe('verificaParola', () => {
  it('accepta o parola care respecta §49.1', () => {
    expect(verificaParola('Parola123')).toBeNull()
  })

  it('refuza sub 8 caractere', () => {
    expect(verificaParola('Par12')).toMatch(/8 caractere/)
  })

  it('refuza fara majuscula', () => {
    // Textul din interfata promitea „o litera mare si o cifra" inca dinainte ca
    // regula sa existe. Testul e aici ca sa nu se mai desparta cele doua.
    expect(verificaParola('parola123')).toMatch(/litera mare/)
  })

  it('refuza fara cifra', () => {
    expect(verificaParola('ParolaMea')).toMatch(/cifra/)
  })

  it('accepta majuscula cu diacritice', () => {
    // Un restaurant romanesc scrie „Șerban1234"; majuscula e reala.
    expect(verificaParola('Șerban1234')).toBeNull()
  })

  it('refuza peste 72 de caractere (limita bcrypt din Supabase)', () => {
    expect(verificaParola(`A1${'x'.repeat(71)}`)).toMatch(/cel mult/)
  })
})
