import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  CHEI_ECHIPA,
  anuleazaInvitatie,
  getInvitatii,
  getMembri,
  invitaMembru,
  schimbaRolMembru,
  seteazaActivMembru,
  stergeMembru,
  type DateInvitatie,
} from '@/services/echipa'
import type { Enums } from '@/types/database'

export function useMembriEchipa(restaurantId: string | undefined) {
  return useQuery({
    queryKey: CHEI_ECHIPA.membri(restaurantId ?? ''),
    queryFn: () => getMembri(restaurantId!),
    enabled: Boolean(restaurantId),
  })
}

export function useInvitatii(restaurantId: string | undefined) {
  return useQuery({
    queryKey: CHEI_ECHIPA.invitatii(restaurantId ?? ''),
    queryFn: () => getInvitatii(restaurantId!),
    enabled: Boolean(restaurantId),
  })
}

/** Mutatiile de echipa; fiecare invalideaza exact lista pe care o schimba. */
export function useMutatiiEchipa(restaurantId: string | undefined) {
  const queryClient = useQueryClient()

  const invalideazaMembri = () =>
    queryClient.invalidateQueries({ queryKey: CHEI_ECHIPA.membri(restaurantId ?? '') })
  const invalideazaInvitatii = () =>
    queryClient.invalidateQueries({ queryKey: CHEI_ECHIPA.invitatii(restaurantId ?? '') })

  return {
    invita: useMutation({
      mutationFn: (date: Omit<DateInvitatie, 'restaurantId'>) =>
        invitaMembru({ ...date, restaurantId: restaurantId! }),
      onSuccess: invalideazaInvitatii,
    }),
    anuleaza: useMutation({
      mutationFn: anuleazaInvitatie,
      onSuccess: invalideazaInvitatii,
    }),
    comutaActiv: useMutation({
      mutationFn: ({ id, activ }: { id: string; activ: boolean }) => seteazaActivMembru(id, activ),
      onSuccess: invalideazaMembri,
    }),
    schimbaRol: useMutation({
      mutationFn: ({ id, rol }: { id: string; rol: Enums<'admin_rol'> }) =>
        schimbaRolMembru(id, rol),
      onSuccess: invalideazaMembri,
    }),
    sterge: useMutation({
      mutationFn: stergeMembru,
      onSuccess: invalideazaMembri,
    }),
  }
}
