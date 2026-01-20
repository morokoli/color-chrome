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
import { History, RotateCcw, X } from "lucide-react"

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
}

export type PaletteModalHandle = {
  submit: () => void
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
    hidePrimaryActionButton = false,
    onPrimaryActionMetaChange,
  } = props
  const { state } = useGlobalState()
  const toast = useToast()
  const [colors, setColors] = useState(initialColors ? initialColors : [createDefaultColorObject()])
  const [originalColors, setOriginalColors] = useState(initialColors ? initialColors : [createDefaultColorObject()])
  const [colorPickerIndex, setColorPickerIndex] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"info" | "create">("create")
  const [activeInfoSubtab, setActiveInfoSubtab] = useState<"palette" | "color">("palette")
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
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
      setColors([createDefaultColorObject()])
      setOriginalColors([createDefaultColorObject()])
      setColorPickerIndex(0)
      setActiveTab("create")
      setActiveInfoSubtab("palette")
      setTags([])
      setFormData({ name: "", url: "", description: "", ranking: 0 })
      setCanUndo(false)
      setCanRedo(false)
      setIsHistoryOpen(false)
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
  }

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
    if (!formData.name.trim() && isPalette) {
      toast.display("error", "Please enter a palette name")
      return
    }

    setLoading(true)
    try {
      if (isSingleColorEdit) {
        const colorData = colors[0]
        const { r, g, b } = colorData.rgb
        const timestamp = Math.floor(Date.now() / 1000)

        if (isEditing) {
          const sheetInfo = parseSheetUrl(colorData.sheetUrl || "")
          await axiosInstance.put(
            `${config.api.endpoints.updateRow}/${paletteId}`,
            {
              sheetId: sheetInfo?.sheetId || colorData?.sheetId,
              isUpdateSheet: false,
              row: {
                hex: colorData.hex,
                rgb: colorData.rgb,
                hsl: colorData.hsl,
                url: colorData.url,
                ranking: colorData.ranking,
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
          toast.display("success", "Color updated!")
        } else {
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
          toast.display("success", "Color created!")
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
          await axiosInstance.post(
            config.api.endpoints.paletteCreate,
            createData,
            {
              headers: {
                Authorization: `Bearer ${state.user?.jwtToken}`,
              },
            }
          )
          toast.display("success", isSingleColor ? "Color created!" : "Palette created!")
        }

        if (!isEditing) {
          setColors([createDefaultColorObject()])
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
          maxWidth="170px"
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
            padding: "0 16px",
          }}
        >
          <div
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
              <button
                onClick={handleUndo}
                title="Undo (Ctrl+Z)"
                style={{
                  padding: "2px 6px",
                  minWidth: "auto",
                  opacity: canUndo ? 1 : 0.5,
                  border: "none",
                  background: "transparent",
                  cursor: canUndo ? "pointer" : "not-allowed",
                }}
                disabled={!canUndo}
              >
                <RotateCcw style={{ width: "14px", height: "14px" }} />
              </button>
              <button
                onClick={handleRedo}
                title="Redo (Ctrl+Shift+Z)"
                style={{
                  padding: "2px 6px",
                  minWidth: "auto",
                  opacity: canRedo ? 1 : 0.5,
                  border: "none",
                  background: "transparent",
                  cursor: canRedo ? "pointer" : "not-allowed",
                }}
                disabled={!canRedo}
              >
                <RotateCcw style={{ width: "14px", height: "14px", transform: "scaleX(-1)" }} />
              </button>
              <button
                onClick={() => setIsHistoryOpen((v) => !v)}
                title="History"
                style={{
                  padding: "2px 6px",
                  minWidth: "auto",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  opacity: activeTab === "create" ? 1 : 0.4,
                }}
                disabled={activeTab !== "create"}
              >
                <History style={{ width: "14px", height: "14px" }} />
              </button>
            </div>
          </div>

            <ColorsSection
              colors={colors}
              colorPickerIndex={colorPickerIndex}
              onColorClick={handleColorBoxClick}
              onRemoveColor={handleRemoveColor}
              onAddColor={handleAddColor}
              onMoveColor={moveColor}
              onAddColorToPalette={handleAddColorToPalette}
            />

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0", marginBottom: "16px" }}>
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

          <div style={{ flex: 1, overflowY: "auto" }}>
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
                      />
                    ) : (
                      <ColorPropertiesForm
                        selectedColor={colors[colorPickerIndex]}
                        onColorChange={handleColorChange}
                        colorPickerIndex={colorPickerIndex}
                      />
                    )}
                  </div>
                ) : (
                  <ColorPropertiesForm
                    selectedColor={colors[colorPickerIndex]}
                    onColorChange={handleColorChange}
                    colorPickerIndex={colorPickerIndex}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side history is shown as an OVERLAY (slide-in) */}
      </div>

      {/* History overlay: keep it MOUNTED so it can capture changes continuously (like webapp). */}
      {activeTab === "create" && (
        <>
          {/* Backdrop (only when open) */}
          {isHistoryOpen && (
            <div
              onClick={() => setIsHistoryOpen(false)}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.08)",
                zIndex: 50,
              }}
            />
          )}

          {/* Panel (always mounted; slides in/out) */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              height: "100%",
              width: "200px",
              backgroundColor: "#fafafa",
              borderLeft: "1px solid #f0f0f0",
              zIndex: 60,
              display: "flex",
              flexDirection: "column",
              transform: isHistoryOpen ? "translateX(0)" : "translateX(100%)",
              transition: "transform 0.25s ease",
              pointerEvents: isHistoryOpen ? "auto" : "none",
            }}
          >
            <div
              style={{
                padding: "16px",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <div>
                <div style={{ margin: 0, fontSize: "16px", fontWeight: 500 }}>History</div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  Previous iterations of your {isPalette ? "palette" : "color"}
                </div>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: 0,
                }}
                title="Close"
              >
                <X style={{ width: "16px", height: "16px" }} />
              </button>
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
        </>
      )}

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
