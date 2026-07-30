import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
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
export function useRealtimeRestaurant(restaurantId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!restaurantId) return

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
        () => {
          queryClient.invalidateQueries({ queryKey: CHEI_REZERVARI.toate(restaurantId) })
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
          queryClient.invalidateQueries({ queryKey: CHEI_NOTIFICARI.lista(restaurantId) })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(canal)
    }
  }, [restaurantId, queryClient])
}
