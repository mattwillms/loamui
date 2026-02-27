import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import type { User, UserStats } from '@/types/auth'

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

async function getMe(): Promise<User> {
  const response = await apiClient.get('/users/me')
  return response.data
}

async function updateMe(data: {
  first_name?: string
  last_name?: string
  timezone?: string
  zip_code?: string
}): Promise<User> {
  const response = await apiClient.patch('/users/me', data)
  return response.data
}

export function useMe() {
  return useQuery<User>({
    queryKey: ['user', 'me'],
    queryFn: getMe,
  })
}

export function useUpdateMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateMe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['user', 'stats'] })
    },
  })
}
