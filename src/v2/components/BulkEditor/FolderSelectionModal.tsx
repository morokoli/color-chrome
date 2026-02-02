import { useState, useEffect, useRef } from "react"
import { X, ChevronDown, Check } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useGetFolders, Folder, Color } from "@/v2/api/folders.api"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { axiosInstance } from "@/v2/hooks/useAPI"
import { Dropdown } from "../FigmaManager/Dropdown"
import { CollapsibleBox } from "../CollapsibleBox"
import * as Tooltip from "@radix-ui/react-tooltip"

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

export interface FolderSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called with destination folderId and the colors selected in this modal (may differ from bulk editor selection) */
  onConfirm: (folderId: string, colorsToOperateOn: SelectedColorItem[]) => void
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
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const [collapsedNonFoldered, setCollapsedNonFoldered] = useState(false)
  /** Modal-local selection (independent of bulk editor); keyed by color._id */
  const [modalSelection, setModalSelection] = useState<Map<string, SelectedColorItem>>(new Map())

  const { data: foldersData, isLoading: foldersLoading } = useGetFolders(true)

  const wasOpenRef = useRef(false)
  // When modal opens, initialize selection from props (bulk editor selection); changes inside modal don't affect bulk editor
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true
      const initial = selectedColors?.length
        ? new Map(selectedColors.map(item => [item.color._id, item]))
        : new Map()
      setModalSelection(initial)
    }
    if (!isOpen) wasOpenRef.current = false
  }, [isOpen, selectedColors])

  const { data: allColorData, isLoading: isLoadingNonFoldered } = useQuery({
    queryKey: ["all-color-data", isOpen],
    queryFn: async () => {
      const response = await axiosInstance.get("/api/database-sheets/all-color-data", {
        headers: {
          Authorization: `Bearer ${state.user?.jwtToken}`,
        },
      })
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
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          }))
        }
      }
      return data
    },
    enabled: isOpen && !!state.user?.jwtToken,
  })

  if (!isOpen) return null

  const folders = foldersData?.folders || []
  const nonFolderedColors: Color[] = allColorData?.colorsWithoutFolders || []
  const actionLabel = actionType === "copy" ? "Copy to" : "Move to"

  const handleFolderToggle = (folderId: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  const handleColorToggle = (color: Color, folder: Folder | null) => {
    setModalSelection(prev => {
      const next = new Map(prev)
      if (next.has(color._id)) {
        next.delete(color._id)
      } else {
        next.set(color._id, {
          color,
          folderId: folder?._id ?? "non-foldered",
          folderName: folder?.name ?? "Non-foldered",
          originalColorId: color._id,
        })
      }
      return next
    })
  }

  const handleConfirm = () => {
    if (selectedFolderId) {
      const colorsToOperateOn = Array.from(modalSelection.values())
      onConfirm(selectedFolderId, colorsToOperateOn)
      setSelectedFolderId(null)
    }
  }

  const modalSelectedList = Array.from(modalSelection.values())

  const handleClose = () => {
    setSelectedFolderId(null)
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
              <span className="text-[13px] font-medium text-gray-800">Your folders</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 min-h-0">
              {/* Non-foldered Colors Section */}
              {nonFolderedColors.length > 0 && (
                <div className="mb-3 border border-gray-200 rounded">
                  <div className="flex items-center gap-2 p-2 bg-gray-50 border-b border-gray-200">
                    <button
                      type="button"
                      onClick={() => setCollapsedNonFoldered(prev => !prev)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <ChevronDown
                        size={14}
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
                        {isLoadingNonFoldered ? "Loading..." : `${nonFolderedColors.length} color${nonFolderedColors.length !== 1 ? "s" : ""}`}
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
                                    style={{ backgroundColor: color.hex }}
                                    className="relative w-[32px] h-[32px] border-2 border-gray-300 hover:border-gray-400 rounded cursor-pointer flex items-center justify-center transition-all"
                                    onClick={() => handleColorToggle(color, null)}
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
                                      <div className="font-medium">Color Information</div>
                                      <div>Hex: {color.hex}</div>
                                      {color.slash_naming ? (
                                        <div>Slash Naming: {color.slash_naming}</div>
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
              {folders.length > 0 && (
                <div className="space-y-2">
                  {folders.map((folder: Folder) => {
                    const colors = folder.colors || []
                    const isCollapsed = collapsedFolders.has(folder._id)
                    return (
                      <div key={folder._id} className="border border-gray-200 rounded">
                        <div className="flex items-center gap-2 p-2 bg-gray-50 border-b border-gray-200">
                          <button
                            type="button"
                            onClick={() => handleFolderToggle(folder._id)}
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
                          <div className="flex-grow">
                            <div className="text-[12px] font-medium text-gray-800 truncate">
                              {folder.name}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {colors.length} color{colors.length !== 1 ? "s" : ""}
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
                                    const isSelected = modalSelection.has(color._id)
                                    const contrast = getContrastColor(color.hex)
                                    return (
                                      <Tooltip.Root key={color._id}>
                                        <Tooltip.Trigger asChild>
                                          <div
                                            role="button"
                                            tabIndex={0}
                                            style={{ backgroundColor: color.hex }}
                                            className="relative w-[32px] h-[32px] border-2 border-gray-300 hover:border-gray-400 rounded cursor-pointer flex items-center justify-center transition-all"
                                            onClick={() => handleColorToggle(color, folder)}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter" || e.key === " ") {
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
                                              <div className="font-medium">Color Information</div>
                                              <div>Hex: {color.hex}</div>
                                              {color.slash_naming ? (
                                                <div>Slash Naming: {color.slash_naming}</div>
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

          {/* Right 50%: destination folder dropdown + selected colors (swatches only) */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <div className="p-3 border-b border-gray-200 flex-shrink-0">
              <label className="block text-[12px] text-gray-700 mb-2">
                Select folder to {actionType === "copy" ? "copy to" : "move to"}
              </label>
              {foldersLoading ? (
                <div className="text-center text-gray-500 text-sm py-2">
                  Loading folders...
                </div>
              ) : folders.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-2">
                  No folders available. Create a folder first.
                </div>
              ) : (
                <Dropdown
                  selected={selectedFolderId}
                  items={folders.map(f => f._id)}
                  renderItem={(folderId) => {
                    const folder = folders.find(f => f._id === folderId)
                    return folder?.name || folderId
                  }}
                  renderSelected={(folderId) => {
                    const folder = folders.find(f => f._id === folderId)
                    return folder?.name || "Select a folder"
                  }}
                  onSelect={(folderId) => setSelectedFolderId(folderId)}
                  placeholder="Select a folder"
                  width="100%"
                />
              )}
            </div>
            <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
              <span className="text-[13px] font-medium text-gray-800">{actionLabel}</span>
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
                    style={{ backgroundColor: item.color.hex || "#ccc" }}
                    title={item.color.hex}
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
            disabled={!selectedFolderId || modalSelectedList.length === 0 || parentIsLoading || foldersLoading}
            className={`flex-1 py-2 text-[12px] rounded transition-colors ${
              selectedFolderId && modalSelectedList.length > 0 && !parentIsLoading && !foldersLoading
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
