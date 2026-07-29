import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

// Fail-fast: fara variabile de mediu, orice apel ulterior ar esua cu un mesaj
// obscur ("Invalid URL"). Mai bine cade la incarcare, cu instructiuni clare.
const url = import.meta.env.VITE_SUPABASE_URL
const cheieAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !cheieAnon) {
  throw new Error(
    'Lipsesc VITE_SUPABASE_URL si/sau VITE_SUPABASE_ANON_KEY. ' +
      'Copiaza .env.example in .env.local si completeaza cheile din ' +
      'Supabase Dashboard > Project Settings > API.',
  )
}

export const supabase = createClient<Database>(url, cheieAnon, {
  auth: {
    // PKCE: singurul flow sigur pentru aplicatii SPA (fara secret in client).
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    // Preia ?code= / #access_token din URL dupa magic link sau resetare parola.
    detectSessionInUrl: true,
    storageKey: 'tablex-auth',
  },
})

/** Baza pentru orice redirect trimis catre Supabase Auth (magic link, reset). */
export function urlRedirect(cale: string): string {
  return new URL(cale, window.location.origin).toString()
}
