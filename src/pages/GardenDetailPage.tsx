import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { Pencil, Plus, ChevronRight, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useGarden, useDeleteGarden, useUpdateGarden } from '@/api/gardens'
import { useBeds, useCreateBed } from '@/api/beds'
import { useGardenSoil } from '@/api/soil'

export function GardenDetailPage() {
  const { id } = useParams<{ id: string }>()
  const gardenId = Number(id)
  const navigate = useNavigate()

  const { data: garden, isLoading: gardenLoading } = useGarden(gardenId)
  const { data: beds, isLoading: bedsLoading } = useBeds(gardenId)
  const createBed = useCreateBed(gardenId)
  const deleteGarden = useDeleteGarden(gardenId)
  const updateGarden = useUpdateGarden(gardenId)

  const hasLocation = !!(garden?.latitude || garden?.longitude)
  const { data: soil, isLoading: soilLoading, isError: soilError } = useGardenSoil(gardenId, hasLocation)

  const [bedDialogOpen, setBedDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [bedName, setBedName] = useState('')
  const [bedNotes, setBedNotes] = useState('')
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editLat, setEditLat] = useState('')
  const [editLon, setEditLon] = useState('')

  function openEditDialog() {
    if (!garden) return
    setEditName(garden.name)
    setEditDescription(garden.description ?? '')
    setEditLat(garden.latitude !== null ? String(garden.latitude) : '')
    setEditLon(garden.longitude !== null ? String(garden.longitude) : '')
    setEditDialogOpen(true)
  }

  async function handleCreateBed(e: React.FormEvent) {
    e.preventDefault()
    if (!bedName.trim()) return
    await createBed.mutateAsync({ name: bedName.trim(), notes: bedNotes.trim() || undefined })
    setBedName('')
    setBedNotes('')
    setBedDialogOpen(false)
  }

  async function handleDeleteGarden() {
    await deleteGarden.mutateAsync()
    navigate('/gardens')
  }

  async function handleUpdateGarden(e: React.FormEvent) {
    e.preventDefault()
    await updateGarden.mutateAsync({
      name: editName.trim() || undefined,
      description: editDescription.trim() || undefined,
      latitude: editLat !== '' ? parseFloat(editLat) : undefined,
      longitude: editLon !== '' ? parseFloat(editLon) : undefined,
    })
    setEditDialogOpen(false)
  }

  if (gardenLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  if (!garden) {
    return <p className="text-sm text-muted-foreground">Garden not found.</p>
  }

  const val = (v: string | number | null) => (v !== null && v !== undefined ? v : '—')

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/gardens" className="hover:text-foreground">Gardens</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{garden.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">{garden.name}</h1>
          {garden.description && (
            <p className="mt-1 text-sm text-muted-foreground">{garden.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {garden.sun_exposure && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {garden.sun_exposure}
              </span>
            )}
            {garden.soil_type && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {garden.soil_type}
              </span>
            )}
            {garden.square_footage && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {garden.square_footage} sq ft
              </span>
            )}
            {garden.latitude !== null && garden.longitude !== null && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {garden.latitude.toFixed(4)}, {garden.longitude.toFixed(4)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setBedDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add bed
          </Button>
          <Button variant="outline" size="icon" onClick={openEditDialog}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Beds */}
      <div>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Beds
        </h2>

        {bedsLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!bedsLoading && beds && beds.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <p className="text-sm text-muted-foreground">No beds yet. Add your first bed to this garden.</p>
              <Button className="mt-4" variant="outline" onClick={() => setBedDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add a bed
              </Button>
            </CardContent>
          </Card>
        )}

        {!bedsLoading && beds && beds.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {beds.map((bed) => (
              <Card
                key={bed.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => navigate(`/beds/${bed.id}`)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">{bed.name}</CardTitle>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {bed.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{bed.notes}</p>
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Soil */}
      <div>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Soil
        </h2>

        {!hasLocation && (
          <p className="text-sm text-muted-foreground">
            Add a location to this garden to see soil data.
          </p>
        )}

        {hasLocation && soilLoading && (
          <p className="text-sm text-muted-foreground">Loading soil data…</p>
        )}

        {hasLocation && soilError && (
          <p className="text-sm text-muted-foreground">No soil data available for this location.</p>
        )}

        {hasLocation && !soilLoading && !soilError && soil && (
          <Card>
            <CardContent className="pt-6">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Soil Series</dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground">{val(soil.soil_series_name)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Texture</dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground">{val(soil.texture_class)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Drainage</dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground">{val(soil.drainage_class)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">pH</dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground">{val(soil.ph_water)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Organic Matter</dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground">
                    {soil.organic_matter_pct !== null ? `${soil.organic_matter_pct}%` : '—'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit garden dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit garden</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateGarden} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Input
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-lat">Latitude (optional)</Label>
                <Input
                  id="edit-lat"
                  type="number"
                  step="any"
                  placeholder="e.g. 32.4735"
                  value={editLat}
                  onChange={(e) => setEditLat(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lon">Longitude (optional)</Label>
                <Input
                  id="edit-lon"
                  type="number"
                  step="any"
                  placeholder="e.g. -90.1322"
                  value={editLon}
                  onChange={(e) => setEditLon(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateGarden.isPending}>
                {updateGarden.isPending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create bed dialog */}
      <Dialog open={bedDialogOpen} onOpenChange={setBedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add bed</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBed} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bed-name">Name</Label>
              <Input
                id="bed-name"
                placeholder="e.g. North raised bed"
                value={bedName}
                onChange={(e) => setBedName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bed-notes">Notes (optional)</Label>
              <Input
                id="bed-notes"
                placeholder="Any notes about this bed"
                value={bedNotes}
                onChange={(e) => setBedNotes(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBedDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBed.isPending}>
                {createBed.isPending ? 'Adding…' : 'Add bed'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete garden confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete garden?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete <strong>{garden.name}</strong> and all its beds and plantings.
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteGarden}
              disabled={deleteGarden.isPending}
            >
              {deleteGarden.isPending ? 'Deleting…' : 'Delete garden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
