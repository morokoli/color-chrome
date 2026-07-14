import { FC, useEffect, useState } from "react"
import Color from "color"
import { Check, Copy, Loader2, Plus, X } from "lucide-react"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useAddMultipleColors } from "@/v2/api/sheet.api"
import { useToast } from "@/v2/hooks/useToast"
import {
  MAX_PALETTE_COLORS,
  SnapshotPaletteEntry,
} from "./types"

interface Props {
  palette: SnapshotPaletteEntry[]
  sourceUrl: string
  selectedId: string | null
  onPaletteChange: (palette: SnapshotPaletteEntry[]) => void
  onSelectEntry: (id: string | null) => void
}

const PalettePanel: FC<Props> = ({
  palette,
  sourceUrl,
  selectedId,
  onPaletteChange,
  onSelectEntry,
}) => {
  const { state, dispatch } = useGlobalState()
  const { addMultipleColorsAsync } = useAddMultipleColors()
  const toast = useToast()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle")

  useEffect(() => {
    if (saveStatus === "success") {
      const t = setTimeout(() => setSaveStatus("idle"), 2000)
      return () => clearTimeout(t)
    }
  }, [saveStatus])

  const slots = Array.from(
    { length: MAX_PALETTE_COLORS },
    (_, i) => palette[i] ?? null,
  )

  const handleDelete = (id: string) => {
    onPaletteChange(palette.filter((e) => e.id !== id))
    if (selectedId === id) onSelectEntry(null)
  }

  const handleCopyHex = async (hex: string, id: string) => {
    try {
      await navigator.clipboard.writeText(hex)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      toast.display("error", "Failed to copy")
    }
  }

  const handleCopyAll = async () => {
    if (palette.length === 0) return
    try {
      await navigator.clipboard.writeText(palette.map((e) => e.hex).join(", "))
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 1500)
    } catch {
      toast.display("error", "Failed to copy")
    }
  }

  const handleSave = async () => {
    if (palette.length === 0) return

    const rows = palette.map((entry) => {
      const colorObj = new Color(entry.hex)
      return {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        url: sourceUrl || "",
        hex: colorObj.hex(),
        hsl: colorObj.hsl().round(1).toString(),
        rgb: colorObj.rgb().round(1).toString(),
        ranking: "0",
        comments: "Extracted from snapshot",
        slash_naming: "",
        additionalColumns: [],
      }
    })

    if (!state.user?.jwtToken) {
      rows.forEach((row) => {
        dispatch({
          type: "ADD_COLOR_HISTORY",
          payload: { hex: row.hex, parsed: row },
        })
      })
      toast.display("success", "Colors saved to local history")
      return
    }

    setSaveStatus("loading")
    try {
      const resp = await addMultipleColorsAsync({
        spreadsheetId: null,
        sheetName: null,
        sheetId: null,
        rows,
      })
      const createdColorIds =
        (resp as any)?.data?.createdColorIds ||
        (resp as any)?.createdColorIds ||
        []
      rows.forEach((row, idx) => {
        const colorId =
          Array.isArray(createdColorIds) && createdColorIds[idx]
            ? createdColorIds[idx]
            : undefined
        dispatch({
          type: "ADD_COLOR_HISTORY",
          payload: {
            hex: row.hex,
            parsed: colorId ? { ...row, _id: colorId, id: colorId } : row,
          },
        })
      })
      setSaveStatus("success")
      toast.display("success", "Colors saved successfully")
    } catch (error) {
      console.error("Error saving snapshot colors:", error)
      setSaveStatus("error")
      toast.display("error", "Failed to save colors")
    }
  }

  return (
    <div className="w-[300px] max-w-[300px] h-full flex flex-col border-l border-gray-200 bg-[#fafafa] flex-shrink-0 overflow-hidden box-border">
      <div className="flex-1 min-h-0 px-2 pt-2 pb-1 overflow-hidden flex flex-col">
        <div
          className="grid grid-cols-2 grid-rows-5 gap-1 w-full mx-auto"
          style={{ height: "95%" }}
        >
          {slots.map((entry, index) => {
            if (!entry) {
              return (
                <div
                  key={`empty-${index}`}
                  className="rounded-md border border-dashed border-gray-300 bg-white flex items-center justify-center h-full min-h-0"
                >
                  <div className="flex flex-col items-center gap-0.5 text-gray-400">
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-[9px]">Click image</span>
                  </div>
                </div>
              )
            }

            const isDark = Color(entry.hex).isDark()
            const isSelected = selectedId === entry.id
            const textColor = isDark ? "#fff" : "#141414"

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelectEntry(entry.id)}
                className={`group relative rounded-md overflow-hidden h-full min-h-0 w-full text-left transition-shadow ${
                  isSelected
                    ? "shadow-[inset_0_0_0_2px_#2680EB]"
                    : "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.22)]"
                }`}
                style={{ backgroundColor: entry.hex }}
              >
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(entry.id)
                  }}
                  className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-black/60 transition-opacity z-10"
                  title="Remove color"
                >
                  <X className="w-2.5 h-2.5" />
                </span>

                <div className="absolute bottom-0 left-0 right-0 px-2 py-1 flex items-center justify-between">
                  <span
                    className="text-[10px] font-semibold font-mono leading-none"
                    style={{
                      color: textColor,
                      textShadow: isDark
                        ? "0 1px 3px rgba(0,0,0,0.65)"
                        : "0 1px 3px rgba(255,255,255,0.9)",
                    }}
                  >
                    {entry.hex}
                  </span>
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopyHex(entry.hex, entry.id)
                    }}
                    className="p-0.5 rounded opacity-90 hover:opacity-100"
                    style={{
                      color: textColor,
                      filter: isDark
                        ? "drop-shadow(0 1px 2px rgba(0,0,0,0.6))"
                        : "drop-shadow(0 1px 2px rgba(255,255,255,0.9))",
                    }}
                    title="Copy hex"
                  >
                    {copiedId === entry.id ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white px-2 py-1.5 space-y-1.5 flex-shrink-0">
        {palette.length > 0 && (
          <div className="flex h-5 rounded-full overflow-hidden border border-gray-200">
            {palette.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelectEntry(entry.id)}
                className={`flex-1 min-w-0 ${
                  selectedId === entry.id ? "opacity-100" : "opacity-90"
                }`}
                style={{ backgroundColor: entry.hex }}
                title={entry.hex}
              />
            ))}
            {Array.from({ length: MAX_PALETTE_COLORS - palette.length }).map(
              (_, i) => (
                <div
                  key={`strip-empty-${i}`}
                  className="flex-1 min-w-0 bg-gray-100"
                />
              ),
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAll}
            disabled={palette.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {copiedAll ? (
              <Check className="w-3 h-3 text-green-600" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            Copy all
          </button>
          <span className="text-[10px] text-gray-400 ml-auto">
            {palette.length}/{MAX_PALETTE_COLORS}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={palette.length === 0 || saveStatus === "loading"}
          className={`w-full py-2 text-[12px] font-semibold rounded-full transition-colors ${
            palette.length > 0
              ? "bg-[#2680EB] text-white hover:bg-[#1473E6]"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {saveStatus === "loading" ? (
            <span className="flex items-center justify-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving...
            </span>
          ) : saveStatus === "success" ? (
            "Saved!"
          ) : (
            "Save color palette"
          )}
        </button>
      </div>
    </div>
  )
}

export default PalettePanel
