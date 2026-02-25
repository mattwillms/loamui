export type ScheduleType = 'water' | 'fertilize' | 'spray' | 'prune' | 'harvest'

export interface Schedule {
  id: number
  planting_id: number | null
  bed_id: number | null
  garden_id: number | null
  schedule_type: ScheduleType
  frequency_days: number | null
  next_due: string | null  // ISO date string
  last_completed: string | null  // ISO datetime string
  notes: string | null
  auto_adjusted: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}
