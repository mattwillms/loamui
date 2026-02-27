import { useState, useEffect, useRef } from 'react'
import { Pencil, Trash2, Plus, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGardens } from '@/api/gardens'
import {
  useJournalEntries,
  useCreateJournalEntry,
  useUpdateJournalEntry,
  useDeleteJournalEntry,
  useGardenPlantings,
} from '@/api/journal'
import type { JournalEntry } from '@/types/journal'

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatEntryDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function monthHeader(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function parseTags(raw: string): string[] | null {
  const tags = raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  return tags.length > 0 ? tags : null
}

function parsePhotos(raw: string): string[] | null {
  const photos = raw
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean)
  return photos.length > 0 ? photos : null
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ── Form state type ───────────────────────────────────────────────────────────

interface FormState {
  date: string
  text: string
  gardenId: string // "none" or numeric string
  plantingId: string // "none" or numeric string
  tagsRaw: string
  photosRaw: string
}

function emptyForm(): FormState {
  return {
    date: todayIso(),
    text: '',
    gardenId: 'none',
    plantingId: 'none',
    tagsRaw: '',
    photosRaw: '',
  }
}

function entryToForm(entry: JournalEntry): FormState {
  return {
    date: entry.date,
    text: entry.text,
    gardenId: entry.garden_id !== null ? String(entry.garden_id) : 'none',
    plantingId: entry.planting_id !== null ? String(entry.planting_id) : 'none',
    tagsRaw: entry.tags ? entry.tags.join(', ') : '',
    photosRaw: entry.photos ? entry.photos.join('\n') : '',
  }
}

// ── Entry form component ──────────────────────────────────────────────────────

interface EntryFormProps {
  form: FormState
  onChange: (f: FormState) => void
}

function EntryForm({ form, onChange }: EntryFormProps) {
  const { data: gardens } = useGardens()
  const selectedGardenId =
    form.gardenId !== 'none' ? Number(form.gardenId) : null
  const { data: plantings } = useGardenPlantings(selectedGardenId)

  function set(patch: Partial<FormState>) {
    onChange({ ...form, ...patch })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="entry-date">Date</Label>
        <input
          id="entry-date"
          type="date"
          value={form.date}
          onChange={(e) => set({ date: e.target.value })}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="entry-garden">Garden (optional)</Label>
        <Select
          value={form.gardenId}
          onValueChange={(v) => set({ gardenId: v, plantingId: 'none' })}
        >
          <SelectTrigger id="entry-garden">
            <SelectValue placeholder="No garden" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No garden</SelectItem>
            {gardens?.map((g) => (
              <SelectItem key={g.id} value={String(g.id)}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="entry-planting">Planting (optional)</Label>
        <Select
          value={form.plantingId}
          onValueChange={(v) => set({ plantingId: v })}
          disabled={selectedGardenId === null}
        >
          <SelectTrigger id="entry-planting">
            <SelectValue placeholder="No planting" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No planting</SelectItem>
            {plantings?.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.common_name ?? `Planting #${p.id}`} ({p.bed_name})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="entry-text">Notes</Label>
        <Textarea
          id="entry-text"
          placeholder="What happened in the garden today?"
          value={form.text}
          onChange={(e) => set({ text: e.target.value })}
          className="min-h-[100px]"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="entry-tags">Tags (comma-separated)</Label>
        <Input
          id="entry-tags"
          placeholder="e.g. harvest, pruning, pest"
          value={form.tagsRaw}
          onChange={(e) => set({ tagsRaw: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="entry-photos">Photo URLs (one per line)</Label>
        <Textarea
          id="entry-photos"
          placeholder="https://..."
          value={form.photosRaw}
          onChange={(e) => set({ photosRaw: e.target.value })}
          className="min-h-[60px] font-mono text-xs"
        />
      </div>
    </div>
  )
}

// ── Tag styling ───────────────────────────────────────────────────────────────

const TAG_STYLES: Record<string, string> = {
  watering: 'bg-blue-100 text-blue-800',
  treatment: 'bg-amber-100 text-amber-800',
  planting: 'bg-green-100 text-green-800',
  status: 'bg-slate-100 text-slate-700',
  removal: 'bg-red-100 text-red-800',
}

function TagChip({ tag }: { tag: string }) {
  const custom = TAG_STYLES[tag]
  if (custom) {
    return (
      <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-xs font-medium ${custom}`}>
        {tag}
      </span>
    )
  }
  return (
    <Badge variant="secondary" className="text-xs px-1.5 py-0">
      {tag}
    </Badge>
  )
}

// ── Entry card ────────────────────────────────────────────────────────────────

interface EntryCardProps {
  entry: JournalEntry
  onEdit: (entry: JournalEntry) => void
  onDelete: (id: number) => void
}

function EntryCard({ entry, onEdit, onDelete }: EntryCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const TRUNCATE_LEN = 200
  const needsTruncate = entry.text.length > TRUNCATE_LEN
  const displayText =
    needsTruncate && !expanded ? entry.text.slice(0, TRUNCATE_LEN) + '…' : entry.text

  const visiblePhotos = entry.photos ? entry.photos.slice(0, 3) : []
  const extraPhotos = entry.photos ? entry.photos.length - 3 : 0

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {formatEntryDate(entry.date)}
        </span>
        {entry.garden_name && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
            {entry.garden_name}
          </span>
        )}
        {entry.plant_name && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 font-medium">
            {entry.plant_name}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => onEdit(entry)}
            className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Edit entry"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {confirmDelete ? (
            <>
              <span className="text-xs text-muted-foreground">Confirm?</span>
              <button
                onClick={() => onDelete(entry.id)}
                className="rounded px-1.5 py-0.5 text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Delete entry"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Text */}
      <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {displayText}
        {needsTruncate && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="ml-1 text-primary hover:underline text-xs"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* Tags */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.tags.map((tag) => (
            <TagChip key={tag} tag={tag} />
          ))}
        </div>
      )}

      {/* Photos */}
      {visiblePhotos.length > 0 && (
        <div className="flex items-center gap-2">
          {visiblePhotos.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              <img
                src={url}
                alt={`Photo ${i + 1}`}
                className="h-20 w-20 rounded object-cover border border-border"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </a>
          ))}
          {extraPhotos > 0 && (
            <span className="text-xs text-muted-foreground">+{extraPhotos} more</span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function JournalPage() {
  const [page, setPage] = useState(1)
  const [gardenFilter, setGardenFilter] = useState<string>('all')
  const [tagInput, setTagInput] = useState('')
  const debouncedTag = useDebounce(tagInput, 300)
  const prevTagRef = useRef(debouncedTag)

  useEffect(() => {
    if (prevTagRef.current !== debouncedTag) {
      setPage(1)
      prevTagRef.current = debouncedTag
    }
  }, [debouncedTag])

  const { data: gardens } = useGardens()

  const queryParams = {
    ...(gardenFilter !== 'all' ? { garden_id: Number(gardenFilter) } : {}),
    ...(debouncedTag ? { tag: debouncedTag } : {}),
    page,
  }
  const { data, isLoading } = useJournalEntries(queryParams)

  const createEntry = useCreateJournalEntry()
  const deleteEntry = useDeleteJournalEntry()

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())

  // Update/create hooks — id is 0 when creating
  const updateEntry = useUpdateJournalEntry(editingEntry?.id ?? 0)

  function openCreate() {
    setEditingEntry(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  function openEdit(entry: JournalEntry) {
    setEditingEntry(entry)
    setForm(entryToForm(entry))
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.text.trim()) return

    const payload = {
      date: form.date,
      text: form.text.trim(),
      garden_id: form.gardenId !== 'none' ? Number(form.gardenId) : null,
      planting_id: form.plantingId !== 'none' ? Number(form.plantingId) : null,
      tags: parseTags(form.tagsRaw),
      photos: parsePhotos(form.photosRaw),
    }

    if (editingEntry) {
      await updateEntry.mutateAsync(payload)
    } else {
      await createEntry.mutateAsync(payload)
    }
    setDialogOpen(false)
  }

  async function handleDelete(id: number) {
    await deleteEntry.mutateAsync(id)
  }

  const totalPages = data ? Math.ceil(data.total / 20) : 1

  // Group entries by month
  const grouped: { month: string; entries: JournalEntry[] }[] = []
  if (data?.items) {
    for (const entry of data.items) {
      const month = monthHeader(entry.date)
      const last = grouped[grouped.length - 1]
      if (last && last.month === month) {
        last.entries.push(entry)
      } else {
        grouped.push({ month, entries: [entry] })
      }
    }
  }

  const isPending = createEntry.isPending || updateEntry.isPending

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Journal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} entr${data.total === 1 ? 'y' : 'ies'}` : 'Garden journal'}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New entry
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={gardenFilter}
          onValueChange={(v) => {
            setGardenFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All gardens" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All gardens</SelectItem>
            {gardens?.map((g) => (
              <SelectItem key={g.id} value={String(g.id)}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Filter by tag…"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          className="w-48"
        />
      </div>

      {/* Loading */}
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {/* Empty state */}
      {!isLoading && data && data.items.length === 0 && (
        <div className="flex flex-col items-center rounded-lg border border-dashed py-16 text-center">
          <div className="mb-4 rounded-full bg-primary/10 p-4">
            <BookOpen className="h-8 w-8 text-primary/60" />
          </div>
          <p className="text-base font-medium text-foreground">No journal entries yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start documenting your garden.
          </p>
          <Button className="mt-6" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add first entry
          </Button>
        </div>
      )}

      {/* Entries grouped by month */}
      {!isLoading && grouped.map(({ month, entries }) => (
        <div key={month} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {month}
          </h2>
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ))}

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit entry' : 'New journal entry'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <EntryForm form={form} onChange={setForm} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save entry'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
