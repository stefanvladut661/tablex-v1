import { describe, expect, it } from 'vitest'

import { emailSchema, numeSchema, parolaSchema, telefonSchema } from '@/lib/validari'

const trece = (schema: { safeParse: (v: unknown) => { success: boolean } }, valoare: unknown) =>
  schema.safeParse(valoare).success

describe('telefonSchema — format romanesc', () => {
  it('accepta formele uzuale', () => {
    for (const numar of [
      '0722123456',
      '0212345678',
      '0312345678',
      '+40722123456',
      '40722123456',
      '  0722123456  ', // se face trim
    ]) {
      expect(trece(telefonSchema, numar), numar).toBe(true)
    }
  })

  it('refuza ce nu e numar romanesc valid', () => {
    for (const numar of [
      '072212345', // prea scurt
      '07221234567', // prea lung
      '0522123456', // prefix inexistent
      '0722 123 456', // spatii interioare
      'telefon',
      '',
    ]) {
      expect(trece(telefonSchema, numar), numar).toBe(false)
    }
  })
})

/**
 * Schema doar imbraca `verificaParola` din lib/parola.ts (unde sunt si testele
 * regulii in sine). Aici verificam ca imbracamintea nu pierde nimic pe drum.
 *
 * Cazurile de mai jos cereau, pana la §49.1, doar lungime: „optcarac" trecea.
 * Trecea si prin interfata care promitea „o litera mare si o cifra".
 */
describe('parolaSchema', () => {
  it('cere lungime, majuscula si cifra (§49.1)', () => {
    expect(trece(parolaSchema, 'Sapte12')).toBe(false)
    expect(trece(parolaSchema, 'optcarac')).toBe(false)
    expect(trece(parolaSchema, 'Optcarac1')).toBe(true)
  })

  it('nu depaseste limita bcrypt de 72 de octeti', () => {
    expect(trece(parolaSchema, `A1${'a'.repeat(70)}`)).toBe(true)
    expect(trece(parolaSchema, `A1${'a'.repeat(71)}`)).toBe(false)
  })
})

describe('emailSchema', () => {
  it('accepta adrese valide si refuza restul', () => {
    expect(trece(emailSchema, 'ana@exemplu.ro')).toBe(true)
    expect(trece(emailSchema, 'ana')).toBe(false)
    expect(trece(emailSchema, 'ana@')).toBe(false)
    expect(trece(emailSchema, `${'a'.repeat(250)}@exemplu.ro`)).toBe(false)
  })
})

describe('numeSchema', () => {
  it('cere cel putin doua caractere, dupa trim', () => {
    expect(trece(numeSchema, 'A')).toBe(false)
    expect(trece(numeSchema, '  A  ')).toBe(false)
    expect(trece(numeSchema, 'Ana')).toBe(true)
  })
})
