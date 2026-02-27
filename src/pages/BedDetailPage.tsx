import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router'
import { ChevronRight, Lock, LockOpen, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useBed } from '@/api/beds'
import { useGarden } from '@/api/gardens'
import {
  useBedPlantings,
  useCreatePlanting,
  useDeletePlanting,
  useUpdatePlanting,
} from '@/api/plantings'
import { usePlants } from '@/api/plants'
import type { Planting } from '@/types/planting'
import type { PlantSummary, PlantListParams } from '@/types/plant'

// ── Constants ─────────────────────────────────────────────────────────────────

const CELL_SIZES = { S: 24, M: 48, L: 72 } as const
type Zoom = keyof typeof CELL_SIZES

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  vegetable: { bg: 'bg-green-100',   border: 'border-green-400',   text: 'text-green-900' },
  herb:      { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-900' },
  tree:      { bg: 'bg-stone-200',   border: 'border-stone-400',   text: 'text-stone-800' },
  shrub:     { bg: 'bg-lime-100',    border: 'border-lime-400',    text: 'text-lime-900' },
  annual:    { bg: 'bg-violet-100',  border: 'border-violet-400',  text: 'text-violet-900' },
  perennial: { bg: 'bg-blue-100',    border: 'border-blue-400',    text: 'text-blue-900' },
  bulb:      { bg: 'bg-amber-100',   border: 'border-amber-400',   text: 'text-amber-900' },
  fruit:     { bg: 'bg-orange-100',  border: 'border-orange-400',  text: 'text-orange-900' },
  flower:    { bg: 'bg-pink-100',    border: 'border-pink-400',    text: 'text-pink-900' },
}
const DEFAULT_COLOR = { bg: 'bg-slate-100', border: 'border-slate-400', text: 'text-slate-800' }

const CYCLE_OPTIONS = [
  { value: 'vegetable', label: 'Vegetable' },
  { value: 'herb', label: 'Herb' },
  { value: 'annual', label: 'Annual' },
  { value: 'perennial', label: 'Perennial' },
  { value: 'shrub', label: 'Shrub' },
  { value: 'tree', label: 'Tree' },
  { value: 'fruit', label: 'Fruit' },
  { value: 'bulb', label: 'Bulb' },
]

const PICKER_PER_PAGE = 12

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTypeColor(plantType: string | null) {
  return plantType ? (TYPE_COLORS[plantType.toLowerCase()] ?? DEFAULT_COLOR) : DEFAULT_COLOR
}

function footprintFor(spacingInches: number | null | undefined): number {
  return Math.max(1, Math.ceil((spacingInches ?? 12) / 12))
}

type CellState =
  | { kind: 'empty' }
  | { kind: 'anchor'; planting: Planting }
  | { kind: 'continuation'; planting: Planting }

function buildOccupancy(plantings: Planting[], cols: number, rows: number): CellState[][] {
  const grid: CellState[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ kind: 'empty' as const }))
  )
  for (const planting of plantings) {
    const gx = planting.grid_x
    const gy = planting.grid_y
    if (gx == null || gy == null) continue
    const fp = footprintFor(planting.plant?.spacing_inches)
    for (let dy = 0; dy < fp; dy++) {
      for (let dx = 0; dx < fp; dx++) {
        const cx = gx + dx
        const cy = gy + dy
        if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
          grid[cy][cx] =
            dx === 0 && dy === 0
              ? { kind: 'anchor', planting }
              : { kind: 'continuation', planting }
        }
      }
    }
  }
  return grid
}

// ── Grid cell components ──────────────────────────────────────────────────────

interface EmptyCellProps {
  x: number
  y: number
  cellSize: number
  isInHoverFootprint: boolean
  isValidDrop: boolean
  isFlashing: boolean
  onClick: () => void
}

function EmptyCell({ x, y, cellSize, isInHoverFootprint, isValidDrop, isFlashing, onClick }: EmptyCellProps) {
  const { setNodeRef } = useDroppable({ id: `cell-${x}-${y}` })
  return (
    <div
      ref={setNodeRef}
      className={`cursor-pointer bg-background transition-colors hover:bg-primary/5 ${isFlashing ? 'flash-invalid' : ''}`}
      style={{ width: cellSize, height: cellSize, position: 'relative' }}
      onClick={onClick}
      title={`(${x + 1}, ${y + 1})`}
    >
      {isInHoverFootprint && (
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundColor: isValidDrop ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
          }}
        />
      )}
    </div>
  )
}

interface ContinuationCellProps {
  x: number
  y: number
  planting: Planting
  cellSize: number
  isDraggingSource: boolean
  isInHoverFootprint: boolean
  isValidDrop: boolean
  isFlashing: boolean
}

function GridContinuationCell({
  x, y, planting, cellSize,
  isDraggingSource, isInHoverFootprint, isValidDrop, isFlashing,
}: ContinuationCellProps) {
  const { setNodeRef } = useDroppable({ id: `cell-${x}-${y}` })
  const colors = getTypeColor(planting.plant?.plant_type ?? null)
  return (
    <div
      ref={setNodeRef}
      className={`border ${colors.border} ${colors.bg} ${isFlashing ? 'flash-invalid' : ''}`}
      style={{ width: cellSize, height: cellSize, position: 'relative', opacity: isDraggingSource ? 0.4 : 1 }}
    >
      {isInHoverFootprint && (
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundColor: isValidDrop ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
          }}
        />
      )}
    </div>
  )
}

interface AnchorCellProps {
  x: number
  y: number
  planting: Planting
  cellSize: number
  isDraggingSource: boolean
  isInHoverFootprint: boolean
  isValidDrop: boolean
  isFlashing: boolean
  isLockAnimating: boolean
  isSelected: boolean
  onDelete: () => void
  onLock: () => void
  onUnlock: () => void
  onSelect: () => void
  onClickUnlocked: () => void
}

function GridAnchorCell({
  x, y, planting, cellSize,
  isDraggingSource, isInHoverFootprint, isValidDrop, isFlashing,
  isLockAnimating, isSelected,
  onDelete, onLock, onUnlock, onSelect, onClickUnlocked,
}: AnchorCellProps) {
  const {
    setNodeRef: setDraggableRef,
    attributes,
    listeners,
    isDragging,
  } = useDraggable({
    id: `planting-${planting.id}`,
    disabled: planting.is_locked,
  })

  const { setNodeRef: setDroppableRef } = useDroppable({ id: `cell-${x}-${y}` })

  const setRef = useCallback(
    (el: HTMLElement | null) => {
      setDraggableRef(el)
      setDroppableRef(el)
    },
    [setDraggableRef, setDroppableRef],
  )

  const colors = getTypeColor(planting.plant?.plant_type ?? null)

  let borderClass: string
  if (planting.is_locked) {
    borderClass = isSelected
      ? 'border border-black/50 ring-1 ring-primary'
      : 'border border-black/50'
  } else if (isLockAnimating) {
    borderClass = 'border-2 border-green-500'
  } else {
    borderClass = 'border-2 border-amber-400'
  }

  const isGhost = isDragging || isDraggingSource

  return (
    <div
      ref={setRef}
      {...listeners}
      {...attributes}
      className={`group relative ${colors.bg} ${borderClass} transition-colors duration-300 ${isFlashing ? 'flash-invalid' : ''} ${planting.is_locked ? 'cursor-pointer' : 'cursor-grab'}`}
      style={{ width: cellSize, height: cellSize, position: 'relative', opacity: isGhost ? 0.4 : 1 }}
      title={planting.plant?.common_name ?? ''}
      onClick={planting.is_locked ? onSelect : onClickUnlocked}
    >
      {/* Hover footprint overlay */}
      {isInHoverFootprint && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
            backgroundColor: isValidDrop ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
          }}
        />
      )}

      {/* Delete button — unlocked, top-right, hover */}
      {!planting.is_locked && (
        <button
          className="absolute right-0 top-0 z-10 hidden h-4 w-4 items-center justify-center rounded-bl bg-black/20 text-white hover:bg-destructive group-hover:flex"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          title="Remove planting"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}

      {/* Lock button — unlocked, bottom-right, hover */}
      {!planting.is_locked && (
        <button
          className="absolute bottom-0 right-0 z-10 hidden h-4 w-4 items-center justify-center rounded-tl bg-black/20 text-white hover:bg-amber-500 group-hover:flex"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onLock() }}
          title="Lock position"
        >
          <Lock className="h-2 w-2" />
        </button>
      )}

      {/* Unlock button — locked, bottom-left, always visible */}
      {planting.is_locked && (
        <button
          className="absolute bottom-0 left-0 z-10 flex h-4 w-4 items-center justify-center rounded-tr bg-black/15 text-black/60 hover:bg-amber-400 hover:text-white"
          onClick={(e) => { e.stopPropagation(); onUnlock() }}
          title="Unlock position"
        >
          <LockOpen className="h-2 w-2" />
        </button>
      )}

      {/* Plant name — M/L zoom only */}
      {cellSize >= 48 && (
        <span
          className={`absolute inset-0 flex items-center justify-center px-1 text-center font-medium leading-tight select-none ${colors.text}`}
          style={{ fontSize: cellSize >= 72 ? '11px' : '9px', zIndex: 1 }}
        >
          {planting.plant?.common_name.split(' ')[0] ?? '?'}
        </span>
      )}
    </div>
  )
}

interface DragOverlayCellProps {
  planting: Planting
  cellSize: number
}

function DragOverlayCell({ planting, cellSize }: DragOverlayCellProps) {
  const colors = getTypeColor(planting.plant?.plant_type ?? null)
  return (
    <div
      className={`${colors.bg} border-2 border-amber-400 shadow-lg`}
      style={{ width: cellSize, height: cellSize, position: 'relative', opacity: 0.9 }}
    >
      {cellSize >= 48 && (
        <span
          className={`absolute inset-0 flex items-center justify-center px-1 text-center font-medium leading-tight select-none ${colors.text}`}
          style={{ fontSize: cellSize >= 72 ? '11px' : '9px' }}
        >
          {planting.plant?.common_name.split(' ')[0] ?? '?'}
        </span>
      )}
    </div>
  )
}

// ── Plant picker dialog ───────────────────────────────────────────────────────

interface PlantPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (plant: PlantSummary) => void
}

function PlantPicker({ open, onClose, onSelect }: PlantPickerProps) {
  const [inputValue, setInputValue] = useState('')
  const [debouncedName, setDebouncedName] = useState('')
  const [cycle, setCycle] = useState('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(inputValue)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [inputValue])

  useEffect(() => {
    if (!open) {
      setInputValue('')
      setDebouncedName('')
      setCycle('all')
      setPage(1)
    }
  }, [open])

  const params: PlantListParams = {
    name: debouncedName || undefined,
    cycle: cycle !== 'all' ? cycle : undefined,
    page,
    per_page: PICKER_PER_PAGE,
  }

  const { data, isLoading } = usePlants(params)
  const totalPages = data ? Math.ceil(data.total / PICKER_PER_PAGE) : 0

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose a plant</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name…"
              className="pl-9"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
            />
          </div>
          <Select value={cycle} onValueChange={(v) => { setCycle(v); setPage(1) }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {CYCLE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
          {isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          )}
          {!isLoading && data?.items.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No plants found.</p>
          )}
          {!isLoading && data?.items.map((plant) => {
            const colors = getTypeColor(plant.plant_type)
            return (
              <button
                key={plant.id}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted"
                onClick={() => onSelect(plant)}
              >
                <div
                  className={`h-8 w-8 flex-none rounded ${colors.bg} border ${colors.border} flex items-center justify-center`}
                >
                  <span className={`text-xs font-semibold ${colors.text}`}>
                    {plant.common_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{plant.common_name}</p>
                  {plant.scientific_name && (
                    <p className="truncate text-xs italic text-muted-foreground">{plant.scientific_name}</p>
                  )}
                </div>
                {plant.plant_type && (
                  <Badge variant="secondary" className="flex-none text-xs capitalize">
                    {plant.plant_type}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-3">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function BedDetailPage() {
  const { id } = useParams<{ id: string }>()
  const bedId = Number(id)

  // Grid state
  const [zoom, setZoom] = useState<Zoom>('M')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingCell, setPendingCell] = useState<{ x: number; y: number } | null>(null)

  // Drag state
  const [draggingPlantingId, setDraggingPlantingId] = useState<number | null>(null)
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null)
  const [isValidDrop, setIsValidDrop] = useState(false)
  const [flashingCells, setFlashingCells] = useState<Set<string>>(new Set())

  // Lock state
  const [selectedPlantingId, setSelectedPlantingId] = useState<number | null>(null)
  const [lockAnimating, setLockAnimating] = useState<Set<number>>(new Set())

  // Refs to avoid stale closures in DnD handlers
  const draggingIdRef = useRef<number | null>(null)
  const hoverCellRef = useRef<{ x: number; y: number } | null>(null)
  const isValidDropRef = useRef(false)

  const { data: bed, isLoading: bedLoading } = useBed(bedId)
  const { data: garden, isLoading: gardenLoading } = useGarden(bed?.garden_id ?? 0)
  const { data: plantings = [] } = useBedPlantings(bedId)
  const createPlanting = useCreatePlanting()
  const deletePlanting = useDeletePlanting()
  const updatePlanting = useUpdatePlanting()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const cellSize = CELL_SIZES[zoom]
  const cols = bed?.width_ft ?? 0
  const rows = bed?.length_ft ?? 0
  const hasGrid = cols > 0 && rows > 0

  const occupancy = hasGrid ? buildOccupancy(plantings, cols, rows) : []

  // Compute hover footprint cells for drag highlighting
  const draggingPlanting = draggingPlantingId ? plantings.find(p => p.id === draggingPlantingId) : null
  const hoverFootprintCells = new Set<string>()
  if (hoverCell && draggingPlanting) {
    const fp = footprintFor(draggingPlanting.plant?.spacing_inches)
    for (let dy = 0; dy < fp; dy++) {
      for (let dx = 0; dx < fp; dx++) {
        hoverFootprintCells.add(`${hoverCell.x + dx}-${hoverCell.y + dy}`)
      }
    }
  }

  // ── DnD handlers ──────────────────────────────────────────────────────────

  function handleDragStart({ active }: DragStartEvent) {
    const plantingId = parseInt(active.id.toString().replace('planting-', ''))
    draggingIdRef.current = plantingId
    setDraggingPlantingId(plantingId)
    setSelectedPlantingId(null)
    setHoverCell(null)
    setIsValidDrop(false)
  }

  function handleDragOver({ over }: DragOverEvent) {
    if (!over) {
      hoverCellRef.current = null
      isValidDropRef.current = false
      setHoverCell(null)
      setIsValidDrop(false)
      return
    }

    const overId = over.id.toString()
    if (!overId.startsWith('cell-')) return

    const parts = overId.split('-')
    const x = parseInt(parts[1])
    const y = parseInt(parts[2])

    hoverCellRef.current = { x, y }
    setHoverCell({ x, y })

    const currentDraggingId = draggingIdRef.current
    const dragging = plantings.find(p => p.id === currentDraggingId)
    if (!dragging) return

    const fp = footprintFor(dragging.plant?.spacing_inches)
    let valid = true

    outer: for (let dy = 0; dy < fp; dy++) {
      for (let dx = 0; dx < fp; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx >= cols || ny >= rows) { valid = false; break outer }
        const cell = occupancy[ny]?.[nx]
        if (!cell || cell.kind === 'empty') continue
        if (cell.planting.id === currentDraggingId) continue // own cells are OK
        valid = false
        break outer
      }
    }

    isValidDropRef.current = valid
    setIsValidDrop(valid)
  }

  async function handleDragEnd({ over }: DragEndEvent) {
    const dragging = draggingIdRef.current
    const hover = hoverCellRef.current
    const valid = isValidDropRef.current

    // Reset all drag state
    draggingIdRef.current = null
    hoverCellRef.current = null
    isValidDropRef.current = false
    setDraggingPlantingId(null)
    setHoverCell(null)
    setIsValidDrop(false)

    if (!dragging || !hover) return

    if (valid && over) {
      const source = plantings.find(p => p.id === dragging)
      if (!source) return
      // No-op if dropped on same position
      if (source.grid_x === hover.x && source.grid_y === hover.y) return
      try {
        await updatePlanting.mutateAsync({
          plantingId: dragging,
          bedId,
          data: { grid_x: hover.x, grid_y: hover.y },
        })
      } catch {
        toast.error('Failed to move planting.')
      }
    } else if (!valid) {
      // Flash the hover footprint cells
      const source = plantings.find(p => p.id === dragging)
      const fp = footprintFor(source?.plant?.spacing_inches)
      const cells = new Set<string>()
      for (let dy = 0; dy < fp; dy++) {
        for (let dx = 0; dx < fp; dx++) {
          const cx = hover.x + dx
          const cy = hover.y + dy
          if (cx < cols && cy < rows) cells.add(`${cx}-${cy}`)
        }
      }
      setFlashingCells(cells)
      setTimeout(() => setFlashingCells(new Set()), 300)
    }
  }

  // ── Grid click handlers ────────────────────────────────────────────────────

  function handleCellClick(x: number, y: number) {
    const cell = occupancy[y]?.[x]
    if (!cell || cell.kind !== 'empty') return
    setSelectedPlantingId(null)
    setPendingCell({ x, y })
    setPickerOpen(true)
  }

  async function handlePlantSelect(plant: PlantSummary) {
    if (!pendingCell) return
    const fp = footprintFor(plant.spacing_inches)

    for (let dy = 0; dy < fp; dy++) {
      for (let dx = 0; dx < fp; dx++) {
        const cx = pendingCell.x + dx
        const cy = pendingCell.y + dy
        if (cx >= cols || cy >= rows) continue
        const cell = occupancy[cy]?.[cx]
        if (cell && cell.kind !== 'empty') {
          toast.error('Not enough space — another plant is in the way.')
          setPickerOpen(false)
          setPendingCell(null)
          return
        }
      }
    }

    setPickerOpen(false)
    try {
      await createPlanting.mutateAsync({
        bed_id: bedId,
        plant_id: plant.id,
        grid_x: pendingCell.x,
        grid_y: pendingCell.y,
        quantity: 1,
      })
    } catch {
      toast.error('Failed to add planting.')
    }
    setPendingCell(null)
  }

  async function handleDelete(planting: Planting) {
    try {
      await deletePlanting.mutateAsync({ plantingId: planting.id, bedId })
    } catch {
      toast.error('Failed to remove planting.')
    }
  }

  async function handleLock(planting: Planting) {
    setLockAnimating(prev => new Set(prev).add(planting.id))
    try {
      await updatePlanting.mutateAsync({
        plantingId: planting.id,
        bedId,
        data: { is_locked: true },
      })
    } catch {
      toast.error('Failed to lock planting.')
      setLockAnimating(prev => { const s = new Set(prev); s.delete(planting.id); return s })
      return
    }
    setTimeout(() => {
      setLockAnimating(prev => { const s = new Set(prev); s.delete(planting.id); return s })
    }, 600)
  }

  async function handleUnlock(planting: Planting) {
    try {
      await updatePlanting.mutateAsync({
        plantingId: planting.id,
        bedId,
        data: { is_locked: false },
      })
    } catch {
      toast.error('Failed to unlock planting.')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (bedLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  if (!bed) {
    return <p className="text-sm text-muted-foreground">Bed not found.</p>
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Breadcrumb + header */}
      <div className="mx-auto w-full max-w-5xl space-y-6">
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

      {/* Grid workspace */}
      <div>
        {/* Controls row */}
        <div className="mx-auto mb-4 flex w-full max-w-5xl items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Plantings
          </h2>
          {hasGrid && (
            <div className="flex items-center gap-1">
              <span className="mr-2 text-xs text-muted-foreground">Zoom</span>
              {(['S', 'M', 'L'] as Zoom[]).map((z) => (
                <Button
                  key={z}
                  size="sm"
                  variant={zoom === z ? 'default' : 'outline'}
                  className="h-7 w-7 p-0 text-xs"
                  onClick={() => setZoom(z)}
                >
                  {z}
                </Button>
              ))}
            </div>
          )}
        </div>

        {!hasGrid && (
          <div className="mx-auto max-w-5xl">
            <p className="text-sm text-muted-foreground">
              Set width and length on this bed to enable the layout designer.
            </p>
          </div>
        )}

        {hasGrid && (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="overflow-x-auto px-4 pb-6">
              <p className="mb-2 text-xs text-muted-foreground">
                {cols} × {rows} ft &mdash; 1 cell = 1 ft &mdash; click an empty cell to add a plant
              </p>

              {/* Grid */}
              <div
                className="inline-grid gap-px bg-border"
                style={{
                  gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                  gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
                }}
              >
                {Array.from({ length: rows * cols }, (_, idx) => {
                  const x = idx % cols
                  const y = Math.floor(idx / cols)
                  const cell = occupancy[y][x]
                  const cellKey = `${x}-${y}`
                  const isInHoverFootprint = hoverFootprintCells.has(cellKey)
                  const isFlashing = flashingCells.has(cellKey)

                  if (cell.kind === 'empty') {
                    return (
                      <EmptyCell
                        key={cellKey}
                        x={x} y={y} cellSize={cellSize}
                        isInHoverFootprint={isInHoverFootprint}
                        isValidDrop={isValidDrop}
                        isFlashing={isFlashing}
                        onClick={() => handleCellClick(x, y)}
                      />
                    )
                  }

                  const isDraggingSource = draggingPlantingId === cell.planting.id

                  if (cell.kind === 'continuation') {
                    return (
                      <GridContinuationCell
                        key={cellKey}
                        x={x} y={y} planting={cell.planting} cellSize={cellSize}
                        isDraggingSource={isDraggingSource}
                        isInHoverFootprint={isInHoverFootprint}
                        isValidDrop={isValidDrop}
                        isFlashing={isFlashing}
                      />
                    )
                  }

                  // anchor cell
                  return (
                    <GridAnchorCell
                      key={cellKey}
                      x={x} y={y} planting={cell.planting} cellSize={cellSize}
                      isDraggingSource={isDraggingSource}
                      isInHoverFootprint={isInHoverFootprint}
                      isValidDrop={isValidDrop}
                      isFlashing={isFlashing}
                      isLockAnimating={lockAnimating.has(cell.planting.id)}
                      isSelected={selectedPlantingId === cell.planting.id}
                      onDelete={() => handleDelete(cell.planting)}
                      onLock={() => handleLock(cell.planting)}
                      onUnlock={() => handleUnlock(cell.planting)}
                      onSelect={() => {
                        setSelectedPlantingId(cell.planting.id)
                        console.log('open panel', cell.planting.id)
                      }}
                      onClickUnlocked={() => setSelectedPlantingId(null)}
                    />
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
                {Object.entries(TYPE_COLORS).map(([type, colors]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className={`h-3 w-3 rounded-sm border ${colors.bg} ${colors.border}`} />
                    <span className="text-xs capitalize text-muted-foreground">{type}</span>
                  </div>
                ))}
              </div>
            </div>

            <DragOverlay>
              {draggingPlanting ? (
                <DragOverlayCell planting={draggingPlanting} cellSize={cellSize} />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Plant picker dialog */}
      <PlantPicker
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false)
          setPendingCell(null)
        }}
        onSelect={handlePlantSelect}
      />
    </div>
  )
}
