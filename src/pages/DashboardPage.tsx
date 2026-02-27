import { useState } from 'react'
import { useNavigate } from 'react-router'
import { LayoutGrid, Leaf, Sprout, CalendarDays, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/store/authStore'
import { useWeatherCurrent } from '@/api/weather'
import { AlertBanner } from '@/components/AlertBanner'
import { useSeasonalTasks } from '@/api/recommendations'
import { useStats } from '@/api/users'
import type { ElementType } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  icon: ElementType
  description?: string
}

function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="rounded-md bg-primary/10 p-1.5">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {description !== undefined && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

const URGENCY_COLORS: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-green-500',
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [dismissedFrost, setDismissedFrost] = useState(false)
  const [dismissedHeat, setDismissedHeat] = useState(false)

  const { data: weather } = useWeatherCurrent()
  const { data: seasonal } = useSeasonalTasks()
  const { data: stats } = useStats()

  const firstName = user?.first_name ?? 'there'

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">
          {getGreeting()}, {firstName}.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's what's growing.</p>
      </div>

      {/* Weather alerts */}
      {(weather?.frost_warning && !dismissedFrost) || (weather?.high_temp_f != null && weather.high_temp_f >= 95 && !dismissedHeat) ? (
        <div className="space-y-2">
          {weather?.frost_warning && !dismissedFrost && (
            <AlertBanner type="frost" temp={weather.low_temp_f} onDismiss={() => setDismissedFrost(true)} />
          )}
          {weather?.high_temp_f != null && weather.high_temp_f >= 95 && !dismissedHeat && (
            <AlertBanner type="heat" temp={weather.high_temp_f} onDismiss={() => setDismissedHeat(true)} />
          )}
        </div>
      ) : null}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Gardens"
          value={stats?.gardens ?? 0}
          icon={LayoutGrid}
          description="No gardens yet"
        />
        <StatCard
          title="Total Beds"
          value={stats?.beds ?? 0}
          icon={Leaf}
          description="Across all gardens"
        />
        <StatCard
          title="Active Plantings"
          value={stats?.active_plantings ?? 0}
          icon={Sprout}
          description="Currently growing"
        />
        <StatCard
          title="Tasks Due Today"
          value={stats?.tasks_due_today ?? 0}
          icon={CalendarDays}
          description="All clear for now"
        />
      </div>

      {/* Seasonal tasks */}
      {seasonal && !seasonal.zone_missing && seasonal.tasks.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            This Month in Your Garden
            <span className="ml-2 font-normal text-muted-foreground">
              — {MONTH_NAMES[seasonal.month]} · Zone {seasonal.zone}
            </span>
          </h2>
          <div className="space-y-2">
            {seasonal.tasks.slice(0, 6).map((task, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${URGENCY_COLORS[task.urgency] ?? 'bg-muted'}`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug text-foreground">{task.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{task.description}</p>
                </div>
                <Badge variant="outline" className="ml-auto shrink-0 text-xs capitalize">
                  {task.task_type}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
      {seasonal?.zone_missing && (
        <p className="text-sm text-muted-foreground">
          Set your hardiness zone in your profile to see seasonal gardening tasks.
        </p>
      )}

      {/* Empty state */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-16 text-center">
          {/* Seedling illustration */}
          <div className="mb-5 text-primary/40">
            <svg
              width="52"
              height="52"
              viewBox="0 0 52 52"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M26 44V22"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M26 30C26 30 12 26 14 14C14 14 28 16 26 30Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                fill="currentColor"
                fillOpacity="0.12"
              />
              <path
                d="M26 38C26 38 40 34 38 22C38 22 24 24 26 38Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                fill="currentColor"
                fillOpacity="0.12"
              />
              <path
                d="M14 44H38"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeOpacity="0.35"
              />
            </svg>
          </div>

          <h2 className="text-base font-medium text-foreground">No gardens yet</h2>
          <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
            Add your first garden to start tracking beds, plantings, and schedules.
          </p>
          <Button
            className="mt-6"
            onClick={() => { navigate('/gardens') }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add your first garden
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
