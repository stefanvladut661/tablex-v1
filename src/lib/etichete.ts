import type { Enums } from '@/types/database'

/**
 * Traducerile enum-urilor din baza de date. Stau intr-un modul separat de
 * componente ca sa nu strice fast-refresh-ul si ca sa nu fie duplicate in
 * fiecare pagina care afiseaza aceleasi statusuri.
 */

export const ETICHETE_STATUS_REZERVARE: Record<Enums<'rezervare_status'>, string> = {
  pending: 'In asteptare',
  confirmata: 'Confirmata',
  sosita: 'Sosita',
  anulata: 'Anulata',
  no_show: 'Neprezentat',
  respinsa: 'Respinsa',
}

export const ETICHETE_SURSA_REZERVARE: Record<Enums<'rezervare_sursa'>, string> = {
  widget: 'Widget public',
  manual: 'Introdusa manual',
  walk_in: 'Walk-in',
  telefon: 'Telefonic',
}

export const ETICHETE_ROL_ADMIN: Record<Enums<'admin_rol'>, string> = {
  manager: 'Manager',
  ospatar: 'Ospatar',
}

export const ETICHETE_STATUS_CERERE_FP: Record<Enums<'fp_request_status'>, string> = {
  pending: 'In asteptare',
  in_progress: 'In lucru',
  published: 'Publicat',
  respins: 'Respins',
}

export const ETICHETE_STATUS_INVITATIE: Record<Enums<'invitatie_status'>, string> = {
  trimisa: 'In asteptare',
  acceptata: 'Acceptata',
  expirata: 'Expirata',
  anulata: 'Anulata',
}
