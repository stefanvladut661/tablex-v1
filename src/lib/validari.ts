import { z } from 'zod'

import { verificaParola } from '@/lib/parola'

export const emailSchema = z
  .email({ message: 'Adresa de email nu pare valida.' })
  .max(254, 'Adresa de email este prea lunga.')

/**
 * Minimul impus si de Supabase Auth (setarea implicita e 6; noi cerem 8).
 * Regula sta in `lib/parola.ts`, ca sa poata fi folosita si de codul incarcat
 * de la primul cadru, fara sa traga zod dupa el. Aici o imbracam in zod.
 */
export const parolaSchema = z.string().refine((v) => verificaParola(v) === null, {
  error: (ctx) => verificaParola(String(ctx.value)) ?? 'Parola nu e valida.',
})

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
