import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useDrag } from "react-dnd"
import { axiosInstance } from "@/v2/hooks/useAPI"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { config } from "@/v2/others/config"
import { Loader2 } from "lucide-react"

interface ImportColorsListProps {
  onAddToPalette: (colorData: any, index: number | null) => void
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
          borderRadius: "6px"
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

const ImportColorsList = ({ onAddToPalette }: ImportColorsListProps) => {
  const [displayedCount, setDisplayedCount] = useState(20)
  const pageSize = 10
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
          sorting: { sortBy: "ranking", sortOrder: "desc" },
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

  const allColors = useMemo(() => {
    try {
      if (!colorsAndPalettesData?.colors?.["All Colors"]) {
        return []
      }
      const colors = colorsAndPalettesData.colors["All Colors"]
      return colors
        .filter((color: any) => color && color.hex)
        .filter((color: any) => {
          return (
            searchQuery.length === 0 ||
            color.hex.toLowerCase().includes(searchQuery.toLowerCase()) ||
            color?.slash_naming?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            color?.comments?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        })
        .sort((a: any, b: any) => (b.ranking || 0) - (a.ranking || 0))
    } catch (error) {
      console.error("Error processing colors:", error)
      return []
    }
  }, [colorsAndPalettesData, searchQuery])

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

  const totalColors = allColors?.length || 0
  const currentColors = allColors.slice(0, displayedCount)

  const handleLoadMore = () => {
    setDisplayedCount((prev) => Math.min(prev + pageSize, totalColors))
  }

  if (isLoading) {
    return (
      <div className="text-center py-5 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
        <div className="text-sm">Loading colors...</div>
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

  if (!allColors.length) {
    if (searchQuery.length > 0) {
      return (
        <div className="text-center py-5 text-gray-500">
          <div className="text-sm mb-2">No colors found</div>
          <input
            type="text"
            placeholder="Search colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      )
    }
    return (
      <div className="text-center py-5 text-gray-500">
        <div className="text-sm">No colors available</div>
        <div className="text-xs mt-1">Add some colors to your sheets first</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <input
        type="text"
        placeholder="Search colors"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full h-9 px-3 mb-2 text-[12px]border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
      />
      <div
        className="flex-1 overflow-y-auto pr-2 space-y-2"
        onScroll={(e) => {
          const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
          if (
            scrollHeight - scrollTop - clientHeight < 50 &&
            displayedCount < totalColors
          ) {
            handleLoadMore()
          }
        }}
      >
        {currentColors.map((colorData: any, idx: number) => (
          <div key={idx}>
            <DraggableImportItem colorData={colorData} />
          </div>
        ))}
        {displayedCount < totalColors && (
          <div className="text-center py-3 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
            Loading more colors...
          </div>
        )}
        {displayedCount >= totalColors && totalColors > 0 && (
          <div className="text-center py-3 text-xs text-gray-500">
            All {totalColors} colors loaded
          </div>
        )}
      </div>
    </div>
  )
}

export default ImportColorsList
