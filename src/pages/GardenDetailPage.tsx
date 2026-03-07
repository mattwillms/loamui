import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { AlertTriangle, Pencil, Plus, ChevronRight, Trash2, PenLine } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useGarden, useDeleteGarden, useUpdateGarden, useGardenPlantings } from '@/api/gardens'
import { useBeds, useCreateBed, useUpdateBed, useUpdateBedById } from '@/api/beds'
import { useGardenSoil } from '@/api/soil'
import { useCreateGardenPlanting, usePlanting, useUpdatePlantingById } from '@/api/plantings'
import { PlantPicker } from '@/components/PlantPicker'
import { PlantingPanel } from '@/components/PlantingPanel'
import { pointInPolygon, rectBoundary } from '@/lib/geometry'
import type { Bed } from '@/types/bed'
import type { GardenPlanting } from '@/types/garden'
import type { PlantSummary } from '@/types/plant'

const GardenCanvas = lazy(() => import('@/components/GardenCanvas'))

export function GardenDetailPage() {
  const { id } = useParams<{ id: string }>()
  const gardenId = Number(id)
  const navigate = useNavigate()

  const { data: garden, isLoading: gardenLoading } = useGarden(gardenId)
  const { data: beds, isLoading: bedsLoading } = useBeds(gardenId)
  const { data: gardenPlantings = [] } = useGardenPlantings(gardenId)
  const createBed = useCreateBed(gardenId)
  const deleteGarden = useDeleteGarden(gardenId)
  const updateGarden = useUpdateGarden(gardenId)
  const createGardenPlanting = useCreateGardenPlanting(gardenId)
  const updateBedById = useUpdateBedById(gardenId)
  const updatePlantingById = useUpdatePlantingById(gardenId)

  const hasLocation = !!(garden?.latitude || garden?.longitude)
  const { data: soil, isLoading: soilLoading, isError: soilError } = useGardenSoil(gardenId, hasLocation)

  // Garden dialogs
  const [bedDialogOpen, setBedDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editLat, setEditLat] = useState('')
  const [editLon, setEditLon] = useState('')
  const [editCanvasWidth, setEditCanvasWidth] = useState('')
  const [editCanvasHeight, setEditCanvasHeight] = useState('')

  // Create bed form
  const [bedName, setBedName] = useState('')
  const [bedNotes, setBedNotes] = useState('')
  const [bedWidth, setBedWidth] = useState('')
  const [bedLength, setBedLength] = useState('')

  // Edit bed dialog
  const [editBedDialogOpen, setEditBedDialogOpen] = useState(false)
  const [editingBed, setEditingBed] = useState<Bed | null>(null)
  const [editBedName, setEditBedName] = useState('')
  const [editBedNotes, setEditBedNotes] = useState('')
  const [editBedWidth, setEditBedWidth] = useState('')
  const [editBedLength, setEditBedLength] = useState('')
  const [editBedLocked, setEditBedLocked] = useState(false)
  const updateBed = useUpdateBed(editingBed?.id ?? 0)

  // Canvas state
  const [selectedPlanting, setSelectedPlanting] = useState<GardenPlanting | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingPosition, setPendingPosition] = useState<{x: number, y: number} | null>(null)
  const [drawMode, setDrawMode] = useState(false)
  const [pendingBedBoundary, setPendingBedBoundary] = useState<Array<{x: number, y: number}> | null>(null)
  const [newBedNameDialogOpen, setNewBedNameDialogOpen] = useState(false)
  const [newBedName, setNewBedName] = useState('')

  // Lock state
  const [lockedBeds, setLockedBeds] = useState<Set<number>>(new Set())
  const [lockedPlantings, setLockedPlantings] = useState<Set<number>>(new Set())

  // Init lock state from DB
  useEffect(() => {
    if (beds) {
      setLockedBeds(new Set(beds.filter(b => b.is_locked).map(b => b.id)))
    }
  }, [beds])

  useEffect(() => {
    if (gardenPlantings) {
      setLockedPlantings(new Set(gardenPlantings.filter(p => p.is_locked).map(p => p.id)))
    }
  }, [gardenPlantings])

  // Fetch full planting for PlantingPanel
  const { data: fullPlanting } = usePlanting(selectedPlanting?.id ?? 0)

  const hasCanvas = !!(garden?.canvas_width_ft && garden?.canvas_height_ft)

  // Out-of-bounds detection
  const outOfBoundsPlantings = hasCanvas
    ? gardenPlantings.filter(p => {
        if (p.pos_x == null || p.pos_y == null) return false
        return p.pos_x < 0 || p.pos_y < 0
          || p.pos_x > garden!.canvas_width_ft!
          || p.pos_y > garden!.canvas_height_ft!
      })
    : []

  function openEditDialog() {
    if (!garden) return
    setEditName(garden.name)
    setEditDescription(garden.description ?? '')
    setEditLat(garden.latitude !== null ? String(garden.latitude) : '')
    setEditLon(garden.longitude !== null ? String(garden.longitude) : '')
    setEditCanvasWidth(garden.canvas_width_ft !== null ? String(garden.canvas_width_ft) : '')
    setEditCanvasHeight(garden.canvas_height_ft !== null ? String(garden.canvas_height_ft) : '')
    setEditDialogOpen(true)
  }

  function openEditBedDialog(bed: Bed) {
    setEditingBed(bed)
    setEditBedName(bed.name)
    setEditBedNotes(bed.notes ?? '')
    setEditBedWidth(bed.width_ft !== null ? String(bed.width_ft) : '')
    setEditBedLength(bed.length_ft !== null ? String(bed.length_ft) : '')
    setEditBedLocked(bed.is_locked)
    setEditBedDialogOpen(true)
  }

  async function handleCreateBed(e: React.FormEvent) {
    e.preventDefault()
    if (!bedName.trim()) return
    const w = bedWidth !== '' ? parseFloat(bedWidth) : undefined
    const l = bedLength !== '' ? parseFloat(bedLength) : undefined

    // Compute stagger offset so new beds don't stack at (0,0)
    const bedCount = beds?.length ?? 0
    const ox = bedCount * 2
    const oy = bedCount * 2
    const boundary = w && l ? rectBoundary(w, l, ox, oy) : undefined

    await createBed.mutateAsync({
      name: bedName.trim(),
      notes: bedNotes.trim() || undefined,
      width_ft: w,
      length_ft: l,
      boundary,
    })
    setBedName('')
    setBedNotes('')
    setBedWidth('')
    setBedLength('')
    setBedDialogOpen(false)
  }

  async function handleUpdateBed(e: React.FormEvent) {
    e.preventDefault()
    if (!editBedName.trim()) return
    await updateBed.mutateAsync({
      name: editBedName.trim(),
      notes: editBedNotes.trim() || undefined,
      width_ft: editBedWidth !== '' ? parseFloat(editBedWidth) : undefined,
      length_ft: editBedLength !== '' ? parseFloat(editBedLength) : undefined,
      is_locked: editBedLocked,
    })
    setEditBedDialogOpen(false)
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
      canvas_width_ft: editCanvasWidth !== '' ? parseFloat(editCanvasWidth) : null,
      canvas_height_ft: editCanvasHeight !== '' ? parseFloat(editCanvasHeight) : null,
    })
    setEditDialogOpen(false)
  }

  // Canvas handlers
  function handleCanvasClick(x: number, y: number) {
    setPendingPosition({ x, y })
    setPickerOpen(true)
  }

  async function handlePlantSelect(plant: PlantSummary) {
    if (!pendingPosition || !beds) return
    setPickerOpen(false)

    const containingBed = beds.find(bed =>
      bed.boundary && pointInPolygon(pendingPosition, bed.boundary)
    ) ?? beds[0] ?? null

    if (!containingBed) {
      toast.error('Add a bed to the garden first.')
      return
    }

    try {
      await createGardenPlanting.mutateAsync({
        bed_id: containingBed.id,
        plant_id: plant.id,
        pos_x: pendingPosition.x,
        pos_y: pendingPosition.y,
        quantity: 1,
      })
    } catch {
      toast.error('Failed to add planting.')
    }
    setPendingPosition(null)
  }

  function handleBedDrawn(boundary: Array<{x: number, y: number}>) {
    setDrawMode(false)
    setPendingBedBoundary(boundary)
    setNewBedName('')
    setNewBedNameDialogOpen(true)
  }

  async function handleNewBedConfirm() {
    if (!newBedName.trim() || !pendingBedBoundary) return
    await createBed.mutateAsync({
      name: newBedName.trim(),
      boundary: pendingBedBoundary,
    })
    setNewBedNameDialogOpen(false)
    setPendingBedBoundary(null)
  }

  // Drag handlers
  const handleBedDragEnd = useCallback((bedId: number, dx: number, dy: number) => {
    const bed = beds?.find(b => b.id === bedId)
    if (!bed?.boundary) return
    const newBoundary = bed.boundary.map(v => ({
      x: Math.round((v.x + dx) * 100) / 100,
      y: Math.round((v.y + dy) * 100) / 100,
    }))
    updateBedById.mutate({ bedId, data: { boundary: newBoundary } })
  }, [beds, updateBedById])

  const handlePlantingDragEnd = useCallback((plantingId: number, x: number, y: number) => {
    updatePlantingById.mutate({
      plantingId,
      data: {
        pos_x: Math.round(x * 100) / 100,
        pos_y: Math.round(y * 100) / 100,
      },
    })
  }, [updatePlantingById])

  if (gardenLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  if (!garden) {
    return <p className="text-sm text-muted-foreground">Garden not found.</p>
  }

  const val = (v: string | number | null) => (v !== null && v !== undefined ? v : '—')

  return (
    <div className="space-y-8">
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

      {/* Out-of-bounds warning */}
      {outOfBoundsPlantings.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {outOfBoundsPlantings.length} planting{outOfBoundsPlantings.length > 1 ? 's are' : ' is'} outside the canvas bounds.
            Resize the garden or drag {outOfBoundsPlantings.length > 1 ? 'them' : 'it'} back inside.
          </p>
        </div>
      )}

      {/* Garden Designer */}
      <div>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Garden Designer
        </h2>

        {!hasCanvas && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Set garden dimensions to enable the designer.
              </p>
              <Button className="mt-4" variant="outline" onClick={openEditDialog}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit garden
              </Button>
            </CardContent>
          </Card>
        )}

        {hasCanvas && (
          <>
            {/* Toolbar */}
            <div className="mb-3 flex items-center gap-2">
              <Button
                variant={drawMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDrawMode(!drawMode)}
              >
                <PenLine className="mr-2 h-4 w-4" />
                Draw Bed
              </Button>
              {drawMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDrawMode(false)}
                >
                  Cancel
                </Button>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {garden.canvas_width_ft} × {garden.canvas_height_ft} ft
              </span>
            </div>

            <Suspense fallback={<p className="text-sm text-muted-foreground">Loading canvas…</p>}>
              <GardenCanvas
                garden={garden}
                beds={beds ?? []}
                plantings={gardenPlantings}
                onPlantingSelect={setSelectedPlanting}
                onCanvasClick={handleCanvasClick}
                drawMode={drawMode}
                onBedDrawn={handleBedDrawn}
                lockedBeds={lockedBeds}
                lockedPlantings={lockedPlantings}
                onBedDragEnd={handleBedDragEnd}
                onPlantingDragEnd={handlePlantingDragEnd}
              />
            </Suspense>
          </>
        )}
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
              <Link key={bed.id} to={`/beds/${bed.id}`} className="block">
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">{bed.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          openEditBedDialog(bed)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
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
                      {bed.is_locked && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Locked
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
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

      {/* PlantingPanel */}
      {selectedPlanting && fullPlanting && (
        <PlantingPanel
          planting={fullPlanting}
          bedId={selectedPlanting.bed_id}
          gardenId={gardenId}
          bedName={selectedPlanting.bed_name}
          onClose={() => setSelectedPlanting(null)}
        />
      )}

      {/* Plant picker */}
      <PlantPicker
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false)
          setPendingPosition(null)
        }}
        onSelect={handlePlantSelect}
      />

      {/* New bed name dialog (after drawing) */}
      <Dialog open={newBedNameDialogOpen} onOpenChange={setNewBedNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name your new bed</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleNewBedConfirm() }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-bed-name">Name</Label>
              <Input
                id="new-bed-name"
                placeholder="e.g. Herb spiral"
                value={newBedName}
                onChange={(e) => setNewBedName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setNewBedNameDialogOpen(false)
                setPendingBedBoundary(null)
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBed.isPending}>
                {createBed.isPending ? 'Creating…' : 'Create bed'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                <Label htmlFor="edit-canvas-w">Garden width (ft)</Label>
                <Input
                  id="edit-canvas-w"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 20"
                  value={editCanvasWidth}
                  onChange={(e) => setEditCanvasWidth(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-canvas-h">Garden height (ft)</Label>
                <Input
                  id="edit-canvas-h"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 30"
                  value={editCanvasHeight}
                  onChange={(e) => setEditCanvasHeight(e.target.value)}
                />
              </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bed-width">Width (ft, optional)</Label>
                <Input
                  id="bed-width"
                  type="number"
                  min="1"
                  step="0.5"
                  placeholder="e.g. 4"
                  value={bedWidth}
                  onChange={(e) => setBedWidth(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bed-length">Length (ft, optional)</Label>
                <Input
                  id="bed-length"
                  type="number"
                  min="1"
                  step="0.5"
                  placeholder="e.g. 8"
                  value={bedLength}
                  onChange={(e) => setBedLength(e.target.value)}
                />
              </div>
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

      {/* Edit bed dialog */}
      <Dialog open={editBedDialogOpen} onOpenChange={setEditBedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit bed</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateBed} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-bed-name">Name</Label>
              <Input
                id="edit-bed-name"
                value={editBedName}
                onChange={(e) => setEditBedName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-bed-width">Width (ft, optional)</Label>
                <Input
                  id="edit-bed-width"
                  type="number"
                  min="1"
                  step="0.5"
                  placeholder="e.g. 4"
                  value={editBedWidth}
                  onChange={(e) => setEditBedWidth(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bed-length">Length (ft, optional)</Label>
                <Input
                  id="edit-bed-length"
                  type="number"
                  min="1"
                  step="0.5"
                  placeholder="e.g. 8"
                  value={editBedLength}
                  onChange={(e) => setEditBedLength(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-bed-notes">Notes (optional)</Label>
              <Input
                id="edit-bed-notes"
                placeholder="Any notes about this bed"
                value={editBedNotes}
                onChange={(e) => setEditBedNotes(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-bed-locked">Lock position</Label>
              <Switch
                id="edit-bed-locked"
                checked={editBedLocked}
                onCheckedChange={setEditBedLocked}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditBedDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateBed.isPending}>
                {updateBed.isPending ? 'Saving…' : 'Save'}
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
