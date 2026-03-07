import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js'
import { Application, extend, useApplication } from '@pixi/react'
import type { Garden } from '@/types/garden'
import type { GardenPlanting } from '@/types/garden'
import type { Bed } from '@/types/bed'

extend({ Container, Graphics, Sprite, Text })

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

function darkenPixiColor(color: number, factor = 0.55): number {
  const r = Math.floor(((color >> 16) & 0xff) * factor)
  const g = Math.floor(((color >> 8) & 0xff) * factor)
  const b = Math.floor((color & 0xff) * factor)
  return (r << 16) | (g << 8) | b
}

function pixiColorToHex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0')
}

// ── Texture cache ────────────────────────────────────────────────────────────

const textureCache = new Map<string, Texture>()

function resolveImageUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${window.location.protocol}//${window.location.host}${url}`
}

async function loadTexture(url: string): Promise<Texture | null> {
  const resolved = resolveImageUrl(url)
  if (textureCache.has(resolved)) return textureCache.get(resolved)!
  try {
    const texture = await Assets.load(resolved)
    textureCache.set(resolved, texture)
    return texture
  } catch {
    return null
  }
}

// ── Icon texture cache ────────────────────────────────────────────────────────

const iconTextureCache = new Map<string, Texture>()

async function getIconTexture(icon: 'sprout' | 'lock', size: number, color: string): Promise<Texture> {
  const key = `${icon}-${size}-${color}`
  if (iconTextureCache.has(key)) return iconTextureCache.get(key)!

  const { renderToStaticMarkup } = await import('react-dom/server')
  let IconComponent: React.FC<React.SVGProps<SVGSVGElement>>
  if (icon === 'sprout') {
    const { Sprout } = await import('lucide-react')
    IconComponent = Sprout as unknown as React.FC<React.SVGProps<SVGSVGElement>>
  } else {
    const { Lock } = await import('lucide-react')
    IconComponent = Lock as unknown as React.FC<React.SVGProps<SVGSVGElement>>
  }

  const svgString = renderToStaticMarkup(
    React.createElement(IconComponent, {
      width: size,
      height: size,
      color,
      strokeWidth: 2,
    } as React.SVGProps<SVGSVGElement>)
  )

  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`
  const texture = await Assets.load(dataUri)
  iconTextureCache.set(key, texture)
  return texture
}

interface GardenCanvasProps {
  garden: Garden
  beds: Bed[]
  plantings: GardenPlanting[]
  onPlantingSelect: (planting: GardenPlanting) => void
  onBedSelect: (bed: Bed) => void
  drawMode: boolean
  onBedDrawn: (boundary: Array<{x: number, y: number}>) => void
  lockedBeds: Set<number>
  lockedPlantings: Set<number>
  onBedDragEnd: (bedId: number, newBoundary: Array<{x: number, y: number}>) => void
  onPlantingDragEnd: (plantingId: number, x: number, y: number) => void
  selectedPlantingId?: number | null
  selectedBedId?: number | null
  newPlantingId?: number | null
}

// ── Background grid ──────────────────────────────────────────────────────────

function BackgroundGrid({ width, height, pixelsPerFoot }: { width: number; height: number; pixelsPerFoot: number }) {
  const draw = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    g.rect(0, 0, width, height).fill(0xEDE8DF)

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
  selected,
  onDragEnd,
  onSelect,
}: {
  bed: Bed
  pixelsPerFoot: number
  locked: boolean
  selected: boolean
  onDragEnd: (newBoundary: Array<{x: number, y: number}>) => void
  onSelect: () => void
}) {
  const boundary = bed.boundary
  if (!boundary || boundary.length < 3) return null

  const { app } = useApplication()
  const dragStartRef = useRef<{x: number, y: number} | null>(null)
  const [dragOffset, setDragOffset] = useState<{x: number, y: number}>({x: 0, y: 0})
  const draggingRef = useRef(false)
  const finalDragRef = useRef({ x: 0, y: 0 })

  // Pending boundary to prevent snap-back
  const [pendingBoundary, setPendingBoundary] = useState<Array<{x: number, y: number}> | null>(null)

  useEffect(() => {
    if (pendingBoundary && bed.boundary) {
      const close = pendingBoundary.every((pt, i) =>
        Math.abs(pt.x - (bed.boundary![i]?.x ?? 0)) < 0.01 &&
        Math.abs(pt.y - (bed.boundary![i]?.y ?? 0)) < 0.01
      )
      if (close) setPendingBoundary(null)
    }
  }, [bed.boundary, pendingBoundary])

  const displayBoundary = pendingBoundary ?? boundary

  // Bounding box center
  const xs = displayBoundary.map(v => v.x * pixelsPerFoot)
  const ys = displayBoundary.map(v => v.y * pixelsPerFoot)
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2

  const fillColor = hexToPixi(bed.color) ?? 0xC4956A
  const strokeColor = darkenPixiColor(fillColor)
  const labelText = bed.name

  const draw = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    const pts = displayBoundary.map(v => ({ x: v.x * pixelsPerFoot, y: v.y * pixelsPerFoot }))
    const flat = pts.flatMap(p => [p.x, p.y])
    g.poly(flat).fill({ color: fillColor, alpha: locked ? 0.4 : 0.5 })
    g.poly(flat).stroke({ color: strokeColor, width: locked ? 3 : 2 })
    if (selected) {
      g.poly(flat).stroke({ color: 0x4a7c59, width: 4 })
      g.poly(flat).stroke({ color: 0xffffff, width: 2 })
    }
  }, [displayBoundary, pixelsPerFoot, locked, fillColor, strokeColor, selected])

  // Label background pill
  const pillWidth = labelText.length * 7.5 + 16 + (locked ? 20 : 0)
  const pillDraw = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    const pw = pillWidth
    const ph = 22
    g.roundRect(-pw / 2, -ph / 2, pw, ph, 4).fill({ color: 0xffffff, alpha: 0.85 })
    g.roundRect(-pw / 2, -ph / 2, pw, ph, 4).stroke({ color: 0xb0a898, width: 1 })
  }, [pillWidth])

  const [lockTexture, setLockTexture] = useState<Texture | null>(null)
  useEffect(() => {
    if (locked) {
      getIconTexture('lock', 14, '#1a1a1a').then(setLockTexture)
    }
  }, [locked])

  const handlePointerDown = useCallback((e: import('pixi.js').FederatedPointerEvent) => {
    e.stopPropagation()
    if (locked) {
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
        const dx = finalDragRef.current.x / pixelsPerFoot
        const dy = finalDragRef.current.y / pixelsPerFoot
        const newBoundary = boundary.map(v => ({
          x: Math.round((v.x + dx) * 100) / 100,
          y: Math.round((v.y + dy) * 100) / 100,
        }))
        setPendingBoundary(newBoundary)
        setDragOffset({ x: 0, y: 0 })
        onDragEnd(newBoundary)
      } else {
        onSelect()
        dragStartRef.current = null
        draggingRef.current = false
        setDragOffset({ x: 0, y: 0 })
      }

      dragStartRef.current = null
      draggingRef.current = false
    }

    app.stage.on('pointermove', onMove)
    app.stage.on('pointerup', onUp)
    app.stage.on('pointerupoutside', onUp)
  }, [app, locked, boundary, pixelsPerFoot, onDragEnd, onSelect])

  return (
    <pixiContainer
      x={dragOffset.x}
      y={dragOffset.y}
      eventMode="static"
      cursor={locked ? 'pointer' : 'grab'}
      onPointerDown={handlePointerDown}
    >
      <pixiGraphics draw={draw} />
      {/* Label with white pill background */}
      <pixiContainer x={cx} y={cy}>
        <pixiGraphics draw={pillDraw} />
        {locked && lockTexture && (
          <pixiSprite
            texture={lockTexture}
            width={14}
            height={14}
            x={-pillWidth / 2 + 4}
            y={-7}
          />
        )}
        <pixiText
          text={labelText}
          anchor={0.5}
          x={locked ? 9 : 0}
          style={{
            fontSize: 13,
            fill: 0x1a1a1a,
          }}
        />
      </pixiContainer>
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
  selected,
  isNew,
  onSelect,
  onDragEnd,
  onDragStart,
  onPendingStart,
  onPendingClear,
}: {
  planting: GardenPlanting
  pixelsPerFoot: number
  locked: boolean
  selected: boolean
  isNew: boolean
  onSelect: () => void
  onDragEnd: (x: number, y: number) => void
  onDragStart: () => void
  onPendingStart: () => void
  onPendingClear: () => void
}) {
  if (planting.pos_x == null || planting.pos_y == null) return null

  const { app } = useApplication()
  const [hovered, setHovered] = useState(false)
  const [texture, setTexture] = useState<Texture | null>(null)
  const color = hexToPixi(planting.color) ?? getColor(planting.plant_type)
  const borderColor = darkenPixiColor(color)
  const firstName = (planting.common_name ?? '?').split(' ')[0]
  const label = firstName

  const [sproutTexture, setSproutTexture] = useState<Texture | null>(null)
  const [lockTexture, setLockTexture] = useState<Texture | null>(null)

  // Drop animation
  const [animScale, setAnimScale] = useState(isNew ? 0 : 1)

  useEffect(() => {
    if (!isNew) return
    let elapsed = 0
    const duration = 400
    const ticker = (delta: import('pixi.js').Ticker) => {
      elapsed += delta.deltaMS
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setAnimScale(eased)
      if (t >= 1) app.ticker.remove(ticker)
    }
    app.ticker.add(ticker)
    return () => { app.ticker.remove(ticker) }
  }, [isNew, app])

  const dragStartRef = useRef<{x: number, y: number} | null>(null)
  const [dragOffset, setDragOffset] = useState<{x: number, y: number}>({x: 0, y: 0})
  const draggingRef = useRef(false)
  const finalDragRef = useRef({ x: 0, y: 0 })

  // Load plant image texture
  useEffect(() => {
    if (planting.image_url) {
      loadTexture(planting.image_url).then(t => {
        if (t) setTexture(t)
      })
    }
  }, [planting.image_url])

  // Load icon textures
  useEffect(() => {
    getIconTexture('sprout', 24, pixiColorToHex(borderColor)).then(setSproutTexture)
  }, [borderColor])

  useEffect(() => {
    if (locked) {
      getIconTexture('lock', 12, '#1a1a1a').then(setLockTexture)
    }
  }, [locked])

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

  const RADIUS = 20

  const baseDraw = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    g.circle(0, 0, RADIUS).fill(color)
  }, [color])

  const tintDraw = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    g.circle(0, 0, RADIUS).fill({ color, alpha: 0.25 })
  }, [color])

  const borderDraw = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    g.circle(0, 0, RADIUS).stroke({ color: borderColor, width: 2 })
    if (selected) {
      g.circle(0, 0, 24).stroke({ color: 0xffffff, width: 2.5 })
      g.circle(0, 0, 26).stroke({ color: 0x4a7c59, width: 1.5 })
    }
  }, [borderColor, selected])

  // Label background pill
  const plantPillWidth = label.length * 6.5 + 10 + (locked ? 16 : 0)
  const pillDraw = useCallback((g: import('pixi.js').Graphics) => {
    g.clear()
    const pw = plantPillWidth
    const ph = 18
    g.roundRect(-pw / 2, -ph / 2, pw, ph, 3).fill({ color: 0xffffff, alpha: 0.85 })
    g.roundRect(-pw / 2, -ph / 2, pw, ph, 3).stroke({ color: 0xb0a898, width: 1 })
  }, [plantPillWidth])

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
      scale={animScale * (hovered ? 1.15 : 1)}
      eventMode="static"
      cursor={locked ? 'pointer' : 'grab'}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onPointerDown={handlePointerDown}
    >
      {/* 1. Base color circle */}
      <pixiGraphics draw={baseDraw} />
      {/* 2. Plant image or sprout fallback */}
      {texture && (
        <>
          <pixiSprite texture={texture} width={40} height={40} x={-20} y={-20} alpha={0.95} />
          <pixiGraphics draw={tintDraw} />
        </>
      )}
      {!texture && sproutTexture && (
        <pixiSprite texture={sproutTexture} width={24} height={24} x={-12} y={-12} />
      )}
      {/* 3. Border on top always */}
      <pixiGraphics draw={borderDraw} />
      {/* 4. Label with pill background */}
      <pixiContainer y={RADIUS + 8}>
        <pixiGraphics draw={pillDraw} />
        {locked && lockTexture && (
          <pixiSprite
            texture={lockTexture}
            width={12}
            height={12}
            x={-plantPillWidth / 2 + 3}
            y={-6}
          />
        )}
        <pixiText
          text={label}
          anchor={{ x: 0.5, y: 0.5 }}
          x={locked ? 8 : 0}
          style={{ fontSize: 11, fill: 0x2d2d2d }}
        />
      </pixiContainer>
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

// ── Main stage content ───────────────────────────────────────────────────────

function StageContent({
  beds,
  plantings,
  onPlantingSelect,
  onBedSelect,
  drawMode,
  onBedDrawn,
  lockedBeds,
  lockedPlantings,
  onBedDragEnd,
  onPlantingDragEnd,
  selectedPlantingId,
  selectedBedId,
  newPlantingId,
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

      {/* Beds */}
      {beds.map(bed => (
        <BedPolygon
          key={bed.id}
          bed={bed}
          pixelsPerFoot={pixelsPerFoot}
          locked={lockedBeds.has(bed.id)}
          selected={selectedBedId === bed.id}
          onDragEnd={(newBoundary) => onBedDragEnd(bed.id, newBoundary)}
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
          selected={selectedPlantingId === p.id}
          isNew={newPlantingId === p.id}
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
        background={0xEDE8DF}
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
