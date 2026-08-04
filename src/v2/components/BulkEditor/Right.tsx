import { useCallback, useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useToast } from "@/v2/hooks/useToast"
import { config } from "@/v2/others/config"
import { axiosInstance } from "@/v2/hooks/useAPI"
import { X } from "lucide-react"
import { ColorList } from "./ColorList"
import { SelectedColor } from "@/v2/api/folders.api"

const MAX_SLASH_NAME_PARTS = 5

function normalizeBulkNameSegments(segments: string[]): string[] {
  return segments
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .slice(0, MAX_SLASH_NAME_PARTS)
}

function bulkSlashNamingFromState(segments: string[], continuation: string): string {
  const clean = normalizeBulkNameSegments(segments)
  const tail = String(continuation || "").trim()
  const parts = [...clean, ...(tail ? [tail] : [])].slice(0, MAX_SLASH_NAME_PARTS)
  return parts.join(" / ")
}

function hydrateBulkNameFieldsFromSlashString(raw: string) {
  const trimmed = String(raw || "").trim()
  if (!trimmed) {
    return { segments: [] as string[], continuation: "" }
  }
  const parts = trimmed
    .split(/\s*\/\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, MAX_SLASH_NAME_PARTS)
  return { segments: parts, continuation: "" }
}

const Right = () => {
  const { state, dispatch } = useGlobalState()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [selectedColors, setSelectedColors] = useState<SelectedColor[]>([])
  const [activeColors, setActiveColors] = useState<number[]>([])
  const [nameSegments, setNameSegments] = useState<string[]>([])
  const [nameSlashInput, setNameSlashInput] = useState<string>("")
  const [nameMode, setNameMode] = useState<"none" | "hex" | "numerator">("none")
  const [tagsList, setTagsList] = useState<string[]>([])
  const [tagsInput, setTagsInput] = useState<string>("")
  const [isLoading, setIsLoading] = useState<"save" | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  const commitPendingTag = useCallback(() => {
    const pending = tagsInput.trim()
    if (!pending) return
    setTagsList((prev) => {
      if (prev.includes(pending)) return prev
      return [...prev, pending].slice(0, 5)
    })
    setTagsInput("")
  }, [tagsInput])

  const applyBulkNameState = useCallback((segments: string[], inputValue: string) => {
    setNameSegments(normalizeBulkNameSegments(segments))
    setNameSlashInput(String(inputValue || ""))
  }, [])

  const commitPendingNameSlashPart = useCallback(() => {
    const pending = nameSlashInput.trim()
    if (!pending) return
    setNameSegments((prev) =>
      [...normalizeBulkNameSegments(prev), pending].slice(0, MAX_SLASH_NAME_PARTS)
    )
    setNameSlashInput("")
  }, [nameSlashInput])

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
        setNameSegments([])
        setNameSlashInput("")
        setTagsList([])
        setTagsInput("")
      } else {
        setActiveColors(selectedColors.map((_, i) => i))
        // If any selected color is a gradient, switch to "none" mode
        const hasGradient = selectedColors.some(item => item.color.type === 'gradient')
        if (hasGradient && nameMode === 'hex') {
          setNameMode('none')
        }
        if (selectedColors.length > 0) {
          const firstSlashNaming = selectedColors[0]?.color.slash_naming || ""
          const allSameName = selectedColors.every(
            (item) => (item.color.slash_naming || "") === firstSlashNaming
          )
          if (allSameName && firstSlashNaming) {
            const { segments, continuation } = hydrateBulkNameFieldsFromSlashString(firstSlashNaming)
            setNameSegments(segments)
            setNameSlashInput(continuation)
          } else {
            setNameSegments([])
            setNameSlashInput("")
          }
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
        setNameSegments([])
        setNameSlashInput("")
        setTagsList([])
        setTagsInput("")
      } else if (filteredColors.length === 1) {
        const { segments, continuation } = hydrateBulkNameFieldsFromSlashString(
          selectedColors[filteredColors[0]]?.color.slash_naming || ""
        )
        setNameSegments(segments)
        setNameSlashInput(continuation)
        const tags = selectedColors[filteredColors[0]]?.color.tags || []
        setTagsList(tags)
        setTagsInput("")
      } else {
        const firstSlashNaming = selectedColors[filteredColors[0]]?.color.slash_naming || ""
        const allSameName = filteredColors.every(
          (idx) => (selectedColors[idx]?.color.slash_naming || "") === firstSlashNaming
        )
        if (allSameName && firstSlashNaming) {
          const { segments, continuation } = hydrateBulkNameFieldsFromSlashString(firstSlashNaming)
          setNameSegments(segments)
          setNameSlashInput(continuation)
        } else {
          setNameSegments([])
          setNameSlashInput("")
        }
      }
    } else {
      const newActive = [...activeColors, colorId]
      // If any selected color is a gradient, switch to "none" mode
      const hasGradient = newActive.some(idx => selectedColors[idx]?.color.type === 'gradient')
      if (hasGradient && nameMode === 'hex') {
        setNameMode('none')
      }
      if (newActive.length === 1) {
        const { segments, continuation } = hydrateBulkNameFieldsFromSlashString(
          selectedColors[colorId]?.color.slash_naming || ""
        )
        setNameSegments(segments)
        setNameSlashInput(continuation)
        const tags = selectedColors[colorId]?.color.tags || []
        setTagsList(tags)
        setTagsInput("")
      } else {
        const firstSlashNaming = selectedColors[newActive[0]]?.color.slash_naming || ""
        const allSameName = newActive.every(
          (idx) => (selectedColors[idx]?.color.slash_naming || "") === firstSlashNaming
        )
        if (allSameName && firstSlashNaming) {
          const { segments, continuation } = hydrateBulkNameFieldsFromSlashString(firstSlashNaming)
          setNameSegments(segments)
          setNameSlashInput(continuation)
        } else {
          setNameSegments([])
          setNameSlashInput("")
        }
      }
      setActiveColors(newActive)
    }
  }

  const handleUpdate = () => {
    if (!activeColors.length) return
    const base = bulkSlashNamingFromState(nameSegments, nameSlashInput)
    const tags = (() => {
      const pending = tagsInput.trim()
      if (!pending) return tagsList
      if (tagsList.includes(pending)) return tagsList
      return [...tagsList, pending].slice(0, 5)
    })()

    const limitToFiveParts = (s: string) => {
      const parts = s.split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean).slice(0, MAX_SLASH_NAME_PARTS)
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
    setTagsInput("")
    const { segments, continuation } = hydrateBulkNameFieldsFromSlashString(base)
    setNameSegments(segments)
    setNameSlashInput(continuation)
    toast.display("success", `Updated name and tags for ${activeColors.length} color(s)`)
  }

  const handleManualslash_namingChange = (
    colorId: number,
    slash_nameInput: string,
  ) => {
    let newslash_naming = slash_nameInput
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\s*\/\s*/g, " / ")
    const parts = newslash_naming.split(/\s*\/\s*/).map((p) => p.trim())
    const nonEmpty = parts.filter(Boolean)
    const limitedParts = nonEmpty.slice(0, MAX_SLASH_NAME_PARTS)
    newslash_naming = limitedParts.join(" / ")

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
    setNameSegments([])
    setNameSlashInput("")
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
        
        // Build the row payload based on whether it's a gradient or solid color
        let rowPayload: any = {
          slash_naming: color.slash_naming || "",
          comments: color.comments || "",
          ranking: color.ranking || 0,
          tags: color.tags || [],
          additionalColumns: color.additionalColumns || [],
          timestamp: Date.now(),
          url: (color as any).url || "",
        }

        // If it's a gradient, include gradient data and type
        if (color.type === 'gradient' && color.gradient_data) {
          rowPayload.type = 'gradient'
          rowPayload.gradient_data = color.gradient_data
          rowPayload.hex = color.hex // Keep hex as fallback
          // Don't send rgb/hsl for gradients as they're not applicable
        } else {
          // For solid colors, include hex, rgb, hsl
          rowPayload.type = 'solid'
          rowPayload.hex = color.hex
          
          // Handle rgb conversion
          if (typeof color.rgb === 'string') {
            rowPayload.rgb = color.rgb
          } else if (color.rgb && typeof color.rgb === 'object' && 'r' in color.rgb && 'g' in color.rgb && 'b' in color.rgb) {
            rowPayload.rgb = `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`
          }
          
          // Handle hsl conversion
          if (typeof color.hsl === 'string') {
            rowPayload.hsl = color.hsl
          } else if (color.hsl && typeof color.hsl === 'object' && 'h' in color.hsl && 's' in color.hsl && 'l' in color.hsl) {
            rowPayload.hsl = `hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`
          }
        }
        
        const response = await axiosInstance.put(
          config.api.endpoints.updateColor,
          {
            colorId: color._id,
            sheetId: null, // We're updating database only
            isUpdateSheet: false,
            row: rowPayload,
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
                type: serverColor.type,
                gradient_data: serverColor.gradient_data,
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
                // Preserve gradient data
                type: serverColor.type || item.color.type,
                gradient_data: serverColor.gradient_data || item.color.gradient_data,
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
                {/* Hide "Add Hex" if any selected color is a gradient */}
                {!activeColors.some(idx => selectedColors[idx]?.color.type === 'gradient') && (
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
                )}
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

            {/* Slash name — chips per segment (same pattern as tags) */}
            <div className="w-full px-3 py-2 border border-gray-200 rounded focus-within:border-gray-400 mb-3">
              <div className="flex flex-wrap gap-1 items-center">
                {nameSegments.map((segment, idx) => (
                  <div key={`${segment}-${idx}`} className="inline-flex items-center gap-1">
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-gray-100 text-gray-800 text-[11px] rounded">
                      {segment}
                      <button
                        type="button"
                        onClick={() =>
                          applyBulkNameState(
                            nameSegments.filter((_, i) => i !== idx),
                            nameSlashInput
                          )
                        }
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X size={10} />
                      </button>
                    </span>
                    {idx < nameSegments.length - 1 && (
                      <span className="text-gray-500 text-[11px] font-semibold">/</span>
                    )}
                  </div>
                ))}
                {nameSegments.length > 0 && nameSegments.length < MAX_SLASH_NAME_PARTS && (
                  <span className="text-gray-500 text-[11px] font-semibold">/</span>
                )}
                {nameSegments.length < MAX_SLASH_NAME_PARTS && (
                  <input
                    type="text"
                    value={nameSlashInput}
                    onChange={(e) => applyBulkNameState(nameSegments, e.target.value)}
                    onBlur={commitPendingNameSlashPart}
                    onKeyDown={(e) => {
                      if ((e.key === "/" || e.key === ",") && nameSlashInput.trim()) {
                        e.preventDefault()
                        applyBulkNameState(
                          [...normalizeBulkNameSegments(nameSegments), nameSlashInput.trim()],
                          ""
                        )
                      } else if (e.key === "Backspace" && !nameSlashInput && nameSegments.length > 0) {
                        applyBulkNameState(nameSegments.slice(0, -1), "")
                      }
                    }}
                    placeholder={
                      nameSegments.length === 0
                        ? "Name (type / or , between parts, max 5)"
                        : ""
                    }
                    className="flex-1 min-w-[120px] text-[12px] outline-none bg-transparent"
                  />
                )}
              </div>
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
                    onBlur={commitPendingTag}
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
                  (nameSegments.length === 0 &&
                    !nameSlashInput.trim() &&
                    tagsList.length === 0 &&
                    !tagsInput.trim())
                }
                className={`w-full px-3 py-2 text-[12px] rounded transition-colors ${
                  activeColors.length === 0 ||
                  (nameSegments.length === 0 &&
                    !nameSlashInput.trim() &&
                    tagsList.length === 0 &&
                    !tagsInput.trim())
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
