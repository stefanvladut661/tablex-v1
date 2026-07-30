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

  // PostgREST / Postgres
  [/staff_invitations_activa_idx/i, 'Exista deja o invitatie activa pentru acest email.'],
  [/restaurants_slug_key|duplicate key.*slug/i, 'Adresa publica este deja folosita.'],
  [/violates row-level security policy/i,
    'Nu ai dreptul sa faci aceasta modificare cu rolul tau.'],
  [/permission denied for function/i, 'Operatia nu este permisa pentru contul tau.'],
  // Constrangerea EXCLUDE din §15.3 — singurul loc unde se aplica regula
  // anti-double-booking, deci si singurul mesaj de conflict de care avem nevoie.
  [/table_allocations_fara_suprapunere|exclusion constraint/i,
    'Masa este deja ocupata in intervalul ales (buffer-ul dintre rezervari inclus).'],
  [/customers_restaurant_id_telefon_key/i,
    'Exista deja un client cu acest numar de telefon.'],
  // Numerotarea meselor e unica pe RESTAURANT, nu pe zona — devine vizibila
  // in editor, unde numerele se scriu de mana.
  [/tables_restaurant_id_numar_masa_key/i,
    'Exista deja o masa cu acest numar in restaurant. Alege alt numar.'],
  [/zones_restaurant_id_nume_key/i, 'Exista deja o zona cu acest nume.'],

  // CHECK-urile din schema. Interfata valideaza deja aceleasi limite, deci
  // aici ajungem doar daca cele doua s-au desincronizat — mesajul trebuie
  // totusi sa fie inteligibil.
  [/restaurants_buffer_minute_check/i, 'Buffer-ul trebuie sa fie intre 0 si 60 de minute.'],
  [/restaurants_durata_implicita_minute_check/i,
    'Durata implicita trebuie sa fie intre 90 si 180 de minute.'],
  [/restaurants_max_scaune_masa_check/i, 'O masa poate avea intre 1 si 24 de scaune.'],
  [/restaurants_data_retentie_ani_check/i, 'Retentia datelor trebuie sa fie intre 1 si 10 ani.'],
  [/restaurants_culoare_accent_check/i, 'Culoarea trebuie scrisa in formatul #RRGGBB.'],
  [/restaurants_slug_check/i,
    'Adresa publica poate avea 3-50 caractere: litere mici, cifre si cratime.'],
  [/reservations_nr_persoane_check/i, 'Numarul de persoane trebuie sa fie intre 1 si 200.'],
]

/**
 * Aduna textul pe care merita sa-l cautam intr-o eroare.
 *
 * DEFECT GASIT LA TESTAREA EDITORULUI, cu efect pe toata aplicatia:
 * erorile PostgREST NU sunt instante de Error — supabase-js le intoarce ca
 * obiecte simple {message, details, hint, code}. Verificarea de dinainte
 * (`eroare instanceof Error`) le respingea, deci `brut` ramanea gol si ORICE
 * eroare venita din baza ajungea la utilizator ca "A aparut o eroare
 * neasteptata": mesajele CHECK-urilor, conflictul EXCLUDE, refuzurile RLS si
 * mesajele scrise anume in triggere nu se vedeau niciodata.
 *
 * Numele constrangerilor apar adesea in `details`, nu in `message`, deci
 * cautam in ambele (plus `hint`), altfel tiparele de mai sus rateaza.
 */
function textEroare(eroare: unknown): string {
  if (typeof eroare === 'string') return eroare
  if (!eroare || typeof eroare !== 'object') return ''

  const sursa = eroare as { message?: unknown; details?: unknown; hint?: unknown }
  return [sursa.message, sursa.details, sursa.hint]
    .filter((parte): parte is string => typeof parte === 'string' && parte.length > 0)
    .join(' · ')
}

export function mesajEroare(eroare: unknown): string {
  const brut = textEroare(eroare)

  for (const [tipar, mesaj] of MESAJE) {
    if (tipar.test(brut)) return mesaj
  }

  // Fara tipar potrivit ramane mesajul brut. Pentru erorile scrise de noi in
  // triggere e chiar textul in romana pe care vrem sa-l vada utilizatorul.
  const doarMesaj = typeof (eroare as { message?: unknown })?.message === 'string'
    ? ((eroare as { message: string }).message)
    : brut

  return doarMesaj || 'A aparut o eroare neasteptata. Incearca din nou.'
}
