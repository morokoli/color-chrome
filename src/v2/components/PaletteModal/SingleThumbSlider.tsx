import { useState } from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

interface SingleThumbSliderProps {
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  color?: string
  backgroundColor?: string
  /** When true, label and slider are in one row; label shows first letter (R,G,B,H,S,L) with full text on hover */
  inlineLabel?: boolean
}

const SingleThumbSlider = ({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  color,
  backgroundColor,
  inlineLabel = false,
}: SingleThumbSliderProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const shortLabel = label ? label.charAt(0).toUpperCase() : ""

  return (
    <div
      style={{
        width: "100%",
        display: inlineLabel ? "flex" : "block",
        alignItems: "center",
        gap: inlineLabel ? "8px" : undefined,
      }}
    >
      {label && (
        <div
          style={{
            position: "relative",
            fontSize: "11.65px",
            minWidth: inlineLabel ? "14px" : undefined,
            textAlign: inlineLabel ? "center" : undefined,
          }}
          onMouseEnter={() => inlineLabel && setShowTooltip(true)}
          onMouseLeave={() => inlineLabel && setShowTooltip(false)}
        >
          {inlineLabel ? shortLabel : label}
          {inlineLabel && showTooltip && (
            <span
              role="tooltip"
              style={{
                position: "absolute",
                top: "50%",
                left: "100%",
                transform: "translateY(-50%) translateX(4px)",
                padding: "2px 6px",
                fontSize: "10px",
                fontWeight: 500,
                color: "#fff",
                backgroundColor: "rgba(0,0,0,0.85)",
                borderRadius: "4px",
                whiteSpace: "nowrap",
                zIndex: 1000,
                pointerEvents: "none",
              }}
            >
              {label}
            </span>
          )}
        </div>
      )}
      <SliderPrimitive.Root
        value={[value]}
        onValueChange={([v]) => onValueChange(v)}
        min={min}
        max={max}
        step={step}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          userSelect: "none",
          touchAction: "none",
          width: "100%",
          flex: inlineLabel ? 1 : undefined,
          minWidth: inlineLabel ? 0 : undefined,
          height: "20px",
        }}
      >
        <SliderPrimitive.Track
          style={{
            background: backgroundColor || "#000",
            position: "relative",
            flexGrow: 1,
            height: "4px",
          }}
        >
          <SliderPrimitive.Range
            style={{
              background: "transparent",
              position: "absolute",
              height: "100%",
            }}
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          style={{
            display: "block",
            width: "14px",
            height: "14px",
            backgroundColor: color || "#fff",
            border: "2px solid black",
            borderRadius: "0",
            cursor: "pointer",
            outline: "none",
            boxShadow: isFocused ? "0 0 0 2px #9ca3af" : "none",
          }}
          aria-label={label}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </SliderPrimitive.Root>
    </div>
  )
}

export default SingleThumbSlider
