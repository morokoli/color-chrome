import { XMarkIcon } from "@heroicons/react/24/outline"

import { ChevronDownIcon } from "@heroicons/react/24/outline"
import * as Tooltip from "@radix-ui/react-tooltip"
import { useState } from "react"
import type { Color } from "./index"

export const ColorDropdown = ({
  colorArray,
  handleChangeColor,
  arrIndex,
  handleDeleteColor,
  handleDeleteColorArr,
}: {
  colorArray: Color[]
  handleChangeColor: (arrIndex: number, index: number, color: Color) => void
  arrIndex: number
  handleDeleteColor: (arrIndex: number, index: number) => void
  handleDeleteColorArr: (index: number) => void
}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-4 justify-between">
        <div className="flex flex-row gap-4">
          <button
            className="min-w-[40px] h-10 flex items-center justify-center"
            onClick={() => setIsOpen(!isOpen)}
          >
            <ChevronDownIcon
              style={{
                transition: "transform 0.3s ease-in-out",
                transform: isOpen ? "rotate(-90deg)" : "rotate(0deg)",
              }}
              className="w-6 h-6"
            />
          </button>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div
                className="min-w-[40px] h-10 border-2 border-black"
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
          <div className="flex flex-row gap-4 pl-14">
            <div className="min-w-[40px] h-10 border border-black flex items-center justify-center text-base">
              {color.prevalence > 0.01
                ? (color.prevalence * 100).toFixed(0) + "%"
                : "<1%"}
            </div>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <div
                  className="min-w-[40px] h-10 border-2 border-black"
                  style={{ backgroundColor: color.hex }}
                />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="bg-black text-white px-2 py-1 rounded text-sm"
                  sideOffset={5}
                >
                  {color.hex}
                  <Tooltip.Arrow className="fill-black" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
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
