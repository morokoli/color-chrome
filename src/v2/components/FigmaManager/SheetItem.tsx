import { useState } from "react"
import { RowData, SheetData } from "@/v2/types/general"
import * as Tooltip from "@radix-ui/react-tooltip"
import { ChevronDown, X } from "lucide-react"

interface SheetItemProps {
  sheet: {
    spreadsheetId: string
    sheetId: string
    sheetName: string
    colorHistory: any[]
  }
  hueFilter: [number, number]
  saturationFilter: [number, number]
  lightnessFilter: [number, number]
  rankingFilter: [number, number]
  searchQuery: string
  onColorClick: (color: RowData, sheetData: SheetData, rowIndex: number) => void
  onRemove: (spreadsheetId: string) => void
}

const SheetItem: React.FC<SheetItemProps> = ({
  sheet,
  hueFilter,
  saturationFilter,
  lightnessFilter,
  rankingFilter,
  searchQuery,
  onColorClick,
  onRemove,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div key={sheet.spreadsheetId} className="mb-4">
      <div className="flex mb-2 items-center gap-2 border-b">
        <button className="p-2" onClick={() => setIsCollapsed(!isCollapsed)}>
          <ChevronDown
            size={16}
            style={{
              transformOrigin: "center",
              transform: `rotate(${isCollapsed ? -90 : 0}deg)`,
              transition: "transform 0.2s ease-in-out",
            }}
          />
        </button>
        <div className="flex-grow p-2 flex items-center justify-between">
          <span>{sheet.sheetName}</span>
        </div>
        <button className="p-2" onClick={() => onRemove(sheet.spreadsheetId)}>
          <X size={16} />
        </button>
      </div>

      <div
        className="w-[355px] relative"
        style={{
          maxHeight: isCollapsed ? 0 : (sheet.colorHistory.length * 21) / 17 + 20,
          overflow: "hidden",
          transition: "max-height 0.2s ease-in-out",
        }}
      >
        <div className="flex flex-wrap content-baseline">
          <Tooltip.Provider>
            {(sheet.colorHistory || [])
              .slice()
              .reverse()
              .filter((color: any) => {
                return (
                  color.hue >= hueFilter[0] &&
                  color.hue <= hueFilter[1] &&
                  color.saturation >= saturationFilter[0] &&
                  color.saturation <= saturationFilter[1] &&
                  color.lightness >= lightnessFilter[0] &&
                  color.lightness <= lightnessFilter[1] &&
                  ((color.ranking >= rankingFilter[0] &&
                    color.ranking <= rankingFilter[1]) ||
                    ([undefined, null, "", "0"].includes(color.ranking) &&
                      rankingFilter[0] === 1)) &&
                  (color.slash_naming
                    ?.toLowerCase()
                    ?.includes(searchQuery.toLowerCase()) ||
                    searchQuery.length == 0)
                )
              })
              .map((color: RowData, index: number) => (
                <Tooltip.Root key={color.hex + index}>
                  <Tooltip.Trigger asChild>
                    <div
                      style={{ backgroundColor: color.hex }}
                      className="w-[20px] h-[21px] cursor-pointer border border-darkgrey"
                      onClick={() =>
                        onColorClick(
                          color,
                          {
                            sheetId: sheet.sheetId,
                            sheetName: sheet.sheetName,
                            spreadsheetId: sheet.spreadsheetId,
                          },
                          index + 1,
                        )
                      }
                    />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="bg-white rounded-md shadow-lg p-2 text-sm"
                      sideOffset={5}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="font-medium">Color Information</div>
                        <div>Hex: {color.hex}</div>
                        {color.rgb && <div>RGB: {color.rgb}</div>}
                        {color.hsl && <div>HSL: {color.hsl}</div>}
                        {color.slash_naming && (
                          <div>Slash Naming: {color.slash_naming}</div>
                        )}
                        {color.comments && (
                          <div>Comments: {color.comments}</div>
                        )}
                        {color.additionalColumns.map((column) => (
                          <div key={column.name}>
                            {column.name}: {column.value}
                          </div>
                        ))}
                      </div>
                      <Tooltip.Arrow className="fill-white" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              ))}
          </Tooltip.Provider>
        </div>
      </div>
    </div>
  )
}

export default SheetItem
