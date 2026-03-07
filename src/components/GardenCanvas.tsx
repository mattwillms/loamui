import { useCallback, useEffect, useRef, useState } from 'react'
import { Container, Graphics, Text } from 'pixi.js'
import { Application, extend, useApplication } from '@pixi/react'
import type { Garden } from '@/types/garden'
import type { GardenPlanting } from '@/types/garden'
import type { Bed } from '@/types/bed'

extend({ Container, Graphics, Text })

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
  lockedBeds: Set<number>
  lockedPlantings: Set<number>
  onBedDragEnd: (bedId: number, dx: number, dy: number) => void
  onPlantingDragEnd: (plantingId: number, x: number, y: number) => void
}

// ── Background grid ──────────────────────────────────────────────────────────

function BackgroundGrid({ width, height, pixelsPerFoot }: { width: number; height: number; pixelsPerFoot: number }) {
  const draw = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    g.rect(0, 0, width, height).fill(0xF5EFE6)

    for (let x = 0; x <= width; x += pixelsPerFoot) {
      g.moveTo(x, 0).lineTo(x, height).stroke({ color: 0xE8DDD0, width: 1 })
    }
    for (let y = 0; y <= height; y += pixelsPerFoot) {
      g.moveTo(0, y).lineTo(width, y).stroke({ color: 0xE8DDD0, width: 1 })
    }
  }, [width, height, pixelsPerFoot])

  return <pixiGraphics draw={draw} />
}

// ── Bed polygon ──────────────────────────────────────────────────────────────

function BedPolygon({
  bed,
  pixelsPerFoot,
  locked,
  onDragEnd,
}: {
  bed: Bed
  pixelsPerFoot: number
  locked: boolean
  onDragEnd: (dx: number, dy: number) => void
}) {
  const boundary = bed.boundary
  if (!boundary || boundary.length < 3) return null

  const dragStartRef = useRef<{x: number, y: number} | null>(null)
  const [dragOffset, setDragOffset] = useState<{x: number, y: number}>({x: 0, y: 0})
  const draggingRef = useRef(false)

  const draw = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    const pts = boundary.map(v => ({ x: v.x * pixelsPerFoot, y: v.y * pixelsPerFoot }))
    const flat = pts.flatMap(p => [p.x, p.y])
    g.poly(flat).fill({ color: 0xC4956A, alpha: 0.5 })
    g.poly(flat).stroke({ color: locked ? 0x666666 : 0x8B6347, width: 2 })
  }, [boundary, pixelsPerFoot, locked])

  // Center label in bounding box
  const xs = boundary.map(v => v.x * pixelsPerFoot)
  const ys = boundary.map(v => v.y * pixelsPerFoot)
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2

  const handlePointerDown = useCallback((e: import('pixi.js').FederatedPointerEvent) => {
    if (locked) return
    e.stopPropagation()
    dragStartRef.current = { x: e.global.x, y: e.global.y }
    draggingRef.current = false
  }, [locked])

  const handlePointerMove = useCallback((e: import('pixi.js').FederatedPointerEvent) => {
    if (!dragStartRef.current) return
    const dx = e.global.x - dragStartRef.current.x
    const dy = e.global.y - dragStartRef.current.y
    if (!draggingRef.current && Math.abs(dx) + Math.abs(dy) < 3) return
    draggingRef.current = true
    setDragOffset({ x: dx, y: dy })
  }, [])

  const handlePointerUp = useCallback(() => {
    if (draggingRef.current) {
      onDragEnd(dragOffset.x / pixelsPerFoot, dragOffset.y / pixelsPerFoot)
    }
    dragStartRef.current = null
    draggingRef.current = false
    setDragOffset({ x: 0, y: 0 })
  }, [dragOffset, pixelsPerFoot, onDragEnd])

  return (
    <pixiContainer
      x={dragOffset.x}
      y={dragOffset.y}
      eventMode="static"
      cursor={locked ? 'default' : 'grab'}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerUpOutside={handlePointerUp}
    >
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

function PlantFootprint({ planting, pixelsPerFoot }: { planting: GardenPlanting; pixelsPerFoot: number }) {
  if (planting.pos_x == null || planting.pos_y == null) return null

  const color = getColor(planting.plant_type)
  const spacingRadius = Math.max(14, ((planting.spacing_inches ?? 12) / 24) * pixelsPerFoot)
  const sx = planting.pos_x * pixelsPerFoot
  const sy = planting.pos_y * pixelsPerFoot

  const draw = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    g.circle(sx, sy, spacingRadius).fill({ color, alpha: 0.15 })
  }, [sx, sy, spacingRadius, color])

  return <pixiGraphics draw={draw} />
}

// ── Plant marker ─────────────────────────────────────────────────────────────

function PlantMarker({
  planting,
  pixelsPerFoot,
  locked,
  onSelect,
  onDragEnd,
  justSelectedRef,
}: {
  planting: GardenPlanting
  pixelsPerFoot: number
  locked: boolean
  onSelect: () => void
  onDragEnd: (x: number, y: number) => void
  justSelectedRef: React.MutableRefObject<boolean>
}) {
  if (planting.pos_x == null || planting.pos_y == null) return null

  const [hovered, setHovered] = useState(false)
  const color = getColor(planting.plant_type)
  const sx = planting.pos_x * pixelsPerFoot
  const sy = planting.pos_y * pixelsPerFoot
  const label = (planting.common_name ?? '?').split(' ')[0]

  const dragStartRef = useRef<{x: number, y: number} | null>(null)
  const [dragOffset, setDragOffset] = useState<{x: number, y: number}>({x: 0, y: 0})
  const draggingRef = useRef(false)

  const draw = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    g.circle(0, 0, 10).fill(color)
    g.circle(0, 0, 10).stroke({ color: locked ? 0x666666 : 0x2d2d2d, width: locked ? 2 : 1.5 })
  }, [color, locked])

  const handlePointerDown = useCallback((e: import('pixi.js').FederatedPointerEvent) => {
    e.stopPropagation()
    justSelectedRef.current = true
    dragStartRef.current = { x: e.global.x, y: e.global.y }
    draggingRef.current = false
  }, [justSelectedRef])

  const handlePointerMove = useCallback((e: import('pixi.js').FederatedPointerEvent) => {
    if (!dragStartRef.current || locked) return
    const dx = e.global.x - dragStartRef.current.x
    const dy = e.global.y - dragStartRef.current.y
    if (!draggingRef.current && Math.abs(dx) + Math.abs(dy) < 3) return
    draggingRef.current = true
    setDragOffset({ x: dx, y: dy })
  }, [locked])

  const handlePointerUp = useCallback(() => {
    if (draggingRef.current) {
      const newX = (sx + dragOffset.x) / pixelsPerFoot
      const newY = (sy + dragOffset.y) / pixelsPerFoot
      onDragEnd(newX, newY)
    } else {
      onSelect()
    }
    dragStartRef.current = null
    draggingRef.current = false
    setDragOffset({ x: 0, y: 0 })
  }, [sx, sy, dragOffset, pixelsPerFoot, onDragEnd, onSelect])

  return (
    <pixiContainer
      x={sx + dragOffset.x}
      y={sy + dragOffset.y}
      scale={hovered ? 1.15 : 1}
      eventMode="static"
      cursor={locked ? 'pointer' : 'grab'}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerUpOutside={handlePointerUp}
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
  pixelsPerFoot,
  onVertexAdd,
  onClose,
}: {
  vertices: Array<{x: number, y: number}>
  pixelsPerFoot: number
  onVertexAdd: (x: number, y: number) => void
  onClose: () => void
}) {
  const { app } = useApplication()

  const draw = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    if (vertices.length === 0) return

    // Draw connecting lines
    for (let i = 0; i < vertices.length - 1; i++) {
      const a = vertices[i]
      const b = vertices[i + 1]
      g.moveTo(a.x * pixelsPerFoot, a.y * pixelsPerFoot)
        .lineTo(b.x * pixelsPerFoot, b.y * pixelsPerFoot)
        .stroke({ color: 0x4a7c59, width: 2 })
    }

    // Draw vertices
    for (const v of vertices) {
      g.circle(v.x * pixelsPerFoot, v.y * pixelsPerFoot, 5).fill(0x4a7c59)
    }
  }, [vertices, pixelsPerFoot])

  const handleClick = useCallback((e: import('pixi.js').FederatedPointerEvent) => {
    const pos = e.global
    const x = pos.x / pixelsPerFoot
    const y = pos.y / pixelsPerFoot

    // Check if close to first vertex
    if (vertices.length >= 3) {
      const first = vertices[0]
      const dx = pos.x - first.x * pixelsPerFoot
      const dy = pos.y - first.y * pixelsPerFoot
      if (Math.sqrt(dx * dx + dy * dy) < 12) {
        onClose()
        return
      }
    }

    onVertexAdd(x, y)
  }, [vertices, pixelsPerFoot, onVertexAdd, onClose])

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
  pixelsPerFoot,
  onClick,
  justSelectedRef,
}: {
  width: number
  height: number
  pixelsPerFoot: number
  onClick: (x: number, y: number) => void
  justSelectedRef: React.MutableRefObject<boolean>
}) {
  const handleClick = useCallback((e: import('pixi.js').FederatedPointerEvent) => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false
      return
    }
    const x = e.global.x / pixelsPerFoot
    const y = e.global.y / pixelsPerFoot
    onClick(x, y)
  }, [pixelsPerFoot, onClick, justSelectedRef])

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
  lockedBeds,
  lockedPlantings,
  onBedDragEnd,
  onPlantingDragEnd,
  stageWidth,
  stageHeight,
  pixelsPerFoot,
}: Omit<GardenCanvasProps, 'garden'> & { stageWidth: number; stageHeight: number; pixelsPerFoot: number }) {
  const [drawVertices, setDrawVertices] = useState<Array<{x: number, y: number}>>([])
  const justSelectedRef = useRef(false)

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
      <BackgroundGrid width={stageWidth} height={stageHeight} pixelsPerFoot={pixelsPerFoot} />

      {/* Beds */}
      {beds.map(bed => (
        <BedPolygon
          key={bed.id}
          bed={bed}
          pixelsPerFoot={pixelsPerFoot}
          locked={lockedBeds.has(bed.id)}
          onDragEnd={(dx, dy) => onBedDragEnd(bed.id, dx, dy)}
        />
      ))}

      {/* Footprints */}
      {plantings.map(p => (
        <PlantFootprint key={`fp-${p.id}`} planting={p} pixelsPerFoot={pixelsPerFoot} />
      ))}

      {/* Plant markers */}
      {plantings.map(p => (
        <PlantMarker
          key={`pm-${p.id}`}
          planting={p}
          pixelsPerFoot={pixelsPerFoot}
          locked={lockedPlantings.has(p.id)}
          onSelect={() => onPlantingSelect(p)}
          onDragEnd={(x, y) => onPlantingDragEnd(p.id, x, y)}
          justSelectedRef={justSelectedRef}
        />
      ))}

      {/* Click area or draw mode */}
      {drawMode ? (
        <DrawOverlay
          vertices={drawVertices}
          pixelsPerFoot={pixelsPerFoot}
          onVertexAdd={handleVertexAdd}
          onClose={handleDrawClose}
        />
      ) : (
        <CanvasClickArea
          width={stageWidth}
          height={stageHeight}
          pixelsPerFoot={pixelsPerFoot}
          onClick={onCanvasClick}
          justSelectedRef={justSelectedRef}
        />
      )}
    </>
  )
}

// ── Exported component ───────────────────────────────────────────────────────

export function GardenCanvas(props: GardenCanvasProps) {
  const { garden } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setContainerWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const gardenW = garden.canvas_width_ft ?? 1
  const gardenH = garden.canvas_height_ft ?? 1
  const pixelsPerFoot = containerWidth / gardenW
  const stageWidth = containerWidth
  const stageHeight = gardenH * pixelsPerFoot

  if (gardenW <= 0 || gardenH <= 0) return null

  return (
    <div ref={containerRef} className="w-full rounded-lg border border-border overflow-hidden">
      <Application
        key={`${stageWidth}x${stageHeight}`}
        width={stageWidth}
        height={stageHeight}
        background={0xF5EFE6}
        antialias
      >
        <StageContent
          {...props}
          stageWidth={stageWidth}
          stageHeight={stageHeight}
          pixelsPerFoot={pixelsPerFoot}
        />
      </Application>
    </div>
  )
}

export default GardenCanvas
