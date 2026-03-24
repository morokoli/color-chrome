import { ChevronDown, Search } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { CollapsibleBox } from "../CollapsibleBox"

interface DropdownProps<T> {
  selected: T | null
  items: T[]
  renderItem: (item: T) => React.ReactNode
  renderSelected: (selected: T) => React.ReactNode
  onSelect: (item: T) => void
  width?: string
  renderFooter?: () => React.ReactNode
  /** When true (e.g. "Add sheet" form open), dropdown scrolls so footer is in view */
  footerExpanded?: boolean
  isSearchable?: boolean
  placeholder?: string
  isVisible?: boolean
  usePortal?: boolean
}

export const Dropdown = <T,>({
  selected,
  items,
  renderItem,
  renderSelected,
  onSelect,
  width = "100%",
  renderFooter,
  footerExpanded = false,
  isSearchable = false,
  placeholder = "Select an option",
  isVisible = true,
  usePortal = false,
}: DropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null)

  // When footer expands (e.g. "Add sheet" form), scroll so it's visible
  useEffect(() => {
    if (footerExpanded && menuRef.current && renderFooter) {
      requestAnimationFrame(() => {
        if (menuRef.current) {
          menuRef.current.scrollTop = menuRef.current.scrollHeight
        }
      })
    }
  }, [footerExpanded, renderFooter])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (usePortal) {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node) &&
          menuRef.current &&
          !menuRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false)
          setMenuPosition(null)
        }
      } else {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false)
        }
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, usePortal])

  useEffect(() => {
    if (isOpen && dropdownRef.current && usePortal) {
      const rect = dropdownRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 4, // Fixed positioning is relative to viewport
        left: rect.left,
        width: rect.width,
      })
    } else {
      setMenuPosition(null)
    }
  }, [isOpen, usePortal])

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
      <CollapsibleBox isOpen={isVisible} maxHeight="800px">
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
              {selected ? (
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
            <ChevronDown size={16} className="min-w-[16px] text-gray-400 rotate-180 transition-transform" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex justify-between items-center border border-gray-200 rounded px-3 py-2 text-ellipsis overflow-hidden bg-white hover:border-gray-300 transition-colors"
        >
          {selected ? (
            <span className="text-gray-800 truncate">{renderSelected(selected)}</span>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
          <ChevronDown size={16} className="min-w-[16px] text-gray-400" />
        </button>
        )}
      </CollapsibleBox>

      {isOpen && (
        usePortal && menuPosition ? (
          createPortal(
            <div
              ref={menuRef}
              className={`fixed border border-gray-200 bg-white z-[100] overflow-y-auto rounded shadow-lg ${renderFooter ? "max-h-80" : "max-h-48"}`}
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                width: `${menuPosition.width}px`,
              }}
            >
              <div className="overflow-y-auto overscroll-contain flex-1">
                {filteredItems.map((item, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      onSelect(item)
                      setIsOpen(false)
                      setMenuPosition(null)
                    }}
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-gray-700 text-ellipsis overflow-hidden transition-colors"
                  >
                    {renderItem(item)}
                  </div>
                ))}
                {filteredItems.length === 0 && (
                  <div className="px-3 py-2 text-gray-400 text-[11px] text-center">
                    No items found
                  </div>
                )}
              </div>
              {renderFooter && <div className="border-t border-gray-200 flex-shrink-0">{renderFooter()}</div>}
            </div>,
            document.body
          )
        ) : (
          <div className={`absolute w-full border border-gray-200 mt-1 bg-white z-[60] rounded shadow-lg flex flex-col max-h-48`}>
            <div className="overflow-y-auto overscroll-contain flex-1">
              {filteredItems.map((item, i) => (
                <div
                  key={i}
                  onClick={() => {
                    onSelect(item)
                    setIsOpen(false)
                  }}
                  className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-gray-700 text-ellipsis overflow-hidden transition-colors"
                >
                  {renderItem(item)}
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="px-3 py-2 text-gray-400 text-[11px] text-center">
                  No items found
                </div>
              )}
            </div>
            {renderFooter && <div className="border-t border-gray-200 flex-shrink-0">{renderFooter()}</div>}
          </div>
        )
      )}
    </div>
  )
}
