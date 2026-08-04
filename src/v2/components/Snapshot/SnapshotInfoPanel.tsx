import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react"
import tinycolor from "tinycolor2"
import { useToast } from "@/v2/hooks/useToast"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { axiosInstance } from "@/v2/hooks/useAPI"
import { config } from "@/v2/others/config"
import type { SnapshotImageData, SnapshotPaletteEntry } from "./types"
import FormInputs from "@/v2/components/PaletteModal/FormInputs"
import ColorPropertiesForm from "@/v2/components/PaletteModal/ColorPropertiesForm"

type ActiveInfoTab = "palette" | "color"

function computeRowPayload(entry: SnapshotPaletteEntry, sourceUrl: string) {
  const tc = tinycolor(entry.hex)
  const rgb = tc.toRgb()
  const hsl = tc.toHsl()
  return {
    timestamp: Date.now(),
    url: entry.url || sourceUrl || "",
    hex: tc.toHexString().toUpperCase(),
    hsl: `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%)`,
    rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    ranking: 0,
    comments: entry.comments || "Extracted from snapshot",
    slash_naming: entry.slash_naming || "",
    tags: entry.tags || [],
    designTokens: entry.designTokens || [],
    additionalColumns: entry.additionalColumns || [],
  }
}

interface Props {
  snapshot: SnapshotImageData
  palette: SnapshotPaletteEntry[]
  selectedId: string | null
  onPaletteChange: (next: SnapshotPaletteEntry[]) => void
  onFooterMetaChange?: (meta: {
    savePaletteDisabled: boolean
    savePaletteLabel: string
    saveSelectedDisabled: boolean
    saveSelectedLabel: string
  }) => void
}

export type SnapshotInfoHandle = {
  savePalette: () => Promise<void>
  saveSelectedColor: () => Promise<void>
}

const SnapshotInfoPanel = forwardRef<SnapshotInfoHandle, Props>(({
  snapshot,
  palette,
  selectedId,
  onPaletteChange,
  onFooterMetaChange,
}, ref) => {
  const toast = useToast()
  const { state, dispatch } = useGlobalState()
  const [activeTab, setActiveTab] = useState<ActiveInfoTab>("palette")
  const [tags, setTags] = useState<string[]>([])
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: "",
    url: snapshot.sourceUrl || "",
    description: "",
    ranking: 0,
  })
  const [savingPalette, setSavingPalette] = useState(false)
  const [savingColor, setSavingColor] = useState(false)

  const selectedEntry = useMemo(
    () => (selectedId ? palette.find((e) => e.id === selectedId) ?? null : null),
    [palette, selectedId],
  )

  useEffect(() => {
    // Keep Generator-like behavior: do not prefill palette name.
    // But we can prefill URL with snapshot source.
    setFormData((prev) => ({
      ...prev,
      url: prev.url || snapshot.sourceUrl || "",
    }))
  }, [snapshot.sourceUrl])

  const canSavePalette = palette.length > 0 && !!state.user?.jwtToken && !savingPalette
  const canSaveColor =
    !!selectedEntry && !!state.user?.jwtToken && !savingColor

  useEffect(() => {
    onFooterMetaChange?.({
      savePaletteDisabled: !canSavePalette,
      savePaletteLabel: savingPalette ? "Saving..." : "Save palette",
      saveSelectedDisabled: !canSaveColor,
      saveSelectedLabel: savingColor
        ? "Saving..."
        : "Save selected color individually",
    })
  }, [canSavePalette, canSaveColor, onFooterMetaChange, savingColor, savingPalette])

  const updateSelectedColor = (value: any) => {
    if (!selectedEntry) return
    onPaletteChange(
      palette.map((e) =>
        e.id === selectedEntry.id
          ? {
              ...e,
              slash_naming: value?.slash_naming ?? value?.name ?? e.slash_naming,
              url: value?.url ?? e.url,
              comments: value?.comments ?? e.comments,
              ranking: value?.ranking ?? e.ranking,
              tags: value?.tags ?? e.tags,
              designTokens: value?.designTokens ?? e.designTokens,
              additionalColumns: value?.additionalColumns ?? e.additionalColumns,
            }
          : e,
      ),
    )
  }

  const handleSavePalette = async (): Promise<void> => {
    if (!state.user?.jwtToken) {
      toast.display("error", "Please log in to save")
      return
    }
    if (palette.length === 0) return

    setSavingPalette(true)
    try {
      const newColors = palette.map((entry) => ({
        ...computeRowPayload(entry, snapshot.sourceUrl),
      }))

      const createData = {
        name: formData.name || "Snapshot palette",
        url: formData.url || snapshot.sourceUrl || "",
        description: formData.description || "Extracted from snapshot",
        ranking: formData.ranking || 0,
        tags,
        colorIds: [],
        newColors,
        updatedColors: [],
      }

      const response = await axiosInstance.post(
        config.api.endpoints.paletteCreate,
        createData,
        { headers: { Authorization: `Bearer ${state.user.jwtToken}` } },
      )
      const data = (response as any)?.data?.data ?? (response as any)?.data ?? {}
      const createdColors = Array.isArray(data?.createdColors) ? data.createdColors : []
      const createdPaletteId = data?.palette?._id ?? data?.palette?.id ?? null

      if (createdColors.length > 0) {
        createdColors.forEach((c: any) => {
          if (!c?.hex) return
          dispatch({
            type: "ADD_COLOR_HISTORY",
            payload: { hex: String(c.hex).toUpperCase(), parsed: c },
          })
        })
      } else {
        // fallback: still add locally so user sees history updated
        newColors.forEach((row: any) => {
          dispatch({ type: "ADD_COLOR_HISTORY", payload: { hex: row.hex, parsed: row } })
        })
      }

      // Match Generator behavior: move colors + add palette to selected folder (first selection)
      const targetFolderId = selectedFolderIds?.[0] ? String(selectedFolderIds[0]) : null
      if (targetFolderId && createdColors.length > 0) {
        const createdIds = createdColors
          .map((c: any) => c?._id ?? c?.id ?? c)
          .filter(Boolean)
          .map(String)
        try {
          if (createdIds.length > 0) {
            await axiosInstance.post(
              `${config.api.endpoints.moveColorsToFolder}/${targetFolderId}/move-colors`,
              { colorIds: createdIds, isNotFoldered: false },
              { headers: { Authorization: `Bearer ${state.user.jwtToken}` } },
            )
          }
          if (createdPaletteId) {
            await axiosInstance.post(
              `${config.api.endpoints.copyColorToFolder}/${targetFolderId}/add-palette`,
              { paletteId: String(createdPaletteId) },
              { headers: { Authorization: `Bearer ${state.user.jwtToken}` } },
            )
          }
        } catch (folderErr) {
          console.error("[Snapshot] folder attach failed", folderErr)
        }
      }

      toast.display("success", "Palette saved")
    } catch (err: any) {
      console.error("[Snapshot] save palette failed", err)
      toast.display("error", err?.response?.data?.message || "Failed to save palette")
    } finally {
      setSavingPalette(false)
    }
  }

  const handleSaveSelectedColor = async (): Promise<void> => {
    if (!selectedEntry) return
    if (!state.user?.jwtToken) {
      toast.display("error", "Please log in to save")
      return
    }

    setSavingColor(true)
    try {
      const row = computeRowPayload(selectedEntry, snapshot.sourceUrl)
      const response = await axiosInstance.post(
        config.api.endpoints.addColor,
        { spreadsheetId: null, sheetName: null, sheetId: null, row },
        { headers: { Authorization: `Bearer ${state.user.jwtToken}` } },
      )
      const apiData = (response as any)?.data?.data ?? (response as any)?.data ?? {}
      const createdColor = apiData?.createdColor ?? apiData?.data?.createdColor ?? null
      if (createdColor && (createdColor._id || createdColor.id)) {
        const createdId = String(createdColor._id ?? createdColor.id)
        dispatch({
          type: "ADD_COLOR_HISTORY",
          payload: { hex: row.hex, parsed: createdColor },
        })

        // Copy to selected folders (Generator-like)
        if (selectedFolderIds && selectedFolderIds.length > 0) {
          await Promise.allSettled(
            selectedFolderIds.map((folderId) =>
              axiosInstance.post(
                `${config.api.endpoints.copyColorToFolder}/${folderId}/copy-color`,
                { colorId: createdId },
                { headers: { Authorization: `Bearer ${state.user?.jwtToken ?? ""}` } },
              ),
            ),
          )
        }
      } else {
        dispatch({ type: "ADD_COLOR_HISTORY", payload: { hex: row.hex, parsed: row } })
      }
      toast.display("success", "Color saved")
    } catch (err: any) {
      console.error("[Snapshot] save color failed", err)
      toast.display("error", err?.response?.data?.message || "Failed to save color")
    } finally {
      setSavingColor(false)
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      savePalette: handleSavePalette,
      saveSelectedColor: handleSaveSelectedColor,
    }),
    [handleSavePalette, handleSaveSelectedColor],
  )

  return (
    <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col bg-white">
      <div className="px-3 pt-2 pb-2 border-b border-gray-200 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex bg-gray-100 p-1 rounded-md border border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab("palette")}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              transition: "all 0.15s ease",
              background: activeTab === "palette" ? "#fff" : "transparent",
              border: "none",
              color: activeTab === "palette" ? "#141414" : "#525252",
              cursor: "pointer",
              lineHeight: 1.3,
              boxShadow:
                activeTab === "palette" ? "0 1px 3px rgba(0, 0, 0, 0.1)" : "none",
            }}
          >
            Palette info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("color")}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              transition: "all 0.15s ease",
              background: activeTab === "color" ? "#fff" : "transparent",
              border: "none",
              color: activeTab === "color" ? "#141414" : "#525252",
              cursor: "pointer",
              lineHeight: 1.3,
              boxShadow:
                activeTab === "color" ? "0 1px 3px rgba(0, 0, 0, 0.1)" : "none",
            }}
          >
            Color info
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3">
        {activeTab === "palette" ? (
          <div className="w-full">
            <FormInputs
              formData={formData}
              setFormData={(updater: any) => {
                if (typeof updater === "function") setFormData((prev) => updater(prev))
                else setFormData(updater)
              }}
              tags={tags}
              setTags={setTags}
              selectedFolderIds={selectedFolderIds}
              onFolderChange={setSelectedFolderIds}
            />
            <div className="mt-3 text-[12px] text-gray-600">
              <div className="flex items-center justify-between border border-gray-100 rounded px-3 py-2 bg-[#fafafa]">
                <span>Colors</span>
                <span className="text-gray-900 font-medium">{palette.length}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full">
            <ColorPropertiesForm
              selectedColor={
                selectedEntry
                  ? {
                      hex: selectedEntry.hex,
                      url: selectedEntry.url || snapshot.sourceUrl || "",
                      comments: selectedEntry.comments || "",
                      ranking: selectedEntry.ranking ?? 0,
                      slash_naming: selectedEntry.slash_naming || "",
                      tags: selectedEntry.tags || [],
                      designTokens: selectedEntry.designTokens || [],
                      additionalColumns: selectedEntry.additionalColumns || [],
                    }
                  : null
              }
              onColorChange={updateSelectedColor}
              colorPickerIndex={selectedEntry ? 0 : null}
              selectedFolderIds={selectedFolderIds}
              onFolderChange={setSelectedFolderIds}
            />
          </div>
        )}
      </div>
    </div>
  )
})

export default SnapshotInfoPanel

