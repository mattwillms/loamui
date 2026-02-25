import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSchedules } from '@/api/schedules'
import type { Schedule, ScheduleType } from '@/types/schedule'

// ── Type colors ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<ScheduleType, string> = {
  water:     'bg-blue-500',
  fertilize: 'bg-green-500',
  spray:     'bg-yellow-500',
  prune:     'bg-orange-500',
  harvest:   'bg-emerald-500',
}

const TYPE_LABELS: Record<ScheduleType, string> = {
  water:     'Water',
  fertilize: 'Fertilize',
  spray:     'Spray',
  prune:     'Prune',
  harvest:   'Harvest',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDateHeader(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function getScopeLabel(schedule: Schedule): string {
  if (schedule.planting_id !== null) return `Planting #${schedule.planting_id}`
  if (schedule.bed_id !== null) return `Bed #${schedule.bed_id}`
  if (schedule.garden_id !== null) return `Garden #${schedule.garden_id}`
  return '—'
}

function groupByDate(schedules: Schedule[]): Map<string, Schedule[]> {
  const map = new Map<string, Schedule[]>()
  for (const s of schedules) {
    if (s.next_due === null) continue
    const existing = map.get(s.next_due) ?? []
    existing.push(s)
    map.set(s.next_due, existing)
  }
  return map
}

// ── Row ────────────────────────────────────────────────────────────────────────

function ScheduleRow({ schedule }: { schedule: Schedule }) {
  const type = schedule.schedule_type
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      {/* Type dot */}
      <span
        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${TYPE_COLORS[type]}`}
        aria-hidden="true"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">{TYPE_LABELS[type]}</span>
          <span className="text-sm text-muted-foreground">{getScopeLabel(schedule)}</span>
          {schedule.auto_adjusted && (
            <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
              Weather adjusted
            </Badge>
          )}
        </div>
        {schedule.notes && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{schedule.notes}</p>
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function SchedulePage() {
  const dueBefore = new Date()
  dueBefore.setDate(dueBefore.getDate() + 14)
  const dueBeforeISO = dueBefore.toISOString().split('T')[0]

  const { data: schedules, isLoading, isError } = useSchedules({ due_before: dueBeforeISO })

  const grouped = schedules ? groupByDate(schedules) : new Map<string, Schedule[]>()
  const sortedDates = Array.from(grouped.keys()).sort()
  const hasItems = sortedDates.length > 0

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Heading */}
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">Upcoming tasks</p>
      </div>

      {/* States */}
      {isLoading && (
        <p className="text-center text-sm text-muted-foreground">Loading schedule…</p>
      )}

      {isError && (
        <p className="text-center text-sm text-muted-foreground">Could not load schedule.</p>
      )}

      {!isLoading && !isError && !hasItems && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <p className="text-sm font-medium text-foreground">No tasks scheduled.</p>
            <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
              Add watering, fertilizer, or treatment schedules to your plantings.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Grouped schedule list */}
      {!isLoading && !isError && hasItems && (
        <div className="space-y-6">
          {sortedDates.map((dateStr) => (
            <div key={dateStr}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {formatDateHeader(dateStr)}
              </h2>
              <div className="rounded-lg border border-border bg-card px-4">
                {grouped.get(dateStr)!.map((schedule) => (
                  <ScheduleRow key={schedule.id} schedule={schedule} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
