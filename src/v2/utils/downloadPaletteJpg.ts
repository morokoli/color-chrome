import tinycolor from "tinycolor2"

const PADDING = 40
const GAP = 20
const CELL_WIDTH = 200
const SWATCH_HEIGHT = 160
const LABEL_HEIGHT = 64
const CELL_HEIGHT = SWATCH_HEIGHT + LABEL_HEIGHT

const getColorHex = (color: any) => {
  if (typeof color === "string") return color
  return color?.hex || "#000000"
}

const getGridShape = (count: number) => {
  const rows = count <= 5 ? 1 : 2
  const cols = Math.ceil(count / rows)
  return { rows, cols }
}

const sanitizeFilename = (name: string) =>
  String(name || "palette")
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "palette"

function renderPaletteCanvas(colors: any[]) {
  const items = (colors || []).map((color) => {
    const hex = getColorHex(color)
    const tc = tinycolor(hex)
    const rgb = tc.toRgb()
    return {
      hex: tc.toHexString().toUpperCase(),
      rgbText: `RGB ${rgb.r}, ${rgb.g}, ${rgb.b}`,
      fill: tc.toHexString(),
    }
  })

  const count = items.length
  const { rows, cols } = getGridShape(count)

  const width = PADDING * 2 + cols * CELL_WIDTH + (cols - 1) * GAP
  const height = PADDING * 2 + rows * CELL_HEIGHT + (rows - 1) * GAP

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas is not supported")

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, width, height)

  items.forEach((item, index) => {
    const row = Math.floor(index / cols)
    const col = index % cols
    const x = PADDING + col * (CELL_WIDTH + GAP)
    const y = PADDING + row * (CELL_HEIGHT + GAP)

    // Color swatch
    ctx.fillStyle = item.fill
    ctx.fillRect(x, y, CELL_WIDTH, SWATCH_HEIGHT)

    // Label area
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(x, y + SWATCH_HEIGHT, CELL_WIDTH, LABEL_HEIGHT)

    // Subtle divider between swatch and labels
    ctx.fillStyle = "rgba(0,0,0,0.06)"
    ctx.fillRect(x, y + SWATCH_HEIGHT, CELL_WIDTH, 1)

    const textX = x + 14
    const hexY = y + SWATCH_HEIGHT + 26
    const rgbY = y + SWATCH_HEIGHT + 48

    ctx.fillStyle = "#111111"
    ctx.font = "600 18px Helvetica Neue, Helvetica, Arial, sans-serif"
    ctx.textBaseline = "alphabetic"
    ctx.fillText(item.hex, textX, hexY)

    ctx.fillStyle = "#666666"
    ctx.font = "400 14px Helvetica Neue, Helvetica, Arial, sans-serif"
    ctx.fillText(item.rgbText, textX, rgbY)
  })

  return canvas
}

/** Trigger a JPG download of the palette grid. */
export function downloadPaletteJpg(colors: any[], paletteName = "palette") {
  if (!Array.isArray(colors) || colors.length === 0) {
    throw new Error("No colors to export")
  }

  const canvas = renderPaletteCanvas(colors)
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92)
  const link = document.createElement("a")
  link.href = dataUrl
  link.download = `${sanitizeFilename(paletteName)}.jpg`
  document.body.appendChild(link)
  link.click()
  link.remove()
}

