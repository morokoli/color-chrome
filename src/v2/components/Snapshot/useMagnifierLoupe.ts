import { useCallback, useRef } from "react"
import { rgbToHex } from "./types"

const LOUPE_SIZE = 148
const SAMPLE_PIXELS = 11
const HALF_SAMPLE = Math.floor(SAMPLE_PIXELS / 2)

export function useMagnifierLoupe() {
  const loupeRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const ensureLoupe = useCallback(() => {
    if (loupeRef.current) return loupeRef.current

    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const loupe = document.createElement("div")
    loupe.style.cssText = `
      position: fixed;
      width: ${LOUPE_SIZE}px;
      height: ${LOUPE_SIZE}px;
      border-radius: 50%;
      border: 3px solid #000;
      box-shadow: 0 4px 24px rgba(0,0,0,0.4);
      pointer-events: none;
      overflow: hidden;
      z-index: 2147483647;
      background: #fff;
      display: none;
    `

    const canvas = document.createElement("canvas")
    canvas.width = LOUPE_SIZE * dpr
    canvas.height = LOUPE_SIZE * dpr
    canvas.style.cssText = `
      width: ${LOUPE_SIZE}px;
      height: ${LOUPE_SIZE}px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      display: block;
    `

    const crosshairH = document.createElement("div")
    crosshairH.style.cssText = `
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: rgba(255,255,255,0.9);
      box-shadow: 0 0 0 0.5px rgba(0,0,0,0.6);
      pointer-events: none;
      transform: translateY(-50%);
    `

    const crosshairV = document.createElement("div")
    crosshairV.style.cssText = `
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 1px;
      background: rgba(255,255,255,0.9);
      box-shadow: 0 0 0 0.5px rgba(0,0,0,0.6);
      pointer-events: none;
      transform: translateX(-50%);
    `

    const centerDot = document.createElement("div")
    centerDot.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 5px;
      height: 5px;
      border: 1.5px solid #fff;
      box-shadow: 0 0 0 0.5px rgba(0,0,0,0.7);
      pointer-events: none;
      transform: translate(-50%, -50%);
      box-sizing: border-box;
    `

    const hexLabel = document.createElement("div")
    hexLabel.id = "cwu-loupe-hex"
    hexLabel.style.cssText = `
      position: absolute;
      bottom: -34px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.9);
      color: #fff;
      padding: 5px 10px;
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    `

    loupe.appendChild(canvas)
    loupe.appendChild(crosshairH)
    loupe.appendChild(crosshairV)
    loupe.appendChild(centerDot)
    loupe.appendChild(hexLabel)
    document.body.appendChild(loupe)

    loupeRef.current = loupe
    canvasRef.current = canvas
    return loupe
  }, [])

  const drawLoupe = useCallback(
    (
      sourceCanvas: HTMLCanvasElement,
      sourceCtx: CanvasRenderingContext2D,
      imageX: number,
      imageY: number,
      imageWidth: number,
      imageHeight: number,
      screenX: number,
      screenY: number,
    ) => {
      const loupe = ensureLoupe()
      const canvas = canvasRef.current
      if (!canvas) return rgbToHex(0, 0, 0)

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) return rgbToHex(0, 0, 0)

      loupe.style.display = "block"

      let magX = screenX + 18
      let magY = screenY + 18
      if (magX + LOUPE_SIZE + 12 > window.innerWidth) {
        magX = screenX - LOUPE_SIZE - 18
      }
      if (magY + LOUPE_SIZE + 44 > window.innerHeight) {
        magY = screenY - LOUPE_SIZE - 44
      }
      loupe.style.left = `${magX}px`
      loupe.style.top = `${magY}px`

      const cx = Math.max(0, Math.min(imageWidth - 1, Math.floor(imageX)))
      const cy = Math.max(0, Math.min(imageHeight - 1, Math.floor(imageY)))

      const sx = Math.max(0, cx - HALF_SAMPLE)
      const sy = Math.max(0, cy - HALF_SAMPLE)
      const sw = Math.min(SAMPLE_PIXELS, imageWidth - sx)
      const sh = Math.min(SAMPLE_PIXELS, imageHeight - sy)

      canvas.width = LOUPE_SIZE * dpr
      canvas.height = LOUPE_SIZE * dpr

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE)
      ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, LOUPE_SIZE, LOUPE_SIZE)

      // Crisp pixel grid overlay
      const cellW = LOUPE_SIZE / sw
      const cellH = LOUPE_SIZE / sh
      ctx.strokeStyle = "rgba(0,0,0,0.12)"
      ctx.lineWidth = 1
      for (let i = 1; i < sw; i++) {
        const x = Math.round(i * cellW) + 0.5
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, LOUPE_SIZE)
        ctx.stroke()
      }
      for (let j = 1; j < sh; j++) {
        const y = Math.round(j * cellH) + 0.5
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(LOUPE_SIZE, y)
        ctx.stroke()
      }

      const center = sourceCtx.getImageData(cx, cy, 1, 1).data
      const hex = rgbToHex(center[0], center[1], center[2])

      loupe.style.borderColor = hex
      const hexLabel = loupe.querySelector("#cwu-loupe-hex")
      if (hexLabel) hexLabel.textContent = hex

      return hex
    },
    [ensureLoupe],
  )

  const hideLoupe = useCallback(() => {
    if (loupeRef.current) {
      loupeRef.current.style.display = "none"
    }
  }, [])

  const destroyLoupe = useCallback(() => {
    loupeRef.current?.remove()
    loupeRef.current = null
    canvasRef.current = null
  }, [])

  return { drawLoupe, hideLoupe, destroyLoupe }
}
