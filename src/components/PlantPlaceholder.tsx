import { Sprout } from 'lucide-react'

const ICON_SPACING = 44 // px between icon centers
const GRID_SIZE = 12 // icons per row/col — enough to fill after rotation

const positions: { x: number; y: number }[] = []
for (let row = 0; row < GRID_SIZE; row++) {
  for (let col = 0; col < GRID_SIZE; col++) {
    positions.push({ x: col * ICON_SPACING, y: row * ICON_SPACING })
  }
}

/**
 * Decorative plant image placeholder with a repeating diagonal Sprout tile pattern.
 */
export function PlantPlaceholder({ className = 'h-40 w-full' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-primary/5 ${className}`}>
      <div
        className="pointer-events-none absolute -inset-1/2"
        style={{ transform: 'rotate(-20deg)' }}
      >
        {positions.map((pos, i) => (
          <Sprout
            key={i}
            className="absolute h-4 w-4 text-primary/10"
            style={{ left: pos.x, top: pos.y }}
          />
        ))}
      </div>
    </div>
  )
}
