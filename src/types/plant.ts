// PlantSummary is returned by GET /plants (list)
export interface PlantSummary {
  id: number
  common_name: string
  scientific_name: string | null
  cultivar_name: string | null
  plant_type: string | null
  sun_requirement: string | null
  water_needs: string | null
  hardiness_zones: string[] | null
  spacing_inches: number | null
  image_url: string | null
  source: string
  edible: boolean | null
  family: string | null
  life_cycle: string | null
  is_favorite: boolean
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
  data_sources: string[] | null
  created_at: string
  updated_at: string

  // Physical / Growing
  height_inches: number | null
  width_inches: number | null
  soil_type: string | null
  soil_ph_min: number | null
  soil_ph_max: number | null
  growth_rate: string | null
  life_cycle: string | null
  drought_resistant: boolean | null
  days_to_harvest: number | null

  // Propagation / Germination
  propagation_method: string | null
  germination_days_min: number | null
  germination_days_max: number | null
  germination_temp_min_f: number | null
  germination_temp_max_f: number | null
  sow_outdoors: string | null
  sow_indoors: string | null
  start_indoors_weeks: number | null
  start_outdoors_weeks: number | null
  plant_transplant: string | null
  plant_cuttings: string | null
  plant_division: string | null

  // Geographic / Taxonomy
  native_to: string | null
  habitat: string | null
  family: string | null
  genus: string | null

  // Edible / Medicinal
  edible: boolean | null
  edible_parts: string | null
  edible_uses: string | null
  medicinal: string | null
  medicinal_parts: string | null
  utility: string | null
  warning: string | null

  // Other
  pollination: string | null
  nitrogen_fixing: boolean | null
  root_type: string | null
  root_depth: string | null

  // Links
  wikipedia_url: string | null
  pfaf_url: string | null
  powo_url: string | null
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
  favorites_only?: boolean
  page?: number
  per_page?: number
}
