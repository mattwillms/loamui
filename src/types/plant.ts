// PlantSummary is returned by GET /plants (list)
export interface PlantSummary {
  id: number
  common_name: string
  scientific_name: string | null
  plant_type: string | null
  sun_requirement: string | null
  water_needs: string | null
  hardiness_zones: string[] | null
  spacing_inches: number | null
  image_url: string | null
  source: string
}

// Plant is returned by GET /plants/{id} (detail)
export interface Plant extends PlantSummary {
  days_to_maturity: number | null
  spacing_inches: number | null
  planting_depth_inches: number | null
  fertilizer_needs: string | null
  bloom_season: string | null
  harvest_window: string | null
  companion_plants: string[] | null
  antagonist_plants: string[] | null
  common_pests: string[] | null
  common_diseases: string[] | null
  description: string | null
  is_user_defined: boolean
  external_id: string | null
  created_at: string
  updated_at: string
}

export interface PlantListResponse {
  items: PlantSummary[]
  total: number
  page: number
  per_page: number
}

export interface CompanionPlantDetail {
  id: number
  common_name: string
  plant_type: string | null
  sun_requirement: string | null
  water_needs: string | null
  image_url: string | null
  description: string | null
}

export interface CompanionEntry {
  name: string
  resolved: boolean
  plant: CompanionPlantDetail | null
}

export interface CompanionRecommendation {
  plant_id: number
  plant_name: string
  companions: CompanionEntry[]
  antagonists: CompanionEntry[]
}

// Query params for GET /plants
// Note: backend param is `name` (partial match on common_name), not `search`
// cycle → plant_type enum, watering → water_needs enum, sunlight → sun_requirement enum
export interface PlantListParams {
  name?: string
  cycle?: string
  watering?: string
  sunlight?: string
  hardiness_zone?: string
  page?: number
  per_page?: number
}
