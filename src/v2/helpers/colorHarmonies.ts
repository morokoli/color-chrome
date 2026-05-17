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
  HARMONY_TYPES.CUSTOM,
  HARMONY_TYPES.ANALOGOUS,
  HARMONY_TYPES.MONOCHROMATIC,
  HARMONY_TYPES.TRIAD,
  HARMONY_TYPES.COMPLEMENTARY,
  HARMONY_TYPES.COMPOUND,
  HARMONY_TYPES.SHADES,
  HARMONY_TYPES.SPLIT_COMPLEMENTARY,
  HARMONY_TYPES.DOUBLE_SPLIT_COMPLEMENTARY,
  HARMONY_TYPES.SQUARE,
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

const positiveModulo = (value: number, modulo: number): number =>
  ((value % modulo) + modulo) % modulo

const getCenteredRelativeIndex = (
  index: number,
  baseIndex: number,
  count: number,
): number => {
  const forward = positiveModulo(index - baseIndex, count)
  return forward > Math.floor(count / 2) ? forward - count : forward
}

const getHarmonyOffset = (
  type: string,
  index: number,
  baseIndex: number,
  count: number,
): number => {
  const relative = index - baseIndex
  const centeredRelative = getCenteredRelativeIndex(index, baseIndex, count)

  switch (type) {
    case HARMONY_TYPES.ANALOGOUS:
      return Math.max(-30, Math.min(30, centeredRelative * 15))
    case HARMONY_TYPES.COMPLEMENTARY:
      return positiveModulo(relative, 2) === 0 ? 0 : 180
    case HARMONY_TYPES.SPLIT_COMPLEMENTARY:
      return [0, 150, 210][positiveModulo(relative, 3)]!
    case HARMONY_TYPES.TRIAD:
      return [0, 120, 240][positiveModulo(relative, 3)]!
    case HARMONY_TYPES.SQUARE:
      return [0, 90, 180, 270][positiveModulo(relative, 4)]!
    case HARMONY_TYPES.COMPOUND:
      return [0, 30, 180, 210][positiveModulo(relative, 4)]!
    case HARMONY_TYPES.DOUBLE_SPLIT_COMPLEMENTARY:
      return [0, 30, 150, 210, -30][positiveModulo(relative, 5)]!
    default:
      return 0
  }
}

const getOffsetCycle = (
  type: string,
  index: number,
  baseIndex: number,
): number => {
  const relative = Math.abs(index - baseIndex)
  const period: Record<string, number> = {
    [HARMONY_TYPES.COMPLEMENTARY]: 2,
    [HARMONY_TYPES.SPLIT_COMPLEMENTARY]: 3,
    [HARMONY_TYPES.TRIAD]: 3,
    [HARMONY_TYPES.SQUARE]: 4,
    [HARMONY_TYPES.COMPOUND]: 4,
    [HARMONY_TYPES.DOUBLE_SPLIT_COMPLEMENTARY]: 5,
  }

  return period[type] ? Math.floor(relative / period[type]) : 0
}

const getCycledLightness = (baseLight: number, cycle: number): number => {
  if (cycle <= 0) return baseLight
  const direction = cycle % 2 === 1 ? 1 : -1
  return Math.max(0.08, Math.min(0.92, baseLight + direction * 0.12))
}

const interpolateHueTable = (
  value: number,
  table: number[][],
  fromIndex: number,
  toIndex: number,
): number => {
  const hue = normalizeHue(value)
  for (let i = 0; i < table.length - 1; i += 1) {
    const a = table[i]!
    const b = table[i + 1]!
    if (hue >= a[fromIndex]! && hue <= b[fromIndex]!) {
      const span = b[fromIndex]! - a[fromIndex]! || 1
      const t = (hue - a[fromIndex]!) / span
      return a[toIndex]! + (b[toIndex]! - a[toIndex]!) * t
    }
  }
  return hue
}

// Adobe Color harmonies use an artist/RYB-style wheel, while exported hex
// values expose ordinary RGB/HSL hue. This table approximates that wheel.
const ADOBE_RYB_HUE_TABLE = [
  [0, 0],
  [60, 26],
  [120, 60],
  [180, 119.5],
  [240, 220],
  [300, 250.5],
  [360, 360],
]

const rgbHueToAdobeRybHue = (rgbHue: number): number =>
  interpolateHueTable(rgbHue, ADOBE_RYB_HUE_TABLE, 1, 0)

const adobeRybHueToRgbHue = (rybHue: number): number =>
  interpolateHueTable(rybHue, ADOBE_RYB_HUE_TABLE, 0, 1)

const rotateAdobeRybHue = (rgbHue: number, rybOffset: number): number =>
  adobeRybHueToRgbHue(rgbHueToAdobeRybHue(rgbHue) + rybOffset)

const getTriadRole = (
  index: number,
  baseIndex: number,
  count: number,
): number => {
  const roleOrder = [0, 240, 120, 0, 240]
  return roleOrder[positiveModulo(index - baseIndex, count) % roleOrder.length]!
}

const getAdobeTriadHex = (
  baseHue: number,
  baseSat: number,
  baseLight: number,
  index: number,
  baseIndex: number,
  count: number,
): string => {
  const relative = positiveModulo(index - baseIndex, count)
  const role = relative % 5
  const hue =
    role === 3
      ? baseHue - 0.5
      : rotateAdobeRybHue(baseHue, getTriadRole(index, baseIndex, count))
  const saturation =
    role === 3
      ? Math.max(0, baseSat * 0.5)
      : role === 4
        ? Math.max(0, baseSat / 3)
        : baseSat
  const lightness =
    role === 3
      ? Math.max(0.08, baseLight - 0.065)
      : role === 4
        ? Math.max(0.08, baseLight - 0.141)
        : baseLight

  return hexAtHsl(hue, saturation, lightness)
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
        const lightness = Math.max(
          0.1,
          Math.min(0.9, baseLight + lightnessVariation),
        )
        colors.push(hexAtHsl(hue, baseSat, lightness))
      }
      return colors
    }

    case HARMONY_TYPES.SPLIT_COMPLEMENTARY: {
      const offsetsClassic = [0, 150, 210]
      if (colorCount === 1) return [baseColorHex]
      if (colorCount === 2) {
        return [baseColorHex, hexAtHsl(baseHue + 150, baseSat, baseLight)]
      }
      if (colorCount === 3) {
        return offsetsClassic.map((o) => hexAtHsl(baseHue + o, baseSat, baseLight))
      }

      const warmHueHigh = normalizeHue(baseHue + 186)
      const warmHueLow = normalizeHue(baseHue + 171)
      const darkSat = Math.min(Math.max(baseSat * 0.149, 0.06), 0.22)
      const darkLight = Math.min(Math.max(baseLight * 0.558, 0.32), 0.48)
      const warmHexHigh = hexAtHsl(warmHueHigh, baseSat, baseLight)
      const warmHexLow = hexAtHsl(warmHueLow, baseSat, baseLight)
      const darkBaseHex = hexAtHsl(baseHue, darkSat, darkLight)
      const mixedWarm = tinycolor.mix(warmHexHigh, warmHexLow, 50)
      const mwHsl = mixedWarm.toHsl()
      const darkWarmHue =
        typeof mwHsl.h === "number" && !Number.isNaN(mwHsl.h)
          ? mwHsl.h
          : normalizeHue((warmHueHigh + warmHueLow) / 2)
      const darkWarmHex = hexAtHsl(darkWarmHue, darkSat, darkLight)

      if (colorCount === 4) {
        return [warmHexHigh, warmHexLow, baseColorHex, darkBaseHex]
      }
      if (colorCount === 5) {
        return [warmHexHigh, warmHexLow, baseColorHex, darkBaseHex, darkWarmHex]
      }

      const coreFive = [
        warmHexHigh,
        warmHexLow,
        baseColorHex,
        darkBaseHex,
        darkWarmHex,
      ]
      return extendByHueCycle(
        coreFive,
        colorCount,
        baseHue,
        baseSat,
        baseLight,
        [186, 171, 0],
      )
    }

    case HARMONY_TYPES.TRIAD: {
      return Array.from({ length: colorCount }, (_, i) =>
        i === 0
          ? baseColor.toHexString()
          : getAdobeTriadHex(baseHue, baseSat, baseLight, i, 0, colorCount),
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
      return extendByHueCycle(
        core,
        colorCount,
        baseHue,
        baseSat,
        baseLight,
        offsetsFour,
      )
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
      return extendByHueCycle(
        core,
        colorCount,
        baseHue,
        baseSat,
        baseLight,
        offsetsFive,
      )
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
        const saturation = Math.max(
          0.3,
          Math.min(1, baseSat * saturationFactor),
        )
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

  const baseHsl = tinycolor(baseColor.hex).toHsl()
  const baseHue = safeHue(baseHsl)
  const baseSat = baseHsl.s
  const baseLight = baseHsl.l
  const lastIndex = Math.max(1, colors.length - 1)

  return colors.map((color, index) => {
    if (index === baseColorIndex) {
      const tc = tinycolor(baseColor.hex)
      return {
        ...color,
        hex: tc.toHexString(),
        rgb: tc.toRgb(),
        hsl: tc.toHsl(),
      }
    }

    let newHex: string

    if (type === HARMONY_TYPES.SHADES) {
      const lightness = 0.12 + (index / lastIndex) * 0.76
      newHex = hexAtHsl(baseHue, baseSat, lightness)
    } else if (type === HARMONY_TYPES.MONOCHROMATIC) {
      const lightness = 0.15 + (index / lastIndex) * 0.7
      const saturationFactor = 1 - Math.abs(index / lastIndex - 0.5) * 0.3
      const saturation = Math.max(0.3, Math.min(1, baseSat * saturationFactor))
      newHex = hexAtHsl(baseHue, saturation, lightness)
    } else if (type === HARMONY_TYPES.TRIAD) {
      newHex = getAdobeTriadHex(
        baseHue,
        baseSat,
        baseLight,
        index,
        baseColorIndex,
        colors.length,
      )
    } else {
      const offset = getHarmonyOffset(type, index, baseColorIndex, colors.length)
      const cycle = getOffsetCycle(type, index, baseColorIndex)
      newHex = hexAtHsl(
        baseHue + offset,
        baseSat,
        getCycledLightness(baseLight, cycle),
      )
    }

    const tc = tinycolor(newHex)

    return {
      ...color,
      hex: newHex,
      rgb: tc.toRgb(),
      hsl: tc.toHsl(),
    }
  })
}

export const getDefaultColorCount = (harmonyType: string): number => {
  const type = resolveHarmonyType(harmonyType)
  switch (type) {
    case HARMONY_TYPES.COMPLEMENTARY:
      return 2
    case HARMONY_TYPES.SPLIT_COMPLEMENTARY:
    case HARMONY_TYPES.TRIAD:
      return 3
    case HARMONY_TYPES.SQUARE:
    case HARMONY_TYPES.COMPOUND:
      return 4
    case HARMONY_TYPES.DOUBLE_SPLIT_COMPLEMENTARY:
      return 5
    case HARMONY_TYPES.SHADES:
    case HARMONY_TYPES.MONOCHROMATIC:
    case HARMONY_TYPES.ANALOGOUS:
      return 5
    default:
      return 1
  }
}
