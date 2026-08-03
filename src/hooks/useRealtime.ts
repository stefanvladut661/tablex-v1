import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useNotificari } from '@/hooks/useNotificari'
import { sunetAlerta } from '@/lib/sunet'
import { supabase } from '@/lib/supabase'
import { CHEI_MESE } from '@/services/mese'
import { CHEI_NOTIFICARI } from '@/services/notificari'
import { CHEI_REZERVARI } from '@/services/rezervari'

/**
 * Sincronizare in timp real pentru panou (§8.4, §24.6).
 *
 * Nu incercam sa aplicam manual randul primit peste cache: o rezervare mutata
 * atinge doua intervale, iar reconstrucția locala ar putea divergea de baza.
 * Invalidam si lasam React Query sa reinterogheze — costul e o cerere, iar
 * corectitudinea e garantata.
 *
 * Postgres Changes respecta RLS, deci fiecare restaurant primeste doar
 * evenimentele lui; filtrul pe restaurant_id e o optimizare, nu o masura de
 * securitate.
 */
export function useRealtimeRestaurant(
  restaurantId: string | undefined,
  userId: string | undefined,
) {
  const queryClient = useQueryClient()
  const notificariUi = useNotificari()

  useEffect(() => {
    if (!restaurantId || !userId) return

    const canal = supabase
      .channel(`restaurant-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (schimbare) => {
          queryClient.invalidateQueries({ queryKey: CHEI_REZERVARI.toate(restaurantId) })

          // §24.6 — toast + sunet scurt cand pica o cerere noua din widget,
          // cat timp personalul e logat. Doar la INSERT si doar pentru
          // widget: propriile actiuni din panou nu au de ce sa sune.
          const noua = schimbare.new as { sursa?: string; status?: string; client_nume?: string }
          if (schimbare.eventType === 'INSERT' && noua?.sursa === 'widget') {
            sunetAlerta()
            notificariUi.info(
              noua.status === 'pending' ? 'Cerere nouă de rezervare' : 'Rezervare nouă confirmată',
              { descriere: noua.client_nume ?? undefined },
            )
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificari',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: CHEI_NOTIFICARI.lista(restaurantId, userId) })
        },
      )
      // Starea de citit e personala (§33) si sta in alta tabela, deci are
      // nevoie de canalul ei. Rostul: managerul care marcheaza pe telefon
      // vede bulina stinsa si pe tableta din sala — ACELASI cont, doua
      // dispozitive. Tabelul nu are restaurant_id (se leaga prin notificare),
      // deci filtrul e pe utilizator.
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificari_citite',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: CHEI_NOTIFICARI.lista(restaurantId, userId) })
        },
      )
      // Publicarea din Floor Plan Studio ajunge pe harta FARA reload
      // (§9.2.2 pasul 4): echipa scrie structura, zonele si mesele, iar
      // panoul restaurantului le reincarca pe fiecare.
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'floor_plan_layers',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: CHEI_MESE.structura(restaurantId) })
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zones',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: CHEI_MESE.zone(restaurantId) })
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: CHEI_MESE.mese(restaurantId) })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(canal)
    }
    // Valoarea contextului de notificari e memoizata in provider.
  }, [restaurantId, userId, queryClient, notificariUi])
}

/**
 * Canalul echipei TableX: clopotelul intern (§38.4) si inbox-ul de tichete
 * (§46.1) se improspateaza singure. Postgres Changes respecta RLS, deci un
 * cont care nu e in echipa nu primeste nimic pe canalul asta.
 *
 * Intoarce starea conexiunii pentru indicatorul din footer (§9.3).
 */
export function useRealtimeEchipa(activ: boolean, userId: string | undefined): boolean {
  const queryClient = useQueryClient()
  const [conectat, setConectat] = useState(false)

  useEffect(() => {
    if (!activ || !userId) return

    const canal = supabase
      .channel('echipa-tablex')
      // Filtrul pe destinatie nu e o masura de securitate (RLS o face), ci de
      // liniste: fara el, fiecare notificare a fiecarui restaurant din retea
      // reinterorga clopotelul echipei, desi acolo nu se vede niciuna.
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificari',
          filter: 'destinatie=eq.super_admin',
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: CHEI_NOTIFICARI.echipa(userId) })
        },
      )
      // Acelasi motiv ca la clopotelul restaurantului: citirea facuta pe alt
      // dispozitiv al aceluiasi cont trebuie sa stinga bulina si aici.
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificari_citite',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: CHEI_NOTIFICARI.echipa(userId) })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['sa', 'suport'] })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_ticket_mesaje' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['sa', 'suport'] })
        },
      )
      .subscribe((status) => {
        setConectat(status === 'SUBSCRIBED')
      })

    return () => {
      setConectat(false)
      void supabase.removeChannel(canal)
    }
  }, [activ, userId, queryClient])

  return conectat
}
