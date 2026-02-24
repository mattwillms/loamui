export type UserRole = 'user' | 'admin'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  is_active: boolean
  timezone: string | null
  zip_code: string | null
  hardiness_zone: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
  last_login: string | null
}

// Matches backend OAuth2PasswordRequestForm — uses `username` field for email
export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

// Matches backend TokenResponse schema exactly
// NOTE: /auth/login does NOT return the user — call /auth/me separately after login
export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}
