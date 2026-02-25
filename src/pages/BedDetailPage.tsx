import { useParams, Link } from 'react-router'
import { ChevronRight, Sprout } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useBed } from '@/api/beds'
import { useGarden } from '@/api/gardens'

export function BedDetailPage() {
  const { id } = useParams<{ id: string }>()
  const bedId = Number(id)

  const { data: bed, isLoading: bedLoading } = useBed(bedId)
  const { data: garden, isLoading: gardenLoading } = useGarden(bed?.garden_id ?? 0)

  if (bedLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  if (!bed) {
    return <p className="text-sm text-muted-foreground">Bed not found.</p>
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Breadcrumb */}
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

      {/* Header */}
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

      {/* Plantings — empty state */}
      <div>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Plantings
        </h2>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <Sprout className="h-8 w-8 text-primary/60" />
            </div>
            <h2 className="text-base font-medium text-foreground">No plantings yet</h2>
            <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
              Plantings will be added in the next phase of development.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
