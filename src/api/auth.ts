import type { User, TokenResponse } from '@/types/auth'
import { apiClient } from './client'

/**
 * POST /auth/login
 * Must be sent as application/x-www-form-urlencoded (OAuth2PasswordRequestForm).
 * The backend uses `username` as the field name even though it holds an email address.
 */
export async function login(email: string, password: string): Promise<TokenResponse> {
  const params = new URLSearchParams()
  params.append('username', email)
  params.append('password', password)
  const response = await apiClient.post<TokenResponse>('/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return response.data
}

/** POST /auth/register — JSON body { name, email, password } */
export async function register(name: string, email: string, password: string): Promise<User> {
  const response = await apiClient.post<User>('/auth/register', { name, email, password })
  return response.data
}

/** POST /auth/refresh — JSON body { refresh_token } */
export async function refresh(refreshToken: string): Promise<TokenResponse> {
  const response = await apiClient.post<TokenResponse>('/auth/refresh', {
    refresh_token: refreshToken,
  })
  return response.data
}

/** GET /auth/me — requires a valid access token */
export async function getMe(): Promise<User> {
  const response = await apiClient.get<User>('/auth/me')
  return response.data
}
