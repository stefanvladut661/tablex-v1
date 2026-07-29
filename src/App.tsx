import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router/dom'

import { AuthProvider } from '@/contexts/AuthProvider'
import { NotificariProvider } from '@/contexts/NotificariProvider'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { router } from '@/router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Datele de rezervari se invalideaza oricum prin realtime (Faza 5);
      // un staleTime scurt evita refetch-uri inutile la fiecare focus.
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificariProvider>
            <RouterProvider router={router} />
          </NotificariProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
