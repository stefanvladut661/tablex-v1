import { useQuery } from '@tanstack/react-query'

import { CHEI_SETARI, getSetariApp } from '@/services/setari'

export function useSetariApp() {
  return useQuery({
    queryKey: CHEI_SETARI.app,
    queryFn: getSetariApp,
    /**
     * Un minut, nu cinci. Randul asta nu tine doar preturile de pe landing: de
     * cand mentenanta e o garda reala (§47.2), intarzierea de aici e exact
     * intarzierea cu care se inchide aplicatia pentru un restaurant. Cinci
     * minute ar fi insemnat cinci minute de scrieri in timpul unei migrari.
     */
    staleTime: 60_000,
  })
}
