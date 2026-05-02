import tinycolor from "tinycolor2"

/** Same rule ids as colorappfrontend/src/helpers/colorHarmonies.js */
export const HARMONY_TYPES = {
  CUSTOM: "custom",
  ANALOGOUS: "analogous",
  MONOCHROMATIC: "monochromatic",
  TRIAD: "triad",
  COMPLEMENTARY: "complementary",
  COMPOUND: "compound",
  SHADES: "shades",
  SPLIT_COMPLEMENTARY: "split-complementary",
  DOUBLE_SPLIT_COMPLEMENTARY: "double-split-complementary",
  SQUARE: "square",
} as const

export type HarmonyTypeId = (typeof HARMONY_TYPES)[keyof typeof HARMONY_TYPES]

export const resolveHarmonyType = (harmonyType: string): string => {
  if (harmonyType === "triadic") return HARMONY_TYPES.TRIAD
  if (harmonyType === "tetradic") return HARMONY_TYPES.SQUARE
  return harmonyType
}

export const HARMONY_DROPDOWN_ORDER: HarmonyTypeId[] = [
  HARMONY_TYPES.ANALOGOUS,
  HARMONY_TYPES.MONOCHROMATIC,
  HARMONY_TYPES.TRIAD,
  HARMONY_TYPES.COMPLEMENTARY,
  HARMONY_TYPES.COMPOUND,
  HARMONY_TYPES.SHADES,
  HARMONY_TYPES.SPLIT_COMPLEMENTARY,
  HARMONY_TYPES.DOUBLE_SPLIT_COMPLEMENTARY,
  HARMONY_TYPES.SQUARE,
  HARMONY_TYPES.CUSTOM,
]

export const getHarmonyDisplayName = (type: string): string => {
  const resolved = resolveHarmonyType(type)
  const names: Record<string, string> = {
    [HARMONY_TYPES.CUSTOM]: "Custom",
    [HARMONY_TYPES.ANALOGOUS]: "Analogous",
    [HARMONY_TYPES.MONOCHROMATIC]: "Monochromatic",
    [HARMONY_TYPES.TRIAD]: "Triad",
    [HARMONY_TYPES.COMPLEMENTARY]: "Complementary",
    [HARMONY_TYPES.COMPOUND]: "Compound",
    [HARMONY_TYPES.SHADES]: "Shades",
    [HARMONY_TYPES.SPLIT_COMPLEMENTARY]: "Split Complementary",
    [HARMONY_TYPES.DOUBLE_SPLIT_COMPLEMENTARY]: "Double Split Complementary",
    [HARMONY_TYPES.SQUARE]: "Square",
  }
  return names[resolved] || "Custom"
}

const normalizeHue = (hue: number): number => {
  let normalized = hue % 360
  if (normalized < 0) normalized += 360
  return normalized
}

const safeHue = (hsl: { h?: number }): number =>
  typeof hsl.h === "number" && !Number.isNaN(hsl.h) ? hsl.h : 0

const hexAtHsl = (h: number, s: number, l: number): string =>
  tinycolor({ h: normalizeHue(h), s, l }).toHexString()

const extendByHueCycle = (
  coreHex: string[],
  colorCount: number,
  baseHue: number,
  baseSat: number,
  baseLight: number,
  hueOffsetsDeg: number[],
): string[] => {
  const colors = [...coreHex]
  const n = hueOffsetsDeg.length
  let i = colors.length
  while (i < colorCount) {
    const angleIndex = i % n
    const cycle = Math.floor(i / n)
    const lightnessShift = cycle * 0.12 - 0.06
    const lightness = Math.max(0.08, Math.min(0.92, baseLight + lightnessShift))
    const hue = normalizeHue(baseHue + hueOffsetsDeg[angleIndex])
    colors.push(hexAtHsl(hue, baseSat, lightness))
    i += 1
  }
  return colors.slice(0, colorCount)
}

export const generateHarmonyColors = (
  baseColorHex: string,
  harmonyType: string,
  count: number,
): string[] => {
  const type = resolveHarmonyType(harmonyType)
  const baseColor = tinycolor(baseColorHex)
  if (!baseColor.isValid()) {
    return Array(Math.max(1, count || 1)).fill(baseColorHex)
  }

  const hsl = baseColor.toHsl()
  const baseHue = safeHue(hsl)
  const baseSat = hsl.s
  const baseLight = hsl.l
  const colorCount = Math.max(1, count || 1)

  switch (type) {
    case HARMONY_TYPES.ANALOGOUS: {
      const halfSpan = 30
      if (colorCount === 1) return [baseColorHex]
      const step = (halfSpan * 2) / (colorCount - 1)
      return Array.from({ length: colorCount }, (_, i) => {
        const offset = -halfSpan + i * step
        return hexAtHsl(baseHue + offset, baseSat, baseLight)
      })
    }

    case HARMONY_TYPES.COMPLEMENTARY: {
      if (colorCount === 1) return [baseColorHex]
      if (colorCount === 2) {
        return [baseColorHex, hexAtHsl(baseHue + 180, baseSat, baseLight)]
      }
      const colors: string[] = []
      for (let i = 0; i < colorCount; i++) {
        const isComplement = i % 2 === 1
        const hue = isComplement ? baseHue + 180 : baseHue
        const lightnessVariation =
          colorCount > 2 ? (i / (colorCount - 1)) * 0.2 - 0.1 : 0
        const lightness = Math.max(0.1, Math.min(0.9, baseLight + lightnessVariation))
        colors.push(hexAtHsl(hue, baseSat, lightness))
      }
      return colors
    }

    case HARMONY_TYPES.SPLIT_COMPLEMENTARY: {
      const offsets = [0, 150, 210]
      if (colorCount === 1) return [baseColorHex]
      if (colorCount <= 3) {
        return Array.from({ length: colorCount }, (_, i) =>
          hexAtHsl(baseHue + offsets[i], baseSat, baseLight),
        )
      }
      return extendByHueCycle(
        Array.from({ length: 3 }, (_, i) =>
          hexAtHsl(baseHue + offsets[i], baseSat, baseLight),
        ),
        colorCount,
        baseHue,
        baseSat,
        baseLight,
        offsets,
      )
    }

    case HARMONY_TYPES.TRIAD: {
      const offsets = [0, 120, 240]
      if (colorCount === 1) return [baseColorHex]
      if (colorCount <= 3) {
        return Array.from({ length: colorCount }, (_, i) =>
          hexAtHsl(baseHue + offsets[i], baseSat, baseLight),
        )
      }
      return extendByHueCycle(
        Array.from({ length: 3 }, (_, i) =>
          hexAtHsl(baseHue + offsets[i], baseSat, baseLight),
        ),
        colorCount,
        baseHue,
        baseSat,
        baseLight,
        offsets,
      )
    }

    case HARMONY_TYPES.SQUARE: {
      const offsets = [0, 90, 180, 270]
      if (colorCount === 1) return [baseColorHex]
      if (colorCount <= 4) {
        return Array.from({ length: colorCount }, (_, i) =>
          hexAtHsl(baseHue + offsets[i], baseSat, baseLight),
        )
      }
      return extendByHueCycle(
        Array.from({ length: 4 }, (_, i) =>
          hexAtHsl(baseHue + offsets[i], baseSat, baseLight),
        ),
        colorCount,
        baseHue,
        baseSat,
        baseLight,
        offsets,
      )
    }

    case HARMONY_TYPES.COMPOUND: {
      const offsetsFour = [0, 30, 180, 210]
      if (colorCount === 1) return [baseColorHex]
      if (colorCount === 2) {
        return [baseColorHex, hexAtHsl(baseHue + 180, baseSat, baseLight)]
      }
      if (colorCount === 3) {
        return [
          baseColorHex,
          hexAtHsl(baseHue + 30, baseSat, baseLight),
          hexAtHsl(baseHue + 180, baseSat, baseLight),
        ]
      }
      const core = Array.from({ length: Math.min(4, colorCount) }, (_, i) =>
        hexAtHsl(baseHue + offsetsFour[i], baseSat, baseLight),
      )
      if (colorCount <= 4) return core
      return extendByHueCycle(core, colorCount, baseHue, baseSat, baseLight, offsetsFour)
    }

    case HARMONY_TYPES.DOUBLE_SPLIT_COMPLEMENTARY: {
      const offsetsFive = [-30, 0, 30, 150, 210]
      if (colorCount === 1) return [baseColorHex]
      if (colorCount === 2) {
        return [baseColorHex, hexAtHsl(baseHue + 180, baseSat, baseLight)]
      }
      if (colorCount === 3) {
        return [
          baseColorHex,
          hexAtHsl(baseHue + 150, baseSat, baseLight),
          hexAtHsl(baseHue + 210, baseSat, baseLight),
        ]
      }
      if (colorCount === 4) {
        return [
          baseColorHex,
          hexAtHsl(baseHue + 30, baseSat, baseLight),
          hexAtHsl(baseHue + 150, baseSat, baseLight),
          hexAtHsl(baseHue + 210, baseSat, baseLight),
        ]
      }
      const core = Array.from({ length: Math.min(5, colorCount) }, (_, i) =>
        hexAtHsl(baseHue + offsetsFive[i], baseSat, baseLight),
      )
      if (colorCount <= 5) return core
      return extendByHueCycle(core, colorCount, baseHue, baseSat, baseLight, offsetsFive)
    }

    case HARMONY_TYPES.SHADES: {
      if (colorCount === 1) return [baseColorHex]
      return Array.from({ length: colorCount }, (_, i) => {
        const l = 0.12 + (i / (colorCount - 1)) * 0.76
        return hexAtHsl(baseHue, baseSat, l)
      })
    }

    case HARMONY_TYPES.MONOCHROMATIC: {
      if (colorCount === 1) return [baseColorHex]
      return Array.from({ length: colorCount }, (_, i) => {
        const lightness = 0.15 + (i / (colorCount - 1)) * 0.7
        const saturationFactor = 1 - Math.abs(i / (colorCount - 1) - 0.5) * 0.3
        const saturation = Math.max(0.3, Math.min(1, baseSat * saturationFactor))
        return hexAtHsl(baseHue, saturation, lightness)
      })
    }

    case HARMONY_TYPES.CUSTOM:
    default:
      return Array(colorCount).fill(baseColorHex)
  }
}

export function applyHarmonyToPalette<T extends { hex?: string }>(
  colors: T[],
  harmonyType: string,
  baseColorIndex = 0,
): T[] {
  if (!colors || colors.length === 0) return colors
  const type = resolveHarmonyType(harmonyType)
  if (type === HARMONY_TYPES.CUSTOM) return colors

  const baseColor = colors[baseColorIndex]
  if (!baseColor || !baseColor.hex) return colors

  const harmonyHexColors = generateHarmonyColors(baseColor.hex, type, colors.length)

  return colors.map((color, index) => {
    const newHex = harmonyHexColors[index] || color.hex
    const tc = tinycolor(newHex)

    return {
      ...color,
      hex: newHex,
      rgb: tc.toRgb(),
      hsl: tc.toHsl(),
    }
  })
}
