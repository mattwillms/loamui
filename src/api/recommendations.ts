import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface SeasonalTaskItem {
  title: string
  description: string
  task_type: string
  urgency: 'high' | 'medium' | 'low'
}

export interface SeasonalTaskResponse {
  zone: string | null
  month: number
  zone_missing: boolean
  tasks: SeasonalTaskItem[]
}

export interface GenerateSchedulesResponse {
  generated: number
  schedule_ids: number[]
}

const URGENCY_ORDER = { high: 0, medium: 1, low: 2 }

export function useSeasonalTasks() {
  return useQuery<SeasonalTaskResponse>({
    queryKey: ['seasonal-tasks'],
    queryFn: () =>
      apiClient.get<SeasonalTaskResponse>('/recommendations/tasks').then((r) => {
        const data = r.data
        return {
          ...data,
          tasks: [...data.tasks].sort(
            (a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]
          ),
        }
      }),
  })
}

export function useGenerateSchedules() {
  const queryClient = useQueryClient()
  return useMutation<GenerateSchedulesResponse, Error, number>({
    mutationFn: (plantingId: number) =>
      apiClient
        .post<GenerateSchedulesResponse>(`/plantings/${plantingId}/generate-schedules`)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })
}
