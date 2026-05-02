import { useEffect, useRef, useState, useCallback } from "react"
import tinycolor from "tinycolor2"
import { HARMONY_TYPES } from "@/v2/helpers/colorHarmonies"

type PaletteColor = { hex: string; rgb?: unknown; hsl?: unknown; [k: string]: unknown }

/** Circular harmony wheel (same behavior as colorappfrontend ColorWheel.jsx); `size` fits Generator picker column. */
const ColorWheel = ({
  colors = [] as PaletteColor[],
  activeColorIndex = 0,
  harmonyType = HARMONY_TYPES.CUSTOM,
  onColorChange,
  size = 168,
  readOnly = false,
}: {
  colors?: PaletteColor[]
  activeColorIndex?: number
  harmonyType?: string
  onColorChange?: (color: PaletteColor, colorIndex: number) => void
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
    const hue = hsl.h || 0
    const saturation = (hsl.s || 0) * 100
    const angle = ((hue - 90) * Math.PI) / 180
    const distance = (saturation / 100) * wheelRadius
    return {
      x: centerX + distance * Math.cos(angle),
      y: centerY + distance * Math.sin(angle),
    }
  }

  const coordsToHsl = (x: number, y: number, currentHsl: { l?: number } | undefined) => {
    const dx = x - centerX
    const dy = y - centerY
    const distance = Math.sqrt(dx * dx + dy * dy)
    const clampedDistance = Math.min(distance, wheelRadius)
    const angle = Math.atan2(dy, dx)
    const hue = ((angle * 180) / Math.PI + 90 + 360) % 360
    const saturation = clampedDistance / wheelRadius
    return { h: hue, s: saturation, l: currentHsl?.l ?? 0.5 }
  }

  const colorsRef = useRef(colors)
  colorsRef.current = colors
  const draggingRef = useRef<number | null>(null)
  draggingRef.current = draggingIndex

  const handlePointerMove = useCallback(
    (e: MouseEvent) => {
      if (readOnly) return
      const idx = draggingRef.current
      if (idx === null) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const currentColor = colorsRef.current[idx]
      const currentHsl = tinycolor(currentColor.hex).toHsl()
      const newHsl = coordsToHsl(x, y, currentHsl)
      const newHex = tinycolor(newHsl).toHexString()
      const newColor = {
        ...currentColor,
        hex: newHex,
        rgb: tinycolor(newHsl).toRgb(),
        hsl: newHsl,
      }
      onColorChange?.(newColor, idx)
    },
    [readOnly, onColorChange, wheelRadius, centerX, centerY],
  )

  const handlePointerUp = useCallback(() => setDraggingIndex(null), [])

  useEffect(() => {
    if (readOnly) setDraggingIndex(null)
  }, [readOnly])

  useEffect(() => {
    if (readOnly || draggingIndex === null) return
    window.addEventListener("mousemove", handlePointerMove)
    window.addEventListener("mouseup", handlePointerUp)
    return () => {
      window.removeEventListener("mousemove", handlePointerMove)
      window.removeEventListener("mouseup", handlePointerUp)
    }
  }, [draggingIndex, readOnly, handlePointerMove, handlePointerUp])

  const handlePointerDown = (e: React.MouseEvent, index: number) => {
    if (readOnly || !onColorChange) return
    e.preventDefault()
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
          cursor: readOnly ? "default" : draggingIndex !== null ? "grabbing" : "default",
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
        const distFromCenter = Math.hypot(coords.x - centerX, coords.y - centerY)
        const brightness = tinycolor(color.hex).getBrightness()
        const textColor = brightness > 128 ? "#000" : "#fff"

        return (
          <div
            key={`marker-${index}`}
            onMouseDown={readOnly ? undefined : (e) => handlePointerDown(e, index)}
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
              border: isActive ? "2px solid #fff" : "2px solid rgba(0, 0, 0, 0.3)",
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
              transition: isDragging ? "none" : "transform 0.15s ease, box-shadow 0.15s ease",
              zIndex: isActive ? 100 : isDragging ? 90 : 10 + Math.round(distFromCenter * 2),
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
                <path d="M5 2 L8 8 L5 7 L2 8 Z" fill={textColor} stroke="none" />
              </svg>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default ColorWheel
