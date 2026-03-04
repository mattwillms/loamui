import tilePng from '@/assets/tile.png'

/**
 * Decorative plant image placeholder with a repeating tile background.
 */
export function PlantPlaceholder({ className = 'h-40 w-full' }: { className?: string }) {
  return (
    <div
      className={`bg-primary/5 ${className}`}
      style={{
        backgroundImage: `url(${tilePng})`,
        backgroundRepeat: 'repeat',
        backgroundSize: 'auto',
      }}
    />
  )
}
