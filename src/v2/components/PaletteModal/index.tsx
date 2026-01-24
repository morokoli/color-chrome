import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { config } from "@/v2/others/config"
import { axiosInstance } from "@/v2/hooks/useAPI"
import { useToast } from "@/v2/hooks/useToast"
import { createDefaultColorObject } from "@/v2/helpers/createDefaultColorObject"
import { CollapsibleBoxHorizontal } from "@/v2/components/CollapsibleBoxHorizontal"
import ColorsSection from "./ColorsSection"
import ColorEditSection from "./ColorEditSection"
import FormInputs from "./FormInputs"
import ColorPropertiesForm from "./ColorPropertiesForm"
import ImportColorsList from "./ImportColorsList"
import PaletteHistory from "./PaletteHistory"

interface PaletteModalProps {
  open: boolean
  onClose: () => void
  paletteId?: string | null
  initialColors?: any[] | null
  isSingleColorEdit?: boolean
  initialPaletteData?: any | null
  initialTags?: string[] | null
  onSuccess?: (colors: any[]) => void
  hidePrimaryActionButton?: boolean
  onPrimaryActionMetaChange?: (meta: { label: string; disabled: boolean }) => void
  onStateChange?: (state: { colorsCount: number; canUndo: boolean; canRedo: boolean }) => void
}

export type PaletteModalHandle = {
  submit: () => void
  getColorsCount: () => number
  canUndo: boolean
  canRedo: boolean
  handleUndo: () => void
  handleRedo: () => void
}

const PaletteModal = forwardRef<PaletteModalHandle, PaletteModalProps>((props, ref) => {
  const {
    open,
    onClose: _onClose,
    paletteId = null,
    initialColors = null,
    isSingleColorEdit = false,
    initialPaletteData = null,
    initialTags = null,
    onSuccess,
    onPrimaryActionMetaChange,
    onStateChange,
  } = props
  const { state } = useGlobalState()
  const toast = useToast()
  const [colors, setColors] = useState(initialColors ? initialColors : [createDefaultColorObject(), createDefaultColorObject()])
  const [originalColors, setOriginalColors] = useState(initialColors ? initialColors : [createDefaultColorObject(), createDefaultColorObject()])
  const [colorPickerIndex, setColorPickerIndex] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"info" | "create">("create")
  const [activeInfoSubtab, setActiveInfoSubtab] = useState<"palette" | "color">("palette")
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    description: "",
    ranking: 0,
  })
  const isEditing = !!paletteId

  // Refs for undo/redo (provided by PaletteHistory)
  const undoRef = useRef<(() => void) | null>(null)
  const redoRef = useRef<(() => void) | null>(null)

  const isSingleColor = colors.length === 1
  const isPalette = colors.length > 1

  useEffect(() => {
    if (initialColors) {
      setColors(initialColors)
      setOriginalColors(initialColors)
      setColorPickerIndex(0)
      setActiveTab("create")
      setActiveInfoSubtab("palette")
    } else {
      setColors([createDefaultColorObject(), createDefaultColorObject()])
      setOriginalColors([createDefaultColorObject(), createDefaultColorObject()])
      setColorPickerIndex(0)
      setActiveTab("create")
      setActiveInfoSubtab("palette")
      setTags([])
      setFormData({ name: "", url: "", description: "", ranking: 0 })
      setCanUndo(false)
      setCanRedo(false)
    }
  }, [initialColors, paletteId])

  useEffect(() => {
    if (initialPaletteData && isEditing) {
      setFormData({
        name: initialPaletteData.name || "",
        url: initialPaletteData.url || "",
        description: initialPaletteData.description || "",
        ranking: initialPaletteData.ranking || 0,
      })
      setTags(initialPaletteData.tags || [])
      if (!initialColors) {
        const colorData = initialPaletteData.colorIds || [createDefaultColorObject()]
        const processedColors = colorData.map((color: any) =>
          typeof color === "string" ? createDefaultColorObject(color) : color
        )
        setColors(processedColors)
      }
    }
  }, [initialPaletteData, initialColors, isEditing])

  useEffect(() => {
    if (initialTags && !isEditing) {
      setTags(initialTags)
    }
  }, [initialTags, isEditing])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [open])

  const handleColorBoxClick = (idx: number) => {
    setColorPickerIndex(idx)
  }

  const handleColorChange = (color: any) => {
    if (colorPickerIndex !== null) {
      const newColors = [...colors]
      newColors[colorPickerIndex] = color
      setColors(newColors)
    }
  }

  const handleAddColor = (idx: number) => {
    if (colors.length < 10) {
      setColors([
        ...colors.slice(0, idx + 1),
        createDefaultColorObject(),
        ...colors.slice(idx + 1),
      ])
    }
  }

  const handleRemoveColor = (idx: number) => {
    setColors(colors.filter((_, i) => i !== idx))
    setColorPickerIndex(0)
  }

  const moveColor = (dragIndex: number, hoverIndex: number) => {
    const dragColor = colors[dragIndex]
    const newColors = [...colors]
    newColors.splice(dragIndex, 1)
    newColors.splice(hoverIndex, 0, dragColor)
    setColors(newColors)
  }

  const handleAddColorToPalette = (colorData: any, index: number | null = null) => {
    if (colors.length < 10) {
      const colorObject =
        typeof colorData === "string"
          ? createDefaultColorObject(colorData)
          : colorData

      if (index !== null) {
        const newColors = [...colors]
        newColors.splice(index, 0, colorObject)
        setColors(newColors)
      } else {
        setColors([...colors, colorObject])
      }
    }
  }

  const handleReplaceColor = (colorData: any, index: number) => {
    const colorObject =
      typeof colorData === "string"
        ? createDefaultColorObject(colorData)
        : colorData

    const newColors = [...colors]
    newColors[index] = colorObject
    setColors(newColors)
  }

  const handleApplySnapshot = (snapshotColors: any[]) => {
    const colorObjects = snapshotColors.map((color) =>
      typeof color === "string" ? createDefaultColorObject(color) : color
    )
    setColors([...colorObjects])
  }

  const handleUndo = () => {
    if (undoRef.current) undoRef.current()
  }

  const handleRedo = () => {
    if (redoRef.current) redoRef.current()
  }

  const handleUndoStateChange = (canUndo: boolean, canRedo: boolean) => {
    setCanUndo(canUndo)
    setCanRedo(canRedo)
    // Notify parent of state changes
    if (onStateChange) {
      onStateChange({ colorsCount: colors.length, canUndo, canRedo })
    }
  }

  // Notify parent when colors change
  useEffect(() => {
    if (onStateChange) {
      onStateChange({ colorsCount: colors.length, canUndo, canRedo })
    }
  }, [colors.length, canUndo, canRedo, onStateChange])

  const primaryActionLabel = loading
    ? "Saving..."
    : isSingleColorEdit
    ? "Save Color"
    : isEditing
    ? isSingleColor
      ? "Save Color"
      : "Save Palette"
    : isSingleColor
    ? "Add Color"
    : "Add Palette"

  useImperativeHandle(ref, () => ({
    submit: () => {
      if (!loading) handleFinish()
    },
    getColorsCount: () => colors.length,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
  }))

  useEffect(() => {
    onPrimaryActionMetaChange?.({
      label: primaryActionLabel,
      disabled: loading,
    })
  }, [onPrimaryActionMetaChange, primaryActionLabel, loading])

  const parseSheetUrl = (url: string) => {
    if (!url) return null
    try {
      const match = url.match(/\/spreadsheets\/d\/([^\/]+)\/edit\?gid=(\d+)/)
      if (match) {
        return {
          spreadsheetId: match[1],
          sheetId: parseInt(match[2]),
        }
      }
      return null
    } catch (error) {
      console.error("Error parsing sheet URL:", error)
      return null
    }
  }

  const parseTags = (tagsArray: any): string[] => {
    if (!Array.isArray(tagsArray)) return []
    const processedTags = tagsArray.flatMap((tag: any) => {
      if (typeof tag === "string" && tag.includes(",")) {
        return tag.split(",").map((t) => t.trim()).filter((t) => t)
      }
      return tag
    })
    return processedTags
      .map((tag: any) => (typeof tag === "string" ? tag.trim() : String(tag)))
      .filter((tag: string) => tag && tag.length > 0)
      .filter((tag: string, index: number, arr: string[]) => arr.indexOf(tag) === index)
  }

  const handleFinish = async () => {
    // Check if this is a single color (either explicitly set or has only 1 color)
    // Recalculate based on current colors state to ensure accuracy
    const currentIsSingleColor = colors.length === 1
    const isActuallySingleColor = isSingleColorEdit || currentIsSingleColor
    
    if (!formData.name.trim() && colors.length > 1 && !isActuallySingleColor) {
      toast.display("error", "Please enter a palette name")
      return
    }

    setLoading(true)
    try {
      if (isActuallySingleColor) {
        const colorData = colors[0]
        
        // Handle RGB - can be object or string
        let r = 0, g = 0, b = 0
        if (typeof colorData.rgb === 'string') {
          const rgbMatch = colorData.rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
          if (rgbMatch) {
            r = parseInt(rgbMatch[1])
            g = parseInt(rgbMatch[2])
            b = parseInt(rgbMatch[3])
          }
        } else if (colorData.rgb && typeof colorData.rgb === 'object' && 'r' in colorData.rgb) {
          r = colorData.rgb.r
          g = colorData.rgb.g
          b = colorData.rgb.b
        }
        
        const timestamp = Math.floor(Date.now() / 1000)

        if (isEditing) {
          const sheetInfo = parseSheetUrl(colorData.sheetUrl || "")
          
          // Format HSL properly
          let hslValue: string
          if (typeof colorData.hsl === 'string') {
            hslValue = colorData.hsl
          } else if (colorData.hsl && typeof colorData.hsl === 'object' && 'h' in colorData.hsl) {
            hslValue = `hsl(${colorData.hsl.h}, ${colorData.hsl.s}%, ${colorData.hsl.l}%)`
          } else {
            hslValue = colorData.hsl || ""
          }
          
          await axiosInstance.put(
            config.api.endpoints.updateColor,
            {
              colorId: paletteId,
              sheetId: sheetInfo?.sheetId || colorData?.sheetId || null,
              isUpdateSheet: false,
              row: {
                hex: colorData.hex || "",
                rgb: `rgb(${r}, ${g}, ${b})`,
                hsl: hslValue,
                url: colorData.url || "",
                ranking: colorData.ranking || 0,
                comments: colorData.comments || "",
                slash_naming: colorData.slash_naming || "",
                tags: parseTags(colorData.tags || []),
                additionalColumns: colorData.additionalColumns || [],
                timestamp: timestamp * 1000, // Convert to milliseconds
              },
            },
            {
              headers: {
                Authorization: `Bearer ${state.user?.jwtToken}`,
              },
            }
          )
          toast.display("success", "Color updated!")
        } else {
          const sheetInfo = parseSheetUrl(colorData.sheetUrl || "")
          
          // Format HSL properly - handle both string and object formats
          let hslValue: string
          if (typeof colorData.hsl === 'string') {
            hslValue = colorData.hsl
          } else if (colorData.hsl && typeof colorData.hsl === 'object' && 'h' in colorData.hsl && 's' in colorData.hsl && 'l' in colorData.hsl) {
            hslValue = `hsl(${colorData.hsl.h}, ${colorData.hsl.s}%, ${colorData.hsl.l}%)`
          } else {
            hslValue = colorData.hsl || ""
          }
          
          const response = await axiosInstance.post(
            config.api.endpoints.addColor,
            {
              spreadsheetId: sheetInfo?.spreadsheetId || null,
              sheetName: null,
              sheetId: sheetInfo?.sheetId || null,
              row: {
                timestamp,
                hex: colorData.hex || "",
                name: colorData.name || "",
                rgb: `rgb(${r}, ${g}, ${b})`,
                hsl: hslValue,
                url: colorData.url || "",
                ranking: colorData.ranking?.toString() || "0",
                comments: colorData.comments || "",
                slash_naming: colorData.slash_naming || "",
                tags: parseTags(colorData.tags || []),
                additionalColumns: colorData.additionalColumns || [],
              },
            },
            {
              headers: {
                Authorization: `Bearer ${state.user?.jwtToken}`,
              },
            }
          )
          toast.display("success", "Color created!")
          
          // Copy color to selected folders if folders are selected
          if (selectedFolderIds && selectedFolderIds.length > 0) {
            try {
              // Handle different response structures
              const colorId = response?.data?.data?.createdColor?._id 
                || response?.data?.createdColor?._id
                || response?.data?.data?.colorId
                || response?.data?.colorId
              
              if (colorId) {
                await Promise.all(
                  selectedFolderIds.map((folderId) =>
                    axiosInstance.post(
                      `${config.api.endpoints.copyColorToFolder}/${folderId}/copy-color`,
                      { colorId },
                      {
                        headers: {
                          Authorization: `Bearer ${state.user?.jwtToken}`,
                        },
                      }
                    ).catch(err => {
                      console.error(`Error copying color to folder ${folderId}:`, err)
                      return null
                    })
                  )
                )
                toast.display("success", `Color added to ${selectedFolderIds.length} folder${selectedFolderIds.length > 1 ? 's' : ''}`)
              } else {
                console.warn("Color ID not found in response, cannot copy to folders", response?.data)
              }
            } catch (folderErr) {
              console.error("Error copying color to folders:", folderErr)
              toast.display("error", "Color created but failed to add to folders")
            }
          }
        }
        onSuccess && onSuccess(colors)
      } else {
        const paletteData = {
          name: formData.name,
          url: formData.url,
          description: formData.description,
          ranking: formData.ranking || 0,
          tags: parseTags(tags),
        }

        const existingColorIds: string[] = []
        const newColors: any[] = []
        const updatedColors: any[] = []

        colors.forEach((color, index) => {
          if (color._id || color.id) {
            const originalColor = originalColors[index]
            const hasChanged = !originalColor ||
              originalColor.hex !== color.hex ||
              JSON.stringify(originalColor.hsl) !== JSON.stringify(color.hsl) ||
              JSON.stringify(originalColor.rgb) !== JSON.stringify(color.rgb) ||
              originalColor.url !== color.url ||
              originalColor.ranking !== color.ranking ||
              originalColor.comments !== color.comments ||
              originalColor.slash_naming !== color.slash_naming ||
              JSON.stringify(originalColor.tags) !== JSON.stringify(color.tags) ||
              JSON.stringify(originalColor.additionalColumns) !== JSON.stringify(color.additionalColumns)

            if (hasChanged) {
              updatedColors.push({
                colorId: color._id || color.id,
                hex: color.hex,
                rgb: color.rgb,
                hsl: color.hsl,
                url: color.url,
                ranking: color.ranking,
                comments: color.comments,
                slash_naming: color.slash_naming,
                tags: parseTags(color.tags),
                additionalColumns: color.additionalColumns,
              })
            }
            existingColorIds.push(color._id || color.id)
          } else {
            newColors.push({
              hex: color.hex,
              rgb: color.rgb,
              hsl: color.hsl,
              url: color.url,
              ranking: color.ranking,
              comments: color.comments,
              slash_naming: color.slash_naming,
              tags: parseTags(color.tags),
              additionalColumns: color.additionalColumns,
            })
          }
        })

        if (isEditing && paletteId) {
          const updateData = {
            ...paletteData,
            colorIds: existingColorIds,
            newColors: newColors,
            updatedColors: updatedColors,
          }
          await axiosInstance.put(
            `${config.api.endpoints.paletteUpdate}/${paletteId}`,
            updateData,
            {
              headers: {
                Authorization: `Bearer ${state.user?.jwtToken}`,
              },
            }
          )
          toast.display("success", isSingleColor ? "Color updated!" : "Palette updated!")
        } else {
          const createData = {
            ...paletteData,
            colorIds: existingColorIds,
            newColors: newColors,
            updatedColors: updatedColors,
          }
          const response = await axiosInstance.post(
            config.api.endpoints.paletteCreate,
            createData,
            {
              headers: {
                Authorization: `Bearer ${state.user?.jwtToken}`,
              },
            }
          )
          toast.display("success", isSingleColor ? "Color created!" : "Palette created!")
          
          // Copy palette colors to selected folders if folders are selected
          if (selectedFolderIds && selectedFolderIds.length > 0 && !isEditing) {
            try {
              // Get all color IDs from the created palette
              const allColorIds = [
                ...existingColorIds,
                ...(response?.data?.data?.createdColors?.map((c: any) => c._id) || []),
              ]
              
              // Copy all colors to all selected folders
              if (allColorIds.length > 0) {
                await Promise.all(
                  selectedFolderIds.flatMap((folderId) =>
                    allColorIds.map((colorId: string) =>
                      axiosInstance.post(
                        `${config.api.endpoints.copyColorToFolder}/${folderId}/copy-color`,
                        { colorId },
                        {
                          headers: {
                            Authorization: `Bearer ${state.user?.jwtToken}`,
                          },
                        }
                      ).catch(err => {
                        console.error(`Error copying color ${colorId} to folder ${folderId}:`, err)
                        return null
                      })
                    )
                  )
                )
              }
            } catch (folderErr) {
              console.error("Error copying palette colors to folders:", folderErr)
            }
          }
        }

        if (!isEditing) {
          setColors([createDefaultColorObject(), createDefaultColorObject()])
          setTags([])
          setFormData({ name: "", url: "", description: "", ranking: 0 })
        }

        onSuccess && onSuccess(colors)
      }
    } catch (err: any) {
      const action = isEditing ? "update" : "create"
      const itemType = isSingleColor ? "color" : "palette"
      toast.display("error", `Failed to ${action} ${itemType}`)
      console.error("Error saving:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSelectedColor = async () => {
    if (colorPickerIndex === null || !colors[colorPickerIndex]) {
      toast.display("error", "Please select a color to save")
      return
    }

    setLoading(true)
    try {
      const colorData = colors[colorPickerIndex]
      const { r, g, b } = colorData.rgb
      const timestamp = Math.floor(Date.now() / 1000)
      const sheetInfo = parseSheetUrl(colorData.sheetUrl || "")

      await axiosInstance.post(
        config.api.endpoints.addColor,
        {
          spreadsheetId: sheetInfo?.spreadsheetId || null,
          sheetName: null,
          sheetId: sheetInfo?.sheetId || null,
          row: {
            timestamp,
            hex: colorData.hex,
            name: colorData.name || "",
            rgb: `rgb(${r}, ${g}, ${b})`,
            hsl: colorData.hsl,
            url: colorData.url,
            ranking: colorData.ranking.toString(),
            comments: colorData.comments,
            slash_naming: colorData.slash_naming,
            tags: parseTags(colorData.tags),
            additionalColumns: colorData.additionalColumns,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${state.user?.jwtToken}`,
          },
        }
      )

      toast.display("success", "Color saved successfully!")
    } catch (err: any) {
      toast.display("error", "Failed to save color")
      console.error("Error saving color:", err)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: activeTab === "create" ? "1200px" : "800px",
        transition: "all 0.3s ease",
        maxHeight: "90vh",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flex: 1,
          overflowY: "auto",
        }}
      >
        {/* Left Side Section - Import */}
        <CollapsibleBoxHorizontal
          isOpen={activeTab === "create"}
          maxWidth="154px"
          className="import-colors-scrollbar"
        >
          <div
            style={{
              padding: "16px",
              borderRight: "1px solid #f0f0f0",
              backgroundColor: "#fafafa",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>Import</h3>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <ImportColorsList onAddToPalette={handleAddColorToPalette} />
            </div>
          </div>
        </CollapsibleBoxHorizontal>

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: activeTab === "create" ? "0 6px" : "0 16px",
          }}
        >
          {/* <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "4px",
              marginBottom: "8px",
              padding: "0 4px",
            }}
          >
            <span style={{ fontSize: "14px" }}>{isPalette ? "Palette" : "Color"}</span>
            <div style={{ display: "flex", gap: "4px" }}>
              {!hidePrimaryActionButton && (
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  style={{
                    padding: "4px 12px",
                    fontSize: "14px",
                    height: "32px",
                    border: "2px solid #000",
                    borderRadius: "0px",
                    background: "#000",
                    color: "#fff",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {primaryActionLabel}
                </button>
              )}
            </div>
          </div> */}

            <ColorsSection
              colors={colors}
              colorPickerIndex={colorPickerIndex}
              onColorClick={handleColorBoxClick}
              onRemoveColor={handleRemoveColor}
              onAddColor={handleAddColor}
              onMoveColor={moveColor}
              onAddColorToPalette={handleAddColorToPalette}
              onReplaceColor={handleReplaceColor}
            />

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0", marginBottom: "8px" }}>
            <button
              onClick={() => setActiveTab("create")}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: activeTab === "create" ? 500 : 400,
                color: activeTab === "create" ? "#000" : "#666",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === "create" ? "2px solid #000" : "1px solid transparent",
                cursor: "pointer",
              }}
            >
              Create
            </button>
            <button
              onClick={() => setActiveTab("info")}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: activeTab === "info" ? 500 : 400,
                color: activeTab === "info" ? "#000" : "#666",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === "info" ? "2px solid #000" : "1px solid transparent",
                cursor: "pointer",
              }}
            >
              Info
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }} className="import-colors-scrollbar">
            {activeTab === "create" ? (
              <ColorEditSection
                selectedColor={
                  colorPickerIndex !== null
                    ? colors[colorPickerIndex]
                    : createDefaultColorObject()
                }
                onColorChange={handleColorChange}
                colorPickerIndex={colorPickerIndex}
              />
            ) : (
              <div>
                {isPalette ? (
                  <div>
                    <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0", marginBottom: "16px" }}>
                      <button
                        onClick={() => setActiveInfoSubtab("palette")}
                        style={{
                          padding: "8px 16px",
                          fontSize: "14px",
                          fontWeight: activeInfoSubtab === "palette" ? 500 : 400,
                          color: activeInfoSubtab === "palette" ? "#000" : "#666",
                          background: "transparent",
                          border: "none",
                          borderBottom: activeInfoSubtab === "palette" ? "2px solid #000" : "1px solid transparent",
                          cursor: "pointer",
                        }}
                      >
                        Palette Info
                      </button>
                      <button
                        onClick={() => setActiveInfoSubtab("color")}
                        style={{
                          padding: "8px 16px",
                          fontSize: "14px",
                          fontWeight: activeInfoSubtab === "color" ? 500 : 400,
                          color: activeInfoSubtab === "color" ? "#000" : "#666",
                          background: "transparent",
                          border: "none",
                          borderBottom: activeInfoSubtab === "color" ? "2px solid #000" : "1px solid transparent",
                          cursor: "pointer",
                        }}
                      >
                        Color Info
                      </button>
                    </div>
                    {activeInfoSubtab === "palette" ? (
                      <FormInputs
                        formData={formData}
                        setFormData={setFormData}
                        tags={tags}
                        setTags={setTags}
                        selectedFolderIds={selectedFolderIds}
                        onFolderChange={setSelectedFolderIds}
                      />
                    ) : (
                      <ColorPropertiesForm
                        selectedColor={colors[colorPickerIndex]}
                        onColorChange={handleColorChange}
                        colorPickerIndex={colorPickerIndex}
                        selectedFolderIds={selectedFolderIds}
                        onFolderChange={setSelectedFolderIds}
                      />
                    )}
                  </div>
                ) : (
                  <ColorPropertiesForm
                    selectedColor={colors[colorPickerIndex]}
                    onColorChange={handleColorChange}
                    colorPickerIndex={colorPickerIndex}
                    selectedFolderIds={selectedFolderIds}
                    onFolderChange={setSelectedFolderIds}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side Section - History (always visible) */}
        <CollapsibleBoxHorizontal
          isOpen={activeTab === "create"}
          maxWidth="170px"
        >
          <div
            style={{
              padding: "10px",
              borderLeft: "1px solid #f0f0f0",
              height: "100%",
              backgroundColor: "#fafafa",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h3 style={{ margin: "0 0 0px 0", fontSize: "12px", fontWeight: 500 }}>History</h3>
            <div style={{ fontSize: "10px", color: "#666", marginBottom: "8px", marginTop: "3px" }}>
              <p style={{ margin: 0 }}>
                Previous iterations of your {isPalette ? "palette" : "color"}
              </p>
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <PaletteHistory
                currentColors={colors}
                paletteId={paletteId}
                onApplySnapshot={handleApplySnapshot}
                onUndoStateChange={handleUndoStateChange}
                onUndoRef={undoRef}
                onRedoRef={redoRef}
              />
            </div>
          </div>
        </CollapsibleBoxHorizontal>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px",
          borderTop: "1px solid #f0f0f0",
          backgroundColor: "#fff",
        }}
      >
        <div>
          {isPalette && !isEditing && colorPickerIndex !== null && (
            <button
              onClick={handleSaveSelectedColor}
              disabled={loading}
              style={{
                padding: "4px 15px",
                fontSize: "14px",
                height: "32px",
                border: "1px solid #d9d9d9",
                borderRadius: "6px",
                background: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
                marginRight: "8px",
              }}
            >
              Save selected color separately
            </button>
          )}
        </div>
        <div />
      </div>
    </div>
  )
})

export default PaletteModal
