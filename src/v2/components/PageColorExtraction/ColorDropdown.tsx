import { XMarkIcon } from "@heroicons/react/24/outline"

import { ChevronDownIcon } from "@heroicons/react/24/outline"
import * as Tooltip from "@radix-ui/react-tooltip"
import { useState } from "react"
import type { ColorType } from "./index"
import { useToast } from "@/v2/hooks/useToast"

export const ColorDropdown = ({
  colorArray,
  handleChangeColor,
  arrIndex,
  handleDeleteColor,
  handleDeleteColorArr,
  selectedColors,
  setSelectedColors,
}: {
  colorArray: ColorType[]
  handleChangeColor: (arrIndex: number, index: number, color: ColorType) => void
  arrIndex: number
  handleDeleteColor: (arrIndex: number, index: number) => void
  handleDeleteColorArr: (index: number) => void
  selectedColors: ColorType[]
  setSelectedColors: (colors: ColorType[]) => void
}) => {
  const toast = useToast()
  const [isOpen, setIsOpen] = useState(false)

  const handleCopyColor = (color: ColorType) => {
    navigator.clipboard.writeText(color.hex)
    toast.display("success", "Color copied to clipboard")
  }

  const handleCheckboxClick = (color: ColorType) => {
    if (selectedColors.includes(color)) {
      setSelectedColors(selectedColors.filter((c) => c !== color))
    } else {
      setSelectedColors([...selectedColors, color])
    }
  }

  const handleSelectAll = () => {
    setSelectedColors([...selectedColors, ...colorArray])
  }

  const handleDeselectAll = () => {
    setSelectedColors(selectedColors.filter((c) => !colorArray.includes(c)))
  }

  const handleMainCheckboxClick = () => {
    if (selectedColors.some((c) => colorArray.includes(c))) {
      handleDeselectAll()
    } else {
      handleSelectAll()
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-4 justify-between">
        <div className="flex flex-row gap-4 items-center">
          <input
            type="checkbox"
            checked={selectedColors.some((c) => colorArray.includes(c))}
            className="color-checkbox"
            onChange={handleMainCheckboxClick}
          />
          <button
            className="min-w-[40px] h-10 flex items-center justify-center"
            onClick={() => setIsOpen(!isOpen)}
          >
            <ChevronDownIcon
              style={{
                transition: "transform 0.3s ease-in-out",
                transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
              }}
              className="w-6 h-6"
            />
          </button>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div
                onClick={() => handleCopyColor(colorArray[0])}
                className="min-w-[40px] h-10 border-2 border-black cursor-pointer"
                style={{ backgroundColor: colorArray[0].hex }}
              />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className="bg-black text-white px-2 py-1 rounded text-sm"
                sideOffset={5}
              >
                {colorArray[0].hex}
                <Tooltip.Arrow className="fill-black" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>

        <button
          className="min-w-[40px] h-10 flex items-center justify-center"
          onClick={() => handleDeleteColorArr(arrIndex)}
        >
          <XMarkIcon className="w-8 h-8" />
        </button>
      </div>
      <div
        className="flex flex-col gap-2 overflow-hidden"
        style={{
          transition: "max-height 0.3s ease-in-out",
          maxHeight: isOpen ? colorArray.length * 80 + "px" : "0px",
        }}
      >
        {colorArray.map((color, index) => (
          <div className="flex flex-row gap-4">
            <div className="min-w-[40px] h-10 flex items-center justify-center text-base">
              <input
                type="checkbox"
                checked={selectedColors.includes(color)}
                className="color-checkbox"
                onChange={() => handleCheckboxClick(color)}
              />
            </div>
            <div className="min-w-[40px] h-10 border border-black flex items-center justify-center text-base">
              {color.prevalence > 0.01
                ? (color.prevalence * 100).toFixed(0) + "%"
                : "<1%"}
            </div>
            <input
              type="text"
              className="w-full border border-grey p-1 p-y-2 text-xl"
              value={color.name}
              onChange={(e) => {
                handleChangeColor(arrIndex, index, {
                  ...color,
                  name: e.target.value,
                })
              }}
            />
            <button
              className="min-w-[40px] h-10 flex items-center justify-center"
              onClick={() => handleDeleteColor(arrIndex, index)}
            >
              <XMarkIcon className="w-8 h-8" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
