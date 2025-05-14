import * as Slider from "@radix-ui/react-slider"
import * as Tooltip from "@radix-ui/react-tooltip"
import { useState } from "react"

interface DualThumbSliderProps {
  value: [number, number]
  onValueChange: (value: [number, number]) => void
  max: number
  min?: number
  step?: number
  label: string
  unit?: string
  showGradient?: boolean
  thumbColors?: [string, string]
}

const DualThumbSlider: React.FC<DualThumbSliderProps> = ({
  value,
  onValueChange,
  max,
  min = 0,
  step = 1,
  label,
  unit = "",
  showGradient = false,
  thumbColors,
}) => {
  const [isMinThumbVisible, setIsMinThumbVisible] = useState(false)
  const [isMaxThumbVisible, setIsMaxThumbVisible] = useState(false)
  const [isMinThumbHovered, setIsMinThumbHovered] = useState(false)
  const [isMaxThumbHovered, setIsMaxThumbHovered] = useState(false)

  // Custom handler to prevent thumbs from crossing
  const handleValueChange = (newValue: number[]) => {
    // Ensure min thumb doesn't exceed max thumb
    if (newValue[0] <= newValue[1]) {
      onValueChange(newValue as [number, number])
    }
  }

  return (
    <div className="text-center w-full">
      <Tooltip.Provider>
        <Slider.Root
          className="relative flex items-center select-none touch-none w-full h-5"
          value={value}
          onValueChange={handleValueChange}
          max={max}
          min={min}
          step={step}
          minStepsBetweenThumbs={1}
        >
          <Slider.Track
            className={`relative grow rounded-full h-[4px] ${!showGradient ? "bg-black" : ""}`}
            style={
              showGradient
                ? {
                    background:
                      "linear-gradient(to right, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))",
                  }
                : undefined
            }
          >
            <Slider.Range
              className={`absolute ${showGradient ? "bg-transparent" : "bg-black"} rounded-full h-full`}
            />
          </Slider.Track>
          <Tooltip.Root open={isMinThumbVisible || isMinThumbHovered}>
            <Tooltip.Trigger asChild>
              <Slider.Thumb
                className="block w-4 h-4 bg-white border-2 border-black rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
                aria-label={`${label} minimum`}
                style={
                  thumbColors?.[0]
                    ? { backgroundColor: thumbColors[0] }
                    : undefined
                }
                onPointerDown={() => setIsMinThumbVisible(true)}
                onPointerUp={() => setIsMinThumbVisible(false)}
                onPointerLeave={() => {
                  setIsMinThumbVisible(false)
                  setIsMinThumbHovered(false)
                }}
                onMouseEnter={() => setIsMinThumbHovered(true)}
                onMouseLeave={() => setIsMinThumbHovered(false)}
              />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className="bg-white px-2 py-1 rounded shadow-lg text-sm"
                sideOffset={5}
                side="bottom"
              >
                {value[0]}{unit}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
          <Tooltip.Root open={isMaxThumbVisible || isMaxThumbHovered}>
            <Tooltip.Trigger asChild>
              <Slider.Thumb
                className="block w-4 h-4 bg-white border-2 border-black rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
                aria-label={`${label} maximum`}
                style={
                  thumbColors?.[1]
                    ? { backgroundColor: thumbColors[1] }
                    : undefined
                }
                onPointerDown={() => setIsMaxThumbVisible(true)}
                onPointerUp={() => setIsMaxThumbVisible(false)}
                onPointerLeave={() => {
                  setIsMaxThumbVisible(false)
                  setIsMaxThumbHovered(false)
                }}
                onMouseEnter={() => setIsMaxThumbHovered(true)}
                onMouseLeave={() => setIsMaxThumbHovered(false)}
              />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className="bg-white px-2 py-1 rounded shadow-lg text-sm"
                sideOffset={5}
                side="bottom"
              >
                {value[1]}{unit}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Slider.Root>
      </Tooltip.Provider>
      <div className="mt-2">{label}</div>
    </div>
  )
}

export default DualThumbSlider
