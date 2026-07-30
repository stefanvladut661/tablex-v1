import { describe, expect, it } from 'vitest'

import { SLUG_MAX, genereazaSlug, slugValid } from '@/lib/slug'

/**
 * Slug-ul e adresa publica a restaurantului si e validat si in baza, de
 * constrangerea restaurants_slug_check. Invariantul care conteaza: generatorul
 * nu are voie sa produca NICIODATA ceva ce baza refuza — altfel onboarding-ul
 * pica dupa ce utilizatorul a completat tot formularul.
 */
describe('genereazaSlug', () => {
  it('transforma un nume obisnuit', () => {
    expect(genereazaSlug('Bistro Central')).toBe('bistro-central')
  })

  it('transliterează diacriticele romanesti, in AMBELE forme Unicode', () => {
    // ș/ț cu virgula (U+0219/U+021B) se descompun prin NFD...
    expect(genereazaSlug('Cârciuma Veche')).toBe('carciuma-veche')
    expect(genereazaSlug('Pescărușul')).toBe('pescarusul')
    // ...dar ş/ţ cu SEDILA (U+015F/U+0163) nu se descompun deloc si au nevoie
    // de maparea explicita. Apar des in texte copiate din documente vechi.
    expect(genereazaSlug('Peşteră Ţara')).toBe('pestera-tara')
  })

  it('nu lasa cratime la capete si nu dubleaza separatorii', () => {
    expect(genereazaSlug('  ---Terasa   la  Mare!!!  ')).toBe('terasa-la-mare')
    expect(genereazaSlug('La Doi Cocoși &&& Co.')).toBe('la-doi-cocosi-co')
  })

  it('taie la lungimea maxima FARA sa lase cratima la final', () => {
    const lung = genereazaSlug('a'.repeat(30) + ' ' + 'b'.repeat(40))
    expect(lung.length).toBeLessThanOrEqual(SLUG_MAX)
    expect(lung.endsWith('-')).toBe(false)
  })

  it('intoarce sir gol cand nu ramane nimic utilizabil', () => {
    // Interfata trebuie sa trateze cazul; important e sa nu produca "-" sau "--".
    expect(genereazaSlug('!!!')).toBe('')
    expect(genereazaSlug('   ')).toBe('')
  })

  it('INVARIANT: ce genereaza trece validatorul, sau e gol', () => {
    const nume = [
      'Bistro Central',
      'Cârciuma Veche',
      'Peşteră Ţara',
      'La Doi Cocoși & Co.',
      '   ---Terasa   la  Mare!!!  ',
      'a'.repeat(80),
      'Restaurant 1',
      'Ștefan cel Mare',
      '123',
      'A B',
    ]

    for (const text of nume) {
      const slug = genereazaSlug(text)
      if (slug === '') continue
      expect(slugValid(slug), `„${text}" → „${slug}" ar fi refuzat de baza`).toBe(true)
    }
  })
})

describe('slugValid — oglindeste CHECK-ul din schema', () => {
  it('accepta ce accepta si baza', () => {
    expect(slugValid('abc')).toBe(true)
    expect(slugValid('bistro-central')).toBe(true)
    expect(slugValid('a1b')).toBe(true)
    expect(slugValid('a'.repeat(50))).toBe(true)
  })

  it('refuza ce refuza si baza', () => {
    expect(slugValid('ab')).toBe(false) // sub 3 caractere
    expect(slugValid('a'.repeat(51))).toBe(false) // peste 50
    expect(slugValid('-abc')).toBe(false) // cratima la inceput
    expect(slugValid('abc-')).toBe(false) // cratima la final
    expect(slugValid('ABC')).toBe(false) // majuscule
    expect(slugValid('ab_c')).toBe(false) // underscore
    expect(slugValid('ab c')).toBe(false) // spatiu
    expect(slugValid('cârciuma')).toBe(false) // diacritice
  })
})
