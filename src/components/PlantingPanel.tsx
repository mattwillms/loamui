import { useState, useEffect } from 'react'
import { X, ChevronDown, ChevronRight, LockOpen, Trash2, Leaf } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  useUpdatePlanting,
  useDeletePlanting,
  useCreateWateringLog,
  useCreateTreatmentLog,
} from '@/api/plantings'
import { useSchedules } from '@/api/schedules'
import { useCreateJournalEntry } from '@/api/journal'
import type { Planting, PlantingStatus } from '@/types/planting'

const STATUS_OPTIONS: { value: PlantingStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'seedling', label: 'Seedling' },
  { value: 'growing', label: 'Growing' },
  { value: 'flowering', label: 'Flowering' },
  { value: 'fruiting', label: 'Fruiting' },
  { value: 'harvesting', label: 'Harvesting' },
  { value: 'dormant', label: 'Dormant' },
  { value: 'removed', label: 'Removed' },
]

const WATERING_METHODS = [
  { value: 'drip', label: 'Drip' },
  { value: 'hand', label: 'Hand' },
  { value: 'sprinkler', label: 'Sprinkler' },
  { value: 'soaker', label: 'Soaker' },
  { value: 'other', label: 'Other' },
]

const TREATMENT_TYPES = [
  { value: 'herbicide', label: 'Herbicide' },
  { value: 'insecticide', label: 'Insecticide' },
  { value: 'fungicide', label: 'Fungicide' },
  { value: 'fertilizer', label: 'Fertilizer' },
  { value: 'amendment', label: 'Amendment' },
]

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

interface Props {
  planting: Planting
  bedId: number
  gardenId: number
  bedName: string
  onClose: () => void
}

export function PlantingPanel({ planting, bedId, gardenId, bedName, onClose }: Props) {
  const [visible, setVisible] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [notes, setNotes] = useState(planting.notes ?? '')

  // Collapsible sections — schedules open by default
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['schedules']))

  // Watering form
  const [waterDate, setWaterDate] = useState(todayISO())
  const [waterAmount, setWaterAmount] = useState('')
  const [waterDuration, setWaterDuration] = useState('')
  const [waterMethod, setWaterMethod] = useState('')

  // Treatment form
  const [treatDate, setTreatDate] = useState(todayISO())
  const [treatType, setTreatType] = useState('')
  const [treatProduct, setTreatProduct] = useState('')
  const [treatAmount, setTreatAmount] = useState('')

  // Sync notes and reset confirm when planting changes
  useEffect(() => {
    setNotes(planting.notes ?? '')
    setConfirmRemove(false)
  }, [planting.id])

  // Slide-in animation
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const updatePlanting = useUpdatePlanting()
  const deletePlanting = useDeletePlanting()
  const createWateringLog = useCreateWateringLog()
  const createTreatmentLog = useCreateTreatmentLog()
  const createJournalEntry = useCreateJournalEntry()
  const { data: schedules = [] } = useSchedules({ planting_id: planting.id })

  const plantName = planting.plant?.common_name ?? 'Unknown plant'

  function fireJournal(text: string, tags: string[]) {
    createJournalEntry.mutate(
      { date: todayISO(), text, tags, garden_id: gardenId, planting_id: planting.id },
      { onError: (err) => console.log('Auto-journal failed:', err) },
    )
  }

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleStatusChange(status: PlantingStatus) {
    try {
      await updatePlanting.mutateAsync({ plantingId: planting.id, bedId, data: { status } })
      fireJournal(`${plantName} status updated to ${status}`, ['status', status])
    } catch {
      toast.error('Failed to update status.')
    }
  }

  async function handleNotesSave() {
    if (notes === (planting.notes ?? '')) return
    try {
      await updatePlanting.mutateAsync({ plantingId: planting.id, bedId, data: { notes } })
    } catch {
      toast.error('Failed to save notes.')
    }
  }

  async function handleLogWatering() {
    try {
      await createWateringLog.mutateAsync({
        planting_id: planting.id,
        date: waterDate,
        amount_inches: waterAmount ? parseFloat(waterAmount) : undefined,
        duration_minutes: waterDuration ? parseInt(waterDuration) : undefined,
        method: (waterMethod as 'drip' | 'hand' | 'sprinkler' | 'soaker' | 'other') || undefined,
      })
      let journalText = `Watered ${plantName}`
      if (waterAmount) journalText += ` — ${waterAmount}"`
      if (waterDuration) journalText += ` (${waterDuration} min)`
      fireJournal(journalText, ['watering'])
      toast.success('Watering logged.')
      setWaterAmount('')
      setWaterDuration('')
      setWaterMethod('')
    } catch {
      toast.error('Failed to log watering.')
    }
  }

  async function handleLogTreatment() {
    if (!treatType) {
      toast.error('Treatment type is required.')
      return
    }
    try {
      await createTreatmentLog.mutateAsync({
        planting_id: planting.id,
        date: treatDate,
        treatment_type: treatType as 'herbicide' | 'insecticide' | 'fungicide' | 'fertilizer' | 'amendment',
        product_name: treatProduct || undefined,
        amount: treatAmount || undefined,
      })
      let journalText = `Applied ${treatType} to ${plantName}`
      if (treatProduct) journalText += ` (${treatProduct})`
      fireJournal(journalText, ['treatment', treatType])
      toast.success('Treatment logged.')
      setTreatType('')
      setTreatProduct('')
      setTreatAmount('')
    } catch {
      toast.error('Failed to log treatment.')
    }
  }

  async function handleUnlock() {
    try {
      await updatePlanting.mutateAsync({ plantingId: planting.id, bedId, data: { is_locked: false } })
    } catch {
      toast.error('Failed to unlock planting.')
    }
  }

  async function handleRemove() {
    if (!confirmRemove) {
      setConfirmRemove(true)
      return
    }
    try {
      await deletePlanting.mutateAsync({ plantingId: planting.id, bedId })
      fireJournal(`${plantName} removed from ${bedName}`, ['removal'])
      onClose()
    } catch {
      toast.error('Failed to remove planting.')
    }
  }

  const plant = planting.plant

  return (
    <div
      className={`fixed right-0 bottom-0 z-30 flex w-80 flex-col bg-card border-l border-border shadow-xl transition-transform duration-300 ${visible ? 'translate-x-0' : 'translate-x-full'}`}
      style={{ top: '56px' }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-border p-4">
        <div className="h-10 w-10 flex-none overflow-hidden rounded-md bg-muted">
          {plant?.image_url ? (
            <img src={plant.image_url} alt={plant.common_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Leaf className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight text-foreground">
            {plant?.common_name ?? 'Unknown plant'}
          </p>
          {plant?.scientific_name && (
            <p className="truncate text-xs italic text-muted-foreground">{plant.scientific_name}</p>
          )}
          {plant?.plant_type && (
            <Badge variant="secondary" className="mt-1 text-xs capitalize">
              {plant.plant_type}
            </Badge>
          )}
        </div>

        <button className="flex-none rounded p-1 hover:bg-muted" onClick={onClose}>
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Status */}
        <div className="border-b border-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Status
          </Label>
          <Select
            value={planting.status}
            onValueChange={(v) => handleStatusChange(v as PlantingStatus)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Info */}
        <div className="space-y-3 border-b border-border p-4">
          {planting.date_planted && (
            <div>
              <p className="text-xs text-muted-foreground">Planted</p>
              <p className="text-sm text-foreground">{planting.date_planted}</p>
            </div>
          )}
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">Notes</Label>
            <Textarea
              rows={3}
              className="resize-none text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesSave}
              placeholder="Add notes…"
            />
          </div>
        </div>

        {/* Watering log */}
        <div className="border-b border-border">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-muted/50"
            onClick={() => toggleSection('watering')}
          >
            Log Watering
            {openSections.has('watering') ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {openSections.has('watering') && (
            <div className="space-y-2 px-4 pb-4">
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={waterDate}
                  onChange={(e) => setWaterDate(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="mb-1 block text-xs text-muted-foreground">Amount (in)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    className="h-8 text-sm"
                    value={waterAmount}
                    onChange={(e) => setWaterAmount(e.target.value)}
                    placeholder="0.5"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs text-muted-foreground">Duration (min)</Label>
                  <Input
                    type="number"
                    min="0"
                    className="h-8 text-sm"
                    value={waterDuration}
                    onChange={(e) => setWaterDuration(e.target.value)}
                    placeholder="15"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Method</Label>
                <Select value={waterMethod} onValueChange={setWaterMethod}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {WATERING_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={handleLogWatering}
                disabled={createWateringLog.isPending}
              >
                {createWateringLog.isPending ? 'Saving…' : 'Log Watering'}
              </Button>
            </div>
          )}
        </div>

        {/* Treatment log */}
        <div className="border-b border-border">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-muted/50"
            onClick={() => toggleSection('treatment')}
          >
            Log Treatment
            {openSections.has('treatment') ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {openSections.has('treatment') && (
            <div className="space-y-2 px-4 pb-4">
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={treatDate}
                  onChange={(e) => setTreatDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Type *</Label>
                <Select value={treatType} onValueChange={setTreatType}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TREATMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Product</Label>
                <Input
                  className="h-8 text-sm"
                  value={treatProduct}
                  onChange={(e) => setTreatProduct(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Amount</Label>
                <Input
                  className="h-8 text-sm"
                  value={treatAmount}
                  onChange={(e) => setTreatAmount(e.target.value)}
                  placeholder="e.g. 2 tbsp"
                />
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={handleLogTreatment}
                disabled={createTreatmentLog.isPending}
              >
                {createTreatmentLog.isPending ? 'Saving…' : 'Log Treatment'}
              </Button>
            </div>
          )}
        </div>

        {/* Schedules */}
        <div className="border-b border-border">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-muted/50"
            onClick={() => toggleSection('schedules')}
          >
            Schedules
            {openSections.has('schedules') ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {openSections.has('schedules') && (
            <div className="space-y-2 px-4 pb-4">
              {schedules.length === 0 ? (
                <p className="text-xs text-muted-foreground">No schedules.</p>
              ) : (
                schedules.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-start justify-between rounded bg-muted/50 px-3 py-2"
                  >
                    <div>
                      <p className="text-xs font-medium capitalize text-foreground">
                        {s.schedule_type}
                      </p>
                      {s.next_due && (
                        <p className="text-xs text-muted-foreground">Due {s.next_due}</p>
                      )}
                      {s.frequency_days && (
                        <p className="text-xs text-muted-foreground">Every {s.frequency_days}d</p>
                      )}
                    </div>
                    <Badge variant={s.is_active ? 'default' : 'secondary'} className="text-xs">
                      {s.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-2 border-t border-border p-4">
        {planting.is_locked && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={handleUnlock}
            disabled={updatePlanting.isPending}
          >
            <LockOpen className="h-3.5 w-3.5" />
            Unlock position
          </Button>
        )}
        <Button
          variant={confirmRemove ? 'destructive' : 'outline'}
          size="sm"
          className="w-full gap-1.5"
          onClick={handleRemove}
          disabled={deletePlanting.isPending}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {confirmRemove ? 'Confirm remove' : 'Remove planting'}
        </Button>
        {confirmRemove && (
          <button
            className="text-center text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setConfirmRemove(false)}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
