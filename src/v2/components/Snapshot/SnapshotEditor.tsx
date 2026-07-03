import { FC, useEffect, useState } from "react"
import { extractColors } from "extract-colors"
import { Loader2 } from "lucide-react"
import SectionHeader from "../common/SectionHeader"
import SnapshotCanvas from "./SnapshotCanvas"
import PalettePanel from "./PalettePanel"
import {
  SnapshotImageData,
  SnapshotPaletteEntry,
  createPaletteEntry,
  findBestPointForColor,
} from "./types"

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
        extraRight={
          <button
            type="button"
            onClick={onStartSnapshot}
            className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            title="Capture a new snapshot"
          >
            Recapture
          </button>
        }
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {initializing ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-[12px]">Extracting colors...</p>
          </div>
        ) : (
          <>
            <SnapshotCanvas
              dataUrl={snapshot.dataUrl}
              imageWidth={snapshot.width}
              imageHeight={snapshot.height}
              palette={palette}
              selectedId={selectedId}
              onPaletteChange={setPalette}
              onSelectEntry={setSelectedId}
            />
            <PalettePanel
              palette={palette}
              sourceUrl={snapshot.sourceUrl}
              selectedId={selectedId}
              onPaletteChange={setPalette}
              onSelectEntry={setSelectedId}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default SnapshotEditor
