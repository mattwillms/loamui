import { Sprout } from 'lucide-react'

/**
 * Decorative plant image placeholder with a repeating diagonal Sprout tile pattern.
 */
export function PlantPlaceholder({
  className = 'h-40 w-full',
  iconClassName = 'h-10 w-10',
}: {
  className?: string
  iconClassName?: string
}) {
  return (
    <div className={`relative overflow-hidden bg-primary/5 ${className}`}>
      <div
        className="pointer-events-none absolute -inset-1/2 grid grid-cols-6 gap-5 opacity-[0.12]"
        style={{ transform: 'rotate(-25deg)' }}
      >
        {Array.from({ length: 48 }).map((_, i) => (
          <Sprout key={i} className="h-5 w-5 text-primary" />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Sprout className={`${iconClassName} text-primary/30`} />
      </div>
    </div>
  )
}
