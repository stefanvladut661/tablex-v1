import { z } from 'zod'

export const emailSchema = z
  .email({ message: 'Adresa de email nu pare valida.' })
  .max(254, 'Adresa de email este prea lunga.')

/** Minimul impus si de Supabase Auth (setarea implicita e 6; noi cerem 8). */
export const parolaSchema = z
  .string()
  .min(8, 'Parola trebuie sa aiba cel putin 8 caractere.')
  .max(72, 'Parola poate avea cel mult 72 de caractere.')

/** Format romanesc: 07xxxxxxxx, 02/03xxxxxxxx, cu sau fara prefix +40. */
export const telefonSchema = z
  .string()
  .trim()
  .regex(/^(?:\+?4)?0[237]\d{8}$/, 'Numarul de telefon nu pare valid (ex: 0722123456).')

export const numeSchema = z
  .string()
  .trim()
  .min(2, 'Introdu cel putin 2 caractere.')
  .max(120, 'Textul este prea lung.')
