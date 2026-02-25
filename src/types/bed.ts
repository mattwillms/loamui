export interface Bed {
  id: number
  garden_id: number
  name: string
  width_ft: number | null
  length_ft: number | null
  sun_exposure_override: string | null
  soil_amendments: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BedCreate {
  name: string
  width_ft?: number
  length_ft?: number
  sun_exposure_override?: string
  soil_amendments?: string
  notes?: string
}

export interface BedUpdate {
  name?: string
  width_ft?: number
  length_ft?: number
  sun_exposure_override?: string
  soil_amendments?: string
  notes?: string
}
