import { supabase } from '@/lib/supabase'

export type TipEmail = 'invitatie' | 'rezervare_confirmata' | 'rezervare_respinsa'

export type RezultatEmail = {
  trimis: boolean
  /** true cand nu e configurat niciun furnizor: functia doar logheaza. */
  simulat?: boolean
  motiv?: string
}

/**
 * Trimite doar {tip, id}: Edge Function-ul deriva destinatarul din baza,
 * citind cu JWT-ul nostru (deci prin RLS). Clientul nu poate specifica cui se
 * trimite, deci endpoint-ul nu poate fi folosit ca releu de spam.
 *
 * Best-effort prin design: un email care nu pleaca NU trebuie sa anuleze
 * acțiunea care l-a declansat — invitatia e deja creata, rezervarea e deja
 * confirmata. De aceea functia nu arunca niciodata.
 */
export async function trimiteEmail(tip: TipEmail, id: string): Promise<RezultatEmail> {
  try {
    const { data, error } = await supabase.functions.invoke('trimite-email', {
      body: { tip, id },
    })
    if (error) {
      console.warn('Emailul nu a putut fi trimis:', error)
      return { trimis: false, motiv: error.message }
    }
    return (data ?? { trimis: false }) as RezultatEmail
  } catch (eroare) {
    console.warn('Emailul nu a putut fi trimis:', eroare)
    return { trimis: false }
  }
}
