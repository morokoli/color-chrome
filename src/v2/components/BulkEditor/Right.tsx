import { useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useToast } from "@/v2/hooks/useToast"
import { config } from "@/v2/others/config"
import { axiosInstance } from "@/v2/hooks/useAPI"
import { colors } from "@/v2/helpers/colors"
import { ColorList } from "./ColorList"
import { SlashNameInputs } from "../FigmaManager/SlashNameInputs"
import { SelectedColor } from "@/v2/api/folders.api"
import { SheetSelectionModal } from "./SheetSelectionModal"

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
  const [sheetModalOpen, setSheetModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState<"save" | "export" | null>(null)

  // Helper function to merge colors, preserving existing values
  const mergeColors = (prev: SelectedColor[], newColors: SelectedColor[]): SelectedColor[] => {
    // If no previous colors, just set the new ones
    if (prev.length === 0) {
      return newColors
    }
    
    // Merge new colors with existing, preserving current values
    return newColors.map(newColor => {
      // Find matching color in previous state by color ID
      const existingColor = prev.find(p => p.color._id === newColor.color._id)
      if (existingColor) {
        // Merge: keep existing values if new ones are empty/null, otherwise use new values
        return {
          ...newColor,
          color: {
            ...existingColor.color, // Keep existing
            ...newColor.color,      // Override with new
            // Preserve non-empty values - prefer new if it has content, otherwise keep existing
            slash_naming: (newColor.color.slash_naming && newColor.color.slash_naming.trim()) 
              ? newColor.color.slash_naming 
              : (existingColor.color.slash_naming || ""),
            comments: (newColor.color.comments && newColor.color.comments.trim())
              ? newColor.color.comments
              : (existingColor.color.comments || ""),
            ranking: newColor.color.ranking ?? existingColor.color.ranking ?? 0,
            tags: (newColor.color.tags && newColor.color.tags.length > 0) 
              ? newColor.color.tags 
              : (existingColor.color.tags || []),
            additionalColumns: (newColor.color.additionalColumns && newColor.color.additionalColumns.length > 0)
              ? newColor.color.additionalColumns
              : (existingColor.color.additionalColumns || []),
          }
        }
      }
      return newColor
    })
  }

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
    // Merge new colors with existing to preserve current values
    const handleColorsChanged = (event: CustomEvent) => {
      const newColors = event.detail.colors as SelectedColor[]
      setSelectedColors(prev => mergeColors(prev, newColors))
    }

    // Listen for folder refresh to update colors with latest data
    const handleFoldersRefreshed = async () => {
      // Wait a bit for folders to be refetched
      setTimeout(() => {
        const saved = localStorage.getItem('bulk_editor_selected_colors')
        if (saved) {
          try {
            const colors = JSON.parse(saved) as SelectedColor[]
            // Merge with existing colors to preserve current values
            setSelectedColors(prev => mergeColors(prev, colors))
          } catch (e) {
            console.error('Error updating colors after refresh:', e)
          }
        }
      }, 300)
    }

    window.addEventListener('bulk-editor-colors-changed', handleColorsChanged as EventListener)
    window.addEventListener('bulk-editor-folders-refresh', handleFoldersRefreshed as EventListener)
    return () => {
      window.removeEventListener('bulk-editor-colors-changed', handleColorsChanged as EventListener)
      window.removeEventListener('bulk-editor-folders-refresh', handleFoldersRefreshed as EventListener)
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
      const promises = selectedColors.map(async (item, index) => {
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
        return { index, response: response.data, originalItem: item }
      })

      const results = await Promise.all(promises)
      toast.display("success", `Successfully updated ${selectedColors.length} color(s)`)
      
      // Update colors immediately with server response data to prevent flickering
      // The server response contains the updated color data
      setSelectedColors(prev => {
        const updated = prev.map((item, index) => {
          const result = results.find(r => r.index === index)
          // Handle both response.data.data.color (wrapped) and response.data.color (direct)
          const serverColor = result?.response?.data?.data?.color || result?.response?.data?.color
          if (result && serverColor) {
            // Merge server response with existing to preserve all fields
            return {
              ...item,
              color: {
                ...item.color, // Keep existing local data
                ...serverColor, // Override with server data
                // Ensure critical fields are preserved (prefer server if present and non-empty, otherwise keep existing)
                slash_naming: (serverColor.slash_naming && serverColor.slash_naming.trim()) 
                  ? serverColor.slash_naming 
                  : (item.color.slash_naming || ""),
                comments: (serverColor.comments && serverColor.comments.trim())
                  ? serverColor.comments
                  : (item.color.comments || ""),
                ranking: serverColor.ranking ?? item.color.ranking ?? 0,
                tags: (serverColor.tags && serverColor.tags.length > 0)
                  ? serverColor.tags
                  : (item.color.tags || []),
                additionalColumns: (serverColor.additionalColumns && serverColor.additionalColumns.length > 0)
                  ? serverColor.additionalColumns
                  : (item.color.additionalColumns || []),
                // Preserve RGB/HSL structure
                rgb: serverColor.rgb || item.color.rgb,
                hsl: serverColor.hsl || item.color.hsl,
              }
            }
          }
          return item
        })
        
        // Update localStorage with updated state
        localStorage.setItem('bulk_editor_selected_colors', JSON.stringify(updated))
        window.dispatchEvent(new CustomEvent('bulk-editor-colors-changed', {
          detail: { colors: updated }
        }))
        
        return updated
      })
      
      // Invalidate and refetch folders to update the left panel with latest data
      await queryClient.invalidateQueries({ queryKey: ["folders"] })
      
      // Dispatch event to trigger refresh in Left component
      // The Left component will update the selected colors with the latest data from server
      window.dispatchEvent(new CustomEvent('bulk-editor-folders-refresh'))
    } catch (error: any) {
      console.error("Error saving colors:", error)
      toast.display("error", error.response?.data?.message || "Failed to save colors")
    } finally {
      setIsLoading(null)
    }
  }

  const handleExportToSheet = () => {
    if (selectedColors.length === 0) {
      toast.display("error", "No colors selected")
      return
    }
    setSheetModalOpen(true)
  }

  const handleSheetConfirm = async (spreadsheetId: string, sheetId: number, sheetName: string) => {
    if (selectedColors.length === 0) return

    setIsLoading("export")
    try {
      // Convert selected colors to the format expected by addMultipleColors
      const rows = selectedColors.map((item) => {
        const color = item.color
        
        // Handle rgb conversion
        let rgbValue: string = ''
        if (typeof color.rgb === 'string') {
          rgbValue = color.rgb
        } else if (color.rgb && typeof color.rgb === 'object' && 'r' in color.rgb && 'g' in color.rgb && 'b' in color.rgb) {
          rgbValue = `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`
        } else {
          rgbValue = colors.hexToRGB(color.hex)
        }
        
        // Handle hsl conversion
        let hslValue: string = ''
        if (typeof color.hsl === 'string') {
          hslValue = color.hsl
        } else if (color.hsl && typeof color.hsl === 'object' && 'h' in color.hsl && 's' in color.hsl && 'l' in color.hsl) {
          hslValue = `hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`
        } else {
          hslValue = colors.hexToHSL(color.hex)
        }

        return {
          timestamp: Date.now(),
          url: (color as any).url || "Bulk Editor Export",
          hex: color.hex,
          hsl: hslValue,
          rgb: rgbValue,
          ranking: (color.ranking || 0).toString(),
          comments: color.comments || "",
          slash_naming: color.slash_naming || "",
          tags: (color.tags || []).join(", "),
          additionalColumns: (color.additionalColumns || []).map(col => ({
            name: col.name,
            value: col.value,
          })),
        }
      })

      await axiosInstance.post(
        config.api.endpoints.addMultipleColors,
        {
          spreadsheetId,
          sheetName,
          sheetId,
          rows,
        },
        {
          headers: {
            Authorization: `Bearer ${state.user?.jwtToken}`,
          },
        }
      )

      toast.display("success", `Successfully exported ${selectedColors.length} color(s) to Google Sheet`)
      
      setSheetModalOpen(false)
    } catch (error: any) {
      console.error("Error exporting colors to sheet:", error)
      toast.display("error", error.response?.data?.message || "Failed to export colors to sheet")
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
                  onClick={handleExportToSheet}
                  disabled={isLoading !== null}
                  className={`flex-1 py-2 text-[12px] border border-gray-200 rounded transition-colors ${
                    isLoading === "export"
                      ? "bg-gray-100 text-gray-400 cursor-wait"
                      : "bg-white hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {isLoading === "export" ? "Exporting..." : "Export to Google Sheet"}
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

      {/* Sheet Selection Modal */}
      <SheetSelectionModal
        isOpen={sheetModalOpen}
        onClose={() => {
          setSheetModalOpen(false)
        }}
        onConfirm={handleSheetConfirm}
        isLoading={isLoading === "export"}
      />
    </div>
  )
}

export default Right
