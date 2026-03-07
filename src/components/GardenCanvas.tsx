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

function hexToPixi(hex: string | null | undefined): number | null {
  if (!hex) return null
  return parseInt(hex.replace('#', ''), 16)
}

interface GardenCanvasProps {
  garden: Garden
  beds: Bed[]
  plantings: GardenPlanting[]
  onPlantingSelect: (planting: GardenPlanting) => void
  onBedSelect: (bed: Bed) => void
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
  onSelect,
}: {
  bed: Bed
  pixelsPerFoot: number
  locked: boolean
  onDragEnd: (dx: number, dy: number) => void
  onSelect: () => void
}) {
  const boundary = bed.boundary
  if (!boundary || boundary.length < 3) return null

  const { app } = useApplication()
  const dragStartRef = useRef<{x: number, y: number} | null>(null)
  const [dragOffset, setDragOffset] = useState<{x: number, y: number}>({x: 0, y: 0})
  const draggingRef = useRef(false)
  const finalDragRef = useRef({ x: 0, y: 0 })

  // Bounding box center + top
  const xs = boundary.map(v => v.x * pixelsPerFoot)
  const ys = boundary.map(v => v.y * pixelsPerFoot)
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  const minY = Math.min(...ys)

  const draw = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    const pts = boundary.map(v => ({ x: v.x * pixelsPerFoot, y: v.y * pixelsPerFoot }))
    const flat = pts.flatMap(p => [p.x, p.y])
    const fillColor = hexToPixi(bed.color) ?? 0xC4956A
    g.poly(flat).fill({ color: fillColor, alpha: 0.5 })
    g.poly(flat).stroke({ color: locked ? 0x666666 : 0x8B6347, width: 2 })

    // Lock icon near center-top
    if (locked) {
      const bxs = pts.map(p => p.x)
      const bys = pts.map(p => p.y)
      const lx = (Math.min(...bxs) + Math.max(...bxs)) / 2
      const ly = Math.min(...bys) + 12
      g.roundRect(lx - 4, ly - 3, 8, 6, 1).fill(0xffffff)
      g.moveTo(lx - 3, ly - 3)
        .lineTo(lx - 3, ly - 6)
        .bezierCurveTo(lx - 3, ly - 10, lx + 3, ly - 10, lx + 3, ly - 6)
        .lineTo(lx + 3, ly - 3)
        .stroke({ color: 0xffffff, width: 1.5 })
    }
  }, [boundary, pixelsPerFoot, locked, bed.color])

  const handlePointerDown = useCallback((e: import('pixi.js').FederatedPointerEvent) => {
    e.stopPropagation()
    if (locked) {
      // Locked beds can still be selected on click
      onSelect()
      return
    }
    dragStartRef.current = { x: e.global.x, y: e.global.y }
    draggingRef.current = false
    finalDragRef.current = { x: 0, y: 0 }

    const onMove = (ev: import('pixi.js').FederatedPointerEvent) => {
      if (!dragStartRef.current) return
      const dx = ev.global.x - dragStartRef.current.x
      const dy = ev.global.y - dragStartRef.current.y
      if (!draggingRef.current && Math.abs(dx) + Math.abs(dy) < 4) return
      draggingRef.current = true
      finalDragRef.current = { x: dx, y: dy }
      setDragOffset({ x: dx, y: dy })
    }

    const onUp = () => {
      app.stage.off('pointermove', onMove)
      app.stage.off('pointerup', onUp)
      app.stage.off('pointerupoutside', onUp)

      if (draggingRef.current) {
        onDragEnd(finalDragRef.current.x / pixelsPerFoot, finalDragRef.current.y / pixelsPerFoot)
      } else {
        onSelect()
      }

      dragStartRef.current = null
      draggingRef.current = false
      setDragOffset({ x: 0, y: 0 })
    }

    app.stage.on('pointermove', onMove)
    app.stage.on('pointerup', onUp)
    app.stage.on('pointerupoutside', onUp)
  }, [app, locked, pixelsPerFoot, onDragEnd, onSelect])

  return (
    <pixiContainer
      x={dragOffset.x}
      y={dragOffset.y}
      eventMode="static"
      cursor={locked ? 'pointer' : 'grab'}
      onPointerDown={handlePointerDown}
    >
      <pixiGraphics draw={draw} />
      <pixiText
        text={bed.name}
        x={cx}
        y={locked ? Math.max(cy, minY + 22) : cy}
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
  onDragStart,
  onPendingStart,
  onPendingClear,
}: {
  planting: GardenPlanting
  pixelsPerFoot: number
  locked: boolean
  onSelect: () => void
  onDragEnd: (x: number, y: number) => void
  onDragStart: () => void
  onPendingStart: () => void
  onPendingClear: () => void
}) {
  if (planting.pos_x == null || planting.pos_y == null) return null

  const { app } = useApplication()
  const [hovered, setHovered] = useState(false)
  const color = hexToPixi(planting.color) ?? getColor(planting.plant_type)
  const label = (planting.common_name ?? '?').split(' ')[0]

  const dragStartRef = useRef<{x: number, y: number} | null>(null)
  const [dragOffset, setDragOffset] = useState<{x: number, y: number}>({x: 0, y: 0})
  const draggingRef = useRef(false)
  const finalDragRef = useRef({ x: 0, y: 0 })

  // Pending position to prevent snap-back
  const [pendingPos, setPendingPos] = useState<{x: number, y: number} | null>(null)

  useEffect(() => {
    if (pendingPos && planting.pos_x != null && planting.pos_y != null) {
      if (Math.abs(planting.pos_x - pendingPos.x) < 0.01 &&
          Math.abs(planting.pos_y - pendingPos.y) < 0.01) {
        setPendingPos(null)
        onPendingClear()
      }
    }
  }, [planting.pos_x, planting.pos_y, pendingPos, onPendingClear])

  const baseX = (pendingPos?.x ?? planting.pos_x!) * pixelsPerFoot
  const baseY = (pendingPos?.y ?? planting.pos_y!) * pixelsPerFoot
  const displayX = baseX + (draggingRef.current ? dragOffset.x : 0)
  const displayY = baseY + (draggingRef.current ? dragOffset.y : 0)

  const draw = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    g.circle(0, 0, 10).fill(color)
    g.circle(0, 0, 10).stroke({ color: locked ? 0x666666 : 0x2d2d2d, width: locked ? 2 : 1.5 })
    // Lock icon overlay
    if (locked) {
      g.roundRect(-3, -1, 6, 5, 1).fill(0x666666)
      g.moveTo(-2, -1).lineTo(-2, -3).bezierCurveTo(-2, -5, 2, -5, 2, -3).lineTo(2, -1)
        .stroke({ color: 0x666666, width: 1.2 })
    }
  }, [color, locked])

  const handlePointerDown = useCallback((e: import('pixi.js').FederatedPointerEvent) => {
    e.stopPropagation()
    dragStartRef.current = { x: e.global.x, y: e.global.y }
    draggingRef.current = false
    finalDragRef.current = { x: 0, y: 0 }

    const onMove = (ev: import('pixi.js').FederatedPointerEvent) => {
      if (!dragStartRef.current || locked) return
      const dx = ev.global.x - dragStartRef.current.x
      const dy = ev.global.y - dragStartRef.current.y
      if (!draggingRef.current && Math.abs(dx) + Math.abs(dy) < 4) return
      if (!draggingRef.current) {
        draggingRef.current = true
        onDragStart()
      }
      finalDragRef.current = { x: dx, y: dy }
      setDragOffset({ x: dx, y: dy })
    }

    const onUp = () => {
      app.stage.off('pointermove', onMove)
      app.stage.off('pointerup', onUp)
      app.stage.off('pointerupoutside', onUp)

      if (draggingRef.current) {
        const newX = (baseX + finalDragRef.current.x) / pixelsPerFoot
        const newY = (baseY + finalDragRef.current.y) / pixelsPerFoot
        onPendingStart()
        onDragEnd(newX, newY)
        setPendingPos({ x: newX, y: newY })
      } else {
        onSelect()
      }

      dragStartRef.current = null
      draggingRef.current = false
      setDragOffset({ x: 0, y: 0 })
    }

    app.stage.on('pointermove', onMove)
    app.stage.on('pointerup', onUp)
    app.stage.on('pointerupoutside', onUp)
  }, [app, locked, baseX, baseY, pixelsPerFoot, onDragEnd, onDragStart, onPendingStart, onSelect])

  return (
    <pixiContainer
      x={displayX}
      y={displayY}
      scale={hovered ? 1.15 : 1}
      eventMode="static"
      cursor={locked ? 'pointer' : 'grab'}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onPointerDown={handlePointerDown}
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
}: {
  width: number
  height: number
  pixelsPerFoot: number
  onClick: (x: number, y: number) => void
}) {
  const handleClick = useCallback((e: import('pixi.js').FederatedPointerEvent) => {
    const x = e.global.x / pixelsPerFoot
    const y = e.global.y / pixelsPerFoot
    onClick(x, y)
  }, [pixelsPerFoot, onClick])

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
  onBedSelect,
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
  const [draggingPlantingId, setDraggingPlantingId] = useState<number | null>(null)
  const [pendingPlantingIds, setPendingPlantingIds] = useState<Set<number>>(new Set())

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

      {/* Click area FIRST so it's underneath everything else */}
      {!drawMode && (
        <CanvasClickArea
          width={stageWidth}
          height={stageHeight}
          pixelsPerFoot={pixelsPerFoot}
          onClick={onCanvasClick}
        />
      )}

      {/* Beds */}
      {beds.map(bed => (
        <BedPolygon
          key={bed.id}
          bed={bed}
          pixelsPerFoot={pixelsPerFoot}
          locked={lockedBeds.has(bed.id)}
          onDragEnd={(dx, dy) => onBedDragEnd(bed.id, dx, dy)}
          onSelect={() => onBedSelect(bed)}
        />
      ))}

      {/* Footprints — hidden during drag and pending position update */}
      {plantings
        .filter(p => p.id !== draggingPlantingId && !pendingPlantingIds.has(p.id))
        .map(p => (
          <PlantFootprint key={`fp-${p.id}`} planting={p} pixelsPerFoot={pixelsPerFoot} />
        ))
      }

      {/* Plant markers */}
      {plantings.map(p => (
        <PlantMarker
          key={`pm-${p.id}`}
          planting={p}
          pixelsPerFoot={pixelsPerFoot}
          locked={lockedPlantings.has(p.id)}
          onSelect={() => onPlantingSelect(p)}
          onDragEnd={(x, y) => {
            setDraggingPlantingId(null)
            onPlantingDragEnd(p.id, x, y)
          }}
          onDragStart={() => setDraggingPlantingId(p.id)}
          onPendingStart={() => setPendingPlantingIds(prev => new Set(prev).add(p.id))}
          onPendingClear={() => setPendingPlantingIds(prev => {
            const next = new Set(prev)
            next.delete(p.id)
            return next
          })}
        />
      ))}

      {/* Draw mode overlay on top */}
      {drawMode && (
        <DrawOverlay
          vertices={drawVertices}
          pixelsPerFoot={pixelsPerFoot}
          onVertexAdd={handleVertexAdd}
          onClose={handleDrawClose}
        />
      )}
    </>
  )
}

// ── Resize bridge ────────────────────────────────────────────────────────────

function ResizeBridge({ width, height }: { width: number; height: number }) {
  const { app } = useApplication()
  useEffect(() => {
    if (app?.renderer) {
      app.renderer.resize(width, height)
    }
  }, [app, width, height])

  // Enable global pointer events on the stage for drag tracking
  useEffect(() => {
    if (app?.stage) {
      app.stage.eventMode = 'static'
      app.stage.hitArea = { contains: () => true }
    }
  }, [app])

  return null
}

// ── Exported component ───────────────────────────────────────────────────────

export function GardenCanvas(props: GardenCanvasProps) {
  const { garden } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let timer: ReturnType<typeof setTimeout>
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) {
        clearTimeout(timer)
        timer = setTimeout(() => setContainerWidth(w), 50)
      }
    })
    ro.observe(el)
    return () => {
      clearTimeout(timer)
      ro.disconnect()
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (el) {
      const w = el.getBoundingClientRect().width
      if (w > 0) setContainerWidth(w)
    }
  }, [])

  const gardenW = garden.canvas_width_ft ?? 1
  const gardenH = garden.canvas_height_ft ?? 1
  const pixelsPerFoot = containerWidth / gardenW
  const stageWidth = containerWidth
  const stageHeight = Math.round(gardenH * pixelsPerFoot)

  if (gardenW <= 0 || gardenH <= 0) return null

  return (
    <div ref={containerRef} className="w-full rounded-lg border border-border overflow-hidden">
      <Application
        width={stageWidth}
        height={stageHeight}
        background={0xF5EFE6}
        antialias
      >
        <ResizeBridge width={stageWidth} height={stageHeight} />
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
