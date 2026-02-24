import { Navigate } from 'react-router'
import type { ReactNode } from 'react'
import { useAuth } from '@/store/authStore'

interface Props {
  children: ReactNode
}

export function ProtectedRoute({ children }: Props) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
