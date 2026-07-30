import { useQuery } from '@tanstack/react-query'

import { CHEI_MESE, getDisponibilitate, getMese, getZone } from '@/services/mese'

export function useZone(restaurantId: string | undefined) {
  return useQuery({
    queryKey: CHEI_MESE.zone(restaurantId ?? ''),
    queryFn: () => getZone(restaurantId!),
    enabled: Boolean(restaurantId),
    staleTime: 5 * 60_000,
  })
}

export function useMese(restaurantId: string | undefined) {
  return useQuery({
    queryKey: CHEI_MESE.mese(restaurantId ?? ''),
    queryFn: () => getMese(restaurantId!),
    enabled: Boolean(restaurantId),
    staleTime: 5 * 60_000,
  })
}

export function useDisponibilitate(
  restaurantId: string | undefined,
  zoneId: string | null,
  start: Date | null,
  durataMinute?: number,
) {
  return useQuery({
    queryKey: CHEI_MESE.disponibilitate(
      restaurantId ?? '',
      zoneId,
      start?.toISOString() ?? '',
      durataMinute ?? 0,
    ),
    queryFn: () => getDisponibilitate(restaurantId!, zoneId, start!, durataMinute),
    enabled: Boolean(restaurantId && start),
    // Disponibilitatea se schimba des; nu o tinem cache-uita.
    staleTime: 0,
  })
}
