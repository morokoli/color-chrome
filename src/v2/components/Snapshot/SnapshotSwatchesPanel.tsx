import { FC, useEffect, useMemo, useState } from "react"
import Color from "color"
import { Check, Copy, Plus, X } from "lucide-react"
import type { SnapshotPaletteEntry } from "./types"
import { MAX_PALETTE_COLORS } from "./types"
import { useToast } from "@/v2/hooks/useToast"

interface Props {
  palette: SnapshotPaletteEntry[]
  selectedId: string | null
  onPaletteChange: (next: SnapshotPaletteEntry[]) => void
  onSelectEntry: (id: string | null) => void
}

const SnapshotSwatchesPanel: FC<Props> = ({
  palette,
  selectedId,
  onPaletteChange,
  onSelectEntry,
}) => {
  const toast = useToast()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (!copiedId) return
    const t = setTimeout(() => setCopiedId(null), 1500)
    return () => clearTimeout(t)
  }, [copiedId])

  const slots = useMemo(
    () => Array.from({ length: MAX_PALETTE_COLORS }, (_, i) => palette[i] ?? null),
    [palette],
  )

  const handleDelete = (id: string) => {
    onPaletteChange(palette.filter((e) => e.id !== id))
    if (selectedId === id) onSelectEntry(null)
  }

  const handleCopyHex = async (hex: string, id: string) => {
    try {
      await navigator.clipboard.writeText(hex)
      setCopiedId(id)
    } catch {
      toast.display("error", "Failed to copy")
    }
  }

  return (
    <div className="px-3 pt-2 pb-1 border-b border-gray-200 bg-[#fafafa] flex-shrink-0">
      <div
        className="flex items-center gap-[2px] w-full"
        style={{
          border: "2px dashed transparent",
          borderRadius: "8px",
          padding: "8px",
        }}
      >
        {slots.map((entry, index) => {
          if (!entry) {
            return (
              <div
                key={`empty-${index}`}
                className="flex-1 min-w-[48px] rounded-md border border-dashed border-gray-300 bg-white flex items-center justify-center h-[90px]"
                title="Click image to add"
              >
                <Plus className="w-3.5 h-3.5 text-gray-300" />
              </div>
            )
          }

          const isDark = Color(entry.hex).isDark()
          const isSelected = selectedId === entry.id
          const iconColor = isDark
            ? "rgba(255,255,255,0.9)"
            : "rgba(0,0,0,0.75)"

          return (
            <div
              key={entry.id}
              className="flex-1 min-w-[48px]"
              style={{ position: "relative", zIndex: 10 - index }}
            >
              <div
                style={{
                  width: "100%",
                  height: "90px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  cursor: "pointer",
                  boxSizing: "border-box",
                  border: isSelected ? "4px solid black" : "2px solid black",
                  backgroundColor: entry.hex,
                }}
                onClick={() => onSelectEntry(entry.id)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(entry.id)
                  }}
                  style={{
                    position: "absolute",
                    top: "2px",
                    right: "2px",
                    fontSize: "12px",
                    color: iconColor,
                    borderRadius: "0",
                    padding: "0",
                    display: "block",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                  title="Remove color"
                >
                  <X className="w-3 h-3" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopyHex(entry.hex, entry.id)
                  }}
                  style={{
                    position: "absolute",
                    bottom: "2px",
                    right: "2px",
                    color: iconColor,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  title="Copy hex"
                >
                  {copiedId === entry.id ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SnapshotSwatchesPanel

