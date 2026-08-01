import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * TableX — trimitere de emailuri tranzacționale.
 *
 * DECIZIA DE SECURITATE care da forma acestei functii:
 * clientul NU trimite niciodata destinatarul sau conținutul. Trimite doar
 * {tip, id}. Functia citeste randul folosind JWT-ul apelantului, deci prin RLS
 * — daca utilizatorul nu are dreptul sa vada invitatia sau rezervarea, nu
 * poate nici sa declanseze un email despre ea. Asa endpoint-ul nu poate fi
 * folosit ca releu de spam.
 *
 * SINGURA EXCEPTIE, si de ce e sigura (migratia 16):
 * emailul "am primit cererea ta" pleaca spre un client ANONIM, care prin RLS
 * nu-si poate citi propria rezervare — deci apelul nu poate porni din browser.
 * Il porneste baza de date, printr-un trigger pg_net, si se legitimeaza cu un
 * secret generat tot in baza. Secretul se valideaza inapoi in Postgres
 * (verifica_secret_webhook), nu il tinem aici: asa rotirea lui nu cere
 * redesfasurarea functiei, iar functia nu are cum sa-l divulge.
 * In acest mod tipul e limitat la 'rezervare_noua' — nimic altceva.
 *
 * Furnizorul e opțional: fara RESEND_API_KEY functia ruleaza in mod SIMULAT,
 * raspunde 200 si logheaza ce ar fi trimis. Aplicatia functioneaza complet,
 * iar conectarea unui furnizor real e doar o variabila de mediu:
 *   supabase secrets set RESEND_API_KEY=...
 *   supabase secrets set EMAIL_EXPEDITOR="TableX <rezervari@domeniul-tau.ro>"
 *   supabase secrets set URL_APLICATIE=https://app.tablex.ro
 */

type TipEmail =
  | 'invitatie'
  | 'invitatie_echipa'
  | 'rezervare_confirmata'
  | 'rezervare_respinsa'
  | 'rezervare_noua'

type Cerere = { tip: TipEmail; id: string }

type Mesaj = { catre: string; subiect: string; html: string }

const CHEIE_RESEND = Deno.env.get('RESEND_API_KEY')
// Injectata automat de platforma — nu cere `supabase secrets set`.
const CHEIE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const EXPEDITOR = Deno.env.get('EMAIL_EXPEDITOR') ?? 'TableX <onboarding@resend.dev>'
const URL_APP = (Deno.env.get('URL_APLICATIE') ?? 'http://localhost:5173').replace(/\/$/, '')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-tablex-webhook',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function raspuns(corp: unknown, status = 200) {
  return new Response(JSON.stringify(corp), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function scapa(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Un singur sablon, ca toate emailurile sa arate la fel. */
function sablon(titlu: string, paragrafe: string[], buton?: { text: string; url: string }) {
  return `<!doctype html>
<html lang="ro"><body style="margin:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <p style="font-size:18px;font-weight:600;margin:0 0 24px">Table<span style="color:#059669">X</span></p>
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px">
      <h1 style="font-size:18px;margin:0 0 12px">${scapa(titlu)}</h1>
      ${paragrafe.map((p) => `<p style="font-size:14px;line-height:1.6;margin:0 0 12px;color:#475569">${p}</p>`).join('')}
      ${
        buton
          ? `<p style="margin:20px 0 0"><a href="${buton.url}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:500">${scapa(buton.text)}</a></p>`
          : ''
      }
    </div>
    <p style="font-size:12px;color:#64748b;margin:16px 0 0">
      Email trimis automat de TableX. Nu raspunde la aceasta adresa.
    </p>
  </div>
</body></html>`
}

function dataLocala(iso: string, fus: string): string {
  return new Date(iso).toLocaleString('ro-RO', {
    timeZone: fus,
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return raspuns({ eroare: 'Foloseste POST.' }, 405)

  const autorizare = req.headers.get('Authorization')
  if (!autorizare) return raspuns({ eroare: 'Lipseste tokenul de autentificare.' }, 401)

  let cerere: Cerere
  try {
    cerere = await req.json()
  } catch {
    return raspuns({ eroare: 'Corp JSON invalid.' }, 400)
  }

  if (!cerere?.tip || !cerere?.id) {
    return raspuns({ eroare: 'Trimite {tip, id}.' }, 400)
  }

  // ── Apelul vine din baza de date? ──────────────────────────────────────
  // Secretul se valideaza IN Postgres: functia verifica_secret_webhook
  // raspunde doar da/nu si e executabila exclusiv de service_role.
  const secretPrimit = req.headers.get('x-tablex-webhook')
  let esteWebhook = false

  if (secretPrimit) {
    if (!CHEIE_SERVICE) {
      console.error('SUPABASE_SERVICE_ROLE_KEY lipseste; nu pot valida webhook-ul.')
      return raspuns({ eroare: 'Functia nu e configurata pentru webhook.' }, 500)
    }
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, CHEIE_SERVICE)
    const { data, error } = await admin.rpc('verifica_secret_webhook', {
      p_secret: secretPrimit,
    })
    if (error || data !== true) {
      console.error('Secret de webhook respins:', error)
      return raspuns({ eroare: 'Secret de webhook invalid.' }, 401)
    }
    esteWebhook = true
  }

  // 'rezervare_noua' merge spre un client anonim, deci NU poate fi cerut de un
  // apelant obisnuit; si invers, webhook-ul nu are voie sa ceara altceva.
  if (cerere.tip === 'rezervare_noua' && !esteWebhook) {
    return raspuns({ eroare: 'Acest tip se trimite doar automat, din baza.' }, 403)
  }
  if (esteWebhook && cerere.tip !== 'rezervare_noua') {
    return raspuns({ eroare: 'Webhook-ul poate trimite doar rezervare_noua.' }, 403)
  }

  // In mod webhook citim cu service_role: clientul anonim nu are — corect — voie
  // sa-si vada rezervarea prin RLS. In rest, clientul moștenește JWT-ul
  // apelantului, deci toate citirile trec prin RLS.
  const supabase = esteWebhook
    ? createClient(Deno.env.get('SUPABASE_URL')!, CHEIE_SERVICE!)
    : createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: autorizare } },
      })

  let mesaj: Mesaj

  try {
    if (cerere.tip === 'invitatie_echipa') {
      // Invitatia in echipa TableX (§47.1) — acelasi mecanism ca la Ospatar.
      // Citirea trece prin RLS: doar rolul super_admin vede invitatiile, deci
      // doar el poate declansa emailul.
      const { data, error } = await supabase
        .from('super_admin_invitations')
        .select('email, rol, token, expira_la')
        .eq('id', cerere.id)
        .single()
      if (error) throw error

      const link = `${URL_APP}/invitatie?token=${encodeURIComponent(data.token)}`
      const rol =
        data.rol === 'super_admin'
          ? 'Super Admin'
          : data.rol === 'designer_architect'
            ? 'Designer / Architect'
            : 'Support'

      mesaj = {
        catre: data.email,
        subiect: 'Invitatie in echipa TableX',
        html: sablon(
          'Ai fost invitat in echipa TableX',
          [
            `Rolul tau va fi <strong>${rol}</strong>. Deschide linkul de mai jos, autentifica-te cu aceasta adresa de email si vei intra in panoul echipei.`,
            `Invitatia expira pe ${new Date(data.expira_la).toLocaleDateString('ro-RO')}.`,
          ],
          { text: 'Accepta invitatia', url: link },
        ),
      }
    } else if (cerere.tip === 'invitatie') {
      const { data, error } = await supabase
        .from('staff_invitations')
        .select('email, rol, token, expira_la, restaurant:restaurants(nume)')
        .eq('id', cerere.id)
        .single()
      if (error) throw error

      const restaurant = (data.restaurant as { nume: string } | null)?.nume ?? 'restaurant'
      const link = `${URL_APP}/invitatie?token=${encodeURIComponent(data.token)}`
      const rol = data.rol === 'manager' ? 'Manager' : 'Ospatar'

      mesaj = {
        catre: data.email,
        subiect: `Invitatie in echipa ${restaurant}`,
        html: sablon(
          `Ai fost invitat la ${scapa(restaurant)}`,
          [
            `Rolul tau va fi <strong>${rol}</strong>. Deschide linkul de mai jos, autentifica-te cu aceasta adresa de email si vei intra direct in panoul restaurantului.`,
            `Invitatia expira pe ${new Date(data.expira_la).toLocaleDateString('ro-RO')}.`,
          ],
          { text: 'Accepta invitatia', url: link },
        ),
      }
    } else {
      const { data, error } = await supabase
        .from('reservations')
        .select(
          'client_nume, email, data_ora, nr_persoane, status, restaurant:restaurants(nume, fus_orar, telefon_contact)',
        )
        .eq('id', cerere.id)
        .single()
      if (error) throw error

      const restaurant = data.restaurant as {
        nume: string
        fus_orar: string
        telefon_contact: string | null
      } | null

      if (!data.email) {
        // Nu e o eroare: rezervarile telefonice si walk-in-urile n-au email.
        return raspuns({ trimis: false, motiv: 'Rezervarea nu are adresa de email.' })
      }

      const cand = dataLocala(data.data_ora, restaurant?.fus_orar ?? 'Europe/Bucharest')
      const numeRestaurant = restaurant?.nume ?? 'Restaurantul'
      const telefon = restaurant?.telefon_contact
        ? `Pentru orice schimbare, suna la ${scapa(restaurant.telefon_contact)}.`
        : 'Pentru orice schimbare, contacteaza restaurantul.'

      if (cerere.tip === 'rezervare_respinsa') {
        mesaj = {
          catre: data.email,
          subiect: `Rezervarea la ${numeRestaurant} nu a putut fi confirmata`,
          html: sablon(`Ne pare rau, ${scapa(data.client_nume)}`, [
            `${scapa(numeRestaurant)} nu poate onora rezervarea pentru <strong>${cand}</strong>, ${data.nr_persoane} persoane.`,
            telefon,
          ]),
        }
      } else if (cerere.tip === 'rezervare_noua') {
        mesaj = {
          catre: data.email,
          subiect: `Am primit cererea ta de rezervare la ${numeRestaurant}`,
          html: sablon(`Mulțumim, ${scapa(data.client_nume)}`, [
            `Am inregistrat cererea pentru <strong>${cand}</strong>, ${data.nr_persoane} persoane. Restaurantul o confirma in scurt timp.`,
            telefon,
          ]),
        }
      } else {
        mesaj = {
          catre: data.email,
          subiect: `Rezervare confirmata la ${numeRestaurant}`,
          html: sablon(`Te asteptam, ${scapa(data.client_nume)}`, [
            `Rezervarea ta la <strong>${scapa(numeRestaurant)}</strong> e confirmata pentru <strong>${cand}</strong>, ${data.nr_persoane} persoane.`,
            telefon,
          ]),
        }
      }
    }
  } catch (eroare) {
    // Randul nu exista SAU apelantul nu are dreptul sa il vada (RLS). Nu
    // diferentiem: altfel functia ar deveni un oracol pentru id-uri valide.
    console.error('Citire refuzata sau inexistenta:', eroare)
    return raspuns({ eroare: 'Nu am gasit datele pentru acest email.' }, 404)
  }

  if (!CHEIE_RESEND) {
    console.log('[SIMULAT] email care ar fi fost trimis:', {
      catre: mesaj.catre,
      subiect: mesaj.subiect,
    })
    return raspuns({ trimis: false, simulat: true, catre: mesaj.catre, subiect: mesaj.subiect })
  }

  const rezultat = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CHEIE_RESEND}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EXPEDITOR,
      to: [mesaj.catre],
      subject: mesaj.subiect,
      html: mesaj.html,
    }),
  })

  if (!rezultat.ok) {
    const detaliu = await rezultat.text()
    console.error('Furnizorul de email a refuzat:', rezultat.status, detaliu)
    return raspuns({ trimis: false, eroare: 'Furnizorul de email a refuzat trimiterea.' }, 502)
  }

  return raspuns({ trimis: true, catre: mesaj.catre })
})
