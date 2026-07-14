import { FC, useEffect, useMemo, useRef, useState } from "react"
import { extractColors } from "extract-colors"
import { Loader2 } from "lucide-react"
import SectionHeader from "../common/SectionHeader"
import SnapshotCanvas from "./SnapshotCanvas"
import SnapshotSwatchesPanel from "./SnapshotSwatchesPanel"
import SnapshotInfoPanel, { type SnapshotInfoHandle } from "./SnapshotInfoPanel"
import {
  SnapshotImageData,
  SnapshotPaletteEntry,
  createPaletteEntry,
  findBestPointForColor,
} from "./types"
import { downloadPaletteJpg } from "@/v2/utils/downloadPaletteJpg"

interface Props {
  snapshot: SnapshotImageData
  setTab: (tab: string | null) => void
  onPickColor?: () => void
  onPickColorFromBrowser?: () => void
  onStartSnapshot?: () => void
}

const SnapshotEditor: FC<Props> = ({
  snapshot,
  setTab,
  onPickColor,
  onPickColorFromBrowser,
  onStartSnapshot,
}) => {
  const [palette, setPalette] = useState<SnapshotPaletteEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [activeTab, setActiveTab] = useState<"create" | "info">("create")
  const infoRef = useRef<SnapshotInfoHandle | null>(null)
  const [footerMeta, setFooterMeta] = useState({
    savePaletteDisabled: true,
    savePaletteLabel: "Save palette",
    saveSelectedDisabled: true,
    saveSelectedLabel: "Save selected color individually",
  })

  const defaultPaletteName = useMemo(() => {
    try {
      const u = new URL(snapshot.sourceUrl || "")
      const host = u.hostname.replace(/^www\./, "") || "snapshot"
      const d = new Date(snapshot.createdAt || Date.now())
      const pad = (n: number) => String(n).padStart(2, "0")
      const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
      return `${host}_${stamp}`
    } catch {
      return "snapshot_palette"
    }
  }, [snapshot.createdAt, snapshot.sourceUrl])

  useEffect(() => {
    let cancelled = false

    async function initPalette() {
      try {
        const extracted = await extractColors(snapshot.dataUrl, {
          pixels: 64000,
          distance: 0.22,
        })

        const topColors = extracted.slice(0, 10)

        const img = new Image()
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = reject
          img.src = snapshot.dataUrl
        })

        const canvas = document.createElement("canvas")
        canvas.width = snapshot.width
        canvas.height = snapshot.height
        const ctx = canvas.getContext("2d", { willReadFrequently: true })
        if (!ctx) {
          setInitializing(false)
          return
        }
        ctx.drawImage(img, 0, 0)

        const entries: SnapshotPaletteEntry[] = topColors.map((color) => {
          const { x, y } = findBestPointForColor(
            ctx,
            snapshot.width,
            snapshot.height,
            color.hex,
          )
          return createPaletteEntry(color.hex, x, y)
        })

        if (!cancelled) {
          setPalette(entries)
          if (entries.length > 0) setSelectedId(entries[0].id)
        }
      } catch (err) {
        console.error("Failed to extract colors:", err)
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }

    initPalette()
    return () => {
      cancelled = true
    }
  }, [snapshot])

  return (
    <div className="snapshot-container w-[800px] h-[600px] max-w-[800px] max-h-[600px] box-border flex flex-col bg-white overflow-hidden shrink-0">
      <SectionHeader
        title="Snapshot"
        setTab={setTab}
        onPickColor={onPickColor}
        onPickColorFromBrowser={onPickColorFromBrowser}
        onStartSnapshot={onStartSnapshot}
        extraRightClassName="flex-1 min-w-0"
        containerClassName="flex-none"
        className="!justify-start"
        extraRight={
          <div className="flex items-center gap-2 w-full min-w-0">
            <div className="flex bg-gray-100 p-1 rounded-md border border-gray-200 flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("create")}
                style={{
                  padding: "6px 16px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  transition: "all 0.15s ease",
                  background: activeTab === "create" ? "#fff" : "transparent",
                  border: "none",
                  color: activeTab === "create" ? "#141414" : "#525252",
                  cursor: "pointer",
                  lineHeight: 1.3,
                  boxShadow:
                    activeTab === "create"
                      ? "0 1px 3px rgba(0, 0, 0, 0.1)"
                      : "none",
                }}
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("info")}
                style={{
                  padding: "6px 16px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  transition: "all 0.15s ease",
                  background: activeTab === "info" ? "#fff" : "transparent",
                  border: "none",
                  color: activeTab === "info" ? "#141414" : "#525252",
                  cursor: "pointer",
                  lineHeight: 1.3,
                  boxShadow:
                    activeTab === "info"
                      ? "0 1px 3px rgba(0, 0, 0, 0.1)"
                      : "none",
                }}
              >
                Info
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => {
                  try {
                    downloadPaletteJpg(
                      palette.map((e) => e.hex),
                      defaultPaletteName,
                    )
                  } catch (e) {
                    console.error("[Snapshot] download failed", e)
                  }
                }}
                disabled={palette.length === 0}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  palette.length > 0
                    ? "border-gray-200 text-gray-600 hover:bg-gray-50"
                    : "border-gray-200 text-gray-300 cursor-not-allowed"
                }`}
                title="Download JPG"
              >
                Download
              </button>
              <button
                type="button"
                onClick={onStartSnapshot}
                className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                title="Capture a new snapshot"
              >
                Recapture
              </button>
            </div>
          </div>
        }
      />

      <SnapshotSwatchesPanel
        palette={palette}
        selectedId={selectedId}
        onPaletteChange={setPalette}
        onSelectEntry={setSelectedId}
      />

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {initializing ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-[12px]">Extracting colors...</p>
          </div>
        ) : (
          <>
            <div className={activeTab === "create" ? "flex flex-col flex-1 min-h-0 overflow-hidden w-full" : "hidden"}>
              <SnapshotCanvas
                dataUrl={snapshot.dataUrl}
                imageWidth={snapshot.width}
                imageHeight={snapshot.height}
                palette={palette}
                selectedId={selectedId}
                onPaletteChange={setPalette}
                onSelectEntry={setSelectedId}
              />
            </div>
            <div className={activeTab === "info" ? "flex flex-col flex-1 min-h-0 overflow-hidden w-full" : "hidden"}>
              <SnapshotInfoPanel
                ref={infoRef}
                snapshot={snapshot}
                palette={palette}
                selectedId={selectedId}
                onPaletteChange={setPalette}
                onFooterMetaChange={setFooterMeta}
              />
            </div>
          </>
        )}
      </div>

      {/* Footer: Save selected color individually + Save palette (same layout as Generator) */}
      <div className="px-3 pb-3 pt-2 border-t border-gray-200 flex-shrink-0 flex items-center justify-between gap-3">
        <button
          onClick={() => {
            if (activeTab !== "info") setActiveTab("info")
            infoRef.current?.saveSelectedColor()
          }}
          className="flex items-center justify-center py-2.5 px-[15px] min-w-[220px] text-[12px] rounded transition-colors border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        >
          {footerMeta.saveSelectedLabel}
        </button>
        <button
          onClick={() => {
            if (activeTab !== "info") setActiveTab("info")
            infoRef.current?.savePalette()
          }}
          className="flex items-center justify-center py-2.5 min-w-[140px] text-[12px] rounded transition-colors bg-gray-900 text-white hover:bg-gray-800"
        >
          {footerMeta.savePaletteLabel}
        </button>
      </div>
    </div>
  )
}

export default SnapshotEditor
