import type { Enums } from '@/types/database'

/**
 * Traducerile enum-urilor din baza de date. Stau intr-un modul separat de
 * componente ca sa nu strice fast-refresh-ul si ca sa nu fie duplicate in
 * fiecare pagina care afiseaza aceleasi statusuri.
 */

export const ETICHETE_STATUS_REZERVARE: Record<Enums<'rezervare_status'>, string> = {
  pending: 'În așteptare',
  confirmata: 'Confirmată',
  sosita: 'Sosită',
  anulata: 'Anulată',
  no_show: 'Neprezentat',
  respinsa: 'Respinsă',
}

export const ETICHETE_SURSA_REZERVARE: Record<Enums<'rezervare_sursa'>, string> = {
  widget: 'Widget public',
  manual: 'Introdusă manual',
  walk_in: 'Walk-in',
  telefon: 'Telefonic',
}

export const ETICHETE_ROL_ADMIN: Record<Enums<'admin_rol'>, string> = {
  manager: 'Manager',
  ospatar: 'Ospătar',
}

/** Rolurile din echipa TableX (§9.2.7), nu ale unui restaurant. */
export const ETICHETE_ROL_ECHIPA: Record<Enums<'super_admin_rol'>, string> = {
  super_admin: 'Super admin',
  designer_architect: 'Designer / arhitect',
  support: 'Support',
}

export const ETICHETE_STATUS_CERERE_FP: Record<Enums<'fp_request_status'>, string> = {
  pending: 'În așteptare',
  in_progress: 'În lucru',
  published: 'Publicat',
  respins: 'Respins',
}

export const ETICHETE_STATUS_INVITATIE: Record<Enums<'invitatie_status'>, string> = {
  trimisa: 'În așteptare',
  acceptata: 'Acceptată',
  expirata: 'Expirată',
  anulata: 'Anulată',
}
