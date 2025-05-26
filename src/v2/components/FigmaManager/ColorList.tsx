import * as Tooltip from "@radix-ui/react-tooltip"
import { X } from "lucide-react"

interface ColorListProps {
  colors: ColorItem[]
  activeColors: number[]
  onCheckboxClick: (colorId: number) => void
  onRemoveColor: (color: string) => void
  handleManualSlashNamingChange: (colorId: number, slashNaming: string) => void
}

interface ColorItem {
  color: {
    hsl?: string
    rgb?: string
    hex: string
    ranking?: string | number
    comments?: string
    tags?: string
    additionalColumns?: {
      name: string
      value: string
    }[]
  }
  animated?: number
  slashNaming: string
}

export const ColorList = ({
  colors,
  activeColors,
  onCheckboxClick,
  onRemoveColor,
  handleManualSlashNamingChange,
}: ColorListProps) => {
  return (
    <>
      {colors.length > 0 && (
        <div className={`flex p-1`}>
          <input
            type="checkbox"
            checked={activeColors.length > 0}
            className="mr-2"
            onChange={() => {
              onCheckboxClick(colors.length)
            }}
          />
        </div>
      )}
      {Array.isArray(colors) &&
        colors.map((item, i) => {
          const isDuplicate = !!item.animated && item.animated >= 1
          return (
            <div
              key={item.color.hex + i}
              className={`flex items-center p-1 animate-highlight`}
              style={{
                animation: isDuplicate
                  ? "highlight 2s ease-in-out infinite"
                  : "none",
              }}
            >
              <input
                type="checkbox"
                checked={activeColors.includes(i)}
                className="mr-2"
                onChange={() => onCheckboxClick(i)}
              />
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <div
                      className="w-8 h-8 border mr-2"
                      style={{ backgroundColor: item.color.hex }}
                    />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="bg-white rounded-md shadow-lg p-2 text-sm"
                      sideOffset={5}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="font-medium">Color Information</div>
                        <div>Hex: {item.color.hex}</div>
                        {item.color.rgb && <div>RGB: {item.color.rgb}</div>}
                        {item.color.hsl && <div>HSL: {item.color.hsl}</div>}
                        {item.color.additionalColumns &&
                          item.color.additionalColumns.map((column) => (
                            <div key={column.name}>
                              {column.name}: {column.value}
                            </div>
                          ))}
                      </div>
                      <Tooltip.Arrow className="fill-white" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
              <input
                type="text"
                className="border p-2 flex-grow bg-gray-100 rounded"
                value={item.slashNaming || "No slashNaming"}
                onChange={(e) =>
                  handleManualSlashNamingChange(i, e.target.value)
                }
              />
              <button
                className="border p-2 ml-2"
                onClick={() => onRemoveColor(item.color.hex)}
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
    </>
  )
}
