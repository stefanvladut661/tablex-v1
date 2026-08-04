import { describe, expect, it } from 'vitest'

import { gasesteZonaDupaNume, normalizeazaNumeZona } from '@/lib/nume-zona'

/**
 * Miza testelor: builderul creeaza singur zona din cerere daca nu o gaseste. O
 * potrivire ratata nu arunca nicio eroare — doar mai apare o zona goala, si
 * mesele se imprastie intre duplicate. Exact genul de greseala invizibila.
 */
describe('normalizeazaNumeZona', () => {
  it('scoate diacriticele, indiferent cum sunt scrise', () => {
    expect(normalizeazaNumeZona('Terasă')).toBe('terasa')
    expect(normalizeazaNumeZona('Salonul Mare')).toBe('salonul mare')
    // ș cu virgula (corect, U+0219) si ş cu sedila (varianta veche, U+015F)
    // trebuie sa dea acelasi rezultat: tastaturile romanesti le produc pe
    // amandoua, iar cele doua cereri ar fi ajuns doua zone diferite.
    expect(normalizeazaNumeZona('Etajul șase')).toBe(
      normalizeazaNumeZona('Etajul şase'),
    )
    expect(normalizeazaNumeZona('Curtea Interioară')).toBe('curtea interioara')
  })

  it('nu se impiedica de spatii si de majuscule', () => {
    expect(normalizeazaNumeZona('  TERASA  ')).toBe('terasa')
    expect(normalizeazaNumeZona('Etaj\t1')).toBe('etaj 1')
    expect(normalizeazaNumeZona('Salon    interior')).toBe('salon interior')
  })

  it('pastreaza numele distincte distincte', () => {
    expect(normalizeazaNumeZona('Terasa 1')).not.toBe(normalizeazaNumeZona('Terasa 2'))
    expect(normalizeazaNumeZona('Salon')).not.toBe(normalizeazaNumeZona('Salonul'))
  })
})

describe('gasesteZonaDupaNume', () => {
  const zone = [
    { id: 'z1', nume: 'Salon interior' },
    { id: 'z2', nume: 'Terasă' },
    { id: 'z3', nume: 'Etaj 1' },
  ]

  it('gaseste zona scrisa altfel in cerere', () => {
    expect(gasesteZonaDupaNume(zone, 'terasa')?.id).toBe('z2')
    expect(gasesteZonaDupaNume(zone, ' TERASĂ ')?.id).toBe('z2')
    expect(gasesteZonaDupaNume(zone, 'Salon   Interior')?.id).toBe('z1')
  })

  it('intoarce null cand zona chiar nu exista', () => {
    // Aici builderul o creeaza — deci un fals negativ costa o zona in plus, iar
    // un fals pozitiv ar duce planul in alta sala.
    expect(gasesteZonaDupaNume(zone, 'Etaj 2')).toBeNull()
    expect(gasesteZonaDupaNume(zone, 'Grădină')).toBeNull()
    expect(gasesteZonaDupaNume([], 'Terasă')).toBeNull()
  })

  it('trateaza numele gol ca lipsa, nu ca potrivire', () => {
    // O cerere fara zona nu are voie sa nimereasca prima zona din lista.
    expect(gasesteZonaDupaNume(zone, '   ')).toBeNull()
    expect(gasesteZonaDupaNume([{ id: 'gol', nume: '' }], '')).toBeNull()
  })
})
