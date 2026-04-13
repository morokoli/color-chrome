import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import { useQueryClient } from "@tanstack/react-query"
import tinycolor from "tinycolor2"
import { Undo2, Redo2 } from "lucide-react"
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
import { useGetFolders } from "@/v2/api/folders.api"

/** Folder IDs that contain this color (by id or populated `colors` hex), for Color Info multi-select. */
function collectFolderIdsForColor(color: any, folders: any[] | undefined): string[] {
  if (!color || !Array.isArray(folders) || folders.length === 0) return []
  const colorIdStr =
    color._id != null ? String(color._id) : color.id != null ? String(color.id) : null
  const hexNorm =
    color.hex != null ? String(color.hex).toLowerCase().replace(/\s/g, "") : ""
  const found = new Set<string>()
  if (colorIdStr) {
    for (const f of folders) {
      if (!f?._id) continue
      if ((f.colorIds ?? []).some((cid: any) => String(cid) === colorIdStr)) {
        found.add(String(f._id))
      }
    }
  }
  if (found.size === 0 && hexNorm && folders.some((x) => Array.isArray(x?.colors))) {
    for (const f of folders) {
      if (!f?._id) continue
      if (
        (f.colors ?? []).some((c: any) => {
          const h = c?.hex != null ? String(c.hex).toLowerCase().replace(/\s/g, "") : ""
          return h === hexNorm
        })
      ) {
        found.add(String(f._id))
      }
    }
  }
  return Array.from(found)
}

/** Matches handleFinish single-color path: library/API rows may use string rgb or object. */
function parseRgbTriplet(colorData: any): { r: number; g: number; b: number } {
  let r = 0
  let g = 0
  let b = 0
  if (typeof colorData.rgb === "string") {
    const m = colorData.rgb.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
    if (m) {
      r = parseInt(m[1], 10)
      g = parseInt(m[2], 10)
      b = parseInt(m[3], 10)
    }
  } else if (colorData.rgb && typeof colorData.rgb === "object" && "r" in colorData.rgb) {
    r = Number(colorData.rgb.r) || 0
    g = Number(colorData.rgb.g) || 0
    b = Number(colorData.rgb.b) || 0
  }
  if (r === 0 && g === 0 && b === 0 && colorData.hex) {
    const tc = tinycolor(colorData.hex)
    if (tc.isValid()) {
      const rgb = tc.toRgb()
      r = rgb.r
      g = rgb.g
      b = rgb.b
    }
  }
  return { r, g, b }
}

function formatHslForApiRow(colorData: any): string {
  if (typeof colorData.hsl === "string") return colorData.hsl
  if (
    colorData.hsl &&
    typeof colorData.hsl === "object" &&
    "h" in colorData.hsl &&
    "s" in colorData.hsl &&
    "l" in colorData.hsl
  ) {
    return `hsl(${colorData.hsl.h}, ${colorData.hsl.s}%, ${colorData.hsl.l}%)`
  }
  const { r, g, b } = parseRgbTriplet(colorData)
  const tc = tinycolor({ r, g, b })
  if (tc.isValid()) {
    const h = tc.toHsl()
    return `hsl(${Math.round(h.h * 360)}, ${Math.round(h.s * 100)}%, ${Math.round(h.l * 100)}%)`
  }
  return ""
}

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
  /** When hidePrimaryActionButton is true, parent can show "Save selected color separately" in its footer; this callback provides disabled/loading */
  onSaveSelectedColorMetaChange?: (meta: { disabled: boolean; loading: boolean }) => void
  onStateChange?: (state: { colorsCount: number }) => void
}

export type PaletteModalHandle = {
  submit: () => void
  getColorsCount: () => number
  canUndo: boolean
  canRedo: boolean
  handleUndo: () => void
  handleRedo: () => void
  saveSelectedColorSeparately: () => void
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
    onSaveSelectedColorMetaChange,
    onStateChange,
  } = props
  const { state, dispatch } = useGlobalState()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { data: foldersForColorSync } = useGetFolders(true)
  const [colors, setColors] = useState(initialColors ? initialColors : [createDefaultColorObject(), createDefaultColorObject()])
  const [originalColors, setOriginalColors] = useState(initialColors ? initialColors : [createDefaultColorObject(), createDefaultColorObject()])
  const [colorPickerIndex, setColorPickerIndex] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  /** Primary action (Add/Save palette or color) — separate from "save selected color separately" so footer labels stay correct */
  const [primarySaving, setPrimarySaving] = useState(false)
  const [saveSelectedSaving, setSaveSelectedSaving] = useState(false)
  const saveInProgress = primarySaving || saveSelectedSaving
  const [activeTab, setActiveTab] = useState<"info" | "create">("create")
  const [activeInfoSubtab, setActiveInfoSubtab] = useState<"palette" | "color">("palette")
  const [nameFieldError, setNameFieldError] = useState(false)
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

  const activeColor = colorPickerIndex !== null ? colors[colorPickerIndex] : null
  const activeColorFolderSyncKey =
    activeColor == null
      ? ""
      : `${colorPickerIndex}:${activeColor._id ?? ""}:${activeColor.id ?? ""}`

  // Color Info folders follow the selected swatch; only re-sync when swatch identity changes (not on every hex edit).
  useEffect(() => {
    if (!open) return
    const folders = foldersForColorSync?.folders
    if (!folders || folders.length === 0) return
    if (colorPickerIndex === null || !colors[colorPickerIndex]) return
    const color = colors[colorPickerIndex]
    const ids = collectFolderIdsForColor(color, folders)
    const hasStoredId =
      (color._id != null && String(color._id).length > 0) ||
      (color.id != null && String(color.id).length > 0)
    if (hasStoredId || ids.length > 0) {
      setSelectedFolderIds(ids)
    } else {
      setSelectedFolderIds([])
    }
  }, [open, colorPickerIndex, activeColorFolderSyncKey, foldersForColorSync?.folders])

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

  const handleAddPaletteToPalette = (paletteColors: any[]) => {
    if (paletteColors.length === 0) return
    const colorObjects = paletteColors.map((c) =>
      typeof c === "string" ? createDefaultColorObject(c) : c
    )
    setColors((prev) => [...prev, ...colorObjects].slice(0, 10))
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
  }

  // Notify parent when colors count changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange({ colorsCount: colors.length })
    }
  }, [colors.length, onStateChange])

  const primaryActionLabel = primarySaving
    ? "Saving..."
    : isSingleColorEdit
      ? "Save"
      : isSingleColor
        ? "Save"
        : "Save"

  useImperativeHandle(ref, () => ({
    submit: () => {
      if (!saveInProgress) handleFinish()
    },
    getColorsCount: () => colors.length,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    saveSelectedColorSeparately: () => {
      if (!saveInProgress) handleSaveSelectedColor()
    },
  }))

  useEffect(() => {
    onPrimaryActionMetaChange?.({
      label: primaryActionLabel,
      disabled: saveInProgress,
    })
  }, [onPrimaryActionMetaChange, primaryActionLabel, saveInProgress])

  const canSaveSelectedColorSeparately = isPalette && !isEditing && colorPickerIndex !== null
  useEffect(() => {
    onSaveSelectedColorMetaChange?.({
      disabled: !canSaveSelectedColorSeparately || saveInProgress,
      loading: saveSelectedSaving,
    })
  }, [onSaveSelectedColorMetaChange, canSaveSelectedColorSeparately, saveInProgress, saveSelectedSaving])

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
      setActiveTab("info")
      setActiveInfoSubtab("palette")
      setNameFieldError(true)
      return
    }

    setPrimarySaving(true)
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
          // Don't use sheetUrl when generating - always set to null
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
              spreadsheetId: null,
              sheetName: null,
              sheetId: null,
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

          // Move palette colors to the selected folder (move = remove from elsewhere, add to selected folder)
          if (selectedFolderIds && selectedFolderIds.length > 0 && !isEditing) {
            const data = response?.data?.data ?? response?.data
            const createdColorList = Array.isArray(data?.createdColors) ? data.createdColors : []
            const createdIds = createdColorList.map((c: any) => c?._id ?? c).filter(Boolean)
            const allColorIds = [...existingColorIds, ...createdIds].map(String)
            const paletteIdFromResponse = data?.palette?._id ?? data?.palette?.id
            const paletteIdStr = paletteIdFromResponse != null ? String(paletteIdFromResponse) : null
            const targetFolderId = String(selectedFolderIds[0])

            try {
              // Move all palette colors to the selected folder (one target; move removes from other folders first)
              if (allColorIds.length > 0) {
                await axiosInstance.post(
                  `${config.api.endpoints.moveColorsToFolder}/${targetFolderId}/move-colors`,
                  { colorIds: allColorIds, isNotFoldered: false },
                  {
                    headers: {
                      Authorization: `Bearer ${state.user?.jwtToken}`,
                    },
                  }
                )
              }

              // Add the palette to the same folder (so it shows in colorappfrontend and Generator Library)
              if (paletteIdStr) {
                await axiosInstance.post(
                  `${config.api.endpoints.copyColorToFolder}/${targetFolderId}/add-palette`,
                  { paletteId: paletteIdStr },
                  {
                    headers: {
                      Authorization: `Bearer ${state.user?.jwtToken}`,
                    },
                  }
                )
              }
            } catch (folderErr) {
              console.error("Error moving palette/colors to folder:", folderErr)
              toast.display("error", "Palette created but failed to add to folder. You can add it from the web app.")
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
      setPrimarySaving(false)
    }
  }

  const handleSaveSelectedColor = async () => {
    if (colorPickerIndex === null || !colors[colorPickerIndex]) {
      toast.display("error", "Please select a color to save")
      return
    }
    if (!state.user?.jwtToken) {
      toast.display("error", "Please log in to save colors")
      return
    }

    setSaveSelectedSaving(true)
    try {
      const colorData = colors[colorPickerIndex]
      const { r, g, b } = parseRgbTriplet(colorData)
      const hslValue = formatHslForApiRow(colorData)
      const timestamp = Math.floor(Date.now() / 1000)

      const response = await axiosInstance.post(
        config.api.endpoints.addColor,
        {
          spreadsheetId: null,
          sheetName: null,
          sheetId: null,
          folderIds: Array.isArray(selectedFolderIds) ? selectedFolderIds : [],
          row: {
            timestamp,
            hex: colorData.hex || "",
            name: colorData.name || "",
            rgb: `rgb(${r}, ${g}, ${b})`,
            hsl: hslValue,
            url: colorData.url || "",
            ranking: colorData.ranking != null ? String(colorData.ranking) : "0",
            comments: colorData.comments || "",
            slash_naming: colorData.slash_naming || "",
            tags: parseTags(colorData.tags || []),
            additionalColumns: colorData.additionalColumns || [],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${state.user.jwtToken}`,
          },
        }
      )

      const result = response?.data?.data ?? response?.data
      const created = result?.createdColor
      const createdHex = created?.hex ?? colorData.hex
      if (created && createdHex) {
        const parsed = {
          _id: created._id ?? created.id,
          id: created._id ?? created.id,
          hex: createdHex,
          url: created.url ?? colorData.url ?? "",
          slash_naming: created.slash_naming ?? colorData.slash_naming ?? "",
          comments: created.comments ?? colorData.comments ?? "",
          ranking: created.ranking ?? colorData.ranking ?? 0,
          tags: created.tags ?? parseTags(colorData.tags) ?? [],
          additionalColumns: created.additionalColumns ?? colorData.additionalColumns ?? [],
          rgb: created.rgb ?? colorData.rgb,
          hsl: created.hsl ?? colorData.hsl,
          timestamp,
        }
        dispatch({ type: "ADD_COLOR_HISTORY", payload: { hex: createdHex, parsed } })
      }

      await queryClient.invalidateQueries({ queryKey: ["colors-and-palettes"] })
      await queryClient.invalidateQueries({ queryKey: ["folders"] })

      toast.display("success", "Color saved successfully!")
    } catch (err: any) {
      const msg =
        err?.response?.data?.err ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to save color"
      toast.display("error", typeof msg === "string" ? msg : "Failed to save color")
      console.error("Error saving color:", err)
    } finally {
      setSaveSelectedSaving(false)
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
          maxWidth="190px"
          className="import-colors-scrollbar"
        >
          <div
            style={{
              padding: "16px",
              borderRight: "1px solid #f0f0f0",
              backgroundColor: "#fafafa",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              flex: 1,
            }}
          >
            <div style={{ flex: 1, overflow: "hidden", minHeight: 0, display: "flex", flexDirection: "column" }}>
              <ImportColorsList
                onAddToPalette={handleAddColorToPalette}
                onAddPaletteToPalette={handleAddPaletteToPalette}
              />
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
                        nameFieldError={nameFieldError}
                        onClearNameFieldError={() => setNameFieldError(false)}
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
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <h3 style={{ margin: 0, fontSize: "12px", fontWeight: 500 }}>Versions</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                <button
                  onClick={handleUndo}
                  title="Undo (Ctrl+Z)"
                  disabled={!canUndo}
                  style={{
                    padding: "2px 4px",
                    minWidth: "auto",
                    opacity: canUndo ? 1 : 0.4,
                    border: "none",
                    background: "transparent",
                    cursor: canUndo ? "pointer" : "not-allowed",
                    borderRadius: "2px",
                  }}
                  onMouseEnter={(e) => canUndo && ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#eee")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent")}
                >
                  <Undo2 style={{ width: "12px", height: "12px" }} />
                </button>
                <button
                  onClick={handleRedo}
                  title="Redo (Ctrl+Shift+Z)"
                  disabled={!canRedo}
                  style={{
                    padding: "2px 4px",
                    minWidth: "auto",
                    opacity: canRedo ? 1 : 0.4,
                    border: "none",
                    background: "transparent",
                    cursor: canRedo ? "pointer" : "not-allowed",
                    borderRadius: "2px",
                  }}
                  onMouseEnter={(e) => canRedo && ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#eee")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent")}
                >
                  <Redo2 style={{ width: "12px", height: "12px" }} />
                </button>
              </div>
            </div>
            <div style={{ fontSize: "10px", color: "#666", marginBottom: "8px", marginTop: "0px" }}>
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
          {isPalette && !isEditing && colorPickerIndex !== null && !props.hidePrimaryActionButton && (
            <button
              onClick={handleSaveSelectedColor}
              disabled={saveInProgress}
              style={{
                padding: "4px 15px",
                fontSize: "14px",
                height: "32px",
                border: "1px solid #d9d9d9",
                borderRadius: "6px",
                background: "#fff",
                cursor: saveInProgress ? "not-allowed" : "pointer",
                opacity: saveInProgress ? 0.5 : 1,
                marginRight: "8px",
              }}
            >
              {saveSelectedSaving ? "Saving..." : "Save selected color separately"}
            </button>
          )}
        </div>
        <div />
      </div>
    </div>
  )
})

export default PaletteModal
