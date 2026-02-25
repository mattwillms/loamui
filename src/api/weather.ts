import { useQuery } from '@tanstack/react-query'
import { apiClient } from './client'

export interface WeatherCurrent {
  latitude: number
  longitude: number
  date: string
  current_temp_f: number | null
  high_temp_f: number | null
  low_temp_f: number | null
  humidity_pct: number | null
  precip_inches: number | null
  wind_mph: number | null
  conditions: string | null
  uv_index: number | null
  soil_temp_f: number | null
  frost_warning: boolean
  fetched_at: string
}

export function useWeatherCurrent() {
  return useQuery<WeatherCurrent>({
    queryKey: ['weather', 'current'],
    queryFn: async () => {
      const response = await apiClient.get('/weather/current')
      return response.data
    },
    retry: false,
  })
}
