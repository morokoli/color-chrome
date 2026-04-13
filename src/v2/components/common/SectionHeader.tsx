import { FC, useState, useRef, useCallback } from "react"
import { ArrowLeft, ChevronDown } from "lucide-react"
import { useClickOutside } from "@/v2/hooks/useClickOutside"
import { SECTION_MENU_ITEMS } from "@/v2/constants/sectionMenu"

export interface SectionHeaderProps {
  title: string
  setTab: (tab: string | null) => void
  onPickColor?: () => void
  onPickColorFromBrowser?: () => void
  extraRight?: React.ReactNode
  /** Optional class for the header container */
  className?: string
}

const SectionHeader: FC<SectionHeaderProps> = ({
  title,
  setTab,
  onPickColor,
  onPickColorFromBrowser,
  extraRight,
  className = "",
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [headingHover, setHeadingHover] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useClickOutside(dropdownRef, useCallback(() => setDropdownOpen(false), []))

  const handleItemClick = (item: (typeof SECTION_MENU_ITEMS)[number]) => {
    if (item.actionKey === "pickColor" && onPickColor) {
      onPickColor()
    } else if (item.actionKey === "pickFromBrowser" && onPickColorFromBrowser) {
      onPickColorFromBrowser()
    } else if (item.menuName != null) {
      setTab(item.menuName)
    }
    setDropdownOpen(false)
  }

  const showChevron = headingHover || dropdownOpen

  return (
    <div
      className={`flex items-center justify-between px-3 py-2 border-b border-gray-200 flex-shrink-0 ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1 relative" ref={dropdownRef}>
        <button
          onClick={() => setTab(null)}
          className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          title="Back to menu"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div
          className="flex items-center gap-1 min-w-0 cursor-pointer rounded px-1 py-0.5 -mx-1"
          onMouseEnter={() => setHeadingHover(true)}
          onMouseLeave={() => setHeadingHover(false)}
          onClick={() => setDropdownOpen((o) => !o)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setDropdownOpen((o) => !o)
            }
          }}
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
        >
          <span className="text-[13px] font-medium text-gray-800 truncate">{title}</span>
          <span
            className={`flex-shrink-0 transition-opacity ${showChevron ? "opacity-100" : "opacity-0"}`}
          >
            <ChevronDown className="w-4 h-4 text-gray-600" strokeWidth={2.25} />
          </span>
        </div>
        {dropdownOpen && (
          <div
            className="absolute left-0 top-full mt-0.5 z-50 min-w-[200px] max-h-[70vh] overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg py-1"
            style={{ marginLeft: "36px" }}
          >
            {SECTION_MENU_ITEMS.map((item) => {
              const Icon = item.Icon
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-100 transition-colors cursor-pointer text-[13px] text-gray-800"
                >
                  <Icon className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  <span className="truncate">{item.title}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
      {extraRight != null && <div className="flex items-center flex-shrink-0">{extraRight}</div>}
    </div>
  )
}

export default SectionHeader
