import { Check, ChevronDown, Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { CollapsibleBox } from "../CollapsibleBox"

interface MultiSelectDropdownProps<T> {
  selected: T[]
  items: T[]
  renderItem: (item: T) => React.ReactNode
  renderSelected: (selected: T[]) => React.ReactNode
  onSelect: (items: T[]) => void
  keyExtractor?: (item: T) => string | number
  width?: string
  renderFooter?: () => React.ReactNode
  isSearchable?: boolean
  placeholder?: string
  isVisible?: boolean
}

export const MultiSelectDropdown = <T,>({
  selected,
  items,
  renderItem,
  renderSelected,
  onSelect,
  keyExtractor,
  width = "100%",
  renderFooter,
  isSearchable = false,
  placeholder = "Select options",
  isVisible = true,
}: MultiSelectDropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isItemSelected = (item: T) => {
    if (keyExtractor) {
      return selected.some(s => keyExtractor(s) === keyExtractor(item))
    }
    return selected.includes(item)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleItemClick = (item: T) => {
    const isSelected = isItemSelected(item)
    const newSelected = isSelected
      ? selected.filter((i) => keyExtractor ? keyExtractor(i) !== keyExtractor(item) : i !== item)
      : [...selected, item]
    onSelect(newSelected)
  }

  const filteredItems = items.filter((item) => {
    if (!isSearchable) return true
    const itemString = String(renderItem(item)).toLowerCase()
    return itemString.includes(searchTerm.toLowerCase())
  })

  return (
    <div
      className={`relative text-[12px] grow`}
      style={{ width }}
      ref={dropdownRef}
    >
      <CollapsibleBox isOpen={isVisible} maxHeight="100px">
        {isOpen ? (
          <div className="flex items-center border border-gray-200 rounded bg-white">
            {isSearchable && (
              <div className="flex items-center gap-2 px-3 py-2 flex-grow">
                <Search size={14} className="text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full outline-none text-[12px]"
                  autoFocus
                />
              </div>
            )}
            {!isSearchable && (
              <div className="flex items-center gap-2 px-3 py-2 flex-grow text-ellipsis whitespace-nowrap overflow-hidden w-full">
                {selected.length > 0 ? (
                  <span className="text-gray-800">{renderSelected(selected)}</span>
                ) : (
                  <span className="text-gray-400 text-ellipsis overflow-hidden">
                    {placeholder}
                  </span>
                )}
              </div>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className={`px-2 py-2 flex items-center`}
            >
              <ChevronDown size={16} className="text-gray-400 rotate-180 transition-transform" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className="w-full flex justify-between items-center border border-gray-200 rounded px-3 py-2 text-ellipsis overflow-hidden bg-white hover:border-gray-300 transition-colors"
          >
            {selected.length > 0 ? (
              <span className="text-gray-800 truncate">{renderSelected(selected)}</span>
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
            <ChevronDown size={16} className="text-gray-400" />
          </button>
        )}
      </CollapsibleBox>

      {isOpen && (
        <div className="absolute w-full border border-gray-200 mt-1 bg-white z-50 max-h-48 overflow-y-auto rounded shadow-lg">
          {filteredItems.map((item, i) => (
            <div
              key={keyExtractor ? String(keyExtractor(item)) : i}
              onClick={() => handleItemClick(item)}
              className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-ellipsis overflow-hidden flex items-center gap-2 text-gray-700 transition-colors"
            >
              <div className="w-4 h-4 flex items-center justify-center">
                {isItemSelected(item) && <Check size={14} className="text-emerald-600" />}
              </div>
              {renderItem(item)}
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="px-3 py-2 text-gray-400 text-[11px] text-center">
              No items found
            </div>
          )}
          {renderFooter && <div className="border-t border-gray-200">{renderFooter()}</div>}
        </div>
      )}
    </div>
  )
}
