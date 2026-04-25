import { useState, useRef } from "react"
import { Plus, Trash2, ArrowRightCircle, Disc, Box } from "lucide-react"
import tinycolor from "tinycolor2"
import ColorEditSection from "./ColorEditSection"
import { createDefaultColorObject } from "@/v2/helpers/createDefaultColorObject"

interface GradientStop {
  id: string
  color: string
  position: number
  hsl?: { h: number; s: number; l: number }
}

interface GradientData {
  type: "linear" | "radial" | "conic"
  angle: number
  position: { x: number; y: number }
  stops: GradientStop[]
  metadata: {
    name: string
    slash_naming: string
    url: string
    tags: string[]
    comments: string
    ranking: number
  }
  figma?: any
}

interface GradientEditorProps {
  gradient: GradientData
  onChange: (gradient: GradientData) => void
  isMobile?: boolean
}

const hexToRgb01 = (hex: string) => {
  const color = tinycolor(hex)
  const rgb = color.toRgb()
  return {
    r: rgb.r / 255,
    g: rgb.g / 255,
    b: rgb.b / 255,
    a: rgb.a || 1,
  }
}

export const generateFigmaGradientData = (gradient: GradientData) => {
  if (!gradient || !gradient.stops) return null

  const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position)

  if (gradient.type === "linear") {
    const figmaAngleRad = ((gradient.angle - 90) * Math.PI) / 180
    const cos = Math.cos(figmaAngleRad)
    const sin = Math.sin(figmaAngleRad)
    return {
      type: "GRADIENT_LINEAR",
      gradientStops: sortedStops.map((stop) => ({
        position: stop.position / 100,
        color: hexToRgb01(stop.color),
      })),
      gradientTransform: [
        [cos, -sin, 0.5 - cos * 0.5 + sin * 0.5],
        [sin, cos, 0.5 - sin * 0.5 - cos * 0.5],
      ],
    }
  }

  if (gradient.type === "radial") {
    const centerX = gradient.position.x / 100 - 0.5
    const centerY = gradient.position.y / 100 - 0.5
    return {
      type: "GRADIENT_RADIAL",
      gradientStops: sortedStops.map((stop) => ({
        position: stop.position / 100,
        color: hexToRgb01(stop.color),
      })),
      gradientTransform: [
        [1, 0, centerX],
        [0, 1, centerY],
      ],
    }
  }

  if (gradient.type === "conic") {
    const figmaAngleRad = ((gradient.angle - 90) * Math.PI) / 180
    const cos = Math.cos(figmaAngleRad)
    const sin = Math.sin(figmaAngleRad)
    return {
      type: "GRADIENT_ANGULAR",
      gradientStops: sortedStops.map((stop) => ({
        position: stop.position / 360,
        color: hexToRgb01(stop.color),
      })),
      gradientTransform: [
        [cos, -sin, 0],
        [sin, cos, 0],
      ],
    }
  }

  return null
}

const generateGradientString = (gradient: GradientData) => {
  if (!gradient || !gradient.stops || gradient.stops.length === 0) {
    return "linear-gradient(90deg, #000 0%, #fff 100%)"
  }
  const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position)
  const stopsString =
    gradient.type === "conic"
      ? sortedStops.map((stop) => `${stop.color} ${stop.position}deg`).join(", ")
      : sortedStops.map((stop) => `${stop.color} ${stop.position}%`).join(", ")

  switch (gradient.type) {
    case "linear":
      return `linear-gradient(${gradient.angle}deg, ${stopsString})`
    case "radial":
      return `radial-gradient(circle at ${gradient.position.x}% ${gradient.position.y}%, ${stopsString})`
    case "conic":
      return `conic-gradient(from ${gradient.angle}deg at ${gradient.position.x}% ${gradient.position.y}%, ${stopsString})`
    default:
      return `linear-gradient(${gradient.angle}deg, ${stopsString})`
  }
}

const generateId = () => `stop_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

const GradientEditor = ({ gradient, onChange, isMobile = false }: GradientEditorProps) => {
  const [selectedStopId, setSelectedStopId] = useState(gradient?.stops?.[0]?.id || "")
  const containerRef = useRef<HTMLDivElement | null>(null)

  if (!gradient || !gradient.stops) {
    return (
      <div style={{ textAlign: "center", padding: "20px", color: "#999" }}>
        No gradient data available
      </div>
    )
  }

  const selectedStop = gradient.stops.find((s) => s.id === selectedStopId) || gradient.stops[0]

  const updateGradient = (updated: Partial<GradientData>) => {
    let finalUpdate: GradientData = { ...gradient, ...updated }
    if (updated.type && updated.type !== gradient.type) {
      const oldType = gradient.type
      const newType = updated.type
      const convertedStops = gradient.stops.map((stop) => {
        let newPosition = stop.position
        if (oldType === "conic" && (newType === "linear" || newType === "radial")) {
          newPosition = (stop.position / 360) * 100
        } else if ((oldType === "linear" || oldType === "radial") && newType === "conic") {
          newPosition = (stop.position / 100) * 360
        }
        return { ...stop, position: newPosition }
      })
      finalUpdate = { ...finalUpdate, stops: convertedStops }
    }

    const figmaData = generateFigmaGradientData(finalUpdate)
    if (figmaData) finalUpdate = { ...finalUpdate, figma: figmaData }
    onChange(finalUpdate)
  }

  const updateStop = (id: string, updated: Partial<GradientStop>) => {
    const newStops = gradient.stops.map((s) => (s.id === id ? { ...s, ...updated } : s))
    updateGradient({ stops: newStops })
  }

  const addStop = () => {
    if (gradient.stops.length >= 8) return
    const newStop: GradientStop = {
      id: generateId(),
      color: "#000000",
      hsl: { h: 0, s: 0, l: 0 },
      position: 50,
    }
    const newStops = [...gradient.stops, newStop].sort((a, b) => a.position - b.position)
    updateGradient({ stops: newStops })
    setSelectedStopId(newStop.id)
  }

  const removeStop = (id: string) => {
    if (gradient.stops.length <= 2) return
    const newStops = gradient.stops.filter((s) => s.id !== id)
    updateGradient({ stops: newStops })
    if (selectedStopId === id) setSelectedStopId(newStops[0].id)
  }

  const handleStopColorChange = (colorObject: any) => {
    updateStop(selectedStop.id, {
      color: colorObject.hex,
      hsl: colorObject.hsl,
    })
  }

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? 12 : 16,
        paddingTop: isMobile ? 8 : 0,
        paddingLeft: isMobile ? 8 : 16,
        paddingRight: isMobile ? 8 : 16,
        marginTop: 12,
      }}
    >
      <div
        style={{
          width: "100%",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
          position: "relative",
          cursor: "default",
          boxSizing: "border-box",
          border: "3px solid black",
          background: generateGradientString(gradient),
          overflow: "visible",
          transition: "none",
          transform: "none",
          boxShadow: "rgba(0, 0, 0, 0.14) 0px 2px 8px, rgba(0, 0, 0, 0.08) 0px 0px 0px 1px",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontSize: 10,
              fontFamily: "monospace",
              fontWeight: 500,
              color: "#999",
            }}
          >
            {gradient.stops.length} Stops Active
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={addStop}
              disabled={gradient.stops.length >= 8}
              title="Add Stop"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 6,
                background: gradient.stops.length >= 8 ? "#f5f5f5" : "#fff",
                border: "1px solid #d9d9d9",
                boxShadow: gradient.stops.length >= 8 ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                cursor: gradient.stops.length >= 8 ? "not-allowed" : "pointer",
                opacity: gradient.stops.length >= 8 ? 0.5 : 1,
                transition: "all 0.15s",
                fontSize: 12,
                fontWeight: 600,
                color: "#666",
              }}
              onMouseEnter={(e) => {
                if (gradient.stops.length < 8) {
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)"
                  e.currentTarget.style.transform = "translateY(-1px)"
                }
              }}
              onMouseLeave={(e) => {
                if (gradient.stops.length < 8) {
                  e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)"
                  e.currentTarget.style.transform = "translateY(0)"
                }
              }}
            >
              <Plus size={14} />
              Add Stop
            </button>
            <button
              type="button"
              onClick={() => removeStop(selectedStop.id)}
              disabled={gradient.stops.length <= 2}
              title="Remove Stop"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                color: gradient.stops.length <= 2 ? "#ccc" : "#ef4444",
                background: "transparent",
                border: gradient.stops.length <= 2 ? "1px solid #e5e5e5" : "1px solid #fecaca",
                cursor: gradient.stops.length <= 2 ? "not-allowed" : "pointer",
                opacity: gradient.stops.length <= 2 ? 0.5 : 1,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (gradient.stops.length > 2) {
                  e.currentTarget.style.color = "#dc2626"
                  e.currentTarget.style.borderColor = "#ef4444"
                  e.currentTarget.style.backgroundColor = "#fef2f2"
                }
              }}
              onMouseLeave={(e) => {
                if (gradient.stops.length > 2) {
                  e.currentTarget.style.color = "#ef4444"
                  e.currentTarget.style.borderColor = "#fecaca"
                  e.currentTarget.style.backgroundColor = "transparent"
                }
              }}
            >
              <Trash2 size={12} />
              Remove Stop
            </button>
          </div>
        </div>

        <div style={{ position: "relative", height: 48, width: "100%" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 14,
              top: "50%",
              transform: "translateY(-50%)",
              borderRadius: 7,
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)",
              border: "1px solid rgba(0,0,0,0.05)",
              background: (() => {
                const previewStops = gradient.stops
                  .map((stop) => {
                    const percentPosition =
                      gradient.type === "conic" ? (stop.position / 360) * 100 : stop.position
                    return `${stop.color} ${percentPosition}%`
                  })
                  .join(", ")
                return `linear-gradient(90deg, ${previewStops})`
              })(),
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 10,
              right: 10,
              top: 0,
              bottom: 0,
            }}
          >
            {gradient.stops.map((stop) => {
              const displayPosition =
                gradient.type === "conic" ? (stop.position / 360) * 100 : stop.position
              return (
                <StopHandle
                  key={stop.id}
                  stop={{ ...stop, position: displayPosition }}
                  active={selectedStopId === stop.id}
                  onSelect={() => setSelectedStopId(stop.id)}
                  onMove={(pos) => {
                    const actualPosition = gradient.type === "conic" ? (pos / 100) * 360 : pos
                    updateStop(stop.id, { position: actualPosition })
                  }}
                />
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 12 : 16 }}>
        <div
          style={{
            display: isMobile ? "flex" : "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(6, 1fr)",
            gap: isMobile ? 12 : 16,
            flexDirection: isMobile ? "column" : undefined,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              gridColumn: isMobile ? undefined : "1 / 3",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TypeButton
              active={gradient.type === "linear"}
              onClick={() => updateGradient({ type: "linear" })}
              icon={<ArrowRightCircle size={14} />}
              label="Linear"
              vertical
            />
            <TypeButton
              active={gradient.type === "radial"}
              onClick={() => updateGradient({ type: "radial" })}
              icon={<Disc size={14} />}
              label="Radial"
              vertical
            />
            <TypeButton
              active={gradient.type === "conic"}
              onClick={() => updateGradient({ type: "conic" })}
              icon={<Box size={14} />}
              label="Conic"
              vertical
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: 20,
              gridColumn: isMobile ? undefined : "3 / 7",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                opacity: gradient.type === "radial" ? 0.2 : 1,
                pointerEvents: gradient.type === "radial" ? "none" : "auto",
                transition: "opacity 0.15s",
                alignItems: "center",
              }}
            >
              <label style={{ fontSize: 11, fontWeight: 600, color: "#666", textAlign: "center" }}>
                Angle
              </label>
              <AngleDial angle={gradient.angle} onChange={(a) => updateGradient({ angle: a })} scale={0.9} />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                opacity: gradient.type === "linear" ? 0.2 : 1,
                pointerEvents: gradient.type === "linear" ? "none" : "auto",
                transition: "opacity 0.15s",
                alignItems: "center",
              }}
            >
              <label style={{ fontSize: 11, fontWeight: 600, color: "#666", textAlign: "center" }}>
                Center
              </label>
              <PositionPicker
                position={gradient.position}
                onChange={(p) => updateGradient({ position: p })}
                scale={0.9}
              />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <ColorEditSection
          selectedColor={
            selectedStop.hsl
              ? { hex: selectedStop.color, hsl: selectedStop.hsl, rgb: tinycolor(selectedStop.color).toRgb() }
              : createDefaultColorObject(selectedStop.color)
          }
          onColorChange={handleStopColorChange}
          colorPickerIndex={0}
          isMobile={isMobile}
        />
      </div>
    </div>
  )
}

interface StopHandleProps {
  stop: GradientStop
  active: boolean
  onSelect: () => void
  onMove: (position: number) => void
}

function StopHandle({ stop, active, onSelect, onMove }: StopHandleProps) {
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    onSelect()
    const parent = e.currentTarget.parentElement
    if (!parent) return
    const rect = parent.getBoundingClientRect()

    const onMouseMove = (moveEvent: MouseEvent) => {
      let delta = (moveEvent.clientX - rect.left) / rect.width
      delta = Math.max(0, Math.min(1, delta)) * 100
      onMove(delta)
    }

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }

  return (
    <button
      type="button"
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        left: `${stop.position}%`,
        top: "50%",
        transform: `translate(-50%, -50%) scale(${active ? 1.2 : 1})`,
        width: 22,
        height: 22,
        borderRadius: 3,
        transition: "transform 0.15s",
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
        border: active ? "2px solid #000" : "2px solid #fff",
        backgroundColor: stop.color,
        cursor: "grab",
        zIndex: active ? 20 : 10,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.1)"
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)"
      }}
    >
      {active && (
        <div
          style={{
            position: "absolute",
            bottom: -10,
            left: "50%",
            transform: "translateX(-50%)",
            width: 3,
            height: 3,
            background: "#000",
            borderRadius: "50%",
          }}
        />
      )}
    </button>
  )
}

interface AngleDialProps {
  angle: number
  onChange: (angle: number) => void
  scale?: number
}

function AngleDial({ angle, onChange, scale = 1 }: AngleDialProps) {
  const dialRef = useRef<HTMLDivElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrag = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!dialRef.current) return
    const touchEvent = "touches" in e ? e.touches[0] : null
    const clientX = "clientX" in e ? e.clientX : touchEvent?.clientX
    const clientY = "clientY" in e ? e.clientY : touchEvent?.clientY
    if (clientX === undefined || clientY === undefined) return

    const rect = dialRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const angleRad = Math.atan2(clientY - centerY, clientX - centerX)
    let angleDeg = Math.round((angleRad * 180) / Math.PI) + 90
    if (angleDeg < 0) angleDeg += 360
    if (angleDeg >= 360) angleDeg = 0
    onChange(angleDeg)
  }

  const onStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(true)
    handleDrag(e)

    const onMove = (ev: MouseEvent | TouchEvent) => {
      ev.preventDefault()
      handleDrag(ev)
    }
    const onEnd = () => {
      setIsDragging(false)
      window.removeEventListener("mousemove", onMove as EventListener)
      window.removeEventListener("mouseup", onEnd)
      window.removeEventListener("touchmove", onMove as EventListener)
      window.removeEventListener("touchend", onEnd)
    }

    window.addEventListener("mousemove", onMove as EventListener)
    window.addEventListener("mouseup", onEnd)
    window.addEventListener("touchmove", onMove as EventListener, { passive: false })
    window.addEventListener("touchend", onEnd)
  }

  const size = 80 * scale
  const centerDotSize = 8 * scale
  const lineWidth = 2 * scale

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * scale }}>
      <div
        ref={dialRef}
        onMouseDown={onStart}
        onTouchStart={onStart}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: `${lineWidth}px solid ${isDragging ? "#666" : "#d9d9d9"}`,
          margin: "0 auto",
          position: "relative",
          cursor: "pointer",
          background: "#fff",
          boxShadow: isDragging ? "0 2px 8px rgba(0,0,0,0.15)" : "inset 0 1px 3px rgba(0,0,0,0.1)",
          transition: "border-color 0.15s, box-shadow 0.15s",
          touchAction: "none",
          userSelect: "none",
        }}
        onMouseEnter={(e) => {
          if (!isDragging) e.currentTarget.style.borderColor = "#999"
        }}
        onMouseLeave={(e) => {
          if (!isDragging) e.currentTarget.style.borderColor = "#d9d9d9"
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: lineWidth,
            height: "40%",
            background: "#000",
            transformOrigin: "top center",
            borderRadius: lineWidth,
            transform: `translate(-50%, 0) rotate(${angle}deg)`,
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: centerDotSize,
            height: centerDotSize,
            marginLeft: -centerDotSize / 2,
            marginTop: -centerDotSize / 2,
            borderRadius: "50%",
            background: "#d9d9d9",
            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
          }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 * scale }}>
        <input
          type="number"
          value={angle}
          onChange={(e) => {
            let val = parseInt(e.target.value, 10) || 0
            if (val < 0) val = 0
            if (val >= 360) val = 359
            onChange(val)
          }}
          min={0}
          max={359}
          style={{
            width: 50 * scale,
            padding: `${4 * scale}px ${8 * scale}px`,
            fontSize: 12 * scale,
            fontFamily: "monospace",
            fontWeight: 600,
            textAlign: "center",
            border: "1px solid #d9d9d9",
            borderRadius: 4,
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#4096ff"
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#d9d9d9"
          }}
        />
        <span style={{ fontSize: 12 * scale, color: "#666", fontWeight: 500 }}>°</span>
      </div>
    </div>
  )
}

interface PositionPickerProps {
  position: { x: number; y: number }
  onChange: (position: { x: number; y: number }) => void
  scale?: number
}

function PositionPicker({ position, onChange, scale = 1 }: PositionPickerProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrag = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!ref.current) return
    const touchEvent = "touches" in e ? e.touches[0] : null
    const clientX = "clientX" in e ? e.clientX : touchEvent?.clientX
    const clientY = "clientY" in e ? e.clientY : touchEvent?.clientY
    if (clientX === undefined || clientY === undefined) return

    const rect = ref.current.getBoundingClientRect()
    let x = (clientX - rect.left) / rect.width
    let y = (clientY - rect.top) / rect.height
    x = Math.max(0, Math.min(1, x)) * 100
    y = Math.max(0, Math.min(1, y)) * 100
    onChange({ x, y })
  }

  const onStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(true)
    handleDrag(e)

    const onMove = (ev: MouseEvent | TouchEvent) => {
      ev.preventDefault()
      handleDrag(ev)
    }
    const onEnd = () => {
      setIsDragging(false)
      window.removeEventListener("mousemove", onMove as EventListener)
      window.removeEventListener("mouseup", onEnd)
      window.removeEventListener("touchmove", onMove as EventListener)
      window.removeEventListener("touchend", onEnd)
    }

    window.addEventListener("mousemove", onMove as EventListener)
    window.addEventListener("mouseup", onEnd)
    window.addEventListener("touchmove", onMove as EventListener, { passive: false })
    window.addEventListener("touchend", onEnd)
  }

  const size = 80 * scale
  const dotSize = 8 * scale
  const borderWidth = 2 * scale

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * scale }}>
      <div
        ref={ref}
        onMouseDown={onStart}
        onTouchStart={onStart}
        style={{
          width: size,
          height: size,
          border: `${borderWidth}px solid ${isDragging ? "#666" : "#d9d9d9"}`,
          margin: "0 auto",
          position: "relative",
          cursor: "crosshair",
          borderRadius: 12 * scale,
          background: "#fff",
          boxShadow: isDragging ? "0 2px 8px rgba(0,0,0,0.15)" : "inset 0 1px 3px rgba(0,0,0,0.1)",
          overflow: "hidden",
          transition: "border-color 0.15s, box-shadow 0.15s",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.1,
            backgroundImage:
              "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
            backgroundSize: `${10 * scale}px ${10 * scale}px`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${position.x}%`,
            top: `${position.y}%`,
            width: dotSize,
            height: dotSize,
            marginLeft: -dotSize / 2,
            marginTop: -dotSize / 2,
            background: "#000",
            borderRadius: "50%",
            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            transition: isDragging ? "none" : "left 0.1s ease-out, top 0.1s ease-out",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8 * scale,
          fontSize: 11 * scale,
          color: "#666",
        }}
      >
        <span style={{ fontFamily: "monospace", fontWeight: 600 }}>X: {Math.round(position.x)}%</span>
        <span style={{ color: "#d9d9d9" }}>|</span>
        <span style={{ fontFamily: "monospace", fontWeight: 600 }}>Y: {Math.round(position.y)}%</span>
      </div>
    </div>
  )
}

interface TypeButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  vertical?: boolean
}

function TypeButton({ active, onClick, icon, label, vertical = false }: TypeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        borderRadius: 10,
        border: active ? "2px solid #000" : "2px solid transparent",
        transition: "all 0.15s",
        background: active ? "#000" : "rgba(237, 237, 234, 0.5)",
        color: active ? "#fff" : "#666",
        cursor: "pointer",
        justifyContent: vertical ? "flex-start" : "center",
        width: "100%",
        boxShadow: active ? "0 3px 6px rgba(0,0,0,0.15)" : "none",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = "#999"
          e.currentTarget.style.background = "#fff"
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = "transparent"
          e.currentTarget.style.background = "rgba(237, 237, 234, 0.5)"
        }
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: active ? "rgba(255,255,255,0.2)" : "#fff",
          boxShadow: active ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
        }}
      >
        {icon}
      </div>
      <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
    </button>
  )
}

export default GradientEditor
