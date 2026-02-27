import { useQuery } from '@tanstack/react-query'
import type { Schedule, ScheduleType } from '@/types/schedule'
import { apiClient } from './client'

interface ScheduleParams {
  planting_id?: number
  due_before?: string
  type?: ScheduleType
  include_inactive?: boolean
}

export function useSchedules(params?: ScheduleParams) {
  return useQuery<Schedule[]>({
    queryKey: ['schedules', params],
    queryFn: async () => {
      const response = await apiClient.get('/schedules', { params })
      return response.data
    },
  })
}
