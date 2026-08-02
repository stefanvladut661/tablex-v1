import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * TableX — resetarea parolei unui Ospatar de catre Managerul lui (§49.8, §52).
 *
 * De ce Edge Function si nu client: schimbarea parolei ALTUI cont cere
 * admin.updateUserById, adica service_role — o cheie care nu are voie sa
 * atinga browserul. Functia primeste JWT-ul managerului, verifica STRICT in
 * baza relatia manager→ospatar (acelasi restaurant, rolurile corecte), si
 * abia apoi foloseste service_role pentru exact aceasta operatie.
 *
 * Parola NU vine de la apelant: se genereaza aici si se intoarce O SINGURA
 * data, ca managerul sa i-o dea ospatarului. Un manager grabit care ar alege
 * „1234" ar fi o gaura; un generator nu se grabeste. Ospatarul si-o schimba
 * apoi din contul lui (§49.9).
 */

const CHEIE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

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

/** 12 caractere fara ambiguitati vizuale (fara 0/O, 1/l/I) — usor de dictat. */
function genereazaParola(): string {
  const alfabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const octeti = new Uint8Array(12)
  crypto.getRandomValues(octeti)
  return Array.from(octeti, (o) => alfabet[o % alfabet.length]).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return raspuns({ eroare: 'Foloseste POST.' }, 405)

  const autorizare = req.headers.get('Authorization')
  if (!autorizare) return raspuns({ eroare: 'Lipseste tokenul de autentificare.' }, 401)
  if (!CHEIE_SERVICE) {
    console.error('SUPABASE_SERVICE_ROLE_KEY lipseste.')
    return raspuns({ eroare: 'Functia nu e configurata.' }, 500)
  }

  let corp: { admin_user_id?: string }
  try {
    corp = await req.json()
  } catch {
    return raspuns({ eroare: 'Corp JSON invalid.' }, 400)
  }
  if (!corp?.admin_user_id) return raspuns({ eroare: 'Trimite {admin_user_id}.' }, 400)

  // Cine cere? Identitatea vine din JWT, nu din corp.
  const caJwt = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: autorizare } },
  })
  const {
    data: { user: apelant },
    error: eroareUser,
  } = await caJwt.auth.getUser()
  if (eroareUser || !apelant) return raspuns({ eroare: 'Sesiune invalida.' }, 401)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, CHEIE_SERVICE)

  // Managerul, activ, al unui restaurant ACTIV — suspendarea inchide tot
  // (§20.3), inclusiv operatia asta.
  const { data: manager } = await admin
    .from('admin_users')
    .select('restaurant_id, rol, activ, restaurant:restaurants(status)')
    .eq('user_id', apelant.id)
    .maybeSingle()

  const restaurantActiv =
    (manager?.restaurant as { status?: string } | null)?.status === 'activ'
  if (!manager?.activ || manager.rol !== 'manager' || !restaurantActiv) {
    return raspuns({ eroare: 'Doar managerul restaurantului poate reseta parole.' }, 403)
  }

  // Tinta: un OSPATAR din acelasi restaurant. Nu manager — un manager nu
  // preia contul altui manager pe drumul asta; nu propriul cont — pentru al
  // tau exista schimbarea normala de parola (§49.9).
  const { data: tinta } = await admin
    .from('admin_users')
    .select('user_id, rol, restaurant_id, nume, email')
    .eq('id', corp.admin_user_id)
    .maybeSingle()

  if (
    !tinta ||
    tinta.restaurant_id !== manager.restaurant_id ||
    tinta.rol !== 'ospatar' ||
    tinta.user_id === apelant.id
  ) {
    return raspuns({ eroare: 'Contul nu e un ospatar al restaurantului tau.' }, 403)
  }

  const parola = genereazaParola()
  const { error: eroareUpdate } = await admin.auth.admin.updateUserById(tinta.user_id, {
    password: parola,
  })
  if (eroareUpdate) {
    console.error('Resetarea parolei a esuat:', eroareUpdate)
    return raspuns({ eroare: 'Resetarea parolei a esuat.' }, 500)
  }

  // Parola apare in raspuns O data si nu se logheaza nicaieri.
  return raspuns({ ok: true, parola, ospatar: tinta.nume ?? tinta.email })
})
