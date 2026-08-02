import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'

import { RUTE } from '@/lib/rute'
import { supabase, urlRedirect } from '@/lib/supabase'
import {
  AuthContext,
  type DateInregistrare,
  type Profil,
  type Restaurant,
  type ValoareAuth,
} from '@/contexts/auth-context'

/**
 * Doua interogari, nu una: un utilizator e ori admin de restaurant, ori
 * super admin (§20.1). A doua nu se executa daca prima a gasit ceva.
 */
async function incarcaProfil(userId: string): Promise<Profil | null> {
  const { data: admin, error: eroareAdmin } = await supabase
    .from('admin_users')
    .select('*, restaurant:restaurants(*)')
    .eq('user_id', userId)
    .maybeSingle()

  if (eroareAdmin) throw eroareAdmin

  if (admin) {
    const { restaurant, ...cont } = admin
    return { tip: 'admin', cont, restaurant: restaurant as Restaurant }
  }

  const { data: superAdmin, error: eroareSuper } = await supabase
    .from('super_admin_users')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (eroareSuper) throw eroareSuper
  if (superAdmin) return { tip: 'super_admin', cont: superAdmin }

  // Cont Supabase valid, dar fara rand in admin_users / super_admin_users:
  // e cazul unui signup a carui etapa de onboarding nu s-a terminat (Faza 3).
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesiune, setSesiune] = useState<Session | null>(null)
  const [sesiuneRezolvata, setSesiuneRezolvata] = useState(false)

  // Profilul se tine impreuna cu userId-ul pentru care a fost incarcat. Asa
  // "profil pentru utilizatorul curent" si "s-a terminat incarcarea" se DEDUC
  // din stare, fara resetari sincrone in efect (care produc render-uri in cascada).
  const [profilIncarcat, setProfilIncarcat] = useState<{
    userId: string
    profil: Profil | null
  } | null>(null)

  useEffect(() => {
    let activ = true

    supabase.auth.getSession().then(({ data }) => {
      if (!activ) return
      setSesiune(data.session)
      setSesiuneRezolvata(true)
    })

    // Nu apelam nimic asincron din supabase-js aici (risc de deadlock in v2);
    // doar setam starea, iar profilul se incarca in efectul urmator.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_eveniment, sesiuneNoua) => {
      if (!activ) return
      setSesiune(sesiuneNoua)
      setSesiuneRezolvata(true)
    })

    return () => {
      activ = false
      subscription.unsubscribe()
    }
  }, [])

  const userId = sesiune?.user.id ?? null

  // Un raspuns intarziat pentru un utilizator care nu mai e cel curent devine
  // automat irelevant: derivarea de mai jos il ignora.
  const profil = profilIncarcat?.userId === userId ? profilIncarcat.profil : null
  const profilRezolvat = !userId || profilIncarcat?.userId === userId

  useEffect(() => {
    if (!userId) return
    let activ = true

    incarcaProfil(userId)
      .then((rezultat) => {
        if (activ) setProfilIncarcat({ userId, profil: rezultat })
      })
      .catch((eroare) => {
        console.error('Incarcarea profilului a esuat:', eroare)
        // Marcam totusi incarcarea ca terminata, altfel garzile ar afisa
        // ecranul de asteptare la infinit.
        if (activ) setProfilIncarcat({ userId, profil: null })
      })

    return () => {
      activ = false
    }
  }, [userId])

  const reincarcaProfil = useCallback(async () => {
    if (!userId) return
    const rezultat = await incarcaProfil(userId)
    setProfilIncarcat({ userId, profil: rezultat })
  }, [userId])

  const autentificare = useCallback(async (email: string, parola: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: parola,
    })
    if (error) throw error
  }, [])

  const trimiteMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: urlRedirect(RUTE.app), shouldCreateUser: false },
    })
    if (error) throw error
  }, [])

  const inregistrare = useCallback(async (date: DateInregistrare) => {
    const { error } = await supabase.auth.signUp({
      email: date.email.trim(),
      password: date.parola,
      options: {
        emailRedirectTo: urlRedirect(date.dupaConfirmare ?? RUTE.app),
        // Restaurantul propriu-zis se creeaza in onboarding (Faza 3), dupa
        // confirmarea emailului; pana atunci datele stau in user_metadata.
        data: {
          nume: date.numePersoana,
          nume_restaurant: date.numeRestaurant,
          telefon: date.telefon ?? null,
          cui: date.cui ?? null,
        },
      },
    })
    if (error) throw error
  }, [])

  const retrimiteConfirmare = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: urlRedirect(RUTE.app) },
    })
    if (error) throw error
  }, [])

  const trimiteResetareParola = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: urlRedirect(RUTE.parolaNoua),
    })
    if (error) throw error
  }, [])

  const seteazaParolaNoua = useCallback(async (parola: string) => {
    const { error } = await supabase.auth.updateUser({ password: parola })
    if (error) throw error
  }, [])

  const deconectare = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    // Nu curatam profilul manual: onAuthStateChange goleste sesiunea, iar
    // profilul se deduce din ea.
  }, [])

  const valoare = useMemo<ValoareAuth>(
    () => ({
      sesiune,
      utilizator: sesiune?.user ?? null,
      profil,
      incarcare: !sesiuneRezolvata || !profilRezolvat,
      esteAutentificat: Boolean(sesiune),
      esteAdmin: profil?.tip === 'admin',
      esteManager: profil?.tip === 'admin' && profil.cont.rol === 'manager',
      esteSuperAdmin: profil?.tip === 'super_admin',
      areFloorPlan:
        profil?.tip === 'admin' &&
        (profil.restaurant.plan === 'pro_floor' || profil.restaurant.floor_plan_deblocat_manual),
      autentificare,
      trimiteMagicLink,
      inregistrare,
      retrimiteConfirmare,
      trimiteResetareParola,
      seteazaParolaNoua,
      deconectare,
      reincarcaProfil,
    }),
    [
      sesiune,
      profil,
      sesiuneRezolvata,
      profilRezolvat,
      autentificare,
      trimiteMagicLink,
      inregistrare,
      retrimiteConfirmare,
      trimiteResetareParola,
      seteazaParolaNoua,
      deconectare,
      reincarcaProfil,
    ],
  )

  return <AuthContext value={valoare}>{children}</AuthContext>
}
