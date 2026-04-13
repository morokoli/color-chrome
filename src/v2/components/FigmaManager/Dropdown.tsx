import { ChevronDown, Search } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { CollapsibleBox } from "../CollapsibleBox"

interface DropdownProps<T> {
  selected: T | null
  items: T[]
  renderItem: (item: T) => React.ReactNode
  renderSelected: (selected: T) => React.ReactNode
  /** Used for filtering when `isSearchable` is true. */
  getSearchText?: (item: T) => string
  onSelect: (item: T) => void
  width?: string
  renderFooter?: () => React.ReactNode
  /** When true (e.g. "Add sheet" form open), dropdown scrolls so footer is in view */
  footerExpanded?: boolean
  isSearchable?: boolean
  placeholder?: string
  isVisible?: boolean
  usePortal?: boolean
  /** When searching, filter from this list (e.g. full folder list) */
  itemsWhenSearching?: T[]
}

export const Dropdown = <T,>({
  selected,
  items,
  renderItem,
  renderSelected,
  getSearchText,
  onSelect,
  width = "100%",
  renderFooter,
  footerExpanded = false,
  isSearchable = false,
  placeholder = "Select an option",
  isVisible = true,
  usePortal = false,
  itemsWhenSearching,
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

  const listForFilter =
    isSearchable && searchTerm.trim() !== "" && itemsWhenSearching !== undefined
      ? itemsWhenSearching
      : items

  const filteredItems = listForFilter.filter((item) => {
    if (!isSearchable) return true
    const itemString = (getSearchText ? getSearchText(item) : "").toLowerCase()
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
          <div className="flex items-center min-h-[40px] border border-gray-200 rounded bg-white">
            {isSearchable && (
            <div className="flex items-center gap-2 px-3 py-2 flex-1 min-w-0">
              <Search size={14} className="shrink-0 text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full min-w-0 outline-none text-[12px]"
                autoFocus
              />
            </div>
          )}
          {!isSearchable && (
            <div className="flex items-center gap-2 px-3 py-2 flex-1 min-w-0 overflow-hidden">
              {selected ? (
                <span className="text-gray-800 truncate">{renderSelected(selected)}</span>
              ) : (
                <span className="text-gray-400 truncate">{placeholder}</span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="shrink-0 px-2 py-2 flex items-center justify-center text-gray-600 hover:text-gray-900"
            aria-label="Close list"
          >
            <ChevronDown size={18} strokeWidth={2.25} className="rotate-180 transition-transform" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center gap-2 border border-gray-200 rounded px-3 py-2 min-h-[40px] bg-white hover:border-gray-300 transition-colors text-left"
        >
          <span className="min-w-0 flex-1 truncate text-gray-800">
            {selected ? renderSelected(selected) : <span className="text-gray-400">{placeholder}</span>}
          </span>
          <span className="shrink-0 flex items-center justify-center text-gray-600" aria-hidden>
            <ChevronDown size={18} strokeWidth={2.25} />
          </span>
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
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-gray-700 transition-colors min-w-0"
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
                  className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-gray-700 transition-colors min-w-0"
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
