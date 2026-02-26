import { useQuery } from '@tanstack/react-query'
import { apiClient } from './client'
import type { UserStats } from '@/types/auth'

export function useStats() {
  return useQuery<UserStats>({
    queryKey: ['user', 'stats'],
    queryFn: async () => {
      const response = await apiClient.get('/auth/me/stats')
      return response.data
    },
    retry: false,
  })
}
