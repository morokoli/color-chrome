import { FC, useCallback, useEffect, useRef, useState } from "react"
import {
  MAX_PALETTE_COLORS,
  SnapshotPaletteEntry,
  createPaletteEntry,
  sampleColorAt,
} from "./types"
import { useMagnifierLoupe } from "./useMagnifierLoupe"

const CANVAS_PADDING = 12
const POINT_SIZE = 22
const SELECTED_POINT_SIZE = 28

interface Props {
  dataUrl: string
  imageWidth: number
  imageHeight: number
  palette: SnapshotPaletteEntry[]
  selectedId: string | null
  onPaletteChange: (palette: SnapshotPaletteEntry[]) => void
  onSelectEntry: (id: string | null) => void
}

const SnapshotCanvas: FC<Props> = ({
  dataUrl,
  imageWidth,
  imageHeight,
  palette,
  selectedId,
  onPaletteChange,
  onSelectEntry,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  // Offscreen full-resolution canvas used only for accurate pixel sampling
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const sampleCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })
  const [imageReady, setImageReady] = useState(false)
  const draggingIdRef = useRef<string | null>(null)
  const { drawLoupe, hideLoupe, destroyLoupe } = useMagnifierLoupe()

  // Build the offscreen sampling canvas at full resolution
  useEffect(() => {
    let cancelled = false
    setImageReady(false)

    const canvas = document.createElement("canvas")
    canvas.width = imageWidth
    canvas.height = imageHeight
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      ctx.drawImage(img, 0, 0, imageWidth, imageHeight)
      sampleCanvasRef.current = canvas
      sampleCtxRef.current = ctx
      setImageReady(true)
    }
    img.src = dataUrl

    return () => {
      cancelled = true
    }
  }, [dataUrl, imageWidth, imageHeight])

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return
      const { clientWidth, clientHeight } = containerRef.current
      const maxW = Math.max(1, clientWidth - CANVAS_PADDING * 2)
      const maxH = Math.max(1, clientHeight - CANVAS_PADDING * 2)
      const scale = Math.min(maxW / imageWidth, maxH / imageHeight)
      setDisplaySize({
        width: Math.max(1, Math.floor(imageWidth * scale)),
        height: Math.max(1, Math.floor(imageHeight * scale)),
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [imageWidth, imageHeight])

  useEffect(() => () => destroyLoupe(), [destroyLoupe])

  const displayToImage = useCallback(
    (displayX: number, displayY: number) => {
      if (displaySize.width === 0 || displaySize.height === 0) {
        return { x: 0, y: 0 }
      }
      return {
        x: (displayX / displaySize.width) * imageWidth,
        y: (displayY / displaySize.height) * imageHeight,
      }
    },
    [displaySize, imageWidth, imageHeight],
  )

  const imageToDisplay = useCallback(
    (imageX: number, imageY: number) => {
      if (displaySize.width === 0 || displaySize.height === 0) {
        return { x: 0, y: 0 }
      }
      return {
        x: (imageX / imageWidth) * displaySize.width,
        y: (imageY / imageHeight) * displaySize.height,
      }
    },
    [displaySize, imageWidth, imageHeight],
  )

  const updateEntryColor = useCallback(
    (id: string, x: number, y: number) => {
      const ctx = sampleCtxRef.current
      if (!ctx) return
      const hex = sampleColorAt(ctx, x, y, imageWidth, imageHeight)
      onPaletteChange(
        palette.map((entry) =>
          entry.id === id ? { ...entry, hex, x, y } : entry,
        ),
      )
    },
    [palette, onPaletteChange, imageWidth, imageHeight],
  )

  const handlePointerDown = (
    e: React.PointerEvent,
    entry: SnapshotPaletteEntry,
  ) => {
    e.stopPropagation()
    e.preventDefault()
    draggingIdRef.current = entry.id
    onSelectEntry(entry.id)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const id = draggingIdRef.current
    if (!id || !imgRef.current || !sampleCanvasRef.current || !sampleCtxRef.current)
      return

    const rect = imgRef.current.getBoundingClientRect()
    const displayX = e.clientX - rect.left
    const displayY = e.clientY - rect.top
    const { x, y } = displayToImage(displayX, displayY)

    drawLoupe(
      sampleCanvasRef.current,
      sampleCtxRef.current,
      x,
      y,
      imageWidth,
      imageHeight,
      e.clientX,
      e.clientY,
    )
    updateEntryColor(id, x, y)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingIdRef.current) {
      draggingIdRef.current = null
      hideLoupe()
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    }
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-loupe-point]")) return
    if (palette.length >= MAX_PALETTE_COLORS) return

    const ctx = sampleCtxRef.current
    const img = imgRef.current
    if (!ctx || !img) return

    const rect = img.getBoundingClientRect()
    const displayX = e.clientX - rect.left
    const displayY = e.clientY - rect.top
    const { x, y } = displayToImage(displayX, displayY)
    const hex = sampleColorAt(ctx, x, y, imageWidth, imageHeight)
    const entry = createPaletteEntry(hex, x, y)
    onPaletteChange([...palette, entry])
    onSelectEntry(entry.id)
  }

  return (
    <div
      ref={containerRef}
      className="snapshot-canvas-area flex-1 min-w-0 h-full flex items-center justify-center overflow-hidden bg-[#ececec] box-border"
      style={{ padding: CANVAS_PADDING }}
    >
      <div
        className="relative bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)] shrink-0 overflow-hidden"
        style={{
          width: displaySize.width > 0 ? displaySize.width : 1,
          height: displaySize.height > 0 ? displaySize.height : 1,
          visibility: displaySize.width > 0 && imageReady ? "visible" : "hidden",
        }}
      >
        <img
          ref={imgRef}
          src={dataUrl}
          onClick={handleCanvasClick}
          draggable={false}
          className="block cursor-crosshair select-none"
          style={{
            width: displaySize.width > 0 ? displaySize.width : undefined,
            height: displaySize.height > 0 ? displaySize.height : undefined,
          }}
        />

        {imageReady &&
          palette.map((entry) => {
            const pos = imageToDisplay(entry.x, entry.y)
            const isSelected = selectedId === entry.id
            return (
              <div
                key={entry.id}
                data-loupe-point
                onPointerDown={(e) => handlePointerDown(e, entry)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="absolute touch-none"
                style={{
                  left: pos.x,
                  top: pos.y,
                  transform: "translate(-50%, -50%)",
                  cursor: "grab",
                  zIndex: isSelected ? 20 : 10,
                }}
              >
                <div
                  className="rounded-full border-2 shadow-md transition-transform hover:scale-110"
                  style={{
                    width: isSelected ? SELECTED_POINT_SIZE : POINT_SIZE,
                    height: isSelected ? SELECTED_POINT_SIZE : POINT_SIZE,
                    backgroundColor: entry.hex,
                    borderColor: isSelected ? "#fff" : "rgba(255,255,255,0.9)",
                    boxShadow: isSelected
                      ? "0 0 0 2px #2680EB, 0 2px 6px rgba(0,0,0,0.35)"
                      : "0 0 0 1px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.25)",
                  }}
                />
              </div>
            )
          })}
      </div>
    </div>
  )
}

export default SnapshotCanvas
