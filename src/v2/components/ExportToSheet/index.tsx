import { FC, useState, useMemo, useCallback } from "react"
import { Check, ChevronDown, Filter, ArrowDownUp } from "lucide-react"
import * as Tooltip from "@radix-ui/react-tooltip"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useToast } from "@/v2/hooks/useToast"
import { useQuery } from "@tanstack/react-query"
import { axiosInstance } from "@/v2/hooks/useAPI"
import { config } from "@/v2/others/config"
import { SheetSelectionModal } from "@/v2/components/BulkEditor/SheetSelectionModal"
import { colors } from "@/v2/helpers/colors"
import SectionHeader from "../common/SectionHeader"
import DualThumbSlider from "../FigmaManager/DualThumbSlider"
import { CollapsibleBox } from "../CollapsibleBox"

const SORT_OPTIONS = [
  { label: "A-Z", value: "a-z", sortBy: "a-z" as const, sortOrder: "asc" as const },
  { label: "Z-A", value: "z-a", sortBy: "a-z" as const, sortOrder: "desc" as const },
  { label: "Newest", value: "newest", sortBy: "newest" as const, sortOrder: "desc" as const },
  { label: "Oldest", value: "oldest", sortBy: "oldest" as const, sortOrder: "asc" as const },
  { label: "Ranking", value: "ranking", sortBy: "ranking" as const, sortOrder: "desc" as const },
]

function getContrastColor(hex: string): "white" | "black" {
  const h = (hex || "#808080").replace("#", "")
  if (h.length !== 6) return "white"
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5 ? "white" : "black"
}

function parseHsl(color: any): { h: number; s: number; l: number } | null {
  if (!color) return null
  if (typeof color.hsl === "object" && "h" in color.hsl) {
    return {
      h: Number(color.hsl.h) || 0,
      s: Number(color.hsl.s) || 0,
      l: Number(color.hsl.l) || 0,
    }
  }
  if (typeof color.hsl === "string") {
    const m = color.hsl.match(/(\d+(\.\d+)?)/g)
    if (m && m.length >= 3) {
      return { h: Number(m[0]) || 0, s: Number(m[1]) || 0, l: Number(m[2]) || 0 }
    }
  }
  try {
    const hsl = colors.hexToHSL(color.hex)
    const m = hsl.match(/(\d+(\.\d+)?)/g)
    if (m && m.length >= 3) {
      return { h: Number(m[0]) || 0, s: Number(m[1]) || 0, l: Number(m[2]) || 0 }
    }
  } catch { }
  return null
}

interface ExportToSheetProps {
  setTab: (tab: string | null) => void
  onPickColor?: () => void
  onPickColorFromBrowser?: () => void
}

export const ExportToSheet: FC<ExportToSheetProps> = ({ setTab, onPickColor, onPickColorFromBrowser }) => {
  const { state, dispatch } = useGlobalState()
  const toast = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOption, setSortOption] = useState("ranking")
  const [filterExpanded, setFilterExpanded] = useState(false)
  const [sortExpanded, setSortExpanded] = useState(false)
  const [hueRange, setHueRange] = useState<[number, number]>([0, 360])
  const [saturationRange, setSaturationRange] = useState<[number, number]>([0, 100])
  const [brightnessRange, setBrightnessRange] = useState<[number, number]>([0, 100])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [sheetModalOpen, setSheetModalOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const toggleGroupCollapse = useCallback((groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
  }, [])

  const sortConfig = SORT_OPTIONS.find((o) => o.value === sortOption) ?? SORT_OPTIONS[4]

  const { data: colorsData, isLoading } = useQuery({
    queryKey: ["colors-and-palettes-export", "folder", sortConfig.sortBy, sortConfig.sortOrder, searchQuery],
    queryFn: async () => {
      const response = await axiosInstance.post(
        config.api.endpoints.getColorsAndPalettes,
        {
          filters: {},
          grouping: { groupBy: "folder" },
          sorting: { sortBy: sortConfig.sortBy === "ranking" ? "rank" : sortConfig.sortBy, sortOrder: sortConfig.sortOrder },
          searchingValue: searchQuery,
        },
        {
          headers: {
            Authorization: `Bearer ${state.user?.jwtToken}`,
          },
        }
      )
      return response.data?.data ?? response.data
    },
    enabled: !!state.user?.jwtToken,
  })

  const groupedColors = useMemo(() => {
    try {
      const cols = colorsData?.colors
      if (!cols) return {}
      const filtered: Record<string, any[]> = {}
      Object.entries(cols).forEach(([groupKey, items]) => {
        const arr = Array.isArray(items) ? items : []
        const list = arr.filter((c: any) => {
          if (!c || !c.hex || c.type === "palette") return false
          const hsl = parseHsl(c)
          if (hsl) {
            if (hsl.h < hueRange[0] || hsl.h > hueRange[1]) return false
            if (hsl.s < saturationRange[0] || hsl.s > saturationRange[1]) return false
            if (hsl.l < brightnessRange[0] || hsl.l > brightnessRange[1]) return false
          }
          return true
        })
        if (list.length > 0) filtered[groupKey] = list
      })
      return filtered
    } catch {
      return {}
    }
  }, [colorsData, hueRange, saturationRange, brightnessRange])

  const filteredColors = useMemo(() => {
    const list: any[] = []
    Object.values(groupedColors).forEach((items) => list.push(...items))
    return list
  }, [groupedColors])

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredColors.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredColors.map((c) => c._id)))
    }
  }, [filteredColors, selectedIds.size])

  const handleExport = useCallback(() => {
    if (selectedIds.size === 0) {
      toast.display("error", "Select at least one color to export")
      return
    }
    setSheetModalOpen(true)
  }, [selectedIds.size, toast])

  const handleSheetConfirm = useCallback(
    async (spreadsheetId: string, sheetId: number, sheetName: string) => {
      setExporting(true)
      try {
        // Build colorId -> folderName map from groupedColors
        const colorIdToFolder: Record<string, string> = {}
        Object.entries(groupedColors).forEach(([groupKey, items]) => {
          const folderName = groupKey.replace(/^(folder|group)_\d+_/, "")
          items.forEach((c: any) => {
            if (c?._id) colorIdToFolder[c._id] = folderName
          })
        })

        const selectedColors = filteredColors.filter((c) => selectedIds.has(c._id))
        const rows = selectedColors.map((c: any) => {
          let rgbVal = ""
          if (typeof c.rgb === "string") rgbVal = c.rgb
          else if (c.rgb && typeof c.rgb === "object" && "r" in c.rgb)
            rgbVal = `rgb(${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b})`
          else rgbVal = colors.hexToRGB(c.hex)
          let hslVal = ""
          if (typeof c.hsl === "string") hslVal = c.hsl
          else if (c.hsl && typeof c.hsl === "object" && "h" in c.hsl)
            hslVal = `hsl(${c.hsl.h}, ${c.hsl.s}%, ${c.hsl.l}%)`
          else hslVal = colors.hexToHSL(c.hex)
          return {
            timestamp: Date.now(),
            url: c.url || "Export to Sheet",
            hex: c.hex,
            hsl: hslVal,
            rgb: rgbVal,
            ranking: (c.ranking ?? 0).toString(),
            comments: c.comments || "",
            slash_naming: c.slash_naming || "",
            tags: Array.isArray(c.tags) ? c.tags.join(", ") : "",
            folder: colorIdToFolder[c._id] || "",
            additionalColumns: (c.additionalColumns || []).map((col: any) => ({ name: col.name, value: col.value })),
          }
        })
        await axiosInstance.post(
          config.api.endpoints.addMultipleColors,
          { spreadsheetId, sheetName, sheetId, rows },
          { headers: { Authorization: `Bearer ${state.user?.jwtToken}` } }
        )
        toast.display("success", `Exported ${selectedColors.length} color(s) to sheet`)
        setSheetModalOpen(false)
        setTab(null)
      } catch (err: any) {
        toast.display("error", err?.response?.data?.err || err?.response?.data?.message || "Export failed")
      } finally {
        setExporting(false)
      }
    },
    [filteredColors, groupedColors, selectedIds, state.user?.jwtToken, toast, setTab]
  )

  return (
    <div className="w-[800px] h-[600px] flex flex-col export-to-sheet-container">
      <SectionHeader
        title="Export to Sheet"
        setTab={setTab}
        onPickColor={onPickColor}
        onPickColorFromBrowser={onPickColorFromBrowser}
      />

      {/* Search */}
      <div className="px-4 py-2 border-b border-gray-100 flex-shrink-0">
        <input
          type="text"
          placeholder="Search by hex, slash name, comments, tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:border-gray-400"
        />
      </div>

      {/* Filter & Sort bar - Filter on left (options right of icon), Sort on right (options left of icon) */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 min-w-0">
          {/* Left: Filter icon + Filter options (right of icon) */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            <button
              onClick={() => setFilterExpanded((e) => !e)}
              className={`p-2 rounded transition-colors flex-shrink-0 ${filterExpanded ? "bg-gray-200 text-gray-800" : "hover:bg-gray-200 text-gray-600"}`}
              title="Filters"
            >
              <Filter size={18} />
            </button>
            {filterExpanded && (
              <div className="flex flex-col gap-2.5 min-w-[280px]">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-600 w-20 flex-shrink-0">Hue</span>
                  <div className="flex-1 min-w-[180px]">
                    <DualThumbSlider
                      value={hueRange}
                      onValueChange={setHueRange}
                      max={360}
                      label=""
                      showGradient={true}
                      thumbColors={[`hsl(${hueRange[0]}, 100%, 50%)`, `hsl(${hueRange[1]}, 100%, 50%)`]}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-600 w-20 flex-shrink-0">Saturation</span>
                  <div className="flex-1 min-w-[180px]">
                    <DualThumbSlider value={saturationRange} onValueChange={setSaturationRange} max={100} label="" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-600 w-20 flex-shrink-0">Brightness</span>
                  <div className="flex-1 min-w-[180px]">
                    <DualThumbSlider value={brightnessRange} onValueChange={setBrightnessRange} max={100} label="" />
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Right: Sort options (left of icon) + Sort icon */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            {sortExpanded && (
              <div className="flex items-center flex-nowrap">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSortOption(opt.value)}
                    className={`px-3 py-1.5 text-xs transition-colors flex-shrink-0 whitespace-nowrap ${sortOption === opt.value ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setSortExpanded((e) => !e)}
              className={`p-2 rounded transition-colors flex-shrink-0 ${sortExpanded ? "bg-gray-200 text-gray-800" : "hover:bg-gray-200 text-gray-600"}`}
              title="Sort"
            >
              <ArrowDownUp size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
        {isLoading ? (
          <div className="py-8 text-center text-gray-500 text-sm">Loading colors...</div>
        ) : (
          <div className="space-y-2">
            {Object.entries(groupedColors).map(([groupKey, items]) => {
              const groupName = groupKey.replace(/^(folder|group)_\d+_/, "")
              const isCollapsed = collapsedGroups.has(groupKey)
              // const selectedCount = items.filter((c) => selectedIds.has(c._id)).length
              return (
                <div key={groupKey} className="border border-gray-200 rounded">
                  <div className="flex items-center gap-2 p-2 bg-gray-50 border-b border-gray-200">

                    <input
                      type="checkbox"
                      checked={items.length > 0 && items.every((c) => selectedIds.has(c._id))}
                      onChange={() => {
                        const allSelected = items.every((c) => selectedIds.has(c._id))
                        setSelectedIds((prev) => {
                          const next = new Set(prev)
                          items.forEach((c) => {
                            if (allSelected) next.delete(c._id)
                            else next.add(c._id)
                          })
                          return next
                        })
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-grow">
                      <div className="text-[12px] font-medium text-gray-800 truncate">{groupName}</div>
                      {/* <div className="text-[10px] text-gray-500">
                        {items.length} color{items.length !== 1 ? "s" : ""}
                        {selectedCount > 0 && ` • ${selectedCount} selected`}
                      </div> */}
                    </div>
                    <button
                      onClick={() => toggleGroupCollapse(groupKey)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <ChevronDown
                        size={14}
                        style={{
                          transformOrigin: "center",
                          transform: `rotate(${isCollapsed ? -90 : 0}deg)`,
                          transition: "transform 0.2s ease-in-out",
                        }}
                      />
                    </button>
                  </div>
                  <CollapsibleBox
                    isOpen={!isCollapsed}
                    maxHeight={`${Math.ceil(items.length / 6) * 40 + 20}px`}
                  >
                    <div className="p-2">
                      <div className="flex flex-wrap gap-1.5">
                        <Tooltip.Provider>
                          {items.map((c: any) => {
                            const isSelected = selectedIds.has(c._id)
                            const contrast = getContrastColor(c.hex)
                            return (
                              <Tooltip.Root key={c._id}>
                                <Tooltip.Trigger asChild>
                                  <div
                                    style={{ backgroundColor: c.hex }}
                                    className="relative w-[32px] h-[32px] cursor-pointer border-2 border-gray-300 hover:border-gray-400 transition-all flex items-center justify-center"
                                    onClick={() => toggleSelection(c._id)}
                                  >
                                    {isSelected && (
                                      <Check
                                        size={18}
                                        strokeWidth={3}
                                        className={`flex-shrink-0 ${contrast === "white" ? "text-white" : "text-black"}`}
                                      />
                                    )}
                                  </div>
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                  <Tooltip.Content
                                    className="bg-white rounded-md shadow-lg p-2 text-sm z-50"
                                    sideOffset={5}
                                  >
                                    <div className="flex flex-col gap-1">
                                      <div className="font-medium">Color Information</div>
                                      <div>Hex: {c.hex}</div>
                                      {c.rgb && (
                                        <div>
                                          RGB: {typeof c.rgb === "string"
                                            ? c.rgb
                                            : `rgb(${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b})`}
                                        </div>
                                      )}
                                      {c.hsl && (
                                        <div>
                                          HSL: {typeof c.hsl === "string"
                                            ? c.hsl
                                            : `hsl(${c.hsl.h}, ${c.hsl.s}%, ${c.hsl.l}%)`}
                                        </div>
                                      )}
                                      {c.slash_naming && (
                                        <div>Slash Naming: {c.slash_naming}</div>
                                      )}
                                      {c.comments && (
                                        <div>Comments: {c.comments}</div>
                                      )}
                                    </div>
                                    <Tooltip.Arrow className="fill-white" />
                                  </Tooltip.Content>
                                </Tooltip.Portal>
                              </Tooltip.Root>
                            )
                          })}
                        </Tooltip.Provider>
                      </div>
                    </div>
                  </CollapsibleBox>
                </div>
              )
            })}
            {filteredColors.length === 0 && (
              <div className="py-8 text-center text-gray-500 text-sm">No colors match your filters</div>
            )}
          </div>
        )}
      </div>

      {/* Export button - Select all + selected count at bottom */}
      <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={selectedIds.size === filteredColors.length && filteredColors.length > 0} onChange={toggleSelectAll} />
            <span className="text-[11px] text-gray-500">Select all</span>
          </div>
          <span className="text-xs text-gray-500">{selectedIds.size} selected</span>
        </div>
        <button
          onClick={handleExport}
          disabled={selectedIds.size === 0 || exporting}
          className="px-4 py-2 text-sm bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? "Exporting..." : "Export to Sheet"}
        </button>
      </div>

      <SheetSelectionModal
        isOpen={sheetModalOpen}
        onClose={() => setSheetModalOpen(false)}
        onConfirm={handleSheetConfirm}
        isLoading={exporting}
        onSheetAddedViaUrl={(spreadsheet, sheetId) => {
          const selectedSheet = spreadsheet.sheets.find((s) => s.id === sheetId)
          if (selectedSheet) {
            dispatch({
              type: "ADD_FILES",
              payload: {
                ...spreadsheet,
                sheets: [selectedSheet],
                colorHistory: [],
              },
            })
          }
        }}
      />
    </div>
  )
}
