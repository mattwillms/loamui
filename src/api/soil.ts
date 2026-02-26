import { useQuery } from '@tanstack/react-query'
import { apiClient } from './client'
import type { SoilData } from '@/types/soil'

export function useGardenSoil(gardenId: number, enabled: boolean) {
  return useQuery<SoilData>({
    queryKey: ['gardens', gardenId, 'soil'],
    queryFn: async () => {
      const response = await apiClient.get(`/gardens/${gardenId}/soil`)
      return response.data
    },
    enabled,
    retry: false,
  })
}
