import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach access token from localStorage on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Internal type for tracking retry state on a config object
interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

// Queue of requests waiting on an in-flight refresh
type QueueEntry = { resolve: (token: string) => void; reject: (err: unknown) => void }
let isRefreshing = false
let failedQueue: QueueEntry[] = []

function flushQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  failedQueue = []
}

function clearAuth() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  window.location.href = '/login'
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableConfig

    // Only handle 401s; skip if already retried or if config is missing
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      clearAuth()
      return Promise.reject(error)
    }

    // If another refresh is already in flight, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return apiClient(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      // Use raw axios (not apiClient) to avoid triggering this interceptor again
      const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
        `${BASE_URL}/auth/refresh`,
        { refresh_token: refreshToken },
      )

      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      apiClient.defaults.headers.common.Authorization = `Bearer ${data.access_token}`

      flushQueue(null, data.access_token)
      originalRequest.headers.Authorization = `Bearer ${data.access_token}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      flushQueue(refreshError, null)
      clearAuth()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)
