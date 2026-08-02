import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * TableX — Generarea Automata AI „Best Guess" (§9.2.2 pasul 1, §41.3).
 *
 * Analizeaza schita grafica incarcata de Admin (imaginea din bucketul privat
 * `schite`) prin Claude API si scrie o prima varianta vectoriala estimativa —
 * pereti, usi, bar, mese cu scaune — in floor_plan_requests.ai_rezultat.
 *
 * REGULA DE FIER (§9.2.2, repetata in CLAUDE.md): rezultatul AI e unealta
 * INTERNA a echipei. Functia refuza orice apelant care nu e super_admin
 * deplin sau designer_architect, iar serviciul din client al restaurantului
 * nu selecteaza niciodata coloana ai_rezultat.
 *
 * „Reincearca Generarea AI" (§41.3) e acelasi apel: rezultatul anterior se
 * SUPRASCRIE complet, fara istoric — punctul de plecare e mereu unul singur.
 *
 * Fara ANTHROPIC_API_KEY functia raspunde civilizat ca generarea nu e
 * configurata — echipa deseneaza manual, ca pana acum. Conectarea e o
 * variabila de mediu: supabase secrets set ANTHROPIC_API_KEY=...
 */

const CHEIE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const CHEIE_ANTHROPIC = Deno.env.get('ANTHROPIC_API_KEY')

/** Canvas-ul implicit al unei zone (vezi migratia floor_plan). */
const CANVAS = { latime: 1200, inaltime: 800 }

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

const TIPURI_STRUCTURA = new Set([
  'perete',
  'usa',
  'bar',
  'dj',
  'vip',
  'intrare',
  'bucatarie',
  'planta',
  'piscina',
])

type Element = {
  tip: string
  x: number
  y: number
  latime: number
  inaltime: number
  eticheta?: string
}

type MasaEstimata = {
  forma: string
  x: number
  y: number
  latime: number
  inaltime: number
  capacitate: number
}

/** Taie estimarile in limitele canvasului si arunca ce nu se poate desena. */
function curataRezultat(brut: unknown): { structura: Element[]; mese: MasaEstimata[] } {
  const obiect = (brut ?? {}) as { structura?: unknown[]; mese?: unknown[] }
  const numar = (v: unknown, max: number) =>
    Math.max(0, Math.min(max, Math.round(Number(v) || 0)))

  const structura = (Array.isArray(obiect.structura) ? obiect.structura : [])
    .map((e) => e as Element)
    .filter((e) => TIPURI_STRUCTURA.has(e?.tip))
    .map((e) => ({
      tip: e.tip,
      x: numar(e.x, CANVAS.latime),
      y: numar(e.y, CANVAS.inaltime),
      latime: Math.max(10, numar(e.latime, CANVAS.latime)),
      inaltime: Math.max(10, numar(e.inaltime, CANVAS.inaltime)),
      ...(typeof e.eticheta === 'string' && e.eticheta ? { eticheta: e.eticheta.slice(0, 40) } : {}),
    }))
    .slice(0, 120)

  const mese = (Array.isArray(obiect.mese) ? obiect.mese : [])
    .map((m) => m as MasaEstimata)
    .filter((m) => m && (m.forma === 'rotunda' || m.forma === 'dreptunghiulara'))
    .map((m) => ({
      forma: m.forma,
      x: numar(m.x, CANVAS.latime),
      y: numar(m.y, CANVAS.inaltime),
      latime: Math.max(30, numar(m.latime, 300)),
      inaltime: Math.max(30, numar(m.inaltime, 300)),
      capacitate: Math.max(1, Math.min(12, Math.round(Number(m.capacitate) || 4))),
    }))
    .slice(0, 80)

  return { structura, mese }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return raspuns({ eroare: 'Foloseste POST.' }, 405)

  const autorizare = req.headers.get('Authorization')
  if (!autorizare) return raspuns({ eroare: 'Lipseste tokenul de autentificare.' }, 401)
  if (!CHEIE_SERVICE) return raspuns({ eroare: 'Functia nu e configurata.' }, 500)

  let corp: { cerere_id?: string }
  try {
    corp = await req.json()
  } catch {
    return raspuns({ eroare: 'Corp JSON invalid.' }, 400)
  }
  if (!corp?.cerere_id) return raspuns({ eroare: 'Trimite {cerere_id}.' }, 400)

  // Cine cere? Doar echipa de studio (§47.4) — verificat in BAZA, nu in corp.
  const caJwt = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: autorizare } },
  })
  const {
    data: { user: apelant },
  } = await caJwt.auth.getUser()
  if (!apelant) return raspuns({ eroare: 'Sesiune invalida.' }, 401)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, CHEIE_SERVICE)
  const { data: membru } = await admin
    .from('super_admin_users')
    .select('rol, activ')
    .eq('user_id', apelant.id)
    .maybeSingle()

  if (!membru?.activ || (membru.rol !== 'super_admin' && membru.rol !== 'designer_architect')) {
    return raspuns({ eroare: 'Generarea AI e unealta echipei de studio.' }, 403)
  }

  const { data: cerere } = await admin
    .from('floor_plan_requests')
    .select('id, schita_image_url')
    .eq('id', corp.cerere_id)
    .maybeSingle()

  if (!cerere) return raspuns({ eroare: 'Cererea nu exista.' }, 404)
  if (!cerere.schita_image_url) {
    return raspuns({ ok: false, motiv: 'Cererea nu are nicio schita incarcata.' })
  }

  if (!CHEIE_ANTHROPIC) {
    return raspuns({
      ok: false,
      simulat: true,
      motiv:
        'Generarea AI nu e configurata (lipseste ANTHROPIC_API_KEY). Deseneaza manual sau seteaza cheia.',
    })
  }

  // Schita sta intr-un bucket privat: o citim cu service_role si o dam mai
  // departe ca base64. Rezultatul ramane oricum doar la echipa.
  const descarcare = await admin.storage.from('schite').download(cerere.schita_image_url)
  if (descarcare.error || !descarcare.data) {
    return raspuns({ eroare: 'Schita nu a putut fi citita din storage.' }, 500)
  }

  const octeti = new Uint8Array(await descarcare.data.arrayBuffer())
  let binar = ''
  for (let i = 0; i < octeti.length; i += 32768) {
    binar += String.fromCharCode(...octeti.subarray(i, i + 32768))
  }
  const base64 = btoa(binar)

  const extensie = cerere.schita_image_url.split('.').pop()?.toLowerCase() ?? 'png'
  const mediaType =
    extensie === 'jpg' || extensie === 'jpeg'
      ? 'image/jpeg'
      : extensie === 'webp'
        ? 'image/webp'
        : 'image/png'

  const prompt = `Analizeaza schita unui plan de restaurant si estimeaza geometria pe un canvas de ${CANVAS.latime}x${CANVAS.inaltime} (originea stanga-sus, valorile in pixeli intregi).
Raspunde DOAR cu JSON valid, fara text in jur, cu forma exacta:
{"structura":[{"tip":"perete|usa|bar|dj|vip|intrare|bucatarie|planta|piscina","x":0,"y":0,"latime":0,"inaltime":0,"eticheta":"optional"}],"mese":[{"forma":"rotunda|dreptunghiulara","x":0,"y":0,"latime":0,"inaltime":0,"capacitate":4}]}
Reguli: peretii sunt dreptunghiuri subtiri (10-16px grosime) pe conturul si compartimentarile vizibile; usile sunt goluri marcate pe pereti; mesele au capacitate estimata dupa marime (2-12). Pastreaza proportiile schitei. Nu inventa elemente care nu se vad.`

  const apel = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CHEIE_ANTHROPIC,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  })

  if (!apel.ok) {
    const detaliu = await apel.text()
    console.error('Claude API a refuzat:', apel.status, detaliu)
    return raspuns({ eroare: 'Generarea AI a esuat. Incearca din nou.' }, 502)
  }

  const rezultatApi = (await apel.json()) as { content?: Array<{ type: string; text?: string }> }
  const text = rezultatApi.content?.find((b) => b.type === 'text')?.text ?? ''

  let brut: unknown
  try {
    // Modelul poate impacheta JSON-ul in ```json ... ``` — le taiem.
    brut = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, ''))
  } catch {
    console.error('Raspuns ne-JSON de la model:', text.slice(0, 400))
    return raspuns({ eroare: 'Modelul nu a intors o geometrie valida. Reincearca.' }, 502)
  }

  const curat = curataRezultat(brut)

  // §41.3 — suprascriere completa, fara istoric.
  const { error: eroareScriere } = await admin
    .from('floor_plan_requests')
    .update({ ai_rezultat: curat, ai_generat_la: new Date().toISOString() })
    .eq('id', cerere.id)
  if (eroareScriere) {
    console.error('ai_rezultat nu s-a putut scrie:', eroareScriere)
    return raspuns({ eroare: 'Rezultatul nu a putut fi salvat.' }, 500)
  }

  return raspuns({
    ok: true,
    elemente: curat.structura.length,
    mese: curat.mese.length,
  })
})
