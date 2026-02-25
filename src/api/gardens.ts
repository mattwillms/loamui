import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Garden, GardenCreate, GardenUpdate } from '@/types/garden'
import { apiClient } from './client'

export function useGardens() {
  return useQuery<Garden[]>({
    queryKey: ['gardens'],
    queryFn: async () => {
      const response = await apiClient.get('/gardens')
      return response.data
    },
  })
}

export function useGarden(id: number) {
  return useQuery<Garden>({
    queryKey: ['gardens', id],
    queryFn: async () => {
      const response = await apiClient.get(`/gardens/${id}`)
      return response.data
    },
  })
}

export function useCreateGarden() {
  const queryClient = useQueryClient()
  return useMutation<Garden, Error, GardenCreate>({
    mutationFn: async (data) => {
      const response = await apiClient.post('/gardens', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gardens'] })
    },
  })
}

export function useUpdateGarden(id: number) {
  const queryClient = useQueryClient()
  return useMutation<Garden, Error, GardenUpdate>({
    mutationFn: async (data) => {
      const response = await apiClient.patch(`/gardens/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gardens'] })
      queryClient.invalidateQueries({ queryKey: ['gardens', id] })
    },
  })
}

export function useDeleteGarden(id: number) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await apiClient.delete(`/gardens/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gardens'] })
    },
  })
}
