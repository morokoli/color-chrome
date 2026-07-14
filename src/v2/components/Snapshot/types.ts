export type SnapshotImageData = {
  dataUrl: string
  width: number
  height: number
  sourceUrl: string
  createdAt: number
}

export type SnapshotPaletteEntry = {
  id: string
  hex: string
  /** Optional name (slash naming) */
  slash_naming?: string
  /** Optional metadata, aligned with Generator color info fields */
  url?: string
  comments?: string
  ranking?: number
  tags?: string[]
  designTokens?: string[]
  additionalColumns?: Array<{ name: string; value: string }>
  /** Position in image pixel coordinates */
  x: number
  y: number
}

export const MAX_PALETTE_COLORS = 10

export function createPaletteEntry(
  hex: string,
  x: number,
  y: number,
): SnapshotPaletteEntry {
  return {
    id: crypto.randomUUID(),
    hex: hex.toUpperCase(),
    slash_naming: "",
    url: "",
    comments: "",
    ranking: 0,
    tags: [],
    designTokens: [],
    additionalColumns: [],
    x,
    y,
  }
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`
}

export function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "")
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

export function colorDistance(
  r: number,
  g: number,
  b: number,
  target: { r: number; g: number; b: number },
): number {
  return Math.sqrt(
    (r - target.r) ** 2 + (g - target.g) ** 2 + (b - target.b) ** 2,
  )
}

/** Find a representative point on the canvas for a given hex color */
export function findBestPointForColor(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  hex: string,
): { x: number; y: number } {
  const target = parseHex(hex)
  let bestX = Math.floor(width / 2)
  let bestY = Math.floor(height / 2)
  let bestDist = Infinity

  const step = Math.max(1, Math.floor(Math.min(width, height) / 40))

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const pixel = ctx.getImageData(x, y, 1, 1).data
      const dist = colorDistance(pixel[0], pixel[1], pixel[2], target)
      if (dist < bestDist) {
        bestDist = dist
        bestX = x
        bestY = y
      }
    }
  }

  return { x: bestX, y: bestY }
}

export function sampleColorAt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  imageWidth: number,
  imageHeight: number,
): string {
  const px = Math.max(0, Math.min(imageWidth - 1, Math.floor(x)))
  const py = Math.max(0, Math.min(imageHeight - 1, Math.floor(y)))
  const pixel = ctx.getImageData(px, py, 1, 1).data
  return rgbToHex(pixel[0], pixel[1], pixel[2])
}
