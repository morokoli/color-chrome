/**
 * Export to Sheet – select colors from folders and export to a Google Sheet.
 * Layout: full-width search at top, filter/sort icons (click to open panels), scrollable content, Export button at bottom.
 * (This file was recreated; the original was missing from the repo—e.g. accidental delete or lost in a branch.)
 */
import { useCallback, useMemo, useState, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { axiosInstance } from "@/v2/hooks/useAPI"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useToast } from "@/v2/hooks/useToast"
import { useClickOutside } from "@/v2/hooks/useClickOutside"
import { config } from "@/v2/others/config"
import { colors } from "@/v2/helpers/colors"
import SectionHeader from "../common/SectionHeader"
import { CollapsibleBox } from "../CollapsibleBox"
import { SheetSelectionModal } from "../BulkEditor/SheetSelectionModal"
import DualThumbSlider from "../FigmaManager/DualThumbSlider"
import { Loader2, Check, Filter, ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react"
import * as Tooltip from "@radix-ui/react-tooltip"

const SORT_OPTIONS: { value: string; label: string; sortBy: string; sortOrder: "asc" | "desc" }[] = [
  { value: "newest", label: "Newest", sortBy: "newest", sortOrder: "desc" },
  { value: "oldest", label: "Oldest", sortBy: "oldest", sortOrder: "asc" },
  { value: "ranking", label: "Ranking", sortBy: "rank", sortOrder: "desc" },
  { value: "a-z", label: "A-Z", sortBy: "folder", sortOrder: "asc" },
  { value: "z-a", label: "Z-A", sortBy: "folder", sortOrder: "desc" },
]

function parseHsl(c: any): { h: number; s: number; l: number } | null {
  if (!c) return null
  const hsl = c.hsl
  if (typeof hsl === "object" && hsl != null && "h" in hsl && "s" in hsl && "l" in hsl) {
    return { h: Number(hsl.h), s: Number(hsl.s), l: Number(hsl.l) }
  }
  if (typeof hsl === "string") {
    const match = hsl.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/)
    if (match) return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) }
  }
  if (c.hex) {
    const str = colors.hexToHSL(c.hex)
    const match = str.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/)
    if (match) return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) }
  }
  return null
}

/** Normalize a gradient stop `color` string to #rrggbb for export. */
function normalizeStopColorToHex(color: unknown): string {
  if (typeof color !== "string" || !color.trim()) return ""
  const t = color.trim()
  const hex6 = /^#([a-f\d]{6})$/i.exec(t)
  if (hex6) return `#${hex6[1].toLowerCase()}`
  const hex3 = /^#([a-f\d]{3})$/i.exec(t)
  if (hex3) {
    const x = hex3[1]
    return `#${x[0]}${x[0]}${x[1]}${x[1]}${x[2]}${x[2]}`.toLowerCase()
  }
  const rgb = t.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (rgb) {
    const r = Math.min(255, parseInt(rgb[1], 10))
    const g = Math.min(255, parseInt(rgb[2], 10))
    const b = Math.min(255, parseInt(rgb[3], 10))
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
  }
  return ""
}

function gradientStopHexCsv(gradientData: { stops?: { color?: string; position?: number }[] }): string {
  if (!gradientData?.stops?.length) return ""
  const sorted = [...gradientData.stops].sort(
    (a, b) => (Number(a.position) || 0) - (Number(b.position) || 0)
  )
  return sorted.map((s) => normalizeStopColorToHex(s.color)).filter(Boolean).join(",")
}

function firstGradientStopHex(gradientData: { stops?: { color?: string; position?: number }[] }): string {
  const csv = gradientStopHexCsv(gradientData)
  return csv.split(",")[0] || ""
}

/** Same shape as swatch preview — used for sheet export CSS column. */
function generateGradientCSS(gradientData: {
  type?: string
  angle?: number
  position?: { x: number; y: number }
  stops?: { color: string; position: number }[]
}): string | null {
  if (!gradientData?.stops?.length) return null

  const sortedStops = [...gradientData.stops].sort((a, b) => a.position - b.position)

  const stopsString =
    gradientData.type === "conic"
      ? sortedStops.map((stop) => `${stop.color} ${stop.position}deg`).join(", ")
      : sortedStops.map((stop) => `${stop.color} ${stop.position}%`).join(", ")

  switch (gradientData.type) {
    case "linear":
      return `linear-gradient(${gradientData.angle ?? 0}deg, ${stopsString})`
    case "radial":
      return `radial-gradient(circle at ${gradientData.position?.x ?? 50}% ${gradientData.position?.y ?? 50}%, ${stopsString})`
    case "conic":
      return `conic-gradient(from ${gradientData.angle ?? 0}deg at ${gradientData.position?.x ?? 50}% ${gradientData.position?.y ?? 50}%, ${stopsString})`
    default:
      return `linear-gradient(${gradientData.angle ?? 0}deg, ${stopsString})`
  }
}

/** Unique key for a color instance (same color in different folders = different keys).
 * Uses groupKey (folder name) since backend pushes same item to multiple groups. */
function getItemKey(c: any, groupKey?: string): string {
  const key = groupKey ?? c._folderGroupKey ?? c.sheetId
  return key ? `${c._id}_${key}` : c._id
}

function getPaletteItemKey(palette: any, groupKey: string): string {
  return `palette_${palette._id}_${groupKey}`
}

const EMPTY_PALETTE_META = {
  paletteName: "",
  paletteUrl: "",
  paletteRanking: "",
  paletteTags: "",
}

function buildExportRow(
  c: any,
  folderName: string,
  paletteMeta: typeof EMPTY_PALETTE_META
) {
  const isGradient = c.type === "gradient" && c.gradient_data
  const hexForExport = isGradient ? gradientStopHexCsv(c.gradient_data) : (c.hex || "")
  const derivedHex = isGradient ? firstGradientStopHex(c.gradient_data) || "#808080" : (c.hex || "#808080")

  let rgbVal = ""
  if (isGradient) {
    rgbVal = colors.hexToRGB(derivedHex)
  } else if (typeof c.rgb === "string") rgbVal = c.rgb
  else if (c.rgb && typeof c.rgb === "object" && "r" in c.rgb)
    rgbVal = `rgb(${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b})`
  else rgbVal = colors.hexToRGB(c.hex)

  let hslVal = ""
  if (isGradient) {
    hslVal = colors.hexToHSL(derivedHex)
  } else if (typeof c.hsl === "string") hslVal = c.hsl
  else if (c.hsl && typeof c.hsl === "object" && "h" in c.hsl)
    hslVal = `hsl(${c.hsl.h}, ${c.hsl.s}%, ${c.hsl.l}%)`
  else hslVal = colors.hexToHSL(c.hex)

  const tags = Array.isArray(c.tags) ? c.tags : []
  const gradientCss =
    isGradient && c.gradient_data ? generateGradientCSS(c.gradient_data) || "" : ""

  const baseRow = {
    timestamp: Date.now(),
    url: c.url || "Export to Sheet",
    hex: hexForExport,
    hsl: hslVal,
    rgb: rgbVal,
    gradientCss,
    ranking: (c.ranking ?? 0).toString(),
    comments: c.comments || "",
    slash_naming: c.slash_naming || "",
    tags,
    additionalColumns: c.additionalColumns || [],
    folder: folderName,
    paletteName: paletteMeta.paletteName,
    paletteUrl: paletteMeta.paletteUrl,
    paletteRanking: paletteMeta.paletteRanking,
    paletteTags: paletteMeta.paletteTags,
  }

  if (isGradient) {
    return {
      ...baseRow,
      type: "gradient" as const,
      gradient_data: c.gradient_data,
    }
  }

  return {
    ...baseRow,
    type: "solid" as const,
  }
}

function getContrastColor(hex: string): "white" | "black" {
  const h = (hex || "#808080").replace("#", "")
  if (h.length !== 6) return "white"
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5 ? "white" : "black"
}

/** Helper to get background style for color or gradient */
function getBackgroundStyle(color: any): React.CSSProperties {
  if (color.type === 'gradient' && color.gradient_data) {
    const gradientCSS = generateGradientCSS(color.gradient_data)
    return gradientCSS ? { background: gradientCSS } : { backgroundColor: color.hex }
  }
  return { backgroundColor: color.hex }
}

function folderNameForExport(groupKey: string, sheetName?: string) {
  const fromKey = groupKey.replace(/^(folder|group)_\d+_/, "")
  if (sheetName?.startsWith("Folder: ")) return sheetName.slice(8)
  return fromKey || sheetName || ""
}

export interface ExportToSheetProps {
  setTab: (tab: string | null) => void
  onPickColor?: () => void
  onPickColorFromBrowser?: () => void
}

export const ExportToSheet: React.FC<ExportToSheetProps> = ({
  setTab,
  onPickColor,
  onPickColorFromBrowser,
}) => {
  const { state } = useGlobalState()
  const toast = useToast()
  const [sortOption, setSortOption] = useState("newest")
  const [searchQuery, setSearchQuery] = useState("")
  const [hueRange, setHueRange] = useState<[number, number]>([0, 360])
  const [saturationRange, setSaturationRange] = useState<[number, number]>([0, 100])
  const [brightnessRange, setBrightnessRange] = useState<[number, number]>([0, 100])
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sheetModalOpen, setSheetModalOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const filterRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)
  useClickOutside(filterRef, () => setFilterOpen(false), filterOpen)
  useClickOutside(sortRef, () => setSortOpen(false), sortOpen)

  const sortConfig = SORT_OPTIONS.find((o) => o.value === sortOption) ?? SORT_OPTIONS[0]

  const { data: colorsData, isLoading } = useQuery({
    queryKey: ["colors-and-palettes-export", "folder", sortConfig.sortBy, sortConfig.sortOrder, searchQuery],
    queryFn: async () => {
      const response = await axiosInstance.post(
        config.api.endpoints.getColorsAndPalettes,
        {
          filters: {},
          grouping: { groupBy: "folder" },
          sorting: { sortBy: sortConfig.sortBy, sortOrder: sortConfig.sortOrder },
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
          if (!c) return false
          if (c.type === "palette") return true
          const filterHex =
            c.type === "gradient" && c.gradient_data
              ? firstGradientStopHex(c.gradient_data)
              : c.hex
          if (!filterHex) return false
          const hsl = parseHsl({ ...c, hex: filterHex })
          if (hsl) {
            if (hsl.h < hueRange[0] || hsl.h > hueRange[1]) return false
            if (hsl.s < saturationRange[0] || hsl.s > saturationRange[1]) return false
            if (hsl.l < brightnessRange[0] || hsl.l > brightnessRange[1]) return false
          }
          return true
        })
        list.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt ?? a.created_at ?? 0).getTime()
          const dateB = new Date(b.createdAt ?? b.created_at ?? 0).getTime()
          return dateB - dateA
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
    Object.entries(groupedColors).forEach(([groupKey, items]) => {
      items.forEach((c: any) => {
        if (c.type !== "palette" && c._id) list.push({ ...c, _folderGroupKey: groupKey })
      })
    })
    return list
  }, [groupedColors])

  /** Palettes listed per folder group — selectable; export expands to one sheet row per swatch color. */
  const filteredPalettes = useMemo(() => {
    const list: { palette: any; groupKey: string }[] = []
    Object.entries(groupedColors).forEach(([groupKey, items]) => {
      items.forEach((c: any) => {
        if (c.type === "palette" && c._id) list.push({ palette: c, groupKey })
      })
    })
    return list
  }, [groupedColors])

  const totalSelectable = filteredColors.length + filteredPalettes.length

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    const allColorKeys = filteredColors.map((c) => getItemKey(c))
    const allPaletteKeys = filteredPalettes.map(({ palette, groupKey }) =>
      getPaletteItemKey(palette, groupKey)
    )
    const allKeys = [...allColorKeys, ...allPaletteKeys]
    if (allKeys.length > 0 && selectedIds.size === allKeys.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allKeys))
    }
  }, [filteredColors, filteredPalettes, selectedIds.size])

  const handleSheetConfirm = useCallback(
    async (sheets: { spreadsheetId: string; sheetId: number; sheetName: string }[]) => {
      const selectedColors = filteredColors.filter((c) => selectedIds.has(getItemKey(c)))
      const selectedPalettes = filteredPalettes.filter(({ palette, groupKey }) =>
        selectedIds.has(getPaletteItemKey(palette, groupKey))
      )
      if (selectedColors.length === 0 && selectedPalettes.length === 0) {
        toast.display("error", "No colors or palettes selected")
        return
      }
      if (sheets.length === 0) {
        toast.display("error", "No sheets selected")
        return
      }
      setExporting(true)
      try {
        const rows: ReturnType<typeof buildExportRow>[] = []

        for (const c of selectedColors) {
          const folderName = folderNameForExport(
            typeof c._folderGroupKey === "string" ? c._folderGroupKey : "",
            c.sheetName
          )
          rows.push(buildExportRow(c, folderName, EMPTY_PALETTE_META))
        }

        for (const { palette, groupKey } of selectedPalettes) {
          const folderName = folderNameForExport(groupKey, palette.sheetName)
          const paletteMeta = {
            paletteName: typeof palette.name === "string" ? palette.name : String(palette.name ?? ""),
            paletteUrl: palette.url != null && String(palette.url).trim() !== "" ? String(palette.url).trim() : "",
            paletteRanking:
              palette.ranking != null && String(palette.ranking).trim() !== ""
                ? String(palette.ranking).trim()
                : "",
            paletteTags: Array.isArray(palette.tags)
              ? palette.tags.join(", ")
              : palette.tags != null
                ? String(palette.tags)
                : "",
          }
          const swatches = Array.isArray(palette.colorIds) ? palette.colorIds : []
          if (swatches.length === 0) {
            toast.display("error", `Palette "${paletteMeta.paletteName || "Untitled"}" has no colors to export`)
            setExporting(false)
            return
          }
          for (const cc of swatches) {
            const isGrad = cc?.type === "gradient" && cc?.gradient_data?.stops?.length
            if (!isGrad && !cc?.hex) continue
            rows.push(buildExportRow(cc, folderName, paletteMeta))
          }
        }

        if (rows.length === 0) {
          toast.display("error", "Nothing to export — selected items have no color rows")
          setExporting(false)
          return
        }
        const authHeader = { headers: { Authorization: `Bearer ${state.user?.jwtToken}` } }
        for (const { spreadsheetId, sheetId, sheetName } of sheets) {
          await axiosInstance.post(
            config.api.endpoints.addMultipleColors,
            { spreadsheetId, sheetName, sheetId, rows },
            authHeader
          )
        }
        toast.display(
          "success",
          sheets.length > 1
            ? `Exported ${rows.length} row(s) to ${sheets.length} sheets`
            : `Exported ${rows.length} row(s) to sheet`
        )
        setSheetModalOpen(false)
        setSelectedIds(new Set())
      } catch (err: any) {
        toast.display("error", err?.response?.data?.err || "Failed to export to sheet")
      } finally {
        setExporting(false)
      }
    },
    [filteredColors, filteredPalettes, selectedIds, state.user?.jwtToken, toast]
  )

  const handleExportClick = () => {
    if (selectedIds.size === 0) {
      toast.display("error", "Select at least one color or palette to export")
      return
    }
    setSheetModalOpen(true)
  }

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSelectAllInFolder = useCallback((items: any[], groupKey: string) => {
    const colorItems = items.filter((c: any) => c.type !== "palette" && c._id)
    const paletteItems = items.filter((c: any) => c.type === "palette" && c._id)
    const colorKeys = colorItems.map((c: any) => getItemKey(c, groupKey))
    const paletteKeys = paletteItems.map((p: any) => getPaletteItemKey(p, groupKey))
    const itemKeys = [...colorKeys, ...paletteKeys]
    const allSelected = itemKeys.length > 0 && itemKeys.every((key) => selectedIds.has(key))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        itemKeys.forEach((key) => next.delete(key))
      } else {
        itemKeys.forEach((key) => next.add(key))
      }
      return next
    })
  }, [selectedIds])

  // Fold / unfold all folder groups
  const collapseAllGroups = useCallback(() => {
    const allKeys = Object.keys(groupedColors || {})
    setCollapsedGroups(new Set(allKeys))
  }, [groupedColors])

  const expandAllGroups = useCallback(() => {
    setCollapsedGroups(new Set())
  }, [])

  return (
    <div
      className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden"
      style={{ width: "800px", transition: "width 0.3s ease-in-out" }}
    >
      <SectionHeader
        title="Sheet"
        setTab={setTab}
        onPickColor={onPickColor}
        onPickColorFromBrowser={onPickColorFromBrowser}
      />

      <div className="flex flex-col flex-1 min-h-0" style={{ height: "500px" }}>
        {/* Full-width search bar */}
        <div className="flex-shrink-0 px-3 pt-2 pb-1">
          <input
            type="text"
            placeholder="Search colors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 px-3 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>

        {/* Filter (left) and Sort (right) row – filter panel to the right of icon, sort options as tabs */}
        <div className="flex items-center gap-3 flex-shrink-0 px-3 py-1.5 border-b border-gray-100 flex-wrap">
          {/* Left: Filter icon + sliders to the right when open */}
          <div className="flex items-center gap-2" ref={filterRef}>
            <button
              type="button"
              onClick={() => { setFilterOpen((o) => !o); setSortOpen(false) }}
              className={`p-1.5 rounded border transition-colors flex-shrink-0 ${filterOpen ? "bg-gray-100 border-gray-300" : "border-gray-200 hover:bg-gray-50"}`}
              title="Filters"
            >
              <Filter className="w-4 h-4 text-gray-600" />
            </button>
            {filterOpen && (
              <div className="flex flex-col gap-2 py-0.5">
                <Tooltip.Provider>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-medium text-gray-500 w-4 flex-shrink-0">H</span>
                        <div className="flex-1 min-w-0 w-28">
                          <DualThumbSlider
                            value={hueRange}
                            onValueChange={setHueRange}
                            max={360}
                            step={1}
                            label=""
                            unit="°"
                            showGradient
                            thumbColors={[`hsl(${hueRange[0]}, 100%, 50%)`, `hsl(${hueRange[1]}, 100%, 50%)`]}
                          />
                        </div>
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content className="bg-gray-900 text-white text-xs px-2 py-1 rounded">Hue</Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-medium text-gray-500 w-4 flex-shrink-0">S</span>
                        <div className="flex-1 min-w-0 w-28">
                          <DualThumbSlider
                            value={saturationRange}
                            onValueChange={setSaturationRange}
                            max={100}
                            step={1}
                            label=""
                            unit="%"
                          />
                        </div>
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content className="bg-gray-900 text-white text-xs px-2 py-1 rounded">Saturation</Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-medium text-gray-500 w-4 flex-shrink-0">B</span>
                        <div className="flex-1 min-w-0 w-28">
                          <DualThumbSlider
                            value={brightnessRange}
                            onValueChange={setBrightnessRange}
                            max={100}
                            step={1}
                            label=""
                            unit="%"
                          />
                        </div>
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content className="bg-gray-900 text-white text-xs px-2 py-1 rounded">Brightness</Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </div>
            )}
          </div>

          {/* Right: Sort options as tabs + Sort icon */}
          <div className="flex items-center gap-1.5 ml-auto" ref={sortRef}>
            {sortOpen && (
              <div className="flex items-center border border-gray-200 bg-white">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSortOption(opt.value)}
                    className={`px-2.5 py-1 text-[11px] transition-colors ${sortOption === opt.value ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => { setSortOpen((o) => !o); setFilterOpen(false) }}
              className={`p-1.5 rounded border transition-colors flex-shrink-0 ${sortOpen ? "bg-gray-100 border-gray-300" : "border-gray-200 hover:bg-gray-50"}`}
              title="Sort"
            >
              <ArrowUpDown className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-hidden flex flex-col p-3 min-h-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {/* Single toggle: collapse all when all expanded, else expand all */}
            {Object.keys(groupedColors).length > 0 && (() => {
              const allExpanded = collapsedGroups.size === 0
              return (
                <div className="flex justify-end items-center mb-1">
                  <Tooltip.Provider>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <button
                          type="button"
                          className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                          onClick={allExpanded ? collapseAllGroups : expandAllGroups}
                          aria-label={allExpanded ? "Collapse all" : "Expand all"}
                        >
                          {allExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-600" strokeWidth={2.25} />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-600" strokeWidth={2.25} />
                          )}
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content className="bg-gray-900 text-white text-xs px-2 py-1 rounded">
                          {allExpanded ? "Collapse all" : "Expand all"}
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                </div>
              )
            })()}
            {Object.entries(groupedColors).map(([groupKey, items]) => {
              const isCollapsed = collapsedGroups.has(groupKey)
              const displayKey = groupKey.replace(/^(folder|group)_\d+_/, "")
              const colorItems = items.filter((c: any) => c.type !== "palette" && c._id)
              const paletteItems = items.filter((c: any) => c.type === "palette" && c._id)
              const folderSelectableKeys = [
                ...colorItems.map((c: any) => getItemKey(c, groupKey)),
                ...paletteItems.map((p: any) => getPaletteItemKey(p, groupKey)),
              ]
              const selectedCount = folderSelectableKeys.filter((key) => selectedIds.has(key)).length
              const allSelectedInFolder =
                folderSelectableKeys.length > 0 &&
                folderSelectableKeys.every((key) => selectedIds.has(key))
              return (
                <div key={groupKey} className="border border-gray-200 rounded">
                  {/* Folder Header – same as Bulk Editor: checkbox, name + count, chevron */}
                  <div className="flex items-center gap-2 p-2 bg-gray-50 border-b border-gray-200">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectAllInFolder(items, groupKey)
                      }}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        allSelectedInFolder ? "bg-gray-900 border-gray-900" : "border-gray-300 hover:border-gray-400"
                      }`}
                      title={allSelectedInFolder ? "Deselect all" : "Select all"}
                    >
                      {allSelectedInFolder && <Check size={12} className="text-white" />}
                    </button>
                    <div className="flex-grow min-w-0">
                      <div className="text-[12px] font-medium text-gray-800 truncate">{displayKey}</div>
                      <div className="text-[10px] text-gray-500">
                        {items.length} item{items.length !== 1 ? "s" : ""}
                        {selectedCount > 0 && ` • ${selectedCount} selected`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleGroup(groupKey)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                    >
                      <ChevronDown
                        size={14}
                        strokeWidth={2.25}
                        className="text-gray-600"
                        style={{
                          transformOrigin: "center",
                          transform: `rotate(${isCollapsed ? -90 : 0}deg)`,
                          transition: "transform 0.2s ease-in-out",
                        }}
                      />
                    </button>
                  </div>
                  <CollapsibleBox isOpen={!isCollapsed} maxHeight={`${Math.ceil(items.length / 6) * 40 + 20}px`}>
                    <div className="p-2">
                      <div className="flex flex-wrap gap-1.5">
                        <Tooltip.Provider>
                          {items.map((c: any) => {
                            if (c.type === "palette" && c._id) {
                              const paletteKey = getPaletteItemKey(c, groupKey)
                              const paletteSelected = selectedIds.has(paletteKey)
                              const firstHex = c.colorIds?.[0]?.hex || "#ccc"
                              const paletteContrast = getContrastColor(firstHex)
                              return (
                                <Tooltip.Root key={paletteKey}>
                                  <Tooltip.Trigger asChild>
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => toggleSelection(paletteKey)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault()
                                          toggleSelection(paletteKey)
                                        }
                                      }}
                                      className={`relative w-[32px] h-[32px] border-2 rounded overflow-hidden flex flex-row cursor-pointer transition-all ${
                                        paletteSelected ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-300 hover:border-gray-500"
                                      }`}
                                      title={c.name || "Palette — click to select for export"}
                                    >
                                      {(c.colorIds || []).map((cc: any, i: number) => (
                                        <div
                                          key={cc._id || i}
                                          style={{
                                            flex: 1,
                                            backgroundColor: cc.hex || "#ccc",
                                            minWidth: 2,
                                          }}
                                        />
                                      ))}
                                      {paletteSelected && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/15">
                                          <Check
                                            size={18}
                                            strokeWidth={3}
                                            className={`flex-shrink-0 drop-shadow ${paletteContrast === "white" ? "text-white" : "text-black"}`}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </Tooltip.Trigger>
                                  <Tooltip.Portal>
                                    <Tooltip.Content className="bg-gray-900 text-white text-xs px-2 py-1 rounded max-w-[220px]">
                                      {c.name || "Palette"} — exports one row per color (palette name, URL, ranking, tags on each row)
                                    </Tooltip.Content>
                                  </Tooltip.Portal>
                                </Tooltip.Root>
                              )
                            }
                            const itemKey = getItemKey(c, groupKey)
                            const isSelected = selectedIds.has(itemKey)
                            const contrastHex =
                              c.type === "gradient" && c.gradient_data
                                ? firstGradientStopHex(c.gradient_data) || c.hex
                                : c.hex
                            const contrast = getContrastColor(contrastHex)
                            return (
                              <Tooltip.Root key={itemKey}>
                                <Tooltip.Trigger asChild>
                                  <div
                                    style={getBackgroundStyle(c)}
                                    className="relative w-[32px] h-[32px] cursor-pointer border-2 border-gray-300 hover:border-gray-400 transition-all flex items-center justify-center"
                                    onClick={() => toggleSelection(itemKey)}
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
                                  <Tooltip.Content className="bg-gray-900 text-white text-xs px-2 py-1 rounded max-w-[200px]">
                                    {c.type === 'gradient' ? (
                                      <>
                                        Gradient ({c.gradient_data?.type || 'linear'})
                                        {c.slash_naming ? ` · ${c.slash_naming}` : ""}
                                      </>
                                    ) : (
                                      <>
                                        {c.hex} {c.slash_naming ? `· ${c.slash_naming}` : ""}
                                      </>
                                    )}
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
            {Object.keys(groupedColors).length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">No colors or palettes found</div>
            )}
          </div>
        )}
        </div>

        {/* Bottom bar: left = checkbox + Select all + selection count, right = Export to sheet */}
        <div className="flex-shrink-0 px-3 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                totalSelectable > 0 && selectedIds.size === totalSelectable
                  ? "bg-gray-900 border-gray-900"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              title={selectedIds.size === totalSelectable && totalSelectable > 0 ? "Deselect all" : "Select all"}
            >
              {totalSelectable > 0 && selectedIds.size === totalSelectable && (
                <Check size={12} className="text-white" />
              )}
            </button>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-[12px] text-gray-700 hover:text-gray-900"
            >
              Select all
            </button>
            <span className="text-[12px] text-gray-500">
              {selectedIds.size} of {totalSelectable} selected
            </span>
          </div>
          <button
            type="button"
            onClick={handleExportClick}
            disabled={selectedIds.size === 0 || exporting}
            className="py-2 px-4 text-[13px] font-medium rounded bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {exporting ? "Exporting..." : "Export to sheet"}
          </button>
        </div>
      </div>

      {sheetModalOpen && (
        <SheetSelectionModal
          isOpen={sheetModalOpen}
          onClose={() => setSheetModalOpen(false)}
          onConfirm={handleSheetConfirm}
          isLoading={exporting}
        />
      )}
    </div>
  )
}
