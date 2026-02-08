import { useState, useEffect } from "react"
import { useQueryClient, useQuery } from "@tanstack/react-query"
import { useGetFolders, Folder, Color } from "@/v2/api/folders.api"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useToast } from "@/v2/hooks/useToast"
import { config } from "@/v2/others/config"
import { axiosInstance } from "@/v2/hooks/useAPI"
import { MultiSelectDropdown } from "../FigmaManager/MultiSelectDropdown"
import { CollapsibleBox } from "../CollapsibleBox"
import { FolderSelectionModal, type SelectedColorItem } from "./FolderSelectionModal"
import { ChevronDown, Check } from "lucide-react"
import * as Tooltip from "@radix-ui/react-tooltip"

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

interface SelectedColor {
  color: Color
  folderId: string
  folderName: string
  originalColorId: string
}

// Special ID for non-foldered option in dropdown
const NON_FOLDERED_ID = "__non_foldered__"

// Type for dropdown items (can be folder or non-foldered option)
type SelectableItem = Folder | { _id: string; name: string; isNonFoldered: true }

const Left: React.FC = () => {
  const { state } = useGlobalState()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { data: foldersData, isLoading, error, refetch } = useGetFolders(true)
  const [selectedFolders, setSelectedFolders] = useState<Folder[]>([])
  const [includeNonFoldered, setIncludeNonFoldered] = useState(false)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const [collapsedNonFoldered, setCollapsedNonFoldered] = useState(false)
  const [selectedColors, setSelectedColors] = useState<Map<string, SelectedColor>>(new Map())
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [folderActionType, setFolderActionType] = useState<"copy" | "move" | null>(null)
  const [actionLoading, setActionLoading] = useState<"copy" | "move" | null>(null)

  // Fetch non-foldered colors using all-color-data endpoint which returns full color objects
  const { data: allColorData, isLoading: isLoadingNonFoldered } = useQuery({
    queryKey: ["all-color-data", includeNonFoldered],
    queryFn: async () => {
      const response = await axiosInstance.get("/api/database-sheets/all-color-data", {
        headers: {
          Authorization: `Bearer ${state.user?.jwtToken}`,
        },
      })
      const data = response.data?.data || response.data
      // Map colorsWithoutFolders to full Color objects
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
    enabled: !!state.user?.jwtToken && includeNonFoldered,
  })

  const nonFolderedColors: Color[] = allColorData?.colorsWithoutFolders || []

  // Load saved folder selection from localStorage, or default to all folders + non-foldered selected
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bulk_editor_selected_folders')
      const savedNonFoldered = localStorage.getItem('bulk_editor_include_non_foldered')
      const folders = foldersData?.folders || []
      if (saved && folders.length > 0) {
        const savedIds = JSON.parse(saved) as string[]
        const matched = folders.filter(f => savedIds.includes(f._id))
        if (matched.length > 0) {
          setSelectedFolders(matched)
          setIncludeNonFoldered(savedNonFoldered === 'true')
          return
        }
      }
      // No saved selection (or empty) – default to all folders + non-foldered selected
      setSelectedFolders([...folders])
      setIncludeNonFoldered(true)
    } catch (e) {
      console.error('Error loading saved folders:', e)
    }
  }, [foldersData])

  // Save folder selection to localStorage
  useEffect(() => {
    if (selectedFolders.length > 0 || includeNonFoldered) {
      if (selectedFolders.length > 0) {
        localStorage.setItem('bulk_editor_selected_folders', JSON.stringify(selectedFolders.map(f => f._id)))
      }
      localStorage.setItem('bulk_editor_include_non_foldered', String(includeNonFoldered))
    } else {
      localStorage.removeItem('bulk_editor_selected_folders')
      localStorage.removeItem('bulk_editor_include_non_foldered')
    }
  }, [selectedFolders, includeNonFoldered])

  const handleFolderToggle = (folderId: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const handleColorClick = (color: Color, folder: Folder | null = null) => {
    // For non-foldered colors, use a special key
    const colorKey = folder ? `${folder._id}_${color._id}` : `non-foldered_${color._id}`
    setSelectedColors(prev => {
      const next = new Map(prev)
      
      // Check if this color is already selected in any folder
      let existingKey: string | null = null
      prev.forEach((selectedColor, key) => {
        if (selectedColor.color._id === color._id) {
          existingKey = key
        }
      })
      
      if (existingKey && existingKey !== colorKey) {
        // Color was moved to a different folder - update the selection
        next.delete(existingKey)
        next.set(colorKey, {
          color,
          folderId: folder ? folder._id : "non-foldered",
          folderName: folder ? folder.name : "Non-foldered",
          originalColorId: color._id,
        })
      } else if (next.has(colorKey)) {
        // Toggle selection if clicking the same color in the same location
        next.delete(colorKey)
      } else {
        // Add new selection
        next.set(colorKey, {
          color,
          folderId: folder ? folder._id : "non-foldered",
          folderName: folder ? folder.name : "Non-foldered",
          originalColorId: color._id,
        })
      }
      return next
    })
  }

  const isColorSelected = (colorId: string, folderId: string | null = null): boolean => {
    const key = folderId ? `${folderId}_${colorId}` : `non-foldered_${colorId}`
    return selectedColors.has(key)
  }

  /** Toggle select all / deselect all for a folder (or non-foldered). Same behavior as Export to Sheet. */
  const handleSelectAllInFolder = (folder: Folder | null, colorsInFolder: Color[]) => {
    if (colorsInFolder.length === 0) return
    const allSelected = colorsInFolder.every((c) => isColorSelected(c._id, folder?._id ?? null))
    setSelectedColors((prev) => {
      const next = new Map(prev)
      if (allSelected) {
        colorsInFolder.forEach((c) => {
          const key = folder ? `${folder._id}_${c._id}` : `non-foldered_${c._id}`
          next.delete(key)
        })
      } else {
        colorsInFolder.forEach((c) => {
          const key = folder ? `${folder._id}_${c._id}` : `non-foldered_${c._id}`
          const folderId = folder ? folder._id : "non-foldered"
          const folderName = folder ? folder.name : "Non-foldered"
          next.delete(key)
          next.set(key, {
            color: c,
            folderId,
            folderName,
            originalColorId: c._id,
          })
        })
      }
      return next
    })
  }

  // Dispatch selected colors to global state or parent component
  useEffect(() => {
    // Store in localStorage for Right component to access
    const colorsArray = Array.from(selectedColors.values())
    localStorage.setItem('bulk_editor_selected_colors', JSON.stringify(colorsArray))
    
    // Dispatch custom event for Right component
    window.dispatchEvent(new CustomEvent('bulk-editor-colors-changed', {
      detail: { colors: colorsArray }
    }))
  }, [selectedColors])

  // When Right side clears (Clear button), de-select all on the left so checkmarks stay in sync
  useEffect(() => {
    const handleClearFromRight = (event: CustomEvent<{ colors: SelectedColor[] }>) => {
      const colors = event.detail?.colors
      if (Array.isArray(colors) && colors.length === 0) {
        setSelectedColors(new Map())
      }
    }
    window.addEventListener('bulk-editor-colors-changed', handleClearFromRight as EventListener)
    return () => {
      window.removeEventListener('bulk-editor-colors-changed', handleClearFromRight as EventListener)
    }
  }, [])

  // Listen for folder refresh events from Right component
  useEffect(() => {
    const handleRefresh = async () => {
      const result = await refetch()
      // After refetch, update selectedFolders to use the new data
      if ((selectedFolders.length > 0 || includeNonFoldered) && result.data?.folders) {
        const currentFolderIds = selectedFolders.map(sf => sf._id)
        const updatedFolders = result.data.folders.filter(f => 
          currentFolderIds.includes(f._id)
        )
        if (updatedFolders.length > 0 || includeNonFoldered) {
          setSelectedFolders(updatedFolders)
          
          // Update selected colors with latest data from refreshed folders
          // Also handle colors that were moved to different folders or from non-foldered
          setSelectedColors(prev => {
            const updated = new Map(prev)
            const colorsToUpdate: Array<{ oldKey: string; newKey: string; color: Color; folder: Folder }> = []
            
            // First, find colors that were moved to different folders or from non-foldered
            prev.forEach((selectedColor, oldKey) => {
              // Check if this color exists in any folder (to catch moves from non-foldered)
              for (const folder of result.data.folders) {
                const colorExists = folder.colors?.some(c => c._id === selectedColor.color._id)
                if (colorExists) {
                  const newKey = `${folder._id}_${selectedColor.color._id}`
                  const color = folder.colors?.find(c => c._id === selectedColor.color._id)
                  // Only update if the destination folder is in selectedFolders
                  // or if moving from non-foldered to a selected folder
                  const isDestinationSelected = updatedFolders.some(f => f._id === folder._id)
                  if (color && newKey !== oldKey && isDestinationSelected) {
                    // Color was moved to a different folder (including from non-foldered)
                    colorsToUpdate.push({
                      oldKey,
                      newKey,
                      color,
                      folder: folder
                    })
                    break // Found the folder, no need to continue searching
                  }
                }
              }
            })
            
            // Remove colors that were moved from non-foldered to a folder that's not selected
            // Skip colors that are already being updated by the first loop
            const keysBeingUpdated = new Set(colorsToUpdate.map(c => c.oldKey))
            prev.forEach((selectedColor, oldKey) => {
              if (oldKey.startsWith('non-foldered_') && !keysBeingUpdated.has(oldKey)) {
                // Check if this color now exists in any folder (meaning it was moved)
                const wasMoved = result.data.folders.some(folder => 
                  folder.colors?.some(c => c._id === selectedColor.color._id)
                )
                // If moved but destination folder is not selected, remove it
                if (wasMoved) {
                  const destinationFolder = result.data.folders.find(folder => 
                    folder.colors?.some(c => c._id === selectedColor.color._id)
                  )
                  const isDestinationSelected = destinationFolder && updatedFolders.some(f => f._id === destinationFolder._id)
                  if (!isDestinationSelected) {
                    updated.delete(oldKey)
                  }
                }
              }
            })
            
            // Remove old keys and add new keys for moved colors
            // Preserve existing color data when moving
            colorsToUpdate.forEach(({ oldKey, newKey, color, folder }) => {
              const existing = updated.get(oldKey)
              updated.delete(oldKey)
              updated.set(newKey, {
                color: {
                  ...existing?.color, // Preserve existing local data
                  ...color,           // Override with server data
                  // Ensure critical fields are preserved
                  slash_naming: color.slash_naming ?? existing?.color.slash_naming ?? "",
                  comments: color.comments ?? existing?.color.comments ?? "",
                  ranking: color.ranking ?? existing?.color.ranking ?? 0,
                  tags: color.tags ?? existing?.color.tags ?? [],
                  additionalColumns: color.additionalColumns ?? existing?.color.additionalColumns ?? [],
                },
                folderId: folder._id,
                folderName: folder.name,
                originalColorId: color._id,
              })
            })
            
            // Update colors that stayed in the same folder with latest data
            // Also handle colors that were copied (they remain in original folder)
            // Merge server data with existing local data to preserve all fields
            updatedFolders.forEach(folder => {
              folder.colors?.forEach(serverColor => {
                const key = `${folder._id}_${serverColor._id}`
                if (updated.has(key)) {
                  const existing = updated.get(key)!
                  // Merge server color data with existing local data
                  // This preserves fields that might not be in server response
                  updated.set(key, {
                    ...existing,
                    color: {
                      ...existing.color, // Keep existing local data
                      ...serverColor,    // Override with server data
                      // Ensure critical fields are preserved
                      slash_naming: serverColor.slash_naming ?? existing.color.slash_naming ?? "",
                      comments: serverColor.comments ?? existing.color.comments ?? "",
                      ranking: serverColor.ranking ?? existing.color.ranking ?? 0,
                      tags: serverColor.tags ?? existing.color.tags ?? [],
                      additionalColumns: serverColor.additionalColumns ?? existing.color.additionalColumns ?? [],
                    },
                    folderId: folder._id,
                    folderName: folder.name,
                  })
                }
              })
            })
            
            // Dispatch updated colors to Right component
            const updatedColorsArray = Array.from(updated.values())
            localStorage.setItem('bulk_editor_selected_colors', JSON.stringify(updatedColorsArray))
            window.dispatchEvent(new CustomEvent('bulk-editor-colors-changed', {
              detail: { colors: updatedColorsArray }
            }))
            
            return updated
          })
        }
      }
    }

    window.addEventListener('bulk-editor-folders-refresh', handleRefresh)
    return () => {
      window.removeEventListener('bulk-editor-folders-refresh', handleRefresh)
    }
  }, [refetch, selectedFolders])

  const handleCopyToFolder = () => {
    const colorsArray = Array.from(selectedColors.values())
    if (colorsArray.length === 0) {
      toast.display("error", "No colors selected")
      return
    }
    setFolderActionType("copy")
    setFolderModalOpen(true)
  }

  const handleMoveToFolder = () => {
    const colorsArray = Array.from(selectedColors.values())
    if (colorsArray.length === 0) {
      toast.display("error", "No colors selected")
      return
    }
    setFolderActionType("move")
    setFolderModalOpen(true)
  }

  const handleFolderConfirm = async (folderIds: string[], colorsToOperateOn: SelectedColorItem[]) => {
    if (!folderActionType) return

    if (colorsToOperateOn.length === 0 || folderIds.length === 0) return

    const colorIds = colorsToOperateOn.map((item) => item.color._id)
    setActionLoading(folderActionType)
    try {
      if (folderActionType === "copy") {
        await axiosInstance.post(
          config.api.endpoints.copyColorsToFolders,
          { folderIds, colorIds },
          {
            headers: {
              Authorization: `Bearer ${state.user?.jwtToken}`,
            },
          }
        )
        toast.display(
          "success",
          `Successfully copied ${colorsToOperateOn.length} color(s) to ${folderIds.length} folder${folderIds.length !== 1 ? "s" : ""}`
        )
      } else if (folderActionType === "move") {
        await axiosInstance.post(
          config.api.endpoints.moveColorsToFolders,
          { folderIds, colorIds },
          {
            headers: {
              Authorization: `Bearer ${state.user?.jwtToken}`,
            },
          }
        )
        toast.display(
          "success",
          `Successfully moved ${colorsToOperateOn.length} color(s) to ${folderIds.length} folder${folderIds.length !== 1 ? "s" : ""}`
        )
      }

      // Invalidate and refetch folders to update the left panel
      await queryClient.invalidateQueries({ queryKey: ["folders"] })
      
      // Also invalidate non-foldered colors query if it's enabled
      // This ensures colors moved from non-foldered to folder are removed from the list
      if (includeNonFoldered) {
        await queryClient.invalidateQueries({ queryKey: ["all-color-data"] })
      }
      
      // Dispatch event to trigger refresh
      window.dispatchEvent(new CustomEvent('bulk-editor-folders-refresh'))
      
      // For copy operations, keep the original selection
      // For move operations, the selection will be updated to the new folder by the refresh handler
      // The selected colors will persist and be updated with latest data when folders are refreshed

      setFolderModalOpen(false)
      setFolderActionType(null)
    } catch (error: any) {
      console.error(`Error ${folderActionType === "copy" ? "copying" : "moving"} colors:`, error)
      toast.display("error", error.response?.data?.err || error.response?.data?.message || `Failed to ${folderActionType} colors`)
    } finally {
      setActionLoading(null)
    }
  }

  const selectedColorsArray = Array.from(selectedColors.values())

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        <div className="mb-2">Loading folders...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500 text-sm">
        <div className="mb-2">Error loading folders</div>
        <div className="text-[11px] text-gray-400">{String(error)}</div>
      </div>
    )
  }

  const folders = foldersData?.folders || []

  // Create dropdown items: folders + non-foldered option
  const dropdownItems: SelectableItem[] = [
    ...folders,
    { _id: NON_FOLDERED_ID, name: "Non-foldered colors", isNonFoldered: true } as SelectableItem
  ]

  // Get selected items for dropdown (folders + non-foldered if selected)
  const selectedItems: SelectableItem[] = [
    ...selectedFolders,
    ...(includeNonFoldered ? [{ _id: NON_FOLDERED_ID, name: "Non-foldered colors", isNonFoldered: true } as SelectableItem] : [])
  ]

  const handleDropdownSelect = (items: SelectableItem[]) => {
    // Separate folders from non-foldered option
    const folders = items.filter((item): item is Folder => !('isNonFoldered' in item && item.isNonFoldered))
    const hasNonFoldered = items.some((item) => 'isNonFoldered' in item && item.isNonFoldered)
    
    setSelectedFolders(folders)
    setIncludeNonFoldered(hasNonFoldered)
  }

  if (folders.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        <div className="mb-2">No folders found</div>
        <div className="text-[11px] text-gray-300">Create folders in your account to use bulk editor</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden w-[400px]">
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
      {/* Folder Selection with Non-foldered option */}
      <div className="mb-3">
        <MultiSelectDropdown<SelectableItem>
          isSearchable
          placeholder="Select Folders"
          selected={selectedItems}
          items={dropdownItems}
          keyExtractor={(item) => item._id}
          renderItem={(item) => {
            if ('isNonFoldered' in item && item.isNonFoldered) {
              return <span className="text-[12px]">{item.name}</span>
            }
            return <span className="text-[12px]">{(item as Folder).name}</span>
          }}
          renderSelected={(selected) => {
            const folderCount = selected.filter((item): item is Folder => !('isNonFoldered' in item && item.isNonFoldered)).length
            const hasNonFoldered = selected.some((item) => 'isNonFoldered' in item && item.isNonFoldered)
            
            if (folderCount === folders.length && hasNonFoldered) {
              return "All Folders + Non-foldered"
            }
            if (folderCount === folders.length) {
              return "All Folders"
            }
            const parts: string[] = []
            if (folderCount > 0) parts.push(`${folderCount} Folder${folderCount > 1 ? 's' : ''}`)
            if (hasNonFoldered) parts.push("Non-foldered")
            return parts.join(", ") || "Select options"
          }}
          onSelect={handleDropdownSelect}
          width="100%"
          checkboxAtEnd={true}
        />
      </div>

      {/* Non-foldered Colors Section */}
      {includeNonFoldered && (
        <div className="mb-3 border border-gray-200 rounded">
          <div className="flex items-center gap-2 p-2 bg-gray-50 border-b border-gray-200">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleSelectAllInFolder(null, nonFolderedColors)
              }}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                nonFolderedColors.length > 0 && nonFolderedColors.every((c) => isColorSelected(c._id, null))
                  ? "bg-gray-900 border-gray-900"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              title={nonFolderedColors.length > 0 && nonFolderedColors.every((c) => isColorSelected(c._id, null)) ? "Deselect all" : "Select all"}
            >
              {nonFolderedColors.length > 0 && nonFolderedColors.every((c) => isColorSelected(c._id, null)) && (
                <Check size={12} className="text-white" />
              )}
            </button>
            <div className="flex-grow min-w-0">
              <div className="text-[12px] font-medium text-gray-800">
                Non-foldered Colors
              </div>
              <div className="text-[10px] text-gray-500">
                {isLoadingNonFoldered ? "Loading..." : `${nonFolderedColors.length} color${nonFolderedColors.length !== 1 ? "s" : ""}`}
                {nonFolderedColors.length > 0 && (
                  <span className="ml-1">
                    • {nonFolderedColors.filter(c => isColorSelected(c._id, null)).length} selected
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setCollapsedNonFoldered(!collapsedNonFoldered)}
              className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
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
          </div>
          <CollapsibleBox
            isOpen={!collapsedNonFoldered}
            maxHeight={`${Math.ceil(nonFolderedColors.length / 6) * 40 + 20}px`}
          >
            <div className="p-2">
              {isLoadingNonFoldered ? (
                <div className="text-center text-gray-400 text-[11px] py-4">Loading colors...</div>
              ) : nonFolderedColors.length === 0 ? (
                <div className="text-center text-gray-400 text-[11px] py-4">
                  No non-foldered colors found
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  <Tooltip.Provider>
                    {nonFolderedColors.map((color) => {
                      const isSelected = isColorSelected(color._id, null)
                      const contrast = getContrastColor(color.hex)
                      return (
                        <Tooltip.Root key={color._id}>
                          <Tooltip.Trigger asChild>
                            <div
                              style={{
                                backgroundColor: color.hex,
                              }}
                              className="relative w-[32px] h-[32px] cursor-pointer border-2 border-gray-300 hover:border-gray-400 transition-all flex items-center justify-center"
                              onClick={() => handleColorClick(color, null)}
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
                                {color.rgb && (
                                  <div>
                                    RGB: {typeof color.rgb === 'string' 
                                      ? color.rgb 
                                      : `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`}
                                  </div>
                                )}
                                {color.hsl && (
                                  <div>
                                    HSL: {typeof color.hsl === 'string' 
                                      ? color.hsl 
                                      : `hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`}
                                  </div>
                                )}
                                {color.slash_naming && (
                                  <div>Slash Naming: {color.slash_naming}</div>
                                )}
                                {color.comments && (
                                  <div>Comments: {color.comments}</div>
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
              )}
            </div>
          </CollapsibleBox>
        </div>
      )}

      {/* Folders with Colors */}
      {selectedFolders.length === 0 && !includeNonFoldered ? (
        <div className="text-center text-gray-400 text-sm py-8">
          <div className="mb-2">Select folders above or enable non-foldered colors to view colors</div>
          <div className="text-[11px] text-gray-300">Click colors to add them to the editor</div>
        </div>
      ) : selectedFolders.length > 0 ? (
        <div className="space-y-2">
          {selectedFolders.map((folder) => {
            const colors = folder.colors || []
            const isCollapsed = collapsedFolders.has(folder._id)
            const selectedCount = colors.filter(c => isColorSelected(c._id, folder._id)).length

            return (
              <div key={folder._id} className="border border-gray-200 rounded">
                {/* Folder Header */}
                <div className="flex items-center gap-2 p-2 bg-gray-50 border-b border-gray-200">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectAllInFolder(folder, colors)
                    }}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      colors.length > 0 && colors.every((c) => isColorSelected(c._id, folder._id))
                        ? "bg-gray-900 border-gray-900"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                    title={colors.length > 0 && colors.every((c) => isColorSelected(c._id, folder._id)) ? "Deselect all" : "Select all"}
                  >
                    {colors.length > 0 && colors.every((c) => isColorSelected(c._id, folder._id)) && (
                      <Check size={12} className="text-white" />
                    )}
                  </button>
                  <div className="flex-grow min-w-0">
                    <div className="text-[12px] font-medium text-gray-800 truncate">
                      {folder.name}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {colors.length} color{colors.length !== 1 ? "s" : ""}
                      {selectedCount > 0 && ` • ${selectedCount} selected`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleFolderToggle(folder._id)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
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

                {/* Colors Grid */}
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
                          {colors.map((color) => {
                            const isSelected = isColorSelected(color._id, folder._id)
                            const contrast = getContrastColor(color.hex)
                            return (
                              <Tooltip.Root key={color._id}>
                                <Tooltip.Trigger asChild>
                                  <div
                                    style={{
                                      backgroundColor: color.hex,
                                    }}
                                    className="relative w-[32px] h-[32px] cursor-pointer border-2 border-gray-300 hover:border-gray-400 transition-all flex items-center justify-center"
                                    onClick={() => handleColorClick(color, folder)}
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
                                      {color.rgb && (
                                        <div>
                                          RGB: {typeof color.rgb === 'string' 
                                            ? color.rgb 
                                            : `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`}
                                        </div>
                                      )}
                                      {color.hsl && (
                                        <div>
                                          HSL: {typeof color.hsl === 'string' 
                                            ? color.hsl 
                                            : `hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`}
                                        </div>
                                      )}
                                      {color.slash_naming && (
                                        <div>Slash Naming: {color.slash_naming}</div>
                                      )}
                                      {color.comments && (
                                        <div>Comments: {color.comments}</div>
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
                    )}
                  </div>
                </CollapsibleBox>
              </div>
            )
          })}
        </div>
      ) : null}
      </div>

      {/* Fixed Bottom Buttons - Copy to and Move to (disabled when no color selected) */}
      <div className="border-t border-gray-200 bg-white p-3 flex-shrink-0">
        <div className="flex gap-2">
          <button
            onClick={handleCopyToFolder}
            disabled={selectedColorsArray.length === 0 || actionLoading !== null}
            className={`flex-1 py-2 text-[12px] border border-gray-200 rounded transition-colors ${
              selectedColorsArray.length === 0 || actionLoading === "copy"
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white hover:bg-gray-50 text-gray-700"
            }`}
          >
            {actionLoading === "copy" ? "Copying..." : "Copy to"}
          </button>
          <button
            onClick={handleMoveToFolder}
            disabled={selectedColorsArray.length === 0 || actionLoading !== null}
            className={`flex-1 py-2 text-[12px] border border-gray-200 rounded transition-colors ${
              selectedColorsArray.length === 0 || actionLoading === "move"
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white hover:bg-gray-50 text-gray-700"
            }`}
          >
            {actionLoading === "move" ? "Moving..." : "Move to"}
          </button>
        </div>
      </div>

      {/* Folder Selection Modal */}
      <FolderSelectionModal
        isOpen={folderModalOpen}
        onClose={() => {
          setFolderModalOpen(false)
          setFolderActionType(null)
        }}
        onConfirm={handleFolderConfirm}
        title={folderActionType === "copy" ? "Copy to Folder" : "Move to Folder"}
        actionType={folderActionType || "copy"}
        isLoading={actionLoading === "copy" || actionLoading === "move"}
        selectedColors={selectedColorsArray}
      />
    </div>
  )
}

export default Left
