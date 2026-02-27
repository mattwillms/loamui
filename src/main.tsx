import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { AuthProvider } from '@/store/authStore'
import { Toaster } from '@/components/ui/sonner'
import { queryClient } from '@/lib/queryClient'
import { router } from '@/router'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
