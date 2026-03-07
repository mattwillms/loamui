import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePlants } from '@/api/plants'
import type { PlantSummary, PlantListParams } from '@/types/plant'

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

function getTypeColor(plantType: string | null) {
  return plantType ? (TYPE_COLORS[plantType.toLowerCase()] ?? DEFAULT_COLOR) : DEFAULT_COLOR
}

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

export interface PlantPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (plant: PlantSummary) => void
}

export function PlantPicker({ open, onClose, onSelect }: PlantPickerProps) {
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
