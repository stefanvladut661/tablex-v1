import { useQuery } from '@tanstack/react-query'

import { CHEI_SETARI, getSetariApp } from '@/services/setari'

export function useSetariApp() {
  return useQuery({
    queryKey: CHEI_SETARI.app,
    queryFn: getSetariApp,
    // Preturile si mesajul de mentenanta se schimba rar.
    staleTime: 5 * 60_000,
  })
}
