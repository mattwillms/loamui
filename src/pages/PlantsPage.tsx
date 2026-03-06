import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router'
import { Sprout, Search, Heart } from 'lucide-react'
import { PlantPlaceholder } from '@/components/PlantPlaceholder'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePlants, useFavoritePlant, useUnfavoritePlant } from '@/api/plants'
import type { PlantListParams, PlantSummary } from '@/types/plant'

const CYCLE_OPTIONS = [
  { value: 'perennial', label: 'Perennial' },
  { value: 'annual', label: 'Annual' },
  { value: 'biennial', label: 'Biennial' },
]

const WATERING_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const SUNLIGHT_OPTIONS = [
  { value: 'full_sun', label: 'Full sun' },
  { value: 'partial_shade', label: 'Partial shade' },
  { value: 'full_shade', label: 'Full shade' },
]

const PER_PAGE = 20

function hasRealImage(plant: PlantSummary): boolean {
  if (!plant.image_url) return false
  if (plant.image_url.includes('sk3776-image-kwvuoab1')) return false
  if (plant.image_url.includes('upgrade-plan')) return false
  if (plant.image_url.includes('permapeople-permaculture-plant-database-blank')) return false
  return true
}

function PlantCard({ plant }: { plant: PlantSummary }) {
  const favoriteMutation = useFavoritePlant()
  const unfavoriteMutation = useUnfavoritePlant()
  const [imgError, setImgError] = useState(false)

  function handleFavoriteClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (plant.is_favorite) {
      unfavoriteMutation.mutate(plant.id)
    } else {
      favoriteMutation.mutate(plant.id)
    }
  }

  return (
    <Link to={`/plants/${plant.id}`} className="block">
      <Card className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md">
        {/* Image with heart overlay */}
        <div className="relative">
          {hasRealImage(plant) && !imgError ? (
            <img
              src={`/api/v1/plants/${plant.id}/image`}
              alt={plant.common_name}
              className="h-40 w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <PlantPlaceholder />
          )}
          <button
            onClick={handleFavoriteClick}
            className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 backdrop-blur-sm transition-colors hover:bg-background"
          >
            <Heart
              className={`h-4 w-4 ${plant.is_favorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
            />
          </button>
        </div>

        <CardContent className="p-4">
          <p className="truncate font-medium text-foreground">{plant.common_name}</p>
          {plant.scientific_name && (
            <p className="truncate text-sm italic text-muted-foreground">
              {plant.scientific_name}
              {plant.cultivar_name && (
                <span className="not-italic text-foreground/60"> '{plant.cultivar_name}'</span>
              )}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {plant.plant_type && (
              <Badge variant="secondary" className="text-xs">{plant.plant_type}</Badge>
            )}
            {plant.water_needs && (
              <Badge variant="outline" className="text-xs">{plant.water_needs}</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function PlantsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Read filters from URL
  const nameFilter = searchParams.get('name') ?? ''
  const cycle = searchParams.get('cycle') ?? 'all'
  const watering = searchParams.get('watering') ?? 'all'
  const sunlight = searchParams.get('sunlight') ?? 'all'
  const favoritesOnly = searchParams.get('favorites') === 'true'
  const edibleOnly = searchParams.get('edible') === 'true'
  const page = parseInt(searchParams.get('page') ?? '1')

  // Local input buffer for debounce
  const [inputValue, setInputValue] = useState(nameFilter)
  const [isFirstRender, setIsFirstRender] = useState(true)

  const updateParams = useCallback((updates: Record<string, string | undefined>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, val] of Object.entries(updates)) {
        if (val === undefined || val === '' || val === 'all' || val === 'false' || (key === 'page' && val === '1')) {
          next.delete(key)
        } else {
          next.set(key, val)
        }
      }
      return next
    })
  }, [setSearchParams])

  // Debounce search input ~400ms — skip first render to preserve page on back nav
  useEffect(() => {
    if (isFirstRender) {
      setIsFirstRender(false)
      return
    }
    const timer = setTimeout(() => {
      updateParams({ name: inputValue || undefined, page: '1' })
    }, 400)
    return () => clearTimeout(timer)
  }, [inputValue]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleCycleChange(val: string) {
    updateParams({ cycle: val, page: '1' })
  }

  function handleWateringChange(val: string) {
    updateParams({ watering: val, page: '1' })
  }

  function handleSunlightChange(val: string) {
    updateParams({ sunlight: val, page: '1' })
  }

  function toggleFavorites() {
    updateParams({ favorites: favoritesOnly ? undefined : 'true', page: '1' })
  }

  function toggleEdible() {
    updateParams({ edible: edibleOnly ? undefined : 'true', page: '1' })
  }

  function setPage(newPage: number) {
    updateParams({ page: String(newPage) })
  }

  const params: PlantListParams = {
    name: nameFilter || undefined,
    cycle: cycle !== 'all' ? cycle : undefined,
    watering: watering !== 'all' ? watering : undefined,
    sunlight: sunlight !== 'all' ? sunlight : undefined,
    favorites_only: favoritesOnly || undefined,
    edible: edibleOnly || undefined,
    page,
    per_page: PER_PAGE,
  }

  const { data, isLoading } = usePlants(params)

  const totalPages = data ? Math.ceil(data.total / PER_PAGE) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Plants</h1>
        <p className="mt-1 text-sm text-muted-foreground">Browse the plant library.</p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name…"
            className="pl-9"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>

        <Select value={cycle} onValueChange={handleCycleChange}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Life cycle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All life cycles</SelectItem>
            {CYCLE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={watering} onValueChange={handleWateringChange}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Watering" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All watering</SelectItem>
            {WATERING_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sunlight} onValueChange={handleSunlightChange}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Sunlight" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sunlight</SelectItem>
            {SUNLIGHT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={favoritesOnly ? 'default' : 'outline'}
          size="icon"
          onClick={toggleFavorites}
          title={favoritesOnly ? 'Show all plants' : 'Show favorites only'}
        >
          <Heart className={`h-4 w-4 ${favoritesOnly ? 'fill-current' : ''}`} />
        </Button>

        <Button
          variant={edibleOnly ? 'default' : 'outline'}
          size="icon"
          onClick={toggleEdible}
          title={edibleOnly ? 'Show all plants' : 'Show edible plants only'}
        >
          <Sprout className="h-4 w-4" />
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {/* Empty state */}
      {!isLoading && data?.items.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <Sprout className="h-8 w-8 text-primary/60" />
            </div>
            <h2 className="text-base font-medium text-foreground">No plants found</h2>
            <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
              {favoritesOnly
                ? 'You haven\u2019t favorited any plants yet.'
                : 'Try adjusting your search or filters.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results grid */}
      {!isLoading && data && data.items.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">
            {data.total} {data.total === 1 ? 'plant' : 'plants'} found
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((plant) => (
              <PlantCard key={plant.id} plant={plant} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
