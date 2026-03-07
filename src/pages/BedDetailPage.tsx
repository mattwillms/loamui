import { useState } from 'react'
import { useParams, Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useBed } from '@/api/beds'
import { useGarden } from '@/api/gardens'
import { useBedPlantings } from '@/api/plantings'
import { PlantingPanel } from '@/components/PlantingPanel'
import type { Planting } from '@/types/planting'

const STATUS_COLORS: Record<string, string> = {
  planned:    'bg-slate-100 text-slate-700',
  seedling:   'bg-lime-100 text-lime-700',
  growing:    'bg-green-100 text-green-700',
  flowering:  'bg-pink-100 text-pink-700',
  fruiting:   'bg-orange-100 text-orange-700',
  harvesting: 'bg-amber-100 text-amber-700',
  dormant:    'bg-stone-100 text-stone-700',
  removed:    'bg-red-100 text-red-700',
}

export function BedDetailPage() {
  const { id } = useParams<{ id: string }>()
  const bedId = Number(id)

  const { data: bed, isLoading: bedLoading } = useBed(bedId)
  const { data: garden, isLoading: gardenLoading } = useGarden(bed?.garden_id ?? 0)
  const { data: plantings = [] } = useBedPlantings(bedId)

  const [selectedPlanting, setSelectedPlanting] = useState<Planting | null>(null)

  if (bedLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  if (!bed) {
    return <p className="text-sm text-muted-foreground">Bed not found.</p>
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Breadcrumb + header */}
      <div className="w-full space-y-6">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/gardens" className="hover:text-foreground">Gardens</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          {gardenLoading || !garden ? (
            <span>…</span>
          ) : (
            <Link to={`/gardens/${garden.id}`} className="hover:text-foreground">{garden.name}</Link>
          )}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{bed.name}</span>
        </div>

        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">{bed.name}</h1>
          {bed.notes && (
            <p className="mt-1 text-sm text-muted-foreground">{bed.notes}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {bed.width_ft && bed.length_ft && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {bed.width_ft} × {bed.length_ft} ft
              </span>
            )}
            {bed.sun_exposure_override && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {bed.sun_exposure_override}
              </span>
            )}
            {bed.soil_amendments && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {bed.soil_amendments}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Plantings list */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Plantings
          </h2>
          {garden && (
            <Link to={`/gardens/${bed.garden_id}`}>
              <Button variant="outline" size="sm">View in garden</Button>
            </Link>
          )}
        </div>

        {plantings.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No plantings in this bed. Add plants from the garden designer.
          </p>
        )}

        {plantings.length > 0 && (
          <div className="space-y-2">
            {plantings.map((planting) => (
              <div
                key={planting.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {planting.plant?.common_name ?? 'Unknown plant'}
                  </p>
                  {planting.date_planted && (
                    <p className="text-xs text-muted-foreground">
                      Planted {planting.date_planted}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={`text-xs capitalize ${STATUS_COLORS[planting.status] ?? 'bg-slate-100 text-slate-700'}`}
                    variant="secondary"
                  >
                    {planting.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPlanting(planting)}
                  >
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PlantingPanel */}
      {selectedPlanting && (
        <PlantingPanel
          planting={selectedPlanting}
          bedId={bedId}
          gardenId={bed.garden_id}
          bedName={bed.name}
          onClose={() => setSelectedPlanting(null)}
        />
      )}
    </div>
  )
}
