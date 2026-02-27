export interface PlantingPlantSummary {
  id: number
  common_name: string
  scientific_name: string | null
  plant_type: string | null
  spacing_inches: number | null
  image_url: string | null
  source: string
}

export interface Planting {
  id: number
  bed_id: number
  plant_id: number
  plant: PlantingPlantSummary | null
  status: string
  date_planted: string | null
  date_transplanted: string | null
  quantity: number
  notes: string | null
  photos: string[] | null
  grid_x: number | null
  grid_y: number | null
  is_locked: boolean
  created_at: string
  updated_at: string
}

export type PlantingStatus =
  | 'planned' | 'seedling' | 'growing' | 'flowering'
  | 'fruiting' | 'harvesting' | 'dormant' | 'removed'

export interface WateringLogCreate {
  planting_id: number
  date: string
  amount_inches?: number
  duration_minutes?: number
  method?: 'drip' | 'hand' | 'sprinkler' | 'soaker' | 'other'
  notes?: string
}

export interface TreatmentLogCreate {
  planting_id: number
  date: string
  treatment_type: 'herbicide' | 'insecticide' | 'fungicide' | 'fertilizer' | 'amendment'
  product_name?: string
  amount?: string
  notes?: string
}

export interface PlantingCreate {
  bed_id: number
  plant_id: number
  grid_x?: number
  grid_y?: number
  is_locked?: boolean
  quantity?: number
}
