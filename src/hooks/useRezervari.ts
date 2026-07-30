import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  CHEI_REZERVARI,
  creeazaRezervare,
  getRezervari,
  mutaRezervare,
  schimbaStatus,
  type DateRezervareNoua,
  type MutareRezervare,
  type StatusRezervare,
} from '@/services/rezervari'

export function useRezervari(restaurantId: string | undefined, deLa: Date, panaLa: Date) {
  return useQuery({
    queryKey: CHEI_REZERVARI.interval(
      restaurantId ?? '',
      deLa.toISOString(),
      panaLa.toISOString(),
    ),
    queryFn: () => getRezervari(restaurantId!, deLa, panaLa),
    enabled: Boolean(restaurantId),
  })
}

/**
 * Orice mutatie invalideaza tot arborele de rezervari al restaurantului:
 * o rezervare mutata poate schimba doua intervale simultan, iar invalidarea
 * fina ar rata exact cazul de mijloc.
 */
export function useMutatiiRezervari(restaurantId: string | undefined) {
  const queryClient = useQueryClient()

  const invalideaza = () =>
    queryClient.invalidateQueries({ queryKey: CHEI_REZERVARI.toate(restaurantId ?? '') })

  return {
    creeaza: useMutation({
      mutationFn: (date: DateRezervareNoua) => creeazaRezervare(date),
      onSuccess: invalideaza,
    }),
    schimbaStatus: useMutation({
      mutationFn: ({ id, status }: { id: string; status: StatusRezervare }) =>
        schimbaStatus(id, status),
      onSuccess: invalideaza,
    }),
    muta: useMutation({
      mutationFn: (mutare: MutareRezervare) => mutaRezervare(mutare),
      onSuccess: invalideaza,
    }),
  }
}
