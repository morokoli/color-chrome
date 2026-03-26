import { useState, useMemo, type CSSProperties } from "react"
import { useQuery } from "@tanstack/react-query"
import { useDrag } from "react-dnd"
import { axiosInstance } from "@/v2/hooks/useAPI"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { config } from "@/v2/others/config"
import { Loader2 } from "lucide-react"
import colorIcon from "@/v2/assets/images/icons/library/color.svg"
import paletteIcon from "@/v2/assets/images/icons/library/palette.svg"

/** Chrome generator library tiles — larger than original 108px; scales inset/type with size. */
const LIBRARY_SWATCH_PX = 134
const LIBRARY_K = LIBRARY_SWATCH_PX / 108
const LIBRARY_INSET = 3.6 * LIBRARY_K
const LIBRARY_GAP = 3.6 * LIBRARY_K
const LIBRARY_ITEM_MB = 7.2 * LIBRARY_K
const LIBRARY_FONT_HEX = Math.round(13 * LIBRARY_K)
const LIBRARY_FONT_NAME = Math.round(11 * LIBRARY_K)

const swPx = `${LIBRARY_SWATCH_PX}px`

interface ImportColorsListProps {
  onAddToPalette: (colorData: any, index: number | null) => void
  onAddPaletteToPalette?: (colors: any[]) => void
}

const ITEM_TYPE = "IMPORT_COLOR"

const isPaletteEntry = (item: any) =>
  item?.type === "palette" || (item?.colorIds && Array.isArray(item.colorIds))

const SimpleColorBox = ({ colorData }: { colorData: any }) => {
  if (!colorData?.hex) return null
  const hex = String(colorData.hex)
  const r = parseInt(hex.replace("#", "").slice(0, 2), 16)
  const g = parseInt(hex.replace("#", "").slice(2, 4), 16)
  const b = parseInt(hex.replace("#", "").slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const isDark = luminance < 0.5
  const textColor = isDark ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.8)"

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: `${LIBRARY_GAP}px`,
        width: swPx,
      }}
    >
      <div
        style={{
          minWidth: swPx,
          height: swPx,
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          transition: "border-width 0.3s ease-in-out",
          cursor: "pointer",
          backgroundColor: colorData.hex,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: `${LIBRARY_INSET}px`,
            left: `${LIBRARY_INSET}px`,
            right: `${LIBRARY_INSET}px`,
            bottom: `${LIBRARY_INSET}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            color: textColor,
            fontSize: `${LIBRARY_FONT_HEX}px`,
            fontWeight: "600",
            textShadow: isDark
              ? "0 1px 2px rgba(0,0,0,0.5)"
              : "0 1px 2px rgba(255,255,255,0.5)",
          }}
        >
          <span style={{ color: "inherit" }}>{colorData.hex?.toUpperCase()}</span>
          <br />
          <span
            style={{
              fontSize: `${LIBRARY_FONT_NAME}px`,
              color: "inherit",
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {colorData.slash_naming || ""}
          </span>
        </div>
      </div>
    </div>
  )
}

const getColorHex = (color: any) => {
  if (typeof color === "string") return color
  return color?.hex || color
}

const DraggablePaletteColorStrip = ({
  colorData,
  onAddColor,
}: {
  colorData: any
  onAddColor: () => void
}) => {
  const hex = getColorHex(colorData) || "#ccc"
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { colorData, type: ITEM_TYPE },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  return (
    <div
      ref={drag}
      role="button"
      tabIndex={0}
      style={{
        flex: 1,
        backgroundColor: hex,
        minWidth: 0,
        cursor: "pointer",
        opacity: isDragging ? 0.5 : 1,
        userSelect: "none",
      }}
      title={`Click to add, drag to drop ${hex}`}
      onClick={(e) => {
        e.stopPropagation()
        onAddColor()
      }}
    />
  )
}

const LibraryPaletteCard = ({
  paletteData,
  colorById,
  onAddColor,
}: {
  paletteData: any
  colorById: Map<string, any>
  onAddColor: (colorData: any) => void
}) => {
  const colorIds = paletteData.colorIds || []
  const colors = colorIds
    .map((c: any) => {
      const id = c?._id ?? c
      const fromMap = id ? colorById.get(String(id)) : null
      return fromMap ?? (c && (c.hex || c._id) ? c : null)
    })
    .filter(Boolean)
  const hexList = colors.map((c: any) => getColorHex(c) || "#ccc")

  return (
    <div
      style={{
        width: swPx,
        minWidth: swPx,
        height: swPx,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        border: "1px solid #e5e5e5",
        transition: "box-shadow 0.2s, border-color 0.2s",
        marginBottom: `${LIBRARY_ITEM_MB}px`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"
        e.currentTarget.style.borderColor = "#999"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none"
        e.currentTarget.style.borderColor = "#e5e5e5"
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "row",
        }}
      >
        {hexList.length > 0 ? (
          hexList.map((_, i: number) => (
            <DraggablePaletteColorStrip
              key={i}
              colorData={colors[i]}
              onAddColor={() => onAddColor(colors[i])}
            />
          ))
        ) : (
          <div
            style={{
              flex: 1,
              backgroundColor: "#f0f0f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              color: "#999",
            }}
          >
            No colors
          </div>
        )}
      </div>
      <div
        role="button"
        tabIndex={0}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          padding: "4px 6px",
          maxWidth: "90%",
          fontSize: "11px",
          fontWeight: 600,
          color: "rgba(255, 255, 255, 0.95)",
          textShadow: "0 1px 2px rgba(0,0,0,0.6)",
          textAlign: "center",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          cursor: "pointer",
          pointerEvents: "none",
        }}
      >
        {paletteData.name || "Untitled palette"}
      </div>
    </div>
  )
}

const filterBtnBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  padding: 0,
  border: "1px solid transparent",
  borderRadius: 4,
  background: "transparent",
  cursor: "pointer",
  lineHeight: 0,
  opacity: 0.45,
  transition: "opacity 0.15s ease, background-color 0.15s ease, border-color 0.15s ease",
}

const filterBtnActive: CSSProperties = {
  opacity: 1,
  backgroundColor: "rgba(0, 0, 0, 0.06)",
  borderColor: "rgba(0, 0, 0, 0.08)",
}

const ImportColorsList = ({ onAddToPalette }: ImportColorsListProps) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [showColors, setShowColors] = useState(true)
  const [showPalettes, setShowPalettes] = useState(true)
  const { state } = useGlobalState()

  const { data: colorsAndPalettesData, isLoading, error } = useQuery({
    queryKey: ["colors-and-palettes", {}],
    queryFn: async () => {
      const response = await axiosInstance.post(
        config.api.endpoints.getColorsAndPalettes,
        {
          filters: {},
          grouping: {},
          sorting: { sortBy: "newest", sortOrder: "desc" },
          searchingValue: "",
        },
        {
          headers: {
            Authorization: `Bearer ${state.user?.jwtToken}`,
          },
        },
      )
      return response.data.data
    },
    enabled: !!state.user?.jwtToken,
  })

  const rawAll = colorsAndPalettesData?.colors?.["All Colors"] ?? []
  const colorById = useMemo(() => {
    const map = new Map<string, any>()
    rawAll.forEach((item: any) => {
      if (item && (item.hex || item.type === "color") && item._id) {
        map.set(String(item._id), item)
      }
    })
    return map
  }, [rawAll])

  const allItems = useMemo(() => {
    try {
      const items = rawAll.filter((item: any) => {
        if (!item) return false
        if (item.hex && item.type !== "palette") return true
        if (item.type === "palette" || (item.colorIds && Array.isArray(item.colorIds))) return true
        return false
      })
      const searchFiltered =
        searchQuery.length === 0
          ? items
          : items.filter((item: any) => {
              const q = searchQuery.toLowerCase()
              if (item.hex && item.type !== "palette") {
                return (
                  (item.hex && item.hex.toLowerCase().includes(q)) ||
                  (item.slash_naming && item.slash_naming.toLowerCase().includes(q)) ||
                  (item.comments && item.comments.toLowerCase().includes(q))
                )
              }
              if (item.type === "palette" || item.colorIds) {
                return (
                  (item.name && item.name.toLowerCase().includes(q)) ||
                  (item.description && item.description.toLowerCase().includes(q))
                )
              }
              return false
            })

      const typeFiltered = searchFiltered.filter((item: any) => {
        if (isPaletteEntry(item)) return showPalettes
        return showColors
      })

      return typeFiltered.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || a.created_at || 0).getTime()
        const dateB = new Date(b.createdAt || b.created_at || 0).getTime()
        return dateB - dateA
      })
    } catch (err) {
      console.error("Error processing library items:", err)
      return []
    }
  }, [rawAll, searchQuery, showColors, showPalettes])

  const libraryHeader = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 16,
        flexShrink: 0,
      }}
    >
      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, flex: 1, minWidth: 0 }}>
        Library
      </h3>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <button
          type="button"
          style={{ ...filterBtnBase, ...(showColors ? filterBtnActive : {}) }}
          aria-pressed={showColors}
          aria-label="Show colors in library"
          title="Colors"
          onClick={() => setShowColors((v) => !v)}
        >
          <img src={colorIcon} alt="" width={18} height={18} style={{ display: "block", pointerEvents: "none" }} />
        </button>
        <button
          type="button"
          style={{ ...filterBtnBase, ...(showPalettes ? filterBtnActive : {}) }}
          aria-pressed={showPalettes}
          aria-label="Show palettes in library"
          title="Palettes"
          onClick={() => setShowPalettes((v) => !v)}
        >
          <img src={paletteIcon} alt="" width={18} height={18} style={{ display: "block", pointerEvents: "none" }} />
        </button>
      </div>
    </div>
  )

  const DraggableImportItem = ({ colorData }: { colorData: any }) => {
    const [{ isDragging }, drag] = useDrag({
      type: ITEM_TYPE,
      item: { colorData, type: ITEM_TYPE },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    })

    return (
      <div
        ref={drag}
        style={{
          opacity: isDragging ? 0.5 : 1,
          cursor: "grab",
          marginBottom: `${LIBRARY_ITEM_MB}px`,
          transform: isDragging ? "rotate(5deg)" : "none",
          transition: "opacity 0.2s, transform 0.2s",
        }}
        onClick={() => onAddToPalette(colorData, null)}
      >
        <SimpleColorBox colorData={colorData} />
      </div>
    )
  }

  const currentItems = allItems
  const bothTypesOff = !showColors && !showPalettes

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden min-h-0">
        {libraryHeader}
        <div className="text-center py-5 text-gray-500 flex-1 flex flex-col justify-center">
          <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
          <div className="text-sm">Loading colors and palettes...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-full overflow-hidden min-h-0">
        {libraryHeader}
        <div className="text-center py-5 text-red-500 flex-1">
          <div className="text-sm mb-1">Error loading colors</div>
          <div className="text-xs">{String(error)}</div>
        </div>
      </div>
    )
  }

  const hasSourceItems = rawAll.some((item: any) => {
    if (!item) return false
    if (item.hex && item.type !== "palette") return true
    return isPaletteEntry(item)
  })

  if (bothTypesOff) {
    return (
      <div className="flex flex-col h-full overflow-hidden min-h-0">
        {libraryHeader}
        <div className="text-center py-5 text-gray-500 text-sm flex-1">
          Turn on colors or palettes
          <div className="text-xs mt-1">Use the icons next to Library</div>
        </div>
      </div>
    )
  }

  if (!currentItems.length) {
    if (searchQuery.length > 0) {
      return (
        <div className="flex flex-col h-full overflow-hidden min-h-0">
          {libraryHeader}
          <input
            type="text"
            placeholder="Search colors and palettes"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md mb-2"
          />
          <div className="text-center py-5 text-gray-500 flex-1">
            <div className="text-sm mb-2">No colors or palettes found</div>
          </div>
        </div>
      )
    }
    if (hasSourceItems) {
      return (
        <div className="flex flex-col h-full overflow-hidden min-h-0">
          {libraryHeader}
          <input
            type="text"
            placeholder="Search colors and palettes"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 px-3 mb-2 text-[12px] border border-gray-300 rounded-md"
          />
          <div className="text-center py-5 text-gray-500 text-sm flex-1">Nothing matches the current filters</div>
        </div>
      )
    }
    return (
      <div className="flex flex-col h-full overflow-hidden min-h-0">
        {libraryHeader}
        <div className="text-center py-5 text-gray-500 flex-1">
          <div className="text-sm">No colors or palettes available</div>
          <div className="text-xs mt-1">Add colors or create palettes first</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden min-h-0">
      {libraryHeader}
      <input
        type="text"
        placeholder="Search colors and palettes"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full h-9 px-3 mb-2 text-[12px] border border-gray-300 rounded-md flex-shrink-0"
      />
      <div className="flex-1 overflow-y-auto pr-2 flex flex-col items-center min-h-0">
        {currentItems.map((item: any, idx: number) => {
          const isPalette = isPaletteEntry(item)
          if (isPalette) {
            return (
              <div key={`palette-${item._id}-${idx}`} className="w-full flex justify-center">
                <LibraryPaletteCard
                  paletteData={item}
                  colorById={colorById}
                  onAddColor={(colorData) => onAddToPalette(colorData, null)}
                />
              </div>
            )
          }
          return (
            <div key={`color-${item._id}-${idx}`} className="w-full flex justify-center">
              <DraggableImportItem colorData={item} />
            </div>
          )
        })}
        {currentItems.length > 0 && (
          <div className="text-center py-3 text-xs text-gray-500 w-full">
            {currentItems.length} item{currentItems.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  )
}

export default ImportColorsList
