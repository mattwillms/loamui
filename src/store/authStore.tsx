import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User } from '@/types/auth'
import { login as loginApi, getMe } from '@/api/auth'
import { queryClient } from '@/lib/queryClient'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // Start loading — we need to check if an existing token is valid
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setIsLoading(false)
      return
    }

    getMe()
      .then(setUser)
      .catch(() => {
        // Token invalid or refresh failed — interceptor already cleared localStorage
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const tokens = await loginApi(email, password)
    localStorage.setItem('access_token', tokens.access_token)
    localStorage.setItem('refresh_token', tokens.refresh_token)
    const userData = await getMe()
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
    queryClient.clear()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
