import { Snowflake, Flame, X } from 'lucide-react'

interface AlertBannerProps {
  type: 'frost' | 'heat'
  temp: number | null
  onDismiss: () => void
}

export function AlertBanner({ type, temp, onDismiss }: AlertBannerProps) {
  const tempDisplay = temp !== null ? `${temp}°F` : 'unknown'

  if (type === 'frost') {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-indigo-900">
        <Snowflake className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" aria-hidden="true" />
        <p className="flex-1 text-sm">
          <span className="font-medium">Frost warning tonight</span>
          {' — '}forecast low: {tempDisplay}. Consider covering sensitive plants.
        </p>
        <button
          onClick={onDismiss}
          aria-label="Dismiss frost warning"
          className="ml-1 rounded p-0.5 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
      <Flame className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
      <p className="flex-1 text-sm">
        <span className="font-medium">Heat advisory today</span>
        {' — '}forecast high: {tempDisplay}. Water early and provide shade for sensitive plants.
      </p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss heat advisory"
        className="ml-1 rounded p-0.5 text-amber-400 hover:bg-amber-100 hover:text-amber-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
