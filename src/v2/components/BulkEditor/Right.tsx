import { useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useToast } from "@/v2/hooks/useToast"
import { config } from "@/v2/others/config"
import { axiosInstance } from "@/v2/hooks/useAPI"
import { ColorList } from "./ColorList"
import { SlashNameInputs } from "../FigmaManager/SlashNameInputs"
import { SelectedColor } from "@/v2/api/folders.api"
import { FolderSelectionModal } from "./FolderSelectionModal"

const Right = () => {
  const { state } = useGlobalState()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [selectedColors, setSelectedColors] = useState<SelectedColor[]>([])
  const [activeColors, setActiveColors] = useState<number[]>([])
  const [slash_nameInputs, setslash_nameInputs] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
  ])
  const [tagsInput, setTagsInput] = useState<string>("")
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [folderActionType, setFolderActionType] = useState<"copy" | "move" | null>(null)
  const [isLoading, setIsLoading] = useState<"save" | "copy" | "move" | null>(null)

  // Load selected colors from localStorage (set by Left component)
  useEffect(() => {
    const loadColors = () => {
      try {
        const saved = localStorage.getItem('bulk_editor_selected_colors')
        if (saved) {
          const colors = JSON.parse(saved) as SelectedColor[]
          setSelectedColors(colors)
        }
      } catch (e) {
        console.error('Error loading selected colors:', e)
      }
    }

    loadColors()

    // Listen for changes from Left component
    const handleColorsChanged = (event: CustomEvent) => {
      setSelectedColors(event.detail.colors)
    }

    window.addEventListener('bulk-editor-colors-changed', handleColorsChanged as EventListener)
    return () => {
      window.removeEventListener('bulk-editor-colors-changed', handleColorsChanged as EventListener)
    }
  }, [])

  const handleCheckboxClick = (colorId: number) => {
    // Handling the "Select All" checkbox
    if (colorId === selectedColors.length) {
      if (activeColors.length === 0) {
        setActiveColors(selectedColors.map((_, i) => i))
        if (selectedColors.length > 0) {
          const parts = getslash_nameParts(0)
          const sharedParts = parts.map((part) =>
            selectedColors.every((item) =>
              item.color.slash_naming?.includes(part) || !item.color.slash_naming
            )
              ? part
              : "",
          )
          const filled = [...sharedParts, "", "", "", "", ""].slice(0, 5)
          setslash_nameInputs(filled)
          
          // Set tags from first color if all have same tags
          const firstTags = selectedColors[0]?.color.tags || []
          if (selectedColors.every(item => 
            JSON.stringify(item.color.tags || []) === JSON.stringify(firstTags)
          )) {
            setTagsInput(firstTags.join(", "))
          } else {
            setTagsInput("")
          }
        }
      } else {
        setActiveColors([])
        setslash_nameInputs(["", "", "", "", ""])
        setTagsInput("")
      }
      return
    }

    if (activeColors.includes(colorId)) {
      const filteredColors = activeColors.filter((color) => color !== colorId)
      setActiveColors(filteredColors)

      if (filteredColors.length === 0) {
        setslash_nameInputs(["", "", "", "", ""])
        setTagsInput("")
      } else if (filteredColors.length === 1) {
        const parts = getslash_nameParts(filteredColors[0])
        const filled = [...parts, "", "", "", "", ""].slice(0, 5)
        setslash_nameInputs(filled)
        const tags = selectedColors[filteredColors[0]]?.color.tags || []
        setTagsInput(tags.join(", "))
      } else {
        const parts = getslash_nameParts(filteredColors[0])
        const sharedParts = parts.map((part) =>
          selectedColors
            .filter((_, index) => activeColors.includes(index) && index !== colorId)
            .every((item) =>
              item.color.slash_naming?.includes(part) || !item.color.slash_naming
            )
            ? part
            : "",
        )
        const filled = [...sharedParts, "", "", "", "", ""].slice(0, 5)
        setslash_nameInputs(filled)
      }
    } else {
      const parts = getslash_nameParts(colorId)
      const sharedParts = parts.map((part) =>
        selectedColors
          .filter((_, index) => activeColors.includes(index))
          .every((item) =>
            item.color.slash_naming?.includes(part) || !item.color.slash_naming
          )
          ? part
          : "",
      )
      const filled = [...sharedParts, "", "", "", "", ""].slice(0, 5)
      setslash_nameInputs(filled)
      setActiveColors([...activeColors, colorId])
    }
  }

  const getslash_nameParts = (colorId: number) => {
    const slash_naming = selectedColors[colorId]?.color.slash_naming || ""
    return slash_naming
      .split("/")
      .map((p) => p.trim())
      .slice(0, 5)
  }

  const handleChangeslash_naming = () => {
    if (!activeColors.length) return
    const newslash_naming = slash_nameInputs.filter(Boolean).join(" / ")
    
    setSelectedColors(prev => 
      prev.map((item, index) => 
        activeColors.includes(index)
          ? {
              ...item,
              color: {
                ...item.color,
                slash_naming: newslash_naming,
              }
            }
          : item
      )
    )
    
    toast.display("success", `Updated slash naming for ${activeColors.length} color(s)`)
  }

  const handleChangeTags = () => {
    if (!activeColors.length) return
    const tags = tagsInput
      .split(",")
      .map(t => t.trim())
      .filter(Boolean)
    
    setSelectedColors(prev => 
      prev.map((item, index) => 
        activeColors.includes(index)
          ? {
              ...item,
              color: {
                ...item.color,
                tags,
              }
            }
          : item
      )
    )
    
    toast.display("success", `Updated tags for ${activeColors.length} color(s)`)
  }

  const handleManualslash_namingChange = (
    colorId: number,
    slash_nameInput: string,
  ) => {
    const newslash_naming = slash_nameInput
      .replace(/\s+/g, "")
      .replace(/ /g, "/")
      .replace(/\//g, " / ")
    
    setSelectedColors(prev => 
      prev.map((item, index) => 
        index === colorId
          ? {
              ...item,
              color: {
                ...item.color,
                slash_naming: newslash_naming,
              }
            }
          : item
      )
    )
  }

  const handleRemoveColor = (colorId: number) => {
    setSelectedColors(prev => prev.filter((_, index) => index !== colorId))
    setActiveColors(prev => prev.filter(id => id !== colorId).map(id => id > colorId ? id - 1 : id))
    
    // Update localStorage
    const updated = selectedColors.filter((_, index) => index !== colorId)
    localStorage.setItem('bulk_editor_selected_colors', JSON.stringify(updated))
    
    // Dispatch event for Left component
    window.dispatchEvent(new CustomEvent('bulk-editor-colors-changed', {
      detail: { colors: updated }
    }))
  }

  const clearColors = () => {
    setSelectedColors([])
    setActiveColors([])
    setslash_nameInputs(["", "", "", "", ""])
    setTagsInput("")
    localStorage.removeItem('bulk_editor_selected_colors')
    window.dispatchEvent(new CustomEvent('bulk-editor-colors-changed', {
      detail: { colors: [] }
    }))
  }

  const handleSaveChanges = async () => {
    if (selectedColors.length === 0) {
      toast.display("error", "No colors to save")
      return
    }

    setIsLoading("save")
    try {
      const promises = selectedColors.map(async (item) => {
        const color = item.color
        
        // Handle rgb conversion
        let rgbValue: string = ''
        if (typeof color.rgb === 'string') {
          rgbValue = color.rgb
        } else if (color.rgb && typeof color.rgb === 'object' && 'r' in color.rgb && 'g' in color.rgb && 'b' in color.rgb) {
          rgbValue = `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`
        }
        
        // Handle hsl conversion
        let hslValue: string = ''
        if (typeof color.hsl === 'string') {
          hslValue = color.hsl
        } else if (color.hsl && typeof color.hsl === 'object' && 'h' in color.hsl && 's' in color.hsl && 'l' in color.hsl) {
          hslValue = `hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`
        }
        
        const response = await axiosInstance.put(
          config.api.endpoints.updateColor,
          {
            colorId: color._id,
            sheetId: null, // We're updating database only
            isUpdateSheet: false,
            row: {
              // Use existing url if available, fallback to empty string (required by backend schema)
              url: (color as any).url || "",
              hex: color.hex,
              rgb: rgbValue,
              hsl: hslValue,
              slash_naming: color.slash_naming || "",
              comments: color.comments || "",
              ranking: color.ranking || 0,
              tags: color.tags || [],
              additionalColumns: color.additionalColumns || [],
              timestamp: Date.now(),
            },
          },
          {
            headers: {
              Authorization: `Bearer ${state.user?.jwtToken}`,
            },
          }
        )
        return response.data
      })

      await Promise.all(promises)
      toast.display("success", `Successfully updated ${selectedColors.length} color(s)`)
      
      // Invalidate and refetch folders to update the left panel
      await queryClient.invalidateQueries({ queryKey: ["folders"] })
      
      // Dispatch event to trigger refresh in Left component
      window.dispatchEvent(new CustomEvent('bulk-editor-folders-refresh'))
      
      // Dispatch event to clear selection in Left component
      window.dispatchEvent(new CustomEvent('bulk-editor-clear-selection'))
      
      // Clear selection after save
      clearColors()
    } catch (error: any) {
      console.error("Error saving colors:", error)
      toast.display("error", error.response?.data?.message || "Failed to save colors")
    } finally {
      setIsLoading(null)
    }
  }

  const handleCopyToFolder = () => {
    if (selectedColors.length === 0) {
      toast.display("error", "No colors selected")
      return
    }
    setFolderActionType("copy")
    setFolderModalOpen(true)
  }

  const handleMoveToFolder = () => {
    if (selectedColors.length === 0) {
      toast.display("error", "No colors selected")
      return
    }
    setFolderActionType("move")
    setFolderModalOpen(true)
  }

  const handleFolderConfirm = async (folderId: string) => {
    if (!folderActionType || selectedColors.length === 0) return

    setIsLoading(folderActionType)
    try {
      if (folderActionType === "copy") {
        // Copy each color to the folder
        const promises = selectedColors.map(async (item) => {
          const response = await axiosInstance.post(
            `${config.api.endpoints.copyColorToFolder}/${folderId}/copy-color`,
            {
              colorId: item.color._id,
            },
            {
              headers: {
                Authorization: `Bearer ${state.user?.jwtToken}`,
              },
            }
          )
          return response.data
        })

        await Promise.all(promises)
        toast.display("success", `Successfully copied ${selectedColors.length} color(s) to folder`)
      } else if (folderActionType === "move") {
        // Move all colors to the folder (bulk operation)
        const colorIds = selectedColors.map(item => item.color._id)
        await axiosInstance.post(
          `${config.api.endpoints.moveColorsToFolder}/${folderId}/move-colors`,
          {
            colorIds,
            isNotFoldered: false,
          },
          {
            headers: {
              Authorization: `Bearer ${state.user?.jwtToken}`,
            },
          }
        )

        toast.display("success", `Successfully moved ${selectedColors.length} color(s) to folder`)
      }

      // Invalidate and refetch folders to update the left panel
      await queryClient.invalidateQueries({ queryKey: ["folders"] })
      
      // Dispatch event to trigger refresh in Left component
      window.dispatchEvent(new CustomEvent('bulk-editor-folders-refresh'))
      
      // Dispatch event to clear selection in Left component
      window.dispatchEvent(new CustomEvent('bulk-editor-clear-selection'))
      
      // Clear right panel selection after copy/move
      clearColors()

      setFolderModalOpen(false)
      setFolderActionType(null)
    } catch (error: any) {
      console.error(`Error ${folderActionType === "copy" ? "copying" : "moving"} colors:`, error)
      toast.display("error", error.response?.data?.err || error.response?.data?.message || `Failed to ${folderActionType} colors`)
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ height: "500px" }}>
      {selectedColors.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400 text-sm py-8">
            <div className="mb-2">Select folders on the left to view colors</div>
            <div className="text-[11px] text-gray-300">Then click colors to add them here for editing</div>
          </div>
        </div>
      ) : (
        <>
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="mb-3">
              <div className="text-[12px] font-medium text-gray-700 mb-2">
                {selectedColors.length} color{selectedColors.length !== 1 ? "s" : ""} selected
              </div>
            </div>

            <SlashNameInputs
              inputs={slash_nameInputs}
              onInputChange={setslash_nameInputs}
              onChangeslash_naming={handleChangeslash_naming}
            />

            {/* Tags Input */}
            <div className="mb-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Tags (comma separated)"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="flex-grow px-3 py-2 text-[12px] border border-gray-200 rounded focus:outline-none focus:border-gray-400"
                />
                <button
                  onClick={handleChangeTags}
                  className="px-3 py-2 text-[12px] bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                >
                  Update Tags
                </button>
              </div>
            </div>

            <div className="bg-blue-50 text-blue-800 border border-blue-200 rounded px-3 py-2 mb-3 text-[11px]">
              Changes are applied to selected colors. Click "Save Changes" to save to database.
            </div>

            <ColorList
              colors={selectedColors}
              activeColors={activeColors}
              onCheckboxClick={handleCheckboxClick}
              onRemoveColor={handleRemoveColor}
              handleManualslash_namingChange={handleManualslash_namingChange}
              clearColors={clearColors}
            />
          </div>

          {/* Fixed Bottom Buttons - Only show when colors are selected */}
          {selectedColors.length > 0 && (
            <div className="border-t border-gray-200 bg-white p-3 flex-shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={handleCopyToFolder}
                  disabled={isLoading !== null}
                  className={`flex-1 py-2 text-[12px] border border-gray-200 rounded transition-colors ${
                    isLoading === "copy"
                      ? "bg-gray-100 text-gray-400 cursor-wait"
                      : "bg-white hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {isLoading === "copy" ? "Copying..." : "Copy to"}
                </button>
                <button
                  onClick={handleMoveToFolder}
                  disabled={isLoading !== null}
                  className={`flex-1 py-2 text-[12px] border border-gray-200 rounded transition-colors ${
                    isLoading === "move"
                      ? "bg-gray-100 text-gray-400 cursor-wait"
                      : "bg-white hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {isLoading === "move" ? "Moving..." : "Move to"}
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={isLoading !== null}
                  className={`flex-1 py-2 text-[12px] rounded transition-colors ${
                    isLoading === "save"
                      ? "bg-gray-600 text-gray-300 cursor-wait"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {isLoading === "save" ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </>
      )}

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
        isLoading={isLoading === "copy" || isLoading === "move"}
      />
    </div>
  )
}

export default Right
