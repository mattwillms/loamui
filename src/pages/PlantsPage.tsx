import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Sprout, Search } from 'lucide-react'
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
import { usePlants } from '@/api/plants'
import type { PlantListParams } from '@/types/plant'

const CYCLE_OPTIONS = [
  { value: 'annual', label: 'Annual' },
  { value: 'perennial', label: 'Perennial' },
  { value: 'shrub', label: 'Shrub' },
  { value: 'tree', label: 'Tree' },
  { value: 'herb', label: 'Herb' },
  { value: 'vegetable', label: 'Vegetable' },
  { value: 'fruit', label: 'Fruit' },
  { value: 'bulb', label: 'Bulb' },
  { value: 'other', label: 'Other' },
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

export function PlantsPage() {
  const navigate = useNavigate()
  const [inputValue, setInputValue] = useState('')
  const [debouncedName, setDebouncedName] = useState('')
  const [cycle, setCycle] = useState('all')
  const [watering, setWatering] = useState('all')
  const [sunlight, setSunlight] = useState('all')
  const [page, setPage] = useState(1)

  // Debounce search input ~400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(inputValue)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [inputValue])

  function handleCycleChange(val: string) {
    setCycle(val)
    setPage(1)
  }

  function handleWateringChange(val: string) {
    setWatering(val)
    setPage(1)
  }

  function handleSunlightChange(val: string) {
    setSunlight(val)
    setPage(1)
  }

  const params: PlantListParams = {
    name: debouncedName || undefined,
    cycle: cycle !== 'all' ? cycle : undefined,
    watering: watering !== 'all' ? watering : undefined,
    sunlight: sunlight !== 'all' ? sunlight : undefined,
    page,
    per_page: PER_PAGE,
  }

  const { data, isLoading } = usePlants(params)

  const totalPages = data ? Math.ceil(data.total / PER_PAGE) : 0

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
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
              Try adjusting your search or filters.
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
              <Card
                key={plant.id}
                className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
                onClick={() => navigate(`/plants/${plant.id}`)}
              >
                {/* Image */}
                {plant.image_url ? (
                  <img
                    src={`/api/v1/plants/${plant.id}/image`}
                    alt={plant.common_name}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center bg-primary/5">
                    <Sprout className="h-10 w-10 text-primary/20" />
                  </div>
                )}

                <CardContent className="p-4">
                  <p className="truncate font-medium text-foreground">{plant.common_name}</p>
                  {plant.scientific_name && (
                    <p className="truncate text-sm italic text-muted-foreground">
                      {plant.scientific_name}
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
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
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
                onClick={() => setPage((p) => p + 1)}
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
