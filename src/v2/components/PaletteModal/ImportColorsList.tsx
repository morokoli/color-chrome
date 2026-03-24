import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useDrag } from "react-dnd"
import { axiosInstance } from "@/v2/hooks/useAPI"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { config } from "@/v2/others/config"
import { Loader2 } from "lucide-react"

interface ImportColorsListProps {
  onAddToPalette: (colorData: any, index: number | null) => void
  onAddPaletteToPalette?: (colors: any[]) => void
}

const ITEM_TYPE = "IMPORT_COLOR"

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
        gap: "3.6px",
        width: "108px",
      }}
    >
      <div
        style={{
          minWidth: "108px",
          height: "108px",
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
            top: "3.6px",
            left: "3.6px",
            right: "3.6px",
            bottom: "3.6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            color: textColor,
            fontSize: "13px",
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
              fontSize: "11px",
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
        width: "108px",
        minWidth: "108px",
        height: "108px",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        border: "1px solid #e5e5e5",
        transition: "box-shadow 0.2s, border-color 0.2s",
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
      {/* Color strips: click = add, drag = drop */}
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
      {/* Palette name: click = add full palette */}
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

const ImportColorsList = ({ onAddToPalette }: ImportColorsListProps) => {
  const [searchQuery, setSearchQuery] = useState("")
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
        }
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
      const filtered =
        searchQuery.length === 0
          ? items
          : items.filter((item: any) => {
              const q = searchQuery.toLowerCase()
              if (item.hex) {
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
      return filtered.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || a.created_at || 0).getTime()
        const dateB = new Date(b.createdAt || b.created_at || 0).getTime()
        return dateB - dateA
      })
    } catch (error) {
      console.error("Error processing library items:", error)
      return []
    }
  }, [rawAll, searchQuery])

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
          marginBottom: "7.2px",
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

  if (isLoading) {
    return (
      <div className="text-center py-5 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
        <div className="text-sm">Loading colors and palettes...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-5 text-red-500">
        <div className="text-sm mb-1">Error loading colors</div>
        <div className="text-xs">{String(error)}</div>
      </div>
    )
  }

  if (!allItems.length) {
    if (searchQuery.length > 0) {
      return (
        <div className="text-center py-5 text-gray-500">
          <div className="text-sm mb-2">No colors or palettes found</div>
          <input
            type="text"
            placeholder="Search colors and palettes"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md"
          />
        </div>
      )
    }
    return (
      <div className="text-center py-5 text-gray-500">
        <div className="text-sm">No colors or palettes available</div>
        <div className="text-xs mt-1">Add colors or create palettes first</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <input
        type="text"
        placeholder="Search colors and palettes"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full h-9 px-3 mb-2 text-[12px] border border-gray-300 rounded-md"
      />
      <div className="flex-1 overflow-y-auto pr-2 space-y-2">
        {currentItems.map((item: any, idx: number) => {
          const isPalette = item.type === "palette" || (item.colorIds && Array.isArray(item.colorIds))
          if (isPalette) {
            return (
              <div key={`palette-${item._id}-${idx}`} style={{ marginBottom: "7.2px" }}>
                <LibraryPaletteCard
                  paletteData={item}
                  colorById={colorById}
                  onAddColor={(colorData) => onAddToPalette(colorData, null)}
                  // onAddPalette={() => {
                  //   if (onAddPaletteToPalette && resolved.length > 0) {
                  //     onAddPaletteToPalette(resolved)
                  //   }
                  // }}
                />
              </div>
            )
          }
          return (
            <div key={`color-${item._id}-${idx}`}>
              <DraggableImportItem colorData={item} />
            </div>
          )
        })}
        {currentItems.length > 0 && (
          <div className="text-center py-3 text-xs text-gray-500">
            {currentItems.length} item{currentItems.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  )
}

export default ImportColorsList
