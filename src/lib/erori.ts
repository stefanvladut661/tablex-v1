/**
 * Traduce erorile Supabase Auth / PostgREST in mesaje in romana.
 * Mesajele brute sunt in engleza si adesea prea tehnice pentru un ospatar.
 */
const MESAJE: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'Email sau parola gresita.'],
  [/email not confirmed/i, 'Trebuie sa confirmi adresa de email inainte de autentificare.'],
  [/user already registered/i, 'Exista deja un cont cu acest email.'],
  [/password should be at least/i, 'Parola trebuie sa aiba cel putin 8 caractere.'],
  [/new password should be different/i, 'Parola noua trebuie sa fie diferita de cea veche.'],
  [/email rate limit exceeded|over_email_send_rate_limit/i,
    'Prea multe emailuri trimise. Incearca din nou peste cateva minute.'],
  [/for security purposes, you can only request this after/i,
    'Prea multe incercari. Asteapta cateva secunde si reincearca.'],
  [/token has expired or is invalid|otp_expired/i,
    'Linkul a expirat sau a fost deja folosit. Cere unul nou.'],
  [/signups not allowed|signup is disabled/i, 'Inregistrarile sunt momentan dezactivate.'],
  [/failed to fetch|network/i, 'Nu am putut contacta serverul. Verifica-ti conexiunea.'],
]

export function mesajEroare(eroare: unknown): string {
  const brut =
    eroare instanceof Error
      ? eroare.message
      : typeof eroare === 'string'
        ? eroare
        : ''

  for (const [tipar, mesaj] of MESAJE) {
    if (tipar.test(brut)) return mesaj
  }

  return brut || 'A aparut o eroare neasteptata. Incearca din nou.'
}
