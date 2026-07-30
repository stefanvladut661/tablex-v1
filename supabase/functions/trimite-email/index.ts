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
 * Furnizorul e opțional: fara RESEND_API_KEY functia ruleaza in mod SIMULAT,
 * raspunde 200 si logheaza ce ar fi trimis. Aplicatia functioneaza complet,
 * iar conectarea unui furnizor real e doar o variabila de mediu:
 *   supabase secrets set RESEND_API_KEY=...
 *   supabase secrets set EMAIL_EXPEDITOR="TableX <rezervari@domeniul-tau.ro>"
 *   supabase secrets set URL_APLICATIE=https://app.tablex.ro
 */

type TipEmail = 'invitatie' | 'rezervare_confirmata' | 'rezervare_respinsa' | 'rezervare_noua'

type Cerere = { tip: TipEmail; id: string }

type Mesaj = { catre: string; subiect: string; html: string }

const CHEIE_RESEND = Deno.env.get('RESEND_API_KEY')
const EXPEDITOR = Deno.env.get('EMAIL_EXPEDITOR') ?? 'TableX <onboarding@resend.dev>'
const URL_APP = (Deno.env.get('URL_APLICATIE') ?? 'http://localhost:5173').replace(/\/$/, '')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  // Clientul moștenește JWT-ul apelantului, deci toate citirile trec prin RLS.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: autorizare } } },
  )

  let mesaj: Mesaj

  try {
    if (cerere.tip === 'invitatie') {
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
