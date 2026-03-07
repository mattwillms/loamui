import { useCallback, useState } from 'react'
import { Container, Graphics, Text } from 'pixi.js'
import { Application, extend, useApplication } from '@pixi/react'
import type { Garden } from '@/types/garden'
import type { GardenPlanting } from '@/types/garden'
import type { Bed } from '@/types/bed'

extend({ Container, Graphics, Text })

const PIXELS_PER_FOOT = 48

const TYPE_COLORS: Record<string, number> = {
  vegetable: 0x86efac,
  herb:      0x6ee7b7,
  tree:      0xd6d3d1,
  shrub:     0xbef264,
  annual:    0xc4b5fd,
  perennial: 0x93c5fd,
  fruit:     0xfdba74,
  flower:    0xf9a8d4,
}
const DEFAULT_COLOR = 0xcbd5e1

function getColor(plantType: string | null): number {
  return plantType ? (TYPE_COLORS[plantType.toLowerCase()] ?? DEFAULT_COLOR) : DEFAULT_COLOR
}

interface GardenCanvasProps {
  garden: Garden
  beds: Bed[]
  plantings: GardenPlanting[]
  onPlantingSelect: (planting: GardenPlanting) => void
  onCanvasClick: (x: number, y: number) => void
  drawMode: boolean
  onBedDrawn: (boundary: Array<{x: number, y: number}>) => void
}

// ── Background grid ──────────────────────────────────────────────────────────

function BackgroundGrid({ width, height }: { width: number; height: number }) {
  const draw = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    g.rect(0, 0, width, height).fill(0xF5EFE6)

    for (let x = 0; x <= width; x += PIXELS_PER_FOOT) {
      g.moveTo(x, 0).lineTo(x, height).stroke({ color: 0xE8DDD0, width: 1 })
    }
    for (let y = 0; y <= height; y += PIXELS_PER_FOOT) {
      g.moveTo(0, y).lineTo(width, y).stroke({ color: 0xE8DDD0, width: 1 })
    }
  }, [width, height])

  return <pixiGraphics draw={draw} />
}

// ── Bed polygon ──────────────────────────────────────────────────────────────

function BedPolygon({ bed }: { bed: Bed }) {
  const boundary = bed.boundary
  if (!boundary || boundary.length < 3) return null

  const draw = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    const pts = boundary.map(v => ({ x: v.x * PIXELS_PER_FOOT, y: v.y * PIXELS_PER_FOOT }))
    const flat = pts.flatMap(p => [p.x, p.y])
    g.poly(flat).fill({ color: 0xC4956A, alpha: 0.5 })
    g.poly(flat).stroke({ color: 0x8B6347, width: 2 })
  }, [boundary])

  // Center label in bounding box
  const xs = boundary.map(v => v.x * PIXELS_PER_FOOT)
  const ys = boundary.map(v => v.y * PIXELS_PER_FOOT)
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2

  return (
    <pixiContainer>
      <pixiGraphics draw={draw} />
      <pixiText
        text={bed.name}
        x={cx}
        y={cy}
        anchor={0.5}
        style={{
          fontSize: 11,
          fill: 0xffffff,
          dropShadow: {
            color: 0x4a3728,
            blur: 2,
            distance: 1,
          },
        }}
      />
    </pixiContainer>
  )
}

// ── Plant footprint (faded spacing circle) ───────────────────────────────────

function PlantFootprint({ planting }: { planting: GardenPlanting }) {
  if (planting.pos_x == null || planting.pos_y == null) return null

  const color = getColor(planting.plant_type)
  const spacingRadius = Math.max(14, ((planting.spacing_inches ?? 12) / 24) * PIXELS_PER_FOOT)
  const sx = planting.pos_x * PIXELS_PER_FOOT
  const sy = planting.pos_y * PIXELS_PER_FOOT

  const draw = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    g.circle(sx, sy, spacingRadius).fill({ color, alpha: 0.15 })
  }, [sx, sy, spacingRadius, color])

  return <pixiGraphics draw={draw} />
}

// ── Plant marker ─────────────────────────────────────────────────────────────

function PlantMarker({
  planting,
  onSelect,
}: {
  planting: GardenPlanting
  onSelect: () => void
}) {
  if (planting.pos_x == null || planting.pos_y == null) return null

  const [hovered, setHovered] = useState(false)
  const color = getColor(planting.plant_type)
  const sx = planting.pos_x * PIXELS_PER_FOOT
  const sy = planting.pos_y * PIXELS_PER_FOOT
  const label = (planting.common_name ?? '?').split(' ')[0]

  const draw = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    g.circle(0, 0, 10).fill(color)
    g.circle(0, 0, 10).stroke({ color: 0x2d2d2d, width: 1.5 })
  }, [color])

  return (
    <pixiContainer
      x={sx}
      y={sy}
      scale={hovered ? 1.15 : 1}
      eventMode="static"
      cursor="pointer"
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onPointerDown={onSelect}
    >
      <pixiGraphics draw={draw} />
      <pixiText
        text={label}
        y={14}
        anchor={{ x: 0.5, y: 0 }}
        style={{ fontSize: 9, fill: 0x2d2d2d }}
      />
    </pixiContainer>
  )
}

// ── Draw mode overlay ────────────────────────────────────────────────────────

function DrawOverlay({
  vertices,
  onVertexAdd,
  onClose,
}: {
  vertices: Array<{x: number, y: number}>
  onVertexAdd: (x: number, y: number) => void
  onClose: () => void
}) {
  const { app } = useApplication()

  const draw = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    if (vertices.length === 0) return

    // Draw connecting lines (dashed effect via short segments)
    for (let i = 0; i < vertices.length - 1; i++) {
      const a = vertices[i]
      const b = vertices[i + 1]
      g.moveTo(a.x * PIXELS_PER_FOOT, a.y * PIXELS_PER_FOOT)
        .lineTo(b.x * PIXELS_PER_FOOT, b.y * PIXELS_PER_FOOT)
        .stroke({ color: 0x4a7c59, width: 2 })
    }

    // Draw vertices
    for (const v of vertices) {
      g.circle(v.x * PIXELS_PER_FOOT, v.y * PIXELS_PER_FOOT, 5).fill(0x4a7c59)
    }
  }, [vertices])

  const handleClick = useCallback((e: import('pixi.js').FederatedPointerEvent) => {
    const pos = e.global
    const x = pos.x / PIXELS_PER_FOOT
    const y = pos.y / PIXELS_PER_FOOT

    // Check if close to first vertex
    if (vertices.length >= 3) {
      const first = vertices[0]
      const dx = pos.x - first.x * PIXELS_PER_FOOT
      const dy = pos.y - first.y * PIXELS_PER_FOOT
      if (Math.sqrt(dx * dx + dy * dy) < 12) {
        onClose()
        return
      }
    }

    onVertexAdd(x, y)
  }, [vertices, onVertexAdd, onClose])

  return (
    <pixiContainer>
      <pixiGraphics draw={draw} />
      {/* Invisible hit area covering the whole canvas */}
      <pixiGraphics
        draw={useCallback((g: import('pixi.js').Graphics) => {
          g.clear()
          g.rect(0, 0, app.screen.width, app.screen.height).fill({ color: 0x000000, alpha: 0.001 })
        }, [app.screen.width, app.screen.height])}
        eventMode="static"
        cursor="crosshair"
        onPointerDown={handleClick}
      />
    </pixiContainer>
  )
}

// ── Canvas click handler ─────────────────────────────────────────────────────

function CanvasClickArea({
  width,
  height,
  onClick,
}: {
  width: number
  height: number
  onClick: (x: number, y: number) => void
}) {
  const handleClick = useCallback((e: import('pixi.js').FederatedPointerEvent) => {
    const x = e.global.x / PIXELS_PER_FOOT
    const y = e.global.y / PIXELS_PER_FOOT
    onClick(x, y)
  }, [onClick])

  return (
    <pixiGraphics
      draw={useCallback((g: import('pixi.js').Graphics) => {
        g.clear()
        g.rect(0, 0, width, height).fill({ color: 0x000000, alpha: 0.001 })
      }, [width, height])}
      eventMode="static"
      cursor="pointer"
      onPointerDown={handleClick}
    />
  )
}

// ── Main stage content ───────────────────────────────────────────────────────

function StageContent({
  beds,
  plantings,
  onPlantingSelect,
  onCanvasClick,
  drawMode,
  onBedDrawn,
  stageWidth,
  stageHeight,
}: Omit<GardenCanvasProps, 'garden'> & { stageWidth: number; stageHeight: number }) {
  const [drawVertices, setDrawVertices] = useState<Array<{x: number, y: number}>>([])

  function handleVertexAdd(x: number, y: number) {
    setDrawVertices(prev => [...prev, { x, y }])
  }

  function handleDrawClose() {
    if (drawVertices.length >= 3) {
      onBedDrawn(drawVertices)
    }
    setDrawVertices([])
  }

  // Reset draw vertices when draw mode toggles off
  if (!drawMode && drawVertices.length > 0) {
    setDrawVertices([])
  }

  return (
    <>
      <BackgroundGrid width={stageWidth} height={stageHeight} />

      {/* Beds */}
      {beds.map(bed => (
        <BedPolygon key={bed.id} bed={bed} />
      ))}

      {/* Footprints */}
      {plantings.map(p => (
        <PlantFootprint key={`fp-${p.id}`} planting={p} />
      ))}

      {/* Plant markers */}
      {plantings.map(p => (
        <PlantMarker
          key={`pm-${p.id}`}
          planting={p}
          onSelect={() => onPlantingSelect(p)}
        />
      ))}

      {/* Click area or draw mode */}
      {drawMode ? (
        <DrawOverlay
          vertices={drawVertices}
          onVertexAdd={handleVertexAdd}
          onClose={handleDrawClose}
        />
      ) : (
        <CanvasClickArea
          width={stageWidth}
          height={stageHeight}
          onClick={onCanvasClick}
        />
      )}
    </>
  )
}

// ── Exported component ───────────────────────────────────────────────────────

export function GardenCanvas(props: GardenCanvasProps) {
  const { garden } = props
  const stageWidth = (garden.canvas_width_ft ?? 0) * PIXELS_PER_FOOT
  const stageHeight = (garden.canvas_height_ft ?? 0) * PIXELS_PER_FOOT

  if (stageWidth <= 0 || stageHeight <= 0) return null

  return (
    <div className="overflow-auto rounded-lg border border-border">
      <Application
        width={stageWidth}
        height={stageHeight}
        background={0xF5EFE6}
        antialias
      >
        <StageContent
          {...props}
          stageWidth={stageWidth}
          stageHeight={stageHeight}
        />
      </Application>
    </div>
  )
}

export default GardenCanvas
