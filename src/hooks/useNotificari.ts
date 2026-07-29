import { useContext } from 'react'

import { NotificariContext, type ValoareNotificari } from '@/contexts/notificari-context'

export function useNotificari(): ValoareNotificari {
  const context = useContext(NotificariContext)
  if (!context) {
    throw new Error('useNotificari trebuie folosit in interiorul <NotificariProvider>.')
  }
  return context
}
