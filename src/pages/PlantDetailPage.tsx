import { useParams, useNavigate } from 'react-router'
import { ArrowLeft, Sprout, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { usePlant, useCompanionRecommendations } from '@/api/plants'
import type { CompanionEntry } from '@/types/plant'

interface CompanionRowProps {
  entries: CompanionEntry[]
  label: string
  accent: 'green' | 'red'
}

function CompanionRow({ entries, label, accent }: CompanionRowProps) {
  const navigate = useNavigate()
  const resolved = entries.filter((e) => e.resolved && e.plant)

  if (resolved.length === 0) return null

  const headerClass =
    accent === 'green'
      ? 'text-xs font-semibold uppercase tracking-wide text-green-700'
      : 'text-xs font-semibold uppercase tracking-wide text-red-700'

  return (
    <div className="space-y-3">
      <p className={headerClass}>{label}</p>
      <div className="flex flex-wrap gap-3">
        {resolved.map((entry) => {
          const p = entry.plant!
          return (
            <button
              key={p.id}
              onClick={() => navigate(`/plants/${p.id}`)}
              className="flex w-[130px] flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-2 text-center transition-shadow hover:shadow-md"
            >
              {p.image_url ? (
                <img
                  src={`/api/v1/plants/${p.id}/image`}
                  alt={p.common_name}
                  className="h-16 w-16 rounded object-cover"
                  onError={(e) => {
                    const el = e.currentTarget
                    el.style.display = 'none'
                    el.nextElementSibling?.classList.remove('hidden')
                  }}
                />
              ) : null}
              <Sprout
                className={`h-16 w-16 text-primary/20 ${p.image_url ? 'hidden' : ''}`}
              />
              <span className="line-clamp-2 text-xs font-medium leading-tight text-foreground">
                {p.common_name}
              </span>
              {p.plant_type && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  {p.plant_type}
                </Badge>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}

function formatInches(inches: number): string {
  if (inches < 12) return `${Math.round(inches)}"`
  const ft = Math.floor(inches / 12)
  const rem = Math.round(inches % 12)
  if (rem === 0) return `${ft} ft`
  return `${ft} ft ${rem} in`
}

function formatRange(min: number | null | undefined, max: number | null | undefined, unit: string): string | null {
  if (min != null && max != null) return `${min}–${max} ${unit}`
  if (min != null) return `${min} ${unit}`
  if (max != null) return `${max} ${unit}`
  return null
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {children}
      </CardContent>
    </Card>
  )
}

export function PlantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const plantId = id ? parseInt(id, 10) : NaN

  const { data: plant, isLoading, isError } = usePlant(plantId)
  const { data: companions } = useCompanionRecommendations(plantId)

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

  const hasGrowingConditions =
    (plant.hardiness_zones && plant.hardiness_zones.length > 0) ||
    plant.water_needs ||
    plant.sun_requirement ||
    plant.soil_type ||
    plant.fertilizer_needs ||
    (plant.soil_ph_min != null || plant.soil_ph_max != null) ||
    plant.drought_resistant === true ||
    plant.nitrogen_fixing === true

  const hasSizeLifecycle =
    plant.height_inches != null ||
    plant.width_inches != null ||
    plant.spacing_inches != null ||
    plant.life_cycle ||
    plant.growth_rate ||
    plant.days_to_maturity != null ||
    plant.days_to_harvest != null ||
    plant.bloom_season ||
    plant.harvest_window

  const hasPlantingGuide =
    plant.propagation_method ||
    plant.germination_days_min != null ||
    plant.germination_days_max != null ||
    plant.germination_temp_min_f != null ||
    plant.germination_temp_max_f != null ||
    plant.sow_outdoors ||
    plant.sow_indoors ||
    plant.start_indoors_weeks != null ||
    plant.start_outdoors_weeks != null ||
    plant.plant_transplant ||
    plant.plant_cuttings ||
    plant.plant_division ||
    plant.planting_depth_inches != null

  const hasEdibleMedicinal =
    plant.edible_parts ||
    plant.edible_uses ||
    plant.medicinal ||
    plant.medicinal_parts ||
    plant.warning

  const hasTaxonomy =
    plant.family ||
    plant.genus ||
    plant.native_to ||
    plant.habitat ||
    plant.pollination ||
    plant.root_type ||
    plant.root_depth

  const hasLinks = plant.wikipedia_url || plant.pfaf_url || plant.powo_url

  const hasCompanions =
    companions &&
    (companions.companions.some((c) => c.resolved) ||
      companions.antagonists.some((a) => a.resolved))

  const hasPestsDiseases =
    (plant.common_pests && plant.common_pests.length > 0) ||
    (plant.common_diseases && plant.common_diseases.length > 0)

  const soilPh =
    plant.soil_ph_min != null && plant.soil_ph_max != null
      ? `${plant.soil_ph_min}–${plant.soil_ph_max}`
      : plant.soil_ph_min != null
        ? `${plant.soil_ph_min}`
        : plant.soil_ph_max != null
          ? `${plant.soil_ph_max}`
          : null

  const germinationDays = formatRange(plant.germination_days_min, plant.germination_days_max, 'days')
  const germinationTemp = formatRange(plant.germination_temp_min_f, plant.germination_temp_max_f, '°F')

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
          <p className="mt-1 text-base italic text-muted-foreground">
            {plant.scientific_name}
            {plant.cultivar_name && (
              <span className="not-italic text-foreground/70"> '{plant.cultivar_name}'</span>
            )}
          </p>
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
          {plant.edible === true && (
            <Badge variant="outline">Edible</Badge>
          )}
          {plant.family && (
            <Badge variant="secondary">{plant.family}</Badge>
          )}
        </div>
      </div>

      {/* Description */}
      {plant.description && (
        <p className="text-sm leading-relaxed text-muted-foreground">{plant.description}</p>
      )}

      {/* Growing Conditions */}
      {hasGrowingConditions && (
        <SectionCard title="Growing Conditions">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            {plant.hardiness_zones && plant.hardiness_zones.length > 0 && (
              <DetailRow label="Hardiness zones" value={plant.hardiness_zones.join(', ')} />
            )}
            {plant.water_needs && (
              <DetailRow label="Water needs" value={plant.water_needs} />
            )}
            {plant.sun_requirement && (
              <DetailRow label="Sun requirement" value={plant.sun_requirement.replace(/_/g, ' ')} />
            )}
            {plant.soil_type && (
              <DetailRow label="Soil type" value={plant.soil_type} />
            )}
            {plant.fertilizer_needs && (
              <DetailRow label="Fertilizer" value={plant.fertilizer_needs} />
            )}
            {soilPh && (
              <DetailRow label="Soil pH" value={soilPh} />
            )}
            {plant.drought_resistant === true && (
              <DetailRow label="Drought resistant" value="Yes" />
            )}
            {plant.nitrogen_fixing === true && (
              <DetailRow label="Nitrogen fixing" value="Yes" />
            )}
          </dl>
        </SectionCard>
      )}

      {/* Size & Lifecycle */}
      {hasSizeLifecycle && (
        <SectionCard title="Size & Lifecycle">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            {plant.height_inches != null && (
              <DetailRow label="Height" value={formatInches(plant.height_inches)} />
            )}
            {plant.width_inches != null && (
              <DetailRow label="Width" value={formatInches(plant.width_inches)} />
            )}
            {plant.spacing_inches != null && (
              <DetailRow label="Spacing" value={`${plant.spacing_inches}"`} />
            )}
            {plant.life_cycle && (
              <DetailRow label="Life cycle" value={plant.life_cycle} />
            )}
            {plant.growth_rate && (
              <DetailRow label="Growth rate" value={plant.growth_rate} />
            )}
            {plant.days_to_maturity != null && (
              <DetailRow label="Days to maturity" value={`${plant.days_to_maturity} days`} />
            )}
            {plant.days_to_harvest != null && (
              <DetailRow label="Days to harvest" value={`${plant.days_to_harvest} days`} />
            )}
            {plant.bloom_season && (
              <DetailRow label="Bloom season" value={plant.bloom_season} />
            )}
            {plant.harvest_window && (
              <DetailRow label="Harvest window" value={plant.harvest_window} />
            )}
          </dl>
        </SectionCard>
      )}

      {/* Planting Guide */}
      {hasPlantingGuide && (
        <SectionCard title="Planting Guide">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            {plant.propagation_method && (
              <DetailRow label="Propagation" value={plant.propagation_method} />
            )}
            {germinationDays && (
              <DetailRow label="Germination" value={germinationDays} />
            )}
            {germinationTemp && (
              <DetailRow label="Germination temp" value={germinationTemp} />
            )}
            {plant.sow_outdoors && (
              <DetailRow label="Sow outdoors" value={plant.sow_outdoors} />
            )}
            {plant.sow_indoors && (
              <DetailRow label="Sow indoors" value={plant.sow_indoors} />
            )}
            {plant.start_indoors_weeks != null && (
              <DetailRow label="Start indoors" value={`${plant.start_indoors_weeks} weeks before last frost`} />
            )}
            {plant.start_outdoors_weeks != null && (
              <DetailRow label="Start outdoors" value={`${plant.start_outdoors_weeks} weeks after last frost`} />
            )}
            {plant.plant_transplant && (
              <DetailRow label="Transplanting" value={plant.plant_transplant} />
            )}
            {plant.plant_cuttings && (
              <DetailRow label="Cuttings" value={plant.plant_cuttings} />
            )}
            {plant.plant_division && (
              <DetailRow label="Division" value={plant.plant_division} />
            )}
            {plant.planting_depth_inches != null && (
              <DetailRow label="Planting depth" value={`${plant.planting_depth_inches}"`} />
            )}
          </dl>
        </SectionCard>
      )}

      {/* Companions */}
      {hasCompanions && (
        <Card>
          <CardContent className="space-y-5 p-5">
            <CompanionRow
              entries={companions!.companions}
              label="Good companions"
              accent="green"
            />
            <CompanionRow
              entries={companions!.antagonists}
              label="Avoid planting with"
              accent="red"
            />
          </CardContent>
        </Card>
      )}

      {/* Edible & Medicinal */}
      {hasEdibleMedicinal && (
        <SectionCard title="Edible & Medicinal">
          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {plant.edible_parts && (
              <DetailRow label="Edible parts" value={plant.edible_parts} />
            )}
            {plant.edible_uses && (
              <DetailRow label="Edible uses" value={plant.edible_uses} />
            )}
            {plant.medicinal && (
              <DetailRow label="Medicinal uses" value={plant.medicinal} />
            )}
            {plant.medicinal_parts && (
              <DetailRow label="Medicinal parts" value={plant.medicinal_parts} />
            )}
            {plant.warning && (
              <div className="flex flex-col gap-0.5 sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Warning</dt>
                <dd>
                  <div className="flex items-start gap-1.5 text-amber-600">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span className="text-sm">{plant.warning}</span>
                  </div>
                </dd>
              </div>
            )}
          </dl>
        </SectionCard>
      )}

      {/* Taxonomy & Origin */}
      {hasTaxonomy && (
        <SectionCard title="Taxonomy & Origin">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            {plant.family && (
              <DetailRow label="Family" value={plant.family} />
            )}
            {plant.genus && (
              <DetailRow label="Genus" value={plant.genus} />
            )}
            {plant.native_to && (
              <DetailRow label="Native to" value={plant.native_to} />
            )}
            {plant.habitat && (
              <DetailRow label="Habitat" value={plant.habitat} />
            )}
            {plant.pollination && (
              <DetailRow label="Pollination" value={plant.pollination} />
            )}
            {plant.root_type && (
              <DetailRow label="Root type" value={plant.root_type} />
            )}
            {plant.root_depth && (
              <DetailRow label="Root depth" value={plant.root_depth} />
            )}
          </dl>
        </SectionCard>
      )}

      {/* Pests & Diseases */}
      {hasPestsDiseases && (
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pests & Diseases</h2>
            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {plant.common_pests && plant.common_pests.length > 0 && (
                <DetailRow label="Common pests" value={plant.common_pests.join(', ')} />
              )}
              {plant.common_diseases && plant.common_diseases.length > 0 && (
                <DetailRow label="Common diseases" value={plant.common_diseases.join(', ')} />
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Links */}
      {hasLinks && (
        <SectionCard title="Links">
          <div className="flex flex-col gap-2">
            {plant.wikipedia_url && (
              <a href={plant.wikipedia_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline underline-offset-2 hover:text-primary/80">
                Wikipedia
              </a>
            )}
            {plant.pfaf_url && (
              <a href={plant.pfaf_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline underline-offset-2 hover:text-primary/80">
                PFAF (Plants For A Future)
              </a>
            )}
            {plant.powo_url && (
              <a href={plant.powo_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline underline-offset-2 hover:text-primary/80">
                POWO (Plants of the World Online)
              </a>
            )}
          </div>
        </SectionCard>
      )}

      {/* Data sources */}
      {plant.data_sources && plant.data_sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Data sources</span>
          {plant.data_sources.map((src) => (
            <Badge key={src} variant="secondary" className="px-1.5 py-0 text-[10px] text-muted-foreground">
              {src}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
