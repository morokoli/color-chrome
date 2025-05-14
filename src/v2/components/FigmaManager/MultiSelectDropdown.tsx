import { Check, ChevronDown, Search } from "lucide-react"
import { useState } from "react"

interface MultiSelectDropdownProps<T> {
  selected: T[]
  items: T[]
  renderItem: (item: T) => React.ReactNode
  renderSelected: (selected: T[]) => React.ReactNode
  onSelect: (items: T[]) => void
  width?: string
  renderFooter?: () => React.ReactNode
}

export const MultiSelectDropdown = <T,>({
  selected,
  items,
  renderItem,
  renderSelected,
  onSelect,
  width = "100%",
  renderFooter,
}: MultiSelectDropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const handleItemClick = (item: T) => {
    const isSelected = selected.includes(item)
    const newSelected = isSelected
      ? selected.filter((i) => i !== item)
      : [...selected, item]
    onSelect(newSelected)
  }

  const filteredItems = items.filter((item) => {
    const itemString = String(renderItem(item)).toLowerCase()
    return itemString.includes(searchTerm.toLowerCase())
  })

  return (
    <div className={`relative text-sm grow`} style={{ width }}>
      {isOpen ? (
        <div className="flex items-center border">
          <div className="flex items-center gap-2 px-3 py-2 flex-grow">
            <Search size={16} className="text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full outline-none text-sm"
              autoFocus
            />
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="px-3 py-2 border-l flex items-center"
          >
            <ChevronDown size={18} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex justify-between items-center border px-3 py-2 text-ellipsis overflow-hidden"
        >
          {renderSelected(selected)}
          <ChevronDown size={18} />
        </button>
      )}

      {isOpen && (
        <div className="absolute w-full border mt-1 bg-white z-10 max-h-60 overflow-y-auto">
          {filteredItems.map((item, i) => (
            <div
              key={i}
              onClick={() => handleItemClick(item)}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b text-ellipsis overflow-hidden flex items-center gap-2"
            >
              <div className="w-4 h-4 flex items-center justify-center">
                {selected.includes(item) && <Check size={14} />}
              </div>
              {renderItem(item)}
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="px-3 py-2 text-gray-500 text-sm text-center">
              No items found
            </div>
          )}
          {renderFooter && <div className="border-t">{renderFooter()}</div>}
        </div>
      )}
    </div>
  )
} 