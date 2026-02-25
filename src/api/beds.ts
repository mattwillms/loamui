import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Bed, BedCreate, BedUpdate } from '@/types/bed'
import { apiClient } from './client'

export function useBeds(gardenId: number) {
  return useQuery<Bed[]>({
    queryKey: ['gardens', gardenId, 'beds'],
    queryFn: async () => {
      const response = await apiClient.get(`/gardens/${gardenId}/beds`)
      return response.data
    },
  })
}

export function useBed(id: number) {
  return useQuery<Bed>({
    queryKey: ['beds', id],
    queryFn: async () => {
      const response = await apiClient.get(`/beds/${id}`)
      return response.data
    },
  })
}

export function useCreateBed(gardenId: number) {
  const queryClient = useQueryClient()
  return useMutation<Bed, Error, BedCreate>({
    mutationFn: async (data) => {
      const response = await apiClient.post(`/gardens/${gardenId}/beds`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gardens', gardenId, 'beds'] })
    },
  })
}

export function useUpdateBed(id: number) {
  const queryClient = useQueryClient()
  return useMutation<Bed, Error, BedUpdate>({
    mutationFn: async (data) => {
      const response = await apiClient.patch(`/beds/${id}`, data)
      return response.data
    },
    onSuccess: (bed) => {
      queryClient.invalidateQueries({ queryKey: ['beds', id] })
      queryClient.invalidateQueries({ queryKey: ['gardens', bed.garden_id, 'beds'] })
    },
  })
}
