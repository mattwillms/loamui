import { useState, useEffect } from 'react'
import { X, Lock, LockOpen, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateBedById, useDeleteBed } from '@/api/beds'
import type { Bed } from '@/types/bed'

const BED_COLORS = [
  '#C4956A', '#8B6347', '#a3b18a', '#588157',
  '#3a5a40', '#dad7cd', '#b5838d', '#6d6875',
  '#e9c46a', '#f4a261', '#e76f51', '#264653',
]

interface Props {
  bed: Bed
  gardenId: number
  onClose: () => void
}

export function BedPanel({ bed, gardenId, onClose }: Props) {
  const [visible, setVisible] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [name, setName] = useState(bed.name)
  const [notes, setNotes] = useState(bed.notes ?? '')

  const updateBed = useUpdateBedById(gardenId)
  const deleteBed = useDeleteBed(gardenId)

  useEffect(() => {
    setName(bed.name)
    setNotes(bed.notes ?? '')
    setConfirmDelete(false)
  }, [bed.id])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  async function handleNameSave() {
    if (name === bed.name || !name.trim()) return
    try {
      await updateBed.mutateAsync({ bedId: bed.id, data: { name: name.trim() } })
    } catch {
      toast.error('Failed to rename bed.')
    }
  }

  async function handleNotesSave() {
    if (notes === (bed.notes ?? '')) return
    try {
      await updateBed.mutateAsync({ bedId: bed.id, data: { notes } })
    } catch {
      toast.error('Failed to save notes.')
    }
  }

  async function handleColorChange(color: string | null) {
    try {
      await updateBed.mutateAsync({ bedId: bed.id, data: { color } })
    } catch {
      toast.error('Failed to update color.')
    }
  }

  async function handleToggleLock() {
    try {
      await updateBed.mutateAsync({ bedId: bed.id, data: { is_locked: !bed.is_locked } })
    } catch {
      toast.error('Failed to toggle lock.')
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    try {
      await deleteBed.mutateAsync(bed.id)
      onClose()
    } catch {
      toast.error('Failed to delete bed.')
    }
  }

  return (
    <div
      className={`fixed right-0 bottom-0 z-30 flex w-80 flex-col bg-card border-l border-border shadow-xl transition-transform duration-300 ${visible ? 'translate-x-0' : 'translate-x-full'}`}
      style={{ top: '64px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-4 w-4 flex-none rounded"
            style={{ backgroundColor: bed.color ?? '#C4956A' }}
          />
          <p className="truncate text-sm font-semibold text-foreground">{bed.name}</p>
        </div>
        <button className="flex-none rounded p-1 hover:bg-muted" onClick={onClose}>
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Name */}
        <div className="border-b border-border p-4">
          <Label className="mb-1 block text-xs text-muted-foreground">Name</Label>
          <Input
            className="h-8 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameSave}
          />
        </div>

        {/* Notes */}
        <div className="border-b border-border p-4">
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

        {/* Dimensions */}
        {(bed.width_ft || bed.length_ft) && (
          <div className="border-b border-border p-4">
            <p className="text-xs text-muted-foreground">Dimensions</p>
            <p className="text-sm text-foreground">
              {bed.width_ft ?? '—'} × {bed.length_ft ?? '—'} ft
            </p>
          </div>
        )}

        {/* Color */}
        <div className="border-b border-border p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Bed Color
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {BED_COLORS.map((c) => (
              <button
                key={c}
                className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  bed.color === c ? 'border-foreground scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
                onClick={() => handleColorChange(bed.color === c ? null : c)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-2 border-t border-border p-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={handleToggleLock}
          disabled={updateBed.isPending}
        >
          {bed.is_locked ? (
            <><LockOpen className="h-3.5 w-3.5" /> Unlock bed</>
          ) : (
            <><Lock className="h-3.5 w-3.5" /> Lock bed</>
          )}
        </Button>
        <Button
          variant={confirmDelete ? 'destructive' : 'outline'}
          size="sm"
          className="w-full gap-1.5"
          onClick={handleDelete}
          disabled={deleteBed.isPending}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {confirmDelete ? 'Confirm delete' : 'Delete bed'}
        </Button>
        {confirmDelete && (
          <button
            className="text-center text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setConfirmDelete(false)}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
