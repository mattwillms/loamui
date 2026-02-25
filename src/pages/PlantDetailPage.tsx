import { useParams, useNavigate } from 'react-router'
import { ArrowLeft, Sprout } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { usePlant } from '@/api/plants'

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}

export function PlantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const plantId = id ? parseInt(id, 10) : NaN

  const { data: plant, isLoading, isError } = usePlant(plantId)

  if (isNaN(plantId)) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/plants')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to plants
        </Button>
        <p className="text-sm text-destructive">Invalid plant ID.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (isError || !plant) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/plants')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to plants
        </Button>
        <p className="text-sm text-destructive">Plant not found.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/plants')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to plants
      </Button>

      {/* Hero image */}
      {plant.image_url ? (
        <img
          src={`/api/v1/plants/${plant.id}/image`}
          alt={plant.common_name}
          className="h-64 w-full rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-64 w-full items-center justify-center rounded-lg bg-primary/5">
          <Sprout className="h-16 w-16 text-primary/20" />
        </div>
      )}

      {/* Heading */}
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">{plant.common_name}</h1>
        {plant.scientific_name && (
          <p className="mt-1 text-base italic text-muted-foreground">{plant.scientific_name}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {plant.plant_type && (
            <Badge variant="secondary">{plant.plant_type}</Badge>
          )}
          {plant.water_needs && (
            <Badge variant="outline">{plant.water_needs} water</Badge>
          )}
          {plant.sun_requirement && (
            <Badge variant="outline">{plant.sun_requirement.replace(/_/g, ' ')}</Badge>
          )}
        </div>
      </div>

      {/* Description */}
      {plant.description && (
        <p className="text-sm leading-relaxed text-muted-foreground">{plant.description}</p>
      )}

      {/* Detail grid */}
      <Card>
        <CardContent className="p-5">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            {plant.hardiness_zones && plant.hardiness_zones.length > 0 && (
              <DetailRow
                label="Hardiness zones"
                value={plant.hardiness_zones.join(', ')}
              />
            )}
            {plant.days_to_maturity != null && (
              <DetailRow label="Days to maturity" value={`${plant.days_to_maturity} days`} />
            )}
            {plant.spacing_inches != null && (
              <DetailRow label="Spacing" value={`${plant.spacing_inches}"`} />
            )}
            {plant.planting_depth_inches != null && (
              <DetailRow label="Planting depth" value={`${plant.planting_depth_inches}"`} />
            )}
            {plant.bloom_season && (
              <DetailRow label="Bloom season" value={plant.bloom_season} />
            )}
            {plant.harvest_window && (
              <DetailRow label="Harvest window" value={plant.harvest_window} />
            )}
            {plant.fertilizer_needs && (
              <DetailRow label="Fertilizer" value={plant.fertilizer_needs} />
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Companion / antagonist */}
      {((plant.companion_plants && plant.companion_plants.length > 0) ||
        (plant.antagonist_plants && plant.antagonist_plants.length > 0)) && (
        <Card>
          <CardContent className="p-5">
            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {plant.companion_plants && plant.companion_plants.length > 0 && (
                <DetailRow
                  label="Good companions"
                  value={plant.companion_plants.join(', ')}
                />
              )}
              {plant.antagonist_plants && plant.antagonist_plants.length > 0 && (
                <DetailRow
                  label="Avoid planting with"
                  value={plant.antagonist_plants.join(', ')}
                />
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Pests / diseases */}
      {((plant.common_pests && plant.common_pests.length > 0) ||
        (plant.common_diseases && plant.common_diseases.length > 0)) && (
        <Card>
          <CardContent className="p-5">
            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {plant.common_pests && plant.common_pests.length > 0 && (
                <DetailRow
                  label="Common pests"
                  value={plant.common_pests.join(', ')}
                />
              )}
              {plant.common_diseases && plant.common_diseases.length > 0 && (
                <DetailRow
                  label="Common diseases"
                  value={plant.common_diseases.join(', ')}
                />
              )}
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
