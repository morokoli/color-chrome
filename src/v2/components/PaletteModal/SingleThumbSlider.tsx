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
}: SingleThumbSliderProps) => {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <div style={{ width: "100%" }}>
      {label && (
        <div style={{ fontSize: "11.65px" }}>
          {label}
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
