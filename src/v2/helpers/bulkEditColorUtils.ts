import type { SelectedColor } from "@/v2/api/folders.api"

/** Normalize hex for equality checks (#abc, ABC, #aabbcc → aabbcc). */
export function normalizeHexForCompare(hex: unknown): string {
  if (hex == null || hex === "") return ""
  let h = String(hex).trim().toLowerCase().replace(/^#/, "")
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("")
  }
  return h.length === 6 ? h : ""
}

/** True when all solid colors in the list share the same normalized hex. */
export function selectedColorsShareSameHex(items: SelectedColor[]): boolean {
  if (!Array.isArray(items) || items.length === 0) return false
  const hexes = items
    .filter((item) => {
      const type = item?.color?.type || "solid"
      return !(type === "gradient" && item?.color?.gradient_data)
    })
    .map((item) => normalizeHexForCompare(item?.color?.hex))
    .filter(Boolean)
  if (hexes.length === 0) return false
  return hexes.every((hex) => hex === hexes[0])
}
