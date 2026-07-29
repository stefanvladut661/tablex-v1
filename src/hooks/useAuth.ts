import { useContext } from 'react'

import { AuthContext, type ValoareAuth } from '@/contexts/auth-context'

export function useAuth(): ValoareAuth {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth trebuie folosit in interiorul <AuthProvider>.')
  }
  return context
}
