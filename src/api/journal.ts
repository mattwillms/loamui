import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type {
  JournalEntry,
  JournalListResponse,
  JournalEntryCreate,
  JournalEntryUpdate,
  GardenPlanting,
} from '@/types/journal'

export function useJournalEntries(params: { garden_id?: number; tag?: string; page?: number }) {
  return useQuery({
    queryKey: ['journal', params],
    queryFn: () =>
      apiClient.get<JournalListResponse>('/journal', { params }).then((r) => r.data),
  })
}

export function useCreateJournalEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: JournalEntryCreate) =>
      apiClient.post<JournalEntry>('/journal', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal'] }),
  })
}

export function useUpdateJournalEntry(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: JournalEntryUpdate) =>
      apiClient.patch<JournalEntry>(`/journal/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal'] }),
  })
}

export function useDeleteJournalEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/journal/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal'] }),
  })
}

export function useGardenPlantings(gardenId: number | null) {
  return useQuery({
    queryKey: ['garden-plantings', gardenId],
    queryFn: () =>
      apiClient
        .get<GardenPlanting[]>(`/gardens/${gardenId}/plantings`)
        .then((r) => r.data),
    enabled: gardenId !== null,
  })
}
