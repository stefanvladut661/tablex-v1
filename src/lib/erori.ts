/**
 * Traduce erorile Supabase Auth / PostgREST in mesaje in romana.
 * Mesajele brute sunt in engleza si adesea prea tehnice pentru un ospatar.
 */
const MESAJE: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'Email sau parolă greșită.'],
  [/email not confirmed/i, 'Trebuie să confirmi adresa de email înainte de autentificare.'],
  [/user already registered/i, 'Există deja un cont cu acest email.'],
  [/password should be at least/i, 'Parola trebuie să aibă cel puțin 8 caractere.'],
  [/new password should be different/i, 'Parola nouă trebuie să fie diferită de cea veche.'],
  [/email rate limit exceeded|over_email_send_rate_limit/i,
    'Prea multe emailuri trimise. Încearcă din nou peste câteva minute.'],
  [/for security purposes, you can only request this after/i,
    'Prea multe încercări. Așteaptă câteva secunde și reîncearcă.'],
  [/token has expired or is invalid|otp_expired/i,
    'Linkul a expirat sau a fost deja folosit. Cere unul nou.'],
  [/signups not allowed|signup is disabled/i, 'Înregistrările sunt momentan dezactivate.'],
  [/failed to fetch|network/i, 'Nu am putut contacta serverul. Verifică-ți conexiunea.'],

  // PostgREST / Postgres
  [/staff_invitations_activa_idx/i, 'Există deja o invitație activă pentru acest email.'],
  [/restaurants_slug_key|duplicate key.*slug/i, 'Adresa publică este deja folosită.'],
  [/violates row-level security policy/i,
    'Nu ai dreptul să faci această modificare cu rolul tău.'],
  [/permission denied for function/i, 'Operația nu este permisă pentru contul tău.'],
  // Constrangerea EXCLUDE din §15.3 — singurul loc unde se aplica regula
  // anti-double-booking, deci si singurul mesaj de conflict de care avem nevoie.
  [/table_allocations_fara_suprapunere|exclusion constraint/i,
    'Masa este deja ocupată în intervalul ales (buffer-ul dintre rezervări inclus).'],
  [/customers_restaurant_id_telefon_key/i,
    'Există deja un client cu acest număr de telefon.'],
  // Numerotarea meselor e unica pe RESTAURANT, nu pe zona — devine vizibila
  // in editor, unde numerele se scriu de mana.
  [/tables_restaurant_id_numar_masa_key/i,
    'Există deja o masă cu acest număr în restaurant. Alege alt număr.'],
  [/zones_restaurant_id_nume_key/i, 'Există deja o zonă cu acest nume.'],

  // CHECK-urile din schema. Interfata valideaza deja aceleasi limite, deci
  // aici ajungem doar daca cele doua s-au desincronizat — mesajul trebuie
  // totusi sa fie inteligibil.
  [/restaurants_buffer_minute_check/i, 'Buffer-ul trebuie să fie între 0 și 60 de minute.'],
  [/restaurants_durata_implicita_minute_check/i,
    'Durata implicită trebuie să fie între 90 și 180 de minute.'],
  [/restaurants_max_scaune_masa_check/i, 'O masă poate avea între 1 și 24 de scaune.'],
  [/restaurants_data_retentie_ani_check/i, 'Retenția datelor trebuie să fie între 1 și 10 ani.'],
  [/restaurants_culoare_accent_check/i, 'Culoarea trebuie scrisă în formatul #RRGGBB.'],
  [/restaurants_slug_check/i,
    'Adresa publică poate avea 3-50 caractere: litere mici, cifre și cratime.'],
  [/reservations_nr_persoane_check/i, 'Numărul de persoane trebuie să fie între 1 și 200.'],
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

  return doarMesaj || 'A apărut o eroare neașteptată. Încearcă din nou.'
}
