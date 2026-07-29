import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'

import { Toaster } from '@/components/ui/sonner'
import { mesajEroare } from '@/lib/erori'
import {
  NotificariContext,
  type OptiuniNotificare,
  type ValoareNotificari,
} from '@/contexts/notificari-context'

function optiuniSonner(optiuni?: OptiuniNotificare) {
  if (!optiuni) return undefined
  return {
    description: optiuni.descriere,
    duration: optiuni.durata,
    action: optiuni.actiune
      ? { label: optiuni.actiune.eticheta, onClick: optiuni.actiune.onClick }
      : undefined,
  }
}

/**
 * Notificari efemere (toast). Notificarile persistente din clopotel
 * (tabela notificari, §21) sunt alt mecanism si vin in Faza 5.
 */
export function NotificariProvider({ children }: { children: ReactNode }) {
  const valoare = useMemo<ValoareNotificari>(
    () => ({
      succes: (mesaj, optiuni) => toast.success(mesaj, optiuniSonner(optiuni)),
      info: (mesaj, optiuni) => toast.info(mesaj, optiuniSonner(optiuni)),
      atentie: (mesaj, optiuni) => toast.warning(mesaj, optiuniSonner(optiuni)),
      eroare: (eroare, optiuni) => toast.error(mesajEroare(eroare), optiuniSonner(optiuni)),
    }),
    [],
  )

  return (
    <NotificariContext value={valoare}>
      {children}
      <Toaster position="top-right" closeButton />
    </NotificariContext>
  )
}
