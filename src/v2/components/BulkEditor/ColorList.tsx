import * as Tooltip from "@radix-ui/react-tooltip"
import { X, Check, Trash2 } from "lucide-react"
import { SelectedColor } from "@/v2/api/folders.api"

interface ColorListProps {
  colors: SelectedColor[]
  activeColors: number[]
  onCheckboxClick: (colorId: number) => void
  onRemoveColor: (colorId: number) => void
  handleManualslash_namingChange: (colorId: number, slash_naming: string) => void
  clearColors: () => void
}

export const ColorList = ({
  colors,
  activeColors,
  onCheckboxClick,
  onRemoveColor,
  handleManualslash_namingChange,
  clearColors,
}: ColorListProps) => {
  const allSelected = activeColors.length === colors.length && colors.length > 0

  return (
    <div className="space-y-2">
      {colors.length > 0 && (
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <button
            onClick={() => onCheckboxClick(colors.length)}
            className={`flex items-center gap-2 px-2 py-1 text-[11px] rounded transition-colors ${
              allSelected
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Check size={12} />
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          <button
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 rounded transition-colors"
            onClick={() => clearColors()}
          >
            <Trash2 size={12} />
            Clear
          </button>
        </div>
      )}

      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
        {Array.isArray(colors) &&
          colors.map((item, i) => {
            const isSelected = activeColors.includes(i)
            return (
              <div
                key={`${item.color._id}_${i}`}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-gray-300 bg-gray-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <button
                  onClick={() => onCheckboxClick(i)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-gray-900 border-gray-900'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {isSelected && <Check size={12} className="text-white" />}
                </button>

                <Tooltip.Provider>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <div
                        className="w-9 h-9 rounded-md border border-gray-200 flex-shrink-0 cursor-pointer shadow-sm"
                        style={{ backgroundColor: item.color.hex }}
                      />
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="bg-white rounded-lg shadow-lg p-3 text-[11px] border border-gray-100 z-50"
                        sideOffset={5}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="font-medium text-gray-900 mb-1">Color Info</div>
                          <div className="text-gray-600">Hex: <span className="font-mono">{item.color.hex}</span></div>
                          {item.color.rgb && (
                            <div className="text-gray-600">
                              RGB: <span className="font-mono">
                                {typeof item.color.rgb === 'string' 
                                  ? item.color.rgb 
                                  : `rgb(${item.color.rgb.r}, ${item.color.rgb.g}, ${item.color.rgb.b})`}
                              </span>
                            </div>
                          )}
                          {item.color.hsl && (
                            <div className="text-gray-600">
                              HSL: <span className="font-mono">
                                {typeof item.color.hsl === 'string' 
                                  ? item.color.hsl 
                                  : `hsl(${item.color.hsl.h}, ${item.color.hsl.s}%, ${item.color.hsl.l}%)`}
                              </span>
                            </div>
                          )}
                          <div className="text-gray-600">Folder: <span className="font-medium">{item.folderName}</span></div>
                          {item.color.additionalColumns &&
                            item.color.additionalColumns.map((column) => (
                              <div key={column.name} className="text-gray-600">
                                {column.name}: {column.value}
                              </div>
                            ))}
                        </div>
                        <Tooltip.Arrow className="fill-white" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>

                <div className="flex-grow flex flex-col gap-1">
                  <input
                    type="text"
                    className="w-full px-2.5 py-1.5 text-[12px] border border-gray-200 rounded-md bg-white focus:outline-none focus:border-gray-400 transition-colors"
                    placeholder="Color name..."
                    value={item.color.slash_naming || ""}
                    onChange={(e) =>
                      handleManualslash_namingChange(i, e.target.value)
                    }
                  />
                  {item.color.tags && item.color.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.color.tags.map((tag, tagIdx) => (
                        <span
                          key={tagIdx}
                          className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                  onClick={() => onRemoveColor(i)}
                >
                  <X size={14} />
                </button>
              </div>
            )
          })}
      </div>
    </div>
  )
}
