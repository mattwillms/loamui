import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Planting, PlantingCreate } from '@/types/planting'
import { apiClient } from './client'

export function useBedPlantings(bedId: number) {
  return useQuery<Planting[]>({
    queryKey: ['beds', bedId, 'plantings'],
    queryFn: async () => {
      const response = await apiClient.get(`/beds/${bedId}/plantings`)
      return response.data
    },
    enabled: bedId > 0,
  })
}

export function useCreatePlanting() {
  const queryClient = useQueryClient()
  return useMutation<Planting, Error, PlantingCreate>({
    mutationFn: async (data) => {
      const response = await apiClient.post('/plantings', data)
      return response.data
    },
    onSuccess: (planting) => {
      queryClient.invalidateQueries({ queryKey: ['beds', planting.bed_id, 'plantings'] })
    },
  })
}

export function useUpdatePlanting() {
  const queryClient = useQueryClient()
  return useMutation<Planting, Error, { plantingId: number; bedId: number; data: Partial<Planting> }>({
    mutationFn: async ({ plantingId, data }) => {
      const response = await apiClient.patch(`/plantings/${plantingId}`, data)
      return response.data
    },
    onSuccess: (_, { bedId }) => {
      queryClient.invalidateQueries({ queryKey: ['beds', bedId, 'plantings'] })
    },
  })
}

export function useDeletePlanting() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { plantingId: number; bedId: number }>({
    mutationFn: async ({ plantingId }) => {
      await apiClient.delete(`/plantings/${plantingId}`)
    },
    onSuccess: (_, { bedId }) => {
      queryClient.invalidateQueries({ queryKey: ['beds', bedId, 'plantings'] })
    },
  })
}
