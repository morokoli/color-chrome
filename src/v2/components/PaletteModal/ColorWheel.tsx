import { memo, useCallback, useEffect, useRef, useState } from "react"
import tinycolor from "tinycolor2"
import { HARMONY_TYPES } from "@/v2/helpers/colorHarmonies"

type PaletteColor = {
  hex: string
  rgb?: unknown
  hsl?: unknown
  [k: string]: unknown
}

type HslValue = {
  h: number
  s: number
  l: number
}

const normalizeHue = (hue: number): number => {
  let normalized = hue % 360
  if (normalized < 0) normalized += 360
  return normalized
}

/** Shortest signed hue difference (degrees) from `from` to `to`. */
const hueDelta = (from: number, to: number): number => {
  const a = normalizeHue(from)
  const b = normalizeHue(to)
  let d = b - a
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x))

const safeHsl = (hex: string): HslValue => {
  const t = tinycolor(hex).toHsl()
  return {
    h: typeof t.h === "number" && !Number.isNaN(t.h) ? t.h : 0,
    s: typeof t.s === "number" && !Number.isNaN(t.s) ? t.s : 0,
    l: typeof t.l === "number" && !Number.isNaN(t.l) ? t.l : 0.5,
  }
}

/** Circular harmony wheel (same behavior as colorappfrontend ColorWheel.jsx); `size` fits Generator picker column. */
const ColorWheel = ({
  colors = [] as PaletteColor[],
  activeColorIndex = 0,
  harmonyType = HARMONY_TYPES.CUSTOM,
  onColorChange,
  onHarmonyPaletteChange,
  size = 168,
  readOnly = false,
}: {
  colors?: PaletteColor[]
  activeColorIndex?: number
  harmonyType?: string
  onColorChange?: (color: PaletteColor, colorIndex: number) => void
  onHarmonyPaletteChange?: (colors: PaletteColor[]) => void
  size?: number
  readOnly?: boolean
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const centerX = size / 2
  const centerY = size / 2
  const wheelRadius = size / 2 - 12
  const markerRadius = 7
  const geometryRef = useRef({ centerX, centerY, wheelRadius })
  geometryRef.current = { centerX, centerY, wheelRadius }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const imageData = ctx.createImageData(size, size)
    const data = imageData.data

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX
        const dy = y - centerY
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance <= wheelRadius) {
          const angle = Math.atan2(dy, dx)
          const hue = ((angle * 180) / Math.PI + 90 + 360) % 360
          const saturation = (distance / wheelRadius) * 100
          const color = tinycolor({ h: hue, s: saturation, l: 50 })
          const rgb = color.toRgb()
          const index = (y * size + x) * 4
          data[index] = rgb.r
          data[index + 1] = rgb.g
          data[index + 2] = rgb.b
          data[index + 3] = 255
        } else {
          const index = (y * size + x) * 4
          data[index + 3] = 0
        }
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }, [size, centerX, centerY, wheelRadius])

  const hslToCoords = (hsl: { h?: number; s?: number; l?: number }) => {
    const { centerX: cx, centerY: cy, wheelRadius: radius } =
      geometryRef.current
    const hue = hsl.h || 0
    const saturation = (hsl.s || 0) * 100
    const angle = ((hue - 90) * Math.PI) / 180
    const distance = (saturation / 100) * radius
    return {
      x: cx + distance * Math.cos(angle),
      y: cy + distance * Math.sin(angle),
    }
  }

  const colorsRef = useRef(colors)
  colorsRef.current = colors
  const onColorChangeRef = useRef(onColorChange)
  onColorChangeRef.current = onColorChange
  const draggingRef = useRef<number | null>(null)
  draggingRef.current = draggingIndex
  const harmonyTypeRef = useRef(harmonyType)
  harmonyTypeRef.current = harmonyType
  const onHarmonyPaletteChangeRef = useRef(onHarmonyPaletteChange)
  onHarmonyPaletteChangeRef.current = onHarmonyPaletteChange
  const harmonySnapshotRef = useRef<HslValue[] | null>(null)
  const pendingMoveRef = useRef<{ clientX: number; clientY: number } | null>(
    null,
  )
  const rafRef = useRef<number | null>(null)

  const cancelPendingMove = useCallback(() => {
    pendingMoveRef.current = null
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const handlePointerMove = useCallback((e: MouseEvent) => {
    pendingMoveRef.current = { clientX: e.clientX, clientY: e.clientY }
    if (rafRef.current !== null) return

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null
      const pending = pendingMoveRef.current
      pendingMoveRef.current = null
      if (!pending) return

      const idx = draggingRef.current
      if (idx === null) return
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = pending.clientX - rect.left
      const y = pending.clientY - rect.top
      const currentColor = colorsRef.current[idx]
      if (!currentColor?.hex) return

      const snapshot = harmonySnapshotRef.current
      const harmonyCb = onHarmonyPaletteChangeRef.current
      const { centerX: cx, centerY: cy, wheelRadius: radius } =
        geometryRef.current
      const useHarmony =
        harmonyTypeRef.current !== HARMONY_TYPES.CUSTOM &&
        colorsRef.current.length > 1 &&
        snapshot &&
        snapshot.length === colorsRef.current.length &&
        typeof harmonyCb === "function"

      if (useHarmony) {
        const start = snapshot[idx]
        const dx = x - cx
        const dy = y - cy
        const distance = Math.sqrt(dx * dx + dy * dy)
        const clampedDistance = Math.min(distance, radius)
        const angle = Math.atan2(dy, dx)
        const pointerHsl = {
          h: ((angle * 180) / Math.PI + 90 + 360) % 360,
          s: clampedDistance / radius,
          l: start.l,
        }
        const hueForDelta = pointerHsl.s < 0.02 ? start.h : pointerHsl.h
        const dHue = hueDelta(start.h, hueForDelta)

        const next = colorsRef.current.map((c, i) => {
          const s = snapshot[i]
          const h = normalizeHue(s.h + dHue)
          const sat = i === idx ? clamp01(pointerHsl.s) : s.s
          const l = s.l
          const tc = tinycolor({ h, s: sat, l })
          return {
            ...c,
            hex: tc.toHexString(),
            rgb: tc.toRgb(),
            hsl: { h, s: sat, l, a: 1 },
          }
        })

        harmonyCb(next)
        return
      }

      const currentHsl = tinycolor(currentColor.hex).toHsl()
      const dx = x - cx
      const dy = y - cy
      const distance = Math.sqrt(dx * dx + dy * dy)
      const clampedDistance = Math.min(distance, radius)
      const angle = Math.atan2(dy, dx)
      const newHsl = {
        h: ((angle * 180) / Math.PI + 90 + 360) % 360,
        s: clampedDistance / radius,
        l: currentHsl.l ?? 0.5,
      }
      const newHex = tinycolor(newHsl).toHexString()
      const newColor = {
        ...currentColor,
        hex: newHex,
        rgb: tinycolor(newHsl).toRgb(),
        hsl: newHsl,
      }
      onColorChangeRef.current?.(newColor, idx)
    })
  }, [])

  const handlePointerUp = useCallback(() => {
    setDraggingIndex(null)
    harmonySnapshotRef.current = null
    cancelPendingMove()
  }, [cancelPendingMove])

  useEffect(() => {
    if (readOnly) {
      setDraggingIndex(null)
      harmonySnapshotRef.current = null
      cancelPendingMove()
    }
  }, [cancelPendingMove, readOnly])

  useEffect(() => {
    if (readOnly || draggingIndex === null) return
    window.addEventListener("mousemove", handlePointerMove)
    window.addEventListener("mouseup", handlePointerUp)
    return () => {
      window.removeEventListener("mousemove", handlePointerMove)
      window.removeEventListener("mouseup", handlePointerUp)
      cancelPendingMove()
    }
  }, [
    cancelPendingMove,
    draggingIndex,
    readOnly,
    handlePointerMove,
    handlePointerUp,
  ])

  const handlePointerDown = (e: React.MouseEvent, index: number) => {
    const allowHarmony =
      harmonyType !== HARMONY_TYPES.CUSTOM &&
      colors.length > 1 &&
      typeof onHarmonyPaletteChange === "function"
    if (readOnly || (!onColorChange && !allowHarmony)) return
    e.preventDefault()
    if (allowHarmony) {
      harmonySnapshotRef.current = colors.map((c) => safeHsl(c.hex))
    } else {
      harmonySnapshotRef.current = null
    }
    setDraggingIndex(index)
  }

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        userSelect: "none",
        margin: "0 auto",
      }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 0,
          borderRadius: "50%",
          cursor: readOnly
            ? "default"
            : draggingIndex !== null
              ? "grabbing"
              : "default",
          pointerEvents: readOnly ? "none" : "auto",
        }}
      />

      {harmonyType !== HARMONY_TYPES.CUSTOM &&
        colors.map((color, idx) => {
          const hsl = tinycolor(color.hex).toHsl()
          const end = hslToCoords(hsl)
          const dx = end.x - centerX
          const dy = end.y - centerY
          const length = Math.hypot(dx, dy)
          if (length < 0.5) return null
          const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
          const isActiveSpoke = idx === activeColorIndex
          return (
            <div
              key={`spoke-${idx}`}
              style={{
                position: "absolute",
                left: centerX,
                top: centerY,
                width: length,
                height: isActiveSpoke ? 2 : 1,
                marginTop: isActiveSpoke ? -1 : -0.5,
                transformOrigin: "0 50%",
                transform: `rotate(${angleDeg}deg)`,
                backgroundColor: isActiveSpoke
                  ? "rgba(255, 255, 255, 0.55)"
                  : "rgba(255, 255, 255, 0.35)",
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
          )
        })}

      {colors.map((color, index) => {
        const hsl = tinycolor(color.hex).toHsl()
        const coords = hslToCoords(hsl)
        const isActive = index === activeColorIndex
        const isHovered = index === hoveredIndex
        const isDragging = index === draggingIndex
        const distFromCenter = Math.hypot(
          coords.x - centerX,
          coords.y - centerY,
        )
        const brightness = tinycolor(color.hex).getBrightness()
        const textColor = brightness > 128 ? "#000" : "#fff"

        return (
          <div
            key={`marker-${index}`}
            onMouseDown={
              readOnly ? undefined : (e) => handlePointerDown(e, index)
            }
            onMouseEnter={readOnly ? undefined : () => setHoveredIndex(index)}
            onMouseLeave={readOnly ? undefined : () => setHoveredIndex(null)}
            style={{
              position: "absolute",
              left: coords.x - markerRadius,
              top: coords.y - markerRadius,
              width: markerRadius * 2,
              height: markerRadius * 2,
              borderRadius: "50%",
              backgroundColor: color.hex,
              border: isActive
                ? "2px solid #fff"
                : "2px solid rgba(0, 0, 0, 0.3)",
              boxShadow: isActive
                ? "0 0 0 1px rgba(0, 0, 0, 0.35), 0 1px 4px rgba(0, 0, 0, 0.25)"
                : "0 1px 3px rgba(0, 0, 0, 0.25)",
              cursor: readOnly ? "default" : isDragging ? "grabbing" : "grab",
              transform:
                readOnly && !isActive
                  ? "scale(1)"
                  : isActive || isHovered
                    ? "scale(1.25)"
                    : "scale(1)",
              transition: isDragging
                ? "none"
                : "transform 0.15s ease, box-shadow 0.15s ease",
              zIndex: isActive
                ? 100
                : isDragging
                  ? 90
                  : 10 + Math.round(distFromCenter * 2),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: readOnly ? "none" : "auto",
            }}
          >
            {isActive && (
              <svg
                width="8"
                height="8"
                viewBox="0 0 10 10"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <path
                  d="M5 2 L8 8 L5 7 L2 8 Z"
                  fill={textColor}
                  stroke="none"
                />
              </svg>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default memo(ColorWheel)
