import { useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useToast } from "@/v2/hooks/useToast"
import { config } from "@/v2/others/config"
import { axiosInstance } from "@/v2/hooks/useAPI"
import { X } from "lucide-react"
import { ColorList } from "./ColorList"
import { SelectedColor } from "@/v2/api/folders.api"

const Right = () => {
  const { state, dispatch } = useGlobalState()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [selectedColors, setSelectedColors] = useState<SelectedColor[]>([])
  const [activeColors, setActiveColors] = useState<number[]>([])
  const [nameInput, setNameInput] = useState<string>("")
  const [nameMode, setNameMode] = useState<"none" | "hex" | "numerator">("none")
  const [tagsList, setTagsList] = useState<string[]>([])
  const [tagsInput, setTagsInput] = useState<string>("")
  const [isLoading, setIsLoading] = useState<"save" | null>(null)
  const [isDirty, setIsDirty] = useState(false)

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
    // Handling the "Select All" / "Deselect All" button: select all when not all selected, deselect all when all selected
    if (colorId === selectedColors.length) {
      const allSelected = activeColors.length === selectedColors.length && selectedColors.length > 0
      if (allSelected) {
        setActiveColors([])
        setNameInput("")
        setTagsList([])
        setTagsInput("")
      } else {
        setActiveColors(selectedColors.map((_, i) => i))
        if (selectedColors.length > 0) {
          const firstSlashNaming = selectedColors[0]?.color.slash_naming || ""
          const allSameName = selectedColors.every(
            (item) => (item.color.slash_naming || "") === firstSlashNaming
          )
          setNameInput(allSameName ? firstSlashNaming : "")
          const firstTags = selectedColors[0]?.color.tags || []
          if (selectedColors.every(item =>
            JSON.stringify(item.color.tags || []) === JSON.stringify(firstTags)
          )) {
            setTagsList(firstTags)
            setTagsInput("")
          } else {
            setTagsList([])
            setTagsInput("")
          }
        }
      }
      return
    }

    if (activeColors.includes(colorId)) {
      const filteredColors = activeColors.filter((color) => color !== colorId)
      setActiveColors(filteredColors)

      if (filteredColors.length === 0) {
        setNameInput("")
        setTagsList([])
        setTagsInput("")
      } else if (filteredColors.length === 1) {
        setNameInput(selectedColors[filteredColors[0]]?.color.slash_naming || "")
        const tags = selectedColors[filteredColors[0]]?.color.tags || []
        setTagsList(tags)
        setTagsInput("")
      } else {
        const firstSlashNaming = selectedColors[filteredColors[0]]?.color.slash_naming || ""
        const allSameName = filteredColors.every(
          (idx) => (selectedColors[idx]?.color.slash_naming || "") === firstSlashNaming
        )
        setNameInput(allSameName ? firstSlashNaming : "")
      }
    } else {
      const newActive = [...activeColors, colorId]
      if (newActive.length === 1) {
        setNameInput(selectedColors[colorId]?.color.slash_naming || "")
        const tags = selectedColors[colorId]?.color.tags || []
        setTagsList(tags)
        setTagsInput("")
      } else {
        const firstSlashNaming = selectedColors[newActive[0]]?.color.slash_naming || ""
        const allSameName = newActive.every(
          (idx) => (selectedColors[idx]?.color.slash_naming || "") === firstSlashNaming
        )
        setNameInput(allSameName ? firstSlashNaming : "")
      }
      setActiveColors(newActive)
    }
  }

  const handleUpdate = () => {
    if (!activeColors.length) return
    const baseParts = nameInput.trim().split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean).slice(0, 5)
    const base = baseParts.join(" / ")
    const tags = tagsList

    const limitToFiveParts = (s: string) => {
      const parts = s.split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean).slice(0, 5)
      return parts.join(" / ")
    }
    const namingByIndex = new Map<number, string>()
    if (nameMode === "none") {
      activeColors.forEach((colorIndex) => {
        namingByIndex.set(colorIndex, base || "")
      })
    } else if (nameMode === "hex") {
      activeColors.forEach((colorIndex) => {
        const hex = selectedColors[colorIndex]?.color.hex || ""
        const hexWithHash = hex.startsWith("#") ? hex : `#${hex}`
        const full = base ? `${base} / ${hexWithHash}` : hexWithHash
        namingByIndex.set(colorIndex, limitToFiveParts(full))
      })
    } else {
      activeColors.forEach((colorIndex, position) => {
        const lineNum = position + 1
        const full = base ? `${base} / ${lineNum}` : String(lineNum)
        namingByIndex.set(colorIndex, limitToFiveParts(full))
      })
    }

    setSelectedColors((prev) =>
      prev.map((item, index) =>
        activeColors.includes(index)
          ? {
              ...item,
              color: {
                ...item.color,
                slash_naming: namingByIndex.get(index) ?? item.color.slash_naming,
                tags,
              },
            }
          : item
      )
    )
    setIsDirty(true)
    toast.display("success", `Updated name and tags for ${activeColors.length} color(s)`)
  }

  const handleManualslash_namingChange = (
    colorId: number,
    slash_nameInput: string,
  ) => {
    const hasTrailingSlash = slash_nameInput.trim().endsWith("/")
    let newslash_naming = slash_nameInput
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\s*\/\s*/g, " / ")
    const parts = newslash_naming.split(/\s*\/\s*/).map((p) => p.trim())
    const nonEmpty = parts.filter(Boolean)
    const limitedParts = nonEmpty.slice(0, 5)
    newslash_naming = limitedParts.join(" / ")
    if (hasTrailingSlash && limitedParts.length < 5) newslash_naming += " / "

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
    setIsDirty(true)
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
    setNameInput("")
    setTagsList([])
    setTagsInput("")
    setIsDirty(false)
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
      
      // Sync parsedData in global state so History tab shows updated name, tags, etc.
      results.forEach(({ response }) => {
        const serverColor = response?.data?.data?.color || response?.data?.color
        const colorId = serverColor?._id ?? serverColor?.id
        if (colorId && serverColor) {
          dispatch({
            type: "UPDATE_PARSED_BY_COLOR_ID",
            payload: {
              colorId: String(colorId),
              parsed: {
                hex: serverColor.hex,
                slash_naming: serverColor.slash_naming,
                tags: serverColor.tags,
                comments: serverColor.comments,
                ranking: serverColor.ranking,
                additionalColumns: serverColor.additionalColumns,
                url: serverColor.url,
                rgb: serverColor.rgb,
                hsl: serverColor.hsl,
              },
            },
          })
        }
      })
      
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
      
      // Invalidate and refetch folders (and non-foldered colors) so when user deselects and selects again, names are up to date
      await queryClient.invalidateQueries({ queryKey: ["folders"] })
      await queryClient.refetchQueries({ queryKey: ["folders"] })
      queryClient.invalidateQueries({ queryKey: ["all-color-data"] })
      
      setIsDirty(false)
    } catch (error: any) {
      console.error("Error saving colors:", error)
      toast.display("error", error.response?.data?.message || "Failed to save colors")
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ height: "500px" }}>
      {selectedColors.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400 text-sm py-8">
            <div className="mb-2">Select colors to add them here for editing</div>
          </div>
        </div>
      ) : (
        <>
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-3">
            {/* X color(s) selected — right: None / Add Hex / Add Index radios */}
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-[12px] font-medium text-gray-700">
                {selectedColors.length} color{selectedColors.length !== 1 ? "s" : ""} selected
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="nameMode"
                    checked={nameMode === "none"}
                    onChange={() => setNameMode("none")}
                    className="w-3.5 h-3.5 accent-black border-gray-400"
                  />
                  <span className="text-[12px] text-gray-700">None</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="nameMode"
                    checked={nameMode === "hex"}
                    onChange={() => setNameMode("hex")}
                    className="w-3.5 h-3.5 accent-black border-gray-400"
                  />
                  <span className="text-[12px] text-gray-700">Add Hex</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="nameMode"
                    checked={nameMode === "numerator"}
                    onChange={() => setNameMode("numerator")}
                    className="w-3.5 h-3.5 accent-black border-gray-400"
                  />
                  <span className="text-[12px] text-gray-700">Add Index</span>
                </label>
              </div>
            </div>

            {/* Full-width name input */}
            <div className="mb-3">
              <input
                type="text"
                placeholder="Name (e.g. Brand/Primary/Blue)"
                value={nameInput}
                onChange={(e) => {
                  const val = e.target.value
                  const parts = val.split("/").map((p) => p.trim())
                  const nonEmpty = parts.filter(Boolean)
                  const limited = nonEmpty.slice(0, 5)
                  let next = limited.join("/")
                  if (val.trim().endsWith("/") && limited.length < 5) next += "/"
                  setNameInput(next)
                }}
                className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded focus:outline-none focus:border-gray-400"
              />
            </div>

            {/* Tags Chip Input */}
            <div className="w-full px-3 py-2 border border-gray-200 rounded focus-within:border-gray-400 mb-3">
              <div className="flex flex-wrap gap-1 items-center">
                {tagsList.map((tag, idx) => (
                  <span key={idx} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] rounded">
                    {tag}
                    <button
                      onClick={() => setTagsList(tagsList.filter((_, i) => i !== idx))}
                      className="ml-0.5 text-blue-400 hover:text-blue-600"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                {tagsList.length < 5 && (
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ',') && tagsInput.trim()) {
                        e.preventDefault()
                        setTagsList([...tagsList, tagsInput.trim()])
                        setTagsInput('')
                      } else if (e.key === 'Backspace' && !tagsInput && tagsList.length > 0) {
                        setTagsList(tagsList.slice(0, -1))
                      }
                    }}
                    placeholder={tagsList.length === 0 ? "Tags (press , or Enter)" : ""}
                    className="flex-1 min-w-[80px] text-[12px] outline-none bg-transparent"
                  />
                )}
              </div>
            </div>

            {/* Single Update button - enabled only when (name or tags) and at least one color selected */}
            <div className="mb-3">
              <button
                onClick={handleUpdate}
                disabled={
                  activeColors.length === 0 ||
                  (!nameInput.trim() && tagsList.length === 0)
                }
                className={`w-full px-3 py-2 text-[12px] rounded transition-colors ${
                  activeColors.length === 0 || (!nameInput.trim() && tagsList.length === 0)
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gray-900 text-white hover:bg-gray-800"
                }`}
              >
                Update
              </button>
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
                  onClick={handleSaveChanges}
                  disabled={
                    isLoading !== null ||
                    selectedColors.length === 0 ||
                    (activeColors.length === 0 && !isDirty)
                  }
                  className={`flex-1 py-2 text-[12px] rounded transition-colors ${
                    isLoading === "save"
                      ? "bg-gray-600 text-gray-300 cursor-wait"
                      : selectedColors.length === 0 ||
                          (activeColors.length === 0 && !isDirty)
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
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
    </div>
  )
}

export default Right
