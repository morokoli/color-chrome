import { Check, ChevronDown, Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { CollapsibleBox } from "../CollapsibleBox"

interface MultiSelectDropdownProps<T> {
  selected: T[]
  items: T[]
  renderItem: (item: T) => React.ReactNode
  renderSelected: (selected: T[]) => React.ReactNode
  /** Used for filtering when `isSearchable` is true. */
  getSearchText?: (item: T) => string
  onSelect: (items: T[]) => void
  keyExtractor?: (item: T) => string | number
  width?: string
  renderFooter?: () => React.ReactNode
  isSearchable?: boolean
  placeholder?: string
  isVisible?: boolean
  checkboxAtEnd?: boolean // If true, shows checkbox at end instead of check icon at beginning
  /** Shown between the label and the checkbox when `checkboxAtEnd`; parent row uses `group` for hover styles */
  renderTrailingActions?: (item: T) => React.ReactNode
  openUpward?: boolean // If true, opens dropdown upward instead of downward
  usePortal?: boolean // If true, render menu in portal (fixed position) so it floats above modals
  emptyMessage?: string // Custom message when no items are available
  /** When searching, list from this source (e.g. full tree) so collapsed rows can still be found */
  itemsWhenSearching?: T[]
  /** Sticky first row inside menu (e.g. Expand/Collapse + Select all). */
  renderHeader?: () => React.ReactNode
  /**
   * When set with `isSearchable`, the search field is not shown in the trigger row while open;
   * instead you receive a ready-made `searchField` node to place inside your header (e.g. between chevron and checkbox).
   */
  renderHeaderWithSearch?: (searchField: React.ReactNode) => React.ReactNode
  /** Scrollable list max height when `renderFooter` is set (Tailwind class). Default max-h-[140px]. */
  listMaxHeightClass?: string
  /** Whole menu max height when `renderFooter` is set (Tailwind class). Default max-h-[280px]. */
  menuMaxHeightClass?: string
}

export const MultiSelectDropdown = <T,>({
  selected,
  items,
  renderItem,
  renderSelected,
  getSearchText,
  onSelect,
  keyExtractor,
  width = "100%",
  renderFooter,
  isSearchable = false,
  placeholder = "Select options",
  isVisible = true,
  checkboxAtEnd = false,
  renderTrailingActions,
  openUpward = false,
  usePortal = false,
  emptyMessage = "No items found",
  itemsWhenSearching,
  renderHeader,
  renderHeaderWithSearch,
  listMaxHeightClass,
  menuMaxHeightClass,
}: MultiSelectDropdownProps<T>) => {
  const footerListMax =
    listMaxHeightClass ?? (renderFooter ? "max-h-[140px]" : "")
  const footerMenuMax =
    menuMaxHeightClass ?? (renderFooter ? "max-h-[280px]" : "")
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const isItemSelected = (item: T) => {
    if (keyExtractor) {
      return selected.some(s => keyExtractor(s) === keyExtractor(item))
    }
    return selected.includes(item)
  }

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
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    } else if (!usePortal) {
      setMenuPosition(null)
    } else if (!isOpen) {
      setMenuPosition(null)
    }
  }, [isOpen, usePortal])

  const handleItemClick = (item: T) => {
    const isSelected = isItemSelected(item)
    const newSelected = isSelected
      ? selected.filter((i) => keyExtractor ? keyExtractor(i) !== keyExtractor(item) : i !== item)
      : [...selected, item]
    onSelect(newSelected)
  }

  const listForFilter =
    isSearchable && searchTerm.trim() !== "" && itemsWhenSearching !== undefined
      ? itemsWhenSearching
      : items

  const filteredItems = listForFilter.filter((item) => {
    if (!isSearchable) return true
    const itemString = (getSearchText
      ? getSearchText(item)
      : keyExtractor
        ? String(keyExtractor(item))
        : ""
    ).toLowerCase()
    return itemString.includes(searchTerm.toLowerCase())
  })

  const searchInTriggerWhileOpen = isSearchable && !renderHeaderWithSearch

  const headerSearchField = (
    <div className="flex items-center gap-1.5 min-w-0 w-full">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search folders..."
        className="w-full min-w-0 outline-none text-[12px] bg-gray-50 border border-gray-200 rounded px-2 py-1"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        aria-label="Search folders"
      />
    </div>
  )

  useEffect(() => {
    if (!isOpen && renderHeaderWithSearch) {
      setSearchTerm("")
    }
  }, [isOpen, renderHeaderWithSearch])

  const menuContent = (
    <>
      <div
        className={`overflow-y-auto overscroll-contain ${renderFooter ? footerListMax : ""}`}
      >
        {renderHeaderWithSearch && isSearchable ? (
          <div className="sticky top-0 z-[1] bg-white border-b border-gray-100">
            {renderHeaderWithSearch(headerSearchField)}
          </div>
        ) : (
          renderHeader && (
            <div className="sticky top-0 z-[1] bg-white border-b border-gray-100">
              {renderHeader()}
            </div>
          )
        )}
        {filteredItems.map((item, i) => {
          const isSelected = isItemSelected(item)
          return (
            <div
              key={keyExtractor ? String(keyExtractor(item)) : i}
              onClick={() => handleItemClick(item)}
              className="group px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2 text-gray-700 transition-colors min-w-0"
            >
              {!checkboxAtEnd && (
                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                  {isSelected && <Check size={14} className="text-emerald-600" />}
                </div>
              )}
              <div className="min-w-0 flex-1">{renderItem(item)}</div>
              {checkboxAtEnd && (
                <div className="flex shrink-0 items-center gap-1.5">
                  {renderTrailingActions && (
                    <div
                      className="flex shrink-0 items-center justify-center opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {renderTrailingActions(item)}
                    </div>
                  )}
                  <div className="relative flex-shrink-0" style={{ width: "16px", height: "16px" }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleItemClick(item)}
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-pointer"
                      style={{
                        appearance: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                        width: "16px",
                        height: "16px",
                        minWidth: "16px",
                        minHeight: "16px",
                        border: isSelected ? "1.5px solid #000000" : "1.5px solid #d1d5db",
                        borderRadius: "3px",
                        backgroundColor: isSelected ? "#000000" : "#ffffff",
                        transition: "all 0.15s ease-in-out",
                        outline: "none",
                        position: "relative",
                        flexShrink: 0,
                        margin: 0,
                        padding: 0,
                        boxSizing: "border-box",
                        imageRendering: "crisp-edges",
                        WebkitFontSmoothing: "antialiased",
                        MozOsxFontSmoothing: "grayscale",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = "#9ca3af"
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = "#d1d5db"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.boxShadow = "0 0 0 2px rgba(0, 0, 0, 0.1)"
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.boxShadow = "none"
                      }}
                    />
                    {isSelected && (
                      <svg
                        className="absolute pointer-events-none"
                        style={{
                          width: "10px",
                          height: "10px",
                          left: "50%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          strokeWidth: "2.5",
                          imageRendering: "crisp-edges",
                          shapeRendering: "geometricPrecision",
                        }}
                        viewBox="0 0 10 10"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M8 2.5L4 6.5L2.5 5"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {filteredItems.length === 0 && emptyMessage && (
          <div className="px-3 py-2 text-gray-400 text-[11px] text-center">{emptyMessage}</div>
        )}
      </div>
      {renderFooter && <div className="border-t border-gray-200 flex-shrink-0">{renderFooter()}</div>}
    </>
  )

  const menuClass = `border border-gray-200 bg-white z-[100] rounded shadow-lg flex flex-col ${
    renderFooter ? footerMenuMax : "max-h-48 overflow-y-auto"
  }`

  return (
    <div
      className={`relative text-[12px] grow`}
      style={{ width }}
      ref={dropdownRef}
    >
      <CollapsibleBox isOpen={isVisible} maxHeight="120px">
        {isOpen ? (
          <div className="flex items-center min-h-[40px] border border-gray-200 rounded bg-white">
            {searchInTriggerWhileOpen && (
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
            {!searchInTriggerWhileOpen && (
              <div className="flex items-center gap-2 px-3 py-2 flex-1 min-w-0 overflow-hidden">
                {selected.length > 0 ? (
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
              {selected.length > 0 ? renderSelected(selected) : <span className="text-gray-400">{placeholder}</span>}
            </span>
            <span className="shrink-0 flex items-center justify-center text-gray-600" aria-hidden>
              <ChevronDown size={18} strokeWidth={2.25} />
            </span>
          </button>
        )}
      </CollapsibleBox>

      {isOpen &&
        (usePortal && menuPosition ? (
          createPortal(
            <div
              ref={menuRef}
              className={menuClass}
              style={{
                position: "fixed",
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                width: `${menuPosition.width}px`,
              }}
            >
              {menuContent}
            </div>,
            document.body
          )
        ) : (
          <div
            className={`absolute w-full ${menuClass} ${openUpward ? "bottom-full mb-1" : "top-full mt-1"}`}
          >
            {menuContent}
          </div>
        ))}
    </div>
  )
}
