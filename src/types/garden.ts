import type { PlantingPlantSummary } from './planting'

export interface Garden {
  id: number
  user_id: number
  name: string
  description: string | null
  square_footage: number | null
  sun_exposure: string | null
  soil_type: string | null
  irrigation_type: string | null
  latitude: number | null
  longitude: number | null
  canvas_width_ft: number | null
  canvas_height_ft: number | null
  created_at: string
  updated_at: string
}

export interface GardenCreate {
  name: string
  description?: string
  square_footage?: number
  sun_exposure?: string
  soil_type?: string
  irrigation_type?: string
  latitude?: number
  longitude?: number
  canvas_width_ft?: number | null
  canvas_height_ft?: number | null
}

export interface GardenUpdate {
  name?: string
  description?: string
  square_footage?: number
  sun_exposure?: string
  soil_type?: string
  irrigation_type?: string
  latitude?: number
  longitude?: number
  canvas_width_ft?: number | null
  canvas_height_ft?: number | null
}

export interface GardenPlanting {
  id: number
  bed_id: number
  bed_name: string
  plant_id: number
  common_name: string | null
  status: string
  date_planted: string | null
  pos_x: number | null
  pos_y: number | null
  plant_type: string | null
  spacing_inches: number | null
  is_locked: boolean
  plant?: PlantingPlantSummary
}
