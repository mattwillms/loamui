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
}
