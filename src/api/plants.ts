import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CompanionRecommendation, Plant, PlantListParams, PlantListResponse } from '@/types/plant'
import { apiClient } from './client'

export function usePlants(params: PlantListParams) {
  return useQuery<PlantListResponse>({
    queryKey: ['plants', params],
    queryFn: async () => {
      const response = await apiClient.get('/plants', { params })
      return response.data
    },
  })
}

export function usePlant(id: number) {
  return useQuery<Plant>({
    queryKey: ['plants', id],
    queryFn: async () => {
      const response = await apiClient.get(`/plants/${id}`)
      return response.data
    },
  })
}

export function useCompanionRecommendations(plantId: number) {
  return useQuery({
    queryKey: ['companions', plantId],
    queryFn: () =>
      apiClient
        .get<CompanionRecommendation>('/recommendations/companions', {
          params: { plant_id: plantId },
        })
        .then((r) => r.data),
    enabled: !isNaN(plantId),
  })
}

export function useFavoritePlant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (plantId: number) => apiClient.post(`/plants/${plantId}/favorite`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants'] })
    },
  })
}

export function useUnfavoritePlant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (plantId: number) => apiClient.delete(`/plants/${plantId}/favorite`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants'] })
    },
  })
}
