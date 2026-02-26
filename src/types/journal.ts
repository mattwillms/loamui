export interface JournalEntry {
  id: number
  date: string
  text: string
  tags: string[] | null
  photos: string[] | null
  garden_id: number | null
  garden_name: string | null
  planting_id: number | null
  plant_name: string | null
  created_at: string
}

export interface JournalListResponse {
  items: JournalEntry[]
  total: number
  page: number
  per_page: number
}

export interface JournalEntryCreate {
  date: string
  text: string
  garden_id?: number | null
  planting_id?: number | null
  tags?: string[] | null
  photos?: string[] | null
}

export interface JournalEntryUpdate {
  date?: string
  text?: string
  garden_id?: number | null
  planting_id?: number | null
  tags?: string[] | null
  photos?: string[] | null
}

export interface GardenPlanting {
  id: number
  bed_id: number
  bed_name: string
  plant_id: number
  common_name: string | null
  status: string
  date_planted: string | null
}
