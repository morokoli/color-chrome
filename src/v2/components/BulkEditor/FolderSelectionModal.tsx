import { useState, useEffect, useRef, useMemo } from "react"
import { X, ChevronDown, Check } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useGetFolders, Folder, Color } from "@/v2/api/folders.api"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { axiosInstance } from "@/v2/hooks/useAPI"
import { MultiSelectDropdown } from "../FigmaManager/MultiSelectDropdown"
import { FolderDropdownRow } from "@/v2/components/common/FolderDropdownRow"
import { CollapsibleBox } from "../CollapsibleBox"
import * as Tooltip from "@radix-ui/react-tooltip"
import { useFolderTreeExpanded } from "../../hooks/useFolderTreeExpanded"
import {
  buildParentIdByChildId,
  flattenFoldersHierarchyOrder,
  flattenVisibleFolderIdsInOrder,
  folderHasChildrenInList,
  getFolderDepthById,
  getFolderPathLabelById,
} from "@/v2/utils/folderDisplayName"

export interface SelectedColorItem {
  color: Color
  folderId?: string
  folderName?: string
  originalColorId?: string
}

/** Returns "black" or "white" for contrast on the given hex background */
function getContrastColor(hex: string): "black" | "white" {
  const h = (hex || "#808080").replace("#", "")
  if (h.length !== 6) return "white"
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5 ? "white" : "black"
}

/** Helper to generate CSS gradient string */
function generateGradientCSS(gradientData: any): string | null {
  if (!gradientData || !gradientData.stops) return null

  const sortedStops = [...gradientData.stops].sort(
    (a: any, b: any) => a.position - b.position,
  )

  // For conic gradients, use degrees; for linear/radial, use percentages
  const stopsString =
    gradientData.type === "conic"
      ? sortedStops
          .map((stop: any) => `${stop.color} ${stop.position}deg`)
          .join(", ")
      : sortedStops
          .map((stop: any) => `${stop.color} ${stop.position}%`)
          .join(", ")

  switch (gradientData.type) {
    case "linear":
      return `linear-gradient(${gradientData.angle}deg, ${stopsString})`
    case "radial":
      return `radial-gradient(circle at ${gradientData.position.x}% ${gradientData.position.y}%, ${stopsString})`
    case "conic":
      return `conic-gradient(from ${gradientData.angle}deg at ${gradientData.position.x}% ${gradientData.position.y}%, ${stopsString})`
    default:
      return `linear-gradient(${gradientData.angle}deg, ${stopsString})`
  }
}

/** Helper to get background style for color or gradient */
function getBackgroundStyle(color: any): React.CSSProperties {
  if (color.type === "gradient" && color.gradient_data) {
    const gradientCSS = generateGradientCSS(color.gradient_data)
    return gradientCSS
      ? { background: gradientCSS }
      : { backgroundColor: color.hex }
  }
  return { backgroundColor: color.hex }
}

export interface FolderSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called with destination folder IDs and the colors selected in this modal (may differ from bulk editor selection) */
  onConfirm: (
    folderIds: string[],
    colorsToOperateOn: SelectedColorItem[],
  ) => void
  title: string
  actionType: "copy" | "move"
  isLoading?: boolean
  /** Initial selection when modal opens (e.g. from bulk editor); modal keeps its own selection after that */
  selectedColors?: SelectedColorItem[]
}

export const FolderSelectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  actionType,
  isLoading: parentIsLoading = false,
  selectedColors = [],
}: FolderSelectionModalProps) => {
  const { state } = useGlobalState()
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([])
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
    new Set(),
  )
  const [collapsedNonFoldered, setCollapsedNonFoldered] = useState(false)
  /** Modal-local selection (independent of bulk editor); keyed by color._id */
  const [modalSelection, setModalSelection] = useState<
    Map<string, SelectedColorItem>
  >(new Map())

  const { data: foldersData, isLoading: foldersLoading } = useGetFolders(true)

  const wasOpenRef = useRef(false)
  // When modal opens, initialize selection from props (bulk editor selection); changes inside modal don't affect bulk editor
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true
      const initial = selectedColors?.length
        ? new Map(selectedColors.map((item) => [item.color._id, item]))
        : new Map()
      setModalSelection(initial)
    }
    if (!isOpen) wasOpenRef.current = false
  }, [isOpen, selectedColors])

  const { data: allColorData, isLoading: isLoadingNonFoldered } = useQuery({
    queryKey: ["all-color-data", isOpen],
    queryFn: async () => {
      const response = await axiosInstance.get(
        "/api/database-sheets/all-color-data",
        {
          headers: {
            Authorization: `Bearer ${state.user?.jwtToken}`,
          },
        },
      )
      const data = response.data?.data || response.data
      if (data?.colorsWithoutFolders) {
        return {
          ...data,
          colorsWithoutFolders: data.colorsWithoutFolders.map((c: any) => ({
            _id: c._id,
            hex: c.hex || "",
            name: c.name || "",
            rgb: c.rgb || { r: 0, g: 0, b: 0 },
            hsl: c.hsl || { h: 0, s: 0, l: 0 },
            url: c.url || "",
            ranking: c.ranking || 0,
            comments: c.comments || "",
            slash_naming: c.slash_naming || "",
            tags: c.tags || [],
            additionalColumns: c.additionalColumns || [],
            type: c.type || "solid",
            gradient_data: c.gradient_data || null,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          })),
        }
      }
      return data
    },
    enabled: isOpen && !!state.user?.jwtToken,
  })

  const foldersFlat = foldersData?.folders || []
  const foldersOrdered = useMemo(
    () => flattenFoldersHierarchyOrder(foldersFlat),
    [foldersFlat],
  )
  const parentByChildId = useMemo(
    () => buildParentIdByChildId(foldersFlat),
    [foldersFlat],
  )
  const allFolderIds = useMemo(
    () => foldersFlat.map((f) => f._id),
    [foldersFlat],
  )
  const existingIdSet = useMemo(() => new Set(allFolderIds), [allFolderIds])
  const { expandedIds, toggleExpanded, expandAll, collapseAll, allExpanded } =
    useFolderTreeExpanded(allFolderIds)
  const visibleFolderIds = useMemo(
    () => flattenVisibleFolderIdsInOrder(foldersFlat, expandedIds),
    [foldersFlat, expandedIds],
  )

  if (!isOpen) return null

  const nonFolderedColors: Color[] = allColorData?.colorsWithoutFolders || []
  const actionLabel = actionType === "copy" ? "Copy to" : "Move to"

  const handleFolderToggle = (folderId: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  const handleColorToggle = (color: Color, folder: Folder | null) => {
    setModalSelection((prev) => {
      const next = new Map(prev)
      if (next.has(color._id)) {
        next.delete(color._id)
      } else {
        next.set(color._id, {
          color,
          folderId: folder?._id ?? "non-foldered",
          folderName: folder
            ? getFolderPathLabelById(
                folder._id,
                foldersFlat,
                parentByChildId,
              ) || folder.name
            : "Non-foldered",
          originalColorId: color._id,
        })
      }
      return next
    })
  }

  const handleConfirm = () => {
    if (selectedFolderIds.length > 0) {
      const colorsToOperateOn = Array.from(modalSelection.values())
      onConfirm(selectedFolderIds, colorsToOperateOn)
      setSelectedFolderIds([])
    }
  }

  const modalSelectedList = Array.from(modalSelection.values())

  const handleClose = () => {
    setSelectedFolderIds([])
    onClose()
  }

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-md shadow-lg border border-gray-200 flex max-w-[700px] w-[95vw] max-h-[85vh] overflow-hidden flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-[14px] font-medium text-gray-800">{title}</h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Content: two columns 50-50 */}
        <div className="flex flex-1 min-h-0">
          {/* Left 50%: all folders with colors (browse) */}
          <div className="flex flex-col flex-1 min-w-0 border-r border-gray-200 overflow-hidden bg-gray-50">
            <div className="px-3 py-2 border-b border-gray-200 flex-shrink-0">
              <span className="text-[13px] font-medium text-gray-800">
                Your folders
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 min-h-0">
              {/* Non-foldered Colors Section */}
              {nonFolderedColors.length > 0 && (
                <div className="mb-3 border border-gray-200 rounded">
                  <div className="flex items-center gap-2 p-2 bg-gray-50 border-b border-gray-200">
                    <button
                      type="button"
                      onClick={() => setCollapsedNonFoldered((prev) => !prev)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <ChevronDown
                        size={14}
                        strokeWidth={2.25}
                        className="text-gray-600"
                        style={{
                          transformOrigin: "center",
                          transform: `rotate(${collapsedNonFoldered ? -90 : 0}deg)`,
                          transition: "transform 0.2s ease-in-out",
                        }}
                      />
                    </button>
                    <div className="flex-grow">
                      <div className="text-[12px] font-medium text-gray-800">
                        Non-foldered Colors
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {isLoadingNonFoldered
                          ? "Loading..."
                          : `${nonFolderedColors.length} color${nonFolderedColors.length !== 1 ? "s" : ""}`}
                      </div>
                    </div>
                  </div>
                  <CollapsibleBox
                    isOpen={!collapsedNonFoldered}
                    maxHeight={`${Math.ceil(nonFolderedColors.length / 6) * 40 + 20}px`}
                  >
                    <div className="p-2">
                      <div className="flex flex-wrap gap-1.5">
                        <Tooltip.Provider>
                          {nonFolderedColors.map((color) => {
                            const isSelected = modalSelection.has(color._id)
                            const contrast = getContrastColor(color.hex)
                            return (
                              <Tooltip.Root key={color._id}>
                                <Tooltip.Trigger asChild>
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    style={getBackgroundStyle(color)}
                                    className="relative w-[32px] h-[32px] border-2 border-gray-300 hover:border-gray-400 rounded cursor-pointer flex items-center justify-center transition-all"
                                    onClick={() =>
                                      handleColorToggle(color, null)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault()
                                        handleColorToggle(color, null)
                                      }
                                    }}
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
                                      <div className="font-medium">
                                        {color.type === "gradient"
                                          ? "Gradient Information"
                                          : "Color Information"}
                                      </div>
                                      {color.type === "gradient" ? (
                                        <>
                                          <div>
                                            Type:{" "}
                                            {color.gradient_data?.type ||
                                              "linear"}
                                          </div>
                                          <div>
                                            Stops:{" "}
                                            {color.gradient_data?.stops
                                              ?.length || 0}
                                          </div>
                                          {color.gradient_data?.angle !==
                                            undefined && (
                                            <div>
                                              Angle: {color.gradient_data.angle}
                                              °
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <div>Hex: {color.hex}</div>
                                      )}
                                      {color.slash_naming ? (
                                        <div>
                                          Slash Naming: {color.slash_naming}
                                        </div>
                                      ) : null}
                                      <Tooltip.Arrow className="fill-white" />
                                    </div>
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
              )}

              {/* Folders with Colors */}
              {foldersOrdered.length > 0 && (
                <div className="space-y-2">
                  {foldersOrdered.map((folder: Folder) => {
                    const colors = folder.colors || []
                    const isCollapsed = collapsedFolders.has(folder._id)
                    return (
                      <div
                        key={folder._id}
                        className="border border-gray-200 rounded"
                      >
                        <div className="flex items-center gap-2 p-2 bg-gray-50 border-b border-gray-200">
                          <button
                            type="button"
                            onClick={() => handleFolderToggle(folder._id)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
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
                          <div className="flex-grow">
                            <div className="text-[12px] font-medium text-gray-800 truncate">
                              {getFolderPathLabelById(
                                folder._id,
                                foldersFlat,
                                parentByChildId,
                              ) || folder.name}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {colors.length} color
                              {colors.length !== 1 ? "s" : ""}
                            </div>
                          </div>
                        </div>
                        <CollapsibleBox
                          isOpen={!isCollapsed}
                          maxHeight={`${Math.ceil(colors.length / 6) * 40 + 20}px`}
                        >
                          <div className="p-2">
                            {colors.length === 0 ? (
                              <div className="text-center text-gray-400 text-[11px] py-4">
                                No colors in this folder
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                <Tooltip.Provider>
                                  {colors.map((color: Color) => {
                                    const isSelected = modalSelection.has(
                                      color._id,
                                    )
                                    const contrast = getContrastColor(color.hex)
                                    return (
                                      <Tooltip.Root key={color._id}>
                                        <Tooltip.Trigger asChild>
                                          <div
                                            role="button"
                                            tabIndex={0}
                                            style={getBackgroundStyle(color)}
                                            className="relative w-[32px] h-[32px] border-2 border-gray-300 hover:border-gray-400 rounded cursor-pointer flex items-center justify-center transition-all"
                                            onClick={() =>
                                              handleColorToggle(color, folder)
                                            }
                                            onKeyDown={(e) => {
                                              if (
                                                e.key === "Enter" ||
                                                e.key === " "
                                              ) {
                                                e.preventDefault()
                                                handleColorToggle(color, folder)
                                              }
                                            }}
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
                                              <div className="font-medium">
                                                {color.type === "gradient"
                                                  ? "Gradient Information"
                                                  : "Color Information"}
                                              </div>
                                              {color.type === "gradient" ? (
                                                <>
                                                  <div>
                                                    Type:{" "}
                                                    {color.gradient_data
                                                      ?.type || "linear"}
                                                  </div>
                                                  <div>
                                                    Stops:{" "}
                                                    {color.gradient_data?.stops
                                                      ?.length || 0}
                                                  </div>
                                                  {color.gradient_data
                                                    ?.angle !== undefined && (
                                                    <div>
                                                      Angle:{" "}
                                                      {
                                                        color.gradient_data
                                                          .angle
                                                      }
                                                      °
                                                    </div>
                                                  )}
                                                </>
                                              ) : (
                                                <div>Hex: {color.hex}</div>
                                              )}
                                              {color.slash_naming ? (
                                                <div>
                                                  Slash Naming:{" "}
                                                  {color.slash_naming}
                                                </div>
                                              ) : null}
                                              <Tooltip.Arrow className="fill-white" />
                                            </div>
                                          </Tooltip.Content>
                                        </Tooltip.Portal>
                                      </Tooltip.Root>
                                    )
                                  })}
                                </Tooltip.Provider>
                              </div>
                            )}
                          </div>
                        </CollapsibleBox>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right 50%: destination folder(s) multi-select + selected colors (swatches only) */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <div className="p-3 border-b border-gray-200 flex-shrink-0">
              <label className="block text-[12px] text-gray-700 mb-2">
                Select folder(s) to{" "}
                {actionType === "copy" ? "copy to" : "move to"}
              </label>
              {foldersLoading ? (
                <div className="text-center text-gray-500 text-sm py-2">
                  Loading folders...
                </div>
              ) : foldersFlat.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-2">
                  No folders available. Create a folder first.
                </div>
              ) : (
                <MultiSelectDropdown<string>
                  selected={selectedFolderIds}
                  items={visibleFolderIds}
                  itemsWhenSearching={foldersOrdered.map((f) => f._id)}
                  renderHeader={() => {
                    const allIds = foldersOrdered.map((f) => f._id)
                    const allSelected =
                      allIds.length > 0 &&
                      selectedFolderIds.length === allIds.length &&
                      allIds.every((id) => selectedFolderIds.includes(id))
                    const someSelected =
                      selectedFolderIds.length > 0 && !allSelected
                    return (
                      <div className="flex items-center justify-between h-8 px-3">
                        <button
                          type="button"
                          className="flex items-center justify-center w-5 h-5 shrink-0 mr-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 rounded-sm focus:outline-none transition-colors"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            allExpanded ? collapseAll() : expandAll()
                          }}
                          aria-label={
                            allExpanded ? "Collapse all" : "Expand all"
                          }
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.25"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`transition-transform duration-150 ${allExpanded ? "rotate-90" : ""}`}
                            aria-hidden
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </button>
                        <div className="shrink-0">
                          <div
                            className="relative flex-shrink-0"
                            style={{ width: "16px", height: "16px" }}
                          >
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={(el) => {
                                if (el)
                                  (el as HTMLInputElement).indeterminate =
                                    someSelected
                              }}
                              onChange={() =>
                                setSelectedFolderIds(allSelected ? [] : allIds)
                              }
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
                                border: allSelected
                                  ? "1.5px solid #000000"
                                  : "1.5px solid #d1d5db",
                                borderRadius: "3px",
                                backgroundColor: allSelected
                                  ? "#000000"
                                  : "#ffffff",
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
                              aria-label="Select all folders"
                            />
                            {allSelected && (
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
                      </div>
                    )
                  }}
                  keyExtractor={(id) => id}
                  renderItem={(folderId) => {
                    const folder = foldersFlat.find((f) => f._id === folderId)
                    return folder ? (
                      <FolderDropdownRow
                        depth={getFolderDepthById(folderId, parentByChildId)}
                        name={folder.name}
                        title={
                          getFolderPathLabelById(
                            folderId,
                            foldersFlat,
                            parentByChildId,
                          ) || folder.name
                        }
                        hasChildren={folderHasChildrenInList(
                          folder,
                          existingIdSet,
                        )}
                        expanded={expandedIds.has(folder._id)}
                        onToggleExpand={() => toggleExpanded(folder._id)}
                      />
                    ) : (
                      folderId
                    )
                  }}
                  renderSelected={(selectedIds) => {
                    if (selectedIds.length === 0) return "Select folders"
                    if (selectedIds.length === 1) {
                      const folder = foldersFlat.find(
                        (f) => f._id === selectedIds[0],
                      )
                      return folder
                        ? getFolderPathLabelById(
                            selectedIds[0],
                            foldersFlat,
                            parentByChildId,
                          ) || folder.name
                        : selectedIds[0]
                    }
                    return `${selectedIds.length} folders selected`
                  }}
                  getSearchText={(folderId) => {
                    const folder = foldersFlat.find((f) => f._id === folderId)
                    return folder
                      ? getFolderPathLabelById(
                          folderId,
                          foldersFlat,
                          parentByChildId,
                        ) || folder.name
                      : String(folderId)
                  }}
                  onSelect={setSelectedFolderIds}
                  placeholder="Select folders"
                  width="100%"
                  isSearchable
                  checkboxAtEnd
                />
              )}
            </div>
            <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
              <span className="text-[13px] font-medium text-gray-800">
                {actionLabel}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 min-h-0 flex flex-wrap gap-2 content-start">
              {modalSelectedList.length === 0 ? (
                <div className="text-[11px] text-gray-400 text-center py-4 w-full">
                  No colors selected — click colors on the left to add/remove
                </div>
              ) : (
                modalSelectedList.map((item, index) => (
                  <div
                    key={item.color._id + String(index)}
                    className="w-8 h-8 rounded border border-gray-200 flex-shrink-0"
                    style={getBackgroundStyle(item.color)}
                    title={
                      item.color.type === "gradient"
                        ? `Gradient (${item.color.gradient_data?.type || "linear"})`
                        : item.color.hex
                    }
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 py-3 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={handleClose}
            className="flex-1 py-2 text-[12px] border border-gray-200 rounded bg-white hover:bg-gray-50 text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              selectedFolderIds.length === 0 ||
              modalSelectedList.length === 0 ||
              parentIsLoading ||
              foldersLoading
            }
            className={`flex-1 py-2 text-[12px] rounded transition-colors ${
              selectedFolderIds.length > 0 &&
              modalSelectedList.length > 0 &&
              !parentIsLoading &&
              !foldersLoading
                ? "bg-gray-900 text-white hover:bg-gray-800"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {parentIsLoading
              ? actionType === "copy"
                ? "Copying..."
                : "Moving..."
              : actionType === "copy"
                ? "Copy"
                : "Move"}
          </button>
        </div>
      </div>
    </div>
  )
}
