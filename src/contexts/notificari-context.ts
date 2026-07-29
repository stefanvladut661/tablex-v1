import { createContext } from 'react'

export type OptiuniNotificare = {
  descriere?: string
  durata?: number
  actiune?: { eticheta: string; onClick: () => void }
}

export type ValoareNotificari = {
  succes: (mesaj: string, optiuni?: OptiuniNotificare) => void
  info: (mesaj: string, optiuni?: OptiuniNotificare) => void
  atentie: (mesaj: string, optiuni?: OptiuniNotificare) => void
  /** Accepta direct obiectul de eroare; traduce mesajul in romana. */
  eroare: (eroare: unknown, optiuni?: OptiuniNotificare) => void
}

export const NotificariContext = createContext<ValoareNotificari | null>(null)
