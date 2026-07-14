import tinycolor from "tinycolor2"

/**
 * Synced from colorappfrontend/src/helpers/colorHarmonies.js
 * Color harmony rule ids (kebab-case). Aligned with Adobe Color wheel presets.
 * @see https://color.adobe.com/create/color-wheel
 */
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

export const HARMONY_DRAG_MODES = {
  FREE: "free",
  ROTATE_HUE: "rotateHue",
  SATURATION_ONLY: "saturationOnly",
} as const

export type HarmonyDragMode =
  (typeof HARMONY_DRAG_MODES)[keyof typeof HARMONY_DRAG_MODES]

/** Legacy values from older builds — map to current ids. */
export const resolveHarmonyType = (harmonyType: string): string => {
  if (harmonyType === "triadic") return HARMONY_TYPES.TRIAD
  if (harmonyType === "tetradic") return HARMONY_TYPES.SQUARE
  return harmonyType
}

/**
 * Harmony picker order (Custom first for quick access; then presets roughly Adobe-like).
 */
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

export const getHarmonyDragMode = (harmonyType: string): HarmonyDragMode => {
  const type = resolveHarmonyType(harmonyType)
  if (type === HARMONY_TYPES.CUSTOM) return HARMONY_DRAG_MODES.FREE
  // Shades: drag changes one point's sat only. Mono uses rotateHue (linked ray).
  if (type === HARMONY_TYPES.SHADES) {
    return HARMONY_DRAG_MODES.SATURATION_ONLY
  }
  return HARMONY_DRAG_MODES.ROTATE_HUE
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

/**
 * Shades ladder (Adobe single-handle): shared H+S, even lightness dark → light.
 */
export const SHADE_L_MIN = 0.12
export const SHADE_L_MAX = 0.88
/** Minimum sat so the single wheel handle stays visible. */
export const SHADE_S_MIN = 0.35

/**
 * Monochromatic ray (Adobe equal-gap spoke).
 * Outer end is always on the wheel rim (sat = 1). Inner stays chromatic enough
 * that hue remains visible (~Adobe N=3 inner s≈0.20).
 */
export const MONO_S_MAX = 1
export const MONO_S_MIN = 0.18
export const MONO_L_MIN = 0.2

const positiveModulo = (value: number, modulo: number): number =>
  ((value % modulo) + modulo) % modulo

type PaletteColorLike = { hex?: string; [key: string]: unknown }

/**
 * After placing `coreHex` colors from hue offsets, add more by cycling offsets with lightness shifts.
 */
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
    const lightness = Math.max(
      0.08,
      Math.min(0.92, baseLight + lightnessShift),
    )
    const hue = normalizeHue(baseHue + hueOffsetsDeg[angleIndex]!)
    colors.push(hexAtHsl(hue, baseSat, lightness))
    i += 1
  }
  return colors.slice(0, colorCount)
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
  return roleOrder[
    positiveModulo(index - baseIndex, count) % roleOrder.length
  ]!
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

/** Classic triad: 3 spokes at 120°; extras stack cycling 1st→2nd→3rd. */
export const TRIAD_MAX_SPOKES = 3
export const TRIAD_HUE_OFFSETS = [0, 120, 240]

const triadSpokeOffsets = (spokeCount: number): number[] =>
  TRIAD_HUE_OFFSETS.slice(
    0,
    Math.max(1, Math.min(TRIAD_MAX_SPOKES, spokeCount || 1)),
  )

/**
 * Adobe Split Complementary “Y”: base + complement ±30° (tighter than Triad).
 * Extras stack cycling 1st→2nd→3rd, same order as Triad.
 */
export const SPLIT_COMPLEMENTARY_MAX_SPOKES = 3
export const SPLIT_COMPLEMENTARY_HUE_OFFSETS = [0, 150, 210]

const splitComplementarySpokeOffsets = (spokeCount: number): number[] =>
  SPLIT_COMPLEMENTARY_HUE_OFFSETS.slice(
    0,
    Math.max(1, Math.min(SPLIT_COMPLEMENTARY_MAX_SPOKES, spokeCount || 1)),
  )

/**
 * Adobe Compound “K”: stem 0°↔180°, both arms on the SAME side of that stem
 * (+30° from base and −30° from complement = 150°). Using 210° instead mirrors
 * the lower arm to the opposite side and reads as a thin X, not a K.
 * Extras stack inward on the 4 rim spokes (5th→1st, 6th→2nd, …) — never a
 * center-only joint swatch.
 */
export const COMPOUND_MAX_SPOKES = 4
export const COMPOUND_HUE_OFFSETS = [0, 30, 180, 150]

const compoundSpokeOffsets = (spokeCount: number): number[] =>
  COMPOUND_HUE_OFFSETS.slice(
    0,
    Math.max(1, Math.min(COMPOUND_MAX_SPOKES, spokeCount || 1)),
  )

/**
 * Double Split Complementary: Split’s Y plus base ±30° → five rim spokes.
 * Not an Adobe rule; textbook extension of Split Complementary.
 * Extras stack cycling 1st→2nd→…→5th (`index % 5`).
 */
export const DOUBLE_SPLIT_COMPLEMENTARY_MAX_SPOKES = 5
export const DOUBLE_SPLIT_COMPLEMENTARY_HUE_OFFSETS = [0, -30, 30, 150, 210]

const doubleSplitComplementarySpokeOffsets = (spokeCount: number): number[] =>
  DOUBLE_SPLIT_COMPLEMENTARY_HUE_OFFSETS.slice(
    0,
    Math.max(
      1,
      Math.min(DOUBLE_SPLIT_COMPLEMENTARY_MAX_SPOKES, spokeCount || 1),
    ),
  )

/**
 * Inward stack on a spoke (Compound K, Triad, Split / Double Split Complementary).
 * Wheel radius = HSL saturation, so step in HSL (not HSV) — ~0.09 sat ≈ 20px
 * on a ~220px wheel. Pastel poles stay near the rim instead of collapsing to
 * the center.
 */
const compoundSpokeShade = (
  poleHex: string,
  axisHue: number,
  depthIndex: number,
): string => {
  const depth = Math.max(1, depthIndex || 1)
  const hsl = tinycolor(poleHex).toHsl()
  const poleSat =
    typeof hsl.s === "number" && !Number.isNaN(hsl.s) ? hsl.s : 0.5
  const poleLight =
    typeof hsl.l === "number" && !Number.isNaN(hsl.l) ? hsl.l : 0.5
  const GAP = 0.27 // ~60px inward per stack (~20px base + 40px) on a ~220px wheel
  const sat = Math.max(0.28, poleSat - GAP * depth)
  const light = Math.max(0.12, Math.min(0.92, poleLight - 0.04 * depth))
  return hexAtHsl(axisHue, sat, light)
}

/**
 * Adobe complementary extras: same hue as the spoke pole, stepped inward as a
 * darker / quieter shade (HSV S+V), not a lightness-only or sat-only nudge.
 * Calibrated from Adobe Express (#0B78B3 → #254A5E).
 */
const adobeComplementaryAxisShade = (
  poleHex: string,
  axisHue: number,
  t: number,
): string => {
  const amount = Math.max(0.05, Math.min(1, t))
  const hsv = tinycolor(poleHex).toHsv()
  // Calibrated from Adobe Express complementary (#0B78B3 → #254A5E) at t=1.
  const s = Math.max(0.1, (hsv.s || 0) * (1 - 0.35 * amount))
  const v = Math.max(0.1, (hsv.v || 0) * (1 - 0.47 * amount))
  return tinycolor({
    h: normalizeHue(axisHue),
    s,
    v,
  }).toHexString()
}

/**
 * Rim poles for complementary: opposite ends of the diameter.
 * Keeps a strong selected base as-is; snaps muted/inward selections outward
 * so reapply lands on the axis ends.
 */
const complementaryRimPoles = (baseColorHex: string) => {
  const baseColor = tinycolor(baseColorHex)
  const hsv = baseColor.toHsv()
  const baseHue = safeHue(hsv)
  const sat = hsv.s || 0
  const val = hsv.v || 0
  const keepExact = sat >= 0.55 && val >= 0.25
  const rimS = keepExact ? sat : Math.max(sat, 0.9)
  const rimV = keepExact ? val : Math.max(Math.min(val || 0.7, 0.92), 0.5)
  const basePole = keepExact
    ? baseColor.toHexString()
    : tinycolor({ h: baseHue, s: rimS, v: rimV }).toHexString()
  const complementPole = tinycolor({
    h: normalizeHue(baseHue + 180),
    s: tinycolor(basePole).toHsv().s,
    v: tinycolor(basePole).toHsv().v,
  }).toHexString()
  return { baseHue, basePole, complementPole }
}

const hueDistance = (h1: number, h2: number): number => {
  const d = Math.abs(normalizeHue(h1) - normalizeHue(h2))
  return Math.min(d, 360 - d)
}

/** Global analogous: at most 5 hue spokes inside a ≤60° arc (±30° around base). */
export const ANALOGOUS_MAX_SPOKES = 5
export const ANALOGOUS_SPAN_DEG = 60

/**
 * Even offsets in [-30, +30], with base offset 0 first (strip slot 0).
 * Never exceeds ANALOGOUS_MAX_SPOKES distinct hues.
 */
const analogousSpokeOffsets = (spokeCount: number): number[] => {
  const n = Math.max(1, Math.min(ANALOGOUS_MAX_SPOKES, spokeCount || 1))
  if (n === 1) return [0]
  const half = ANALOGOUS_SPAN_DEG / 2
  const spaced = Array.from(
    { length: n },
    (_, i) => -half + (i / (n - 1)) * ANALOGOUS_SPAN_DEG,
  )
  let zeroIdx = 0
  let minAbs = Infinity
  spaced.forEach((offset, i) => {
    const abs = Math.abs(offset)
    if (abs < minAbs) {
      minAbs = abs
      zeroIdx = i
    }
  })
  spaced[zeroIdx] = 0
  return [...spaced.slice(zeroIdx), ...spaced.slice(0, zeroIdx)]
}

/** Inward shade on one analogous spoke — same hue, quieter HSV S/V. */
const adobeAnalogousSpokeShade = (
  poleHex: string,
  axisHue: number,
  t: number,
): string => {
  const amount = Math.max(0.05, Math.min(1, t))
  const hsv = tinycolor(poleHex).toHsv()
  const s = Math.max(0.1, (hsv.s || 0) * (1 - 0.35 * amount))
  const v = Math.max(0.1, (hsv.v || 0) * (1 - 0.47 * amount))
  return tinycolor({
    h: normalizeHue(axisHue),
    s,
    v,
  }).toHexString()
}

const getComplementaryAxis = (
  hex: string,
  baseHue: number,
): "complement" | "base" => {
  const h = safeHue(tinycolor(hex).toHsl())
  const compHue = normalizeHue(baseHue + 180)
  return hueDistance(h, compHue) < hueDistance(h, baseHue)
    ? "complement"
    : "base"
}

/**
 * Generate harmony hex values with the base color at role index 0.
 * Supports any count from 1 to MAX_PALETTE_COLORS (10).
 */
const generateHarmonyHexes = (
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
  const baseHex = baseColor.toHexString()
  const colorCount = Math.max(1, count || 1)

  switch (type) {
    case HARMONY_TYPES.ANALOGOUS: {
      // Global rule: adjacent hues in ≤60° arc; Adobe UX: max 5 spokes, extras stack.
      if (colorCount === 1) return [baseHex]

      const spokeCount = Math.min(colorCount, ANALOGOUS_MAX_SPOKES)
      const offsets = analogousSpokeOffsets(spokeCount)
      const hsv = baseColor.toHsv()
      const rimS = hsv.s
      const rimV = hsv.v

      const poleHexes = offsets.map((offset, i) => {
        if (i === 0) return baseHex
        return tinycolor({
          h: normalizeHue(baseHue + offset),
          s: rimS,
          v: rimV,
        }).toHexString()
      })

      const colors: string[] = []
      for (let i = 0; i < colorCount; i++) {
        if (i < spokeCount) {
          colors.push(poleHexes[i]!)
          continue
        }
        const spoke = i % spokeCount
        const depth = Math.floor(i / spokeCount)
        const shadeCount = Math.floor((colorCount - 1 - spoke) / spokeCount)
        const t = shadeCount <= 0 ? 1 : depth / shadeCount
        colors.push(
          adobeAnalogousSpokeShade(
            poleHexes[spoke]!,
            baseHue + offsets[spoke]!,
            t,
          ),
        )
      }
      return colors
    }

    case HARMONY_TYPES.COMPLEMENTARY: {
      if (colorCount === 1) return [baseHex]

      const { baseHue: rimHue, basePole, complementPole } =
        complementaryRimPoles(baseHex)

      // 2 colors → opposite ends of the axis (rim poles).
      if (colorCount === 2) {
        return [basePole, complementPole]
      }

      // N>2 → even slots on base spoke, odd on complement; poles at rim, shades inward.
      const baseCount = Math.ceil(colorCount / 2)
      const complementCount = Math.floor(colorCount / 2)
      const colors: string[] = []
      let baseSlot = 0
      let complementSlot = 0
      for (let i = 0; i < colorCount; i++) {
        const onComplement = i % 2 === 1
        if (onComplement) {
          if (complementSlot === 0) {
            colors.push(complementPole)
          } else {
            const t =
              complementCount <= 1 ? 1 : complementSlot / (complementCount - 1)
            colors.push(
              adobeComplementaryAxisShade(complementPole, rimHue + 180, t),
            )
          }
          complementSlot += 1
        } else if (baseSlot === 0) {
          colors.push(basePole)
          baseSlot += 1
        } else {
          const t = baseCount <= 1 ? 1 : baseSlot / (baseCount - 1)
          colors.push(adobeComplementaryAxisShade(basePole, rimHue, t))
          baseSlot += 1
        }
      }
      return colors
    }

    case HARMONY_TYPES.SPLIT_COMPLEMENTARY: {
      // Adobe Y: base + complement ±30°; extras stack on spokes 0→1→2→0…
      if (colorCount === 1) return [baseHex]

      const spokeCount = Math.min(colorCount, SPLIT_COMPLEMENTARY_MAX_SPOKES)
      const offsets = splitComplementarySpokeOffsets(spokeCount)
      const hsv = baseColor.toHsv()
      const rimS = hsv.s
      const rimV = hsv.v

      const poleHexes = offsets.map((offset, i) => {
        if (i === 0) return baseHex
        return tinycolor({
          h: normalizeHue(baseHue + offset),
          s: rimS,
          v: rimV,
        }).toHexString()
      })

      const colors: string[] = []
      for (let i = 0; i < colorCount; i++) {
        if (i < spokeCount) {
          colors.push(poleHexes[i]!)
          continue
        }
        const spoke = i % spokeCount
        const depth = Math.floor(i / spokeCount)
        colors.push(
          compoundSpokeShade(
            poleHexes[spoke]!,
            baseHue + offsets[spoke]!,
            depth,
          ),
        )
      }
      return colors
    }
    case HARMONY_TYPES.TRIAD: {
      // Equilateral triangle on the wheel; extras stack near poles (not center).
      if (colorCount === 1) return [baseHex]

      const spokeCount = Math.min(colorCount, TRIAD_MAX_SPOKES)
      const offsets = triadSpokeOffsets(spokeCount)
      const hsv = baseColor.toHsv()
      const rimS = hsv.s
      const rimV = hsv.v

      const poleHexes = offsets.map((offset, i) => {
        if (i === 0) return baseHex
        return tinycolor({
          h: normalizeHue(baseHue + offset),
          s: rimS,
          v: rimV,
        }).toHexString()
      })

      const colors: string[] = []
      for (let i = 0; i < colorCount; i++) {
        if (i < spokeCount) {
          colors.push(poleHexes[i]!)
          continue
        }
        const spoke = i % spokeCount
        const depth = Math.floor(i / spokeCount)
        colors.push(
          compoundSpokeShade(
            poleHexes[spoke]!,
            baseHue + offsets[spoke]!,
            depth,
          ),
        )
      }
      return colors
    }

    case HARMONY_TYPES.SQUARE: {
      const offsets = [0, 90, 180, 270]
      if (colorCount === 1) return [baseHex]
      if (colorCount <= 4) {
        return Array.from({ length: colorCount }, (__, i) =>
          offsets[i] === 0
            ? baseHex
            : hexAtHsl(baseHue + offsets[i]!, baseSat, baseLight),
        )
      }
      return extendByHueCycle(
        Array.from({ length: 4 }, (__, i) =>
          offsets[i] === 0
            ? baseHex
            : hexAtHsl(baseHue + offsets[i]!, baseSat, baseLight),
        ),
        colorCount,
        baseHue,
        baseSat,
        baseLight,
        offsets,
      )
    }

    case HARMONY_TYPES.COMPOUND: {
      // Adobe K rim at 0/30/180/150; extras stack inward on spokes (not center).
      if (colorCount === 1) return [baseHex]

      const spokeCount = Math.min(colorCount, COMPOUND_MAX_SPOKES)
      const offsets = compoundSpokeOffsets(spokeCount)
      const hsv = baseColor.toHsv()
      const rimS = hsv.s
      const rimV = hsv.v

      const poleHexes = offsets.map((offset, i) => {
        if (i === 0) return baseHex
        return tinycolor({
          h: normalizeHue(baseHue + offset),
          s: rimS,
          v: rimV,
        }).toHexString()
      })

      const colors: string[] = []
      for (let i = 0; i < colorCount; i++) {
        if (i < spokeCount) {
          colors.push(poleHexes[i]!)
          continue
        }
        const spoke = i % spokeCount
        const depth = Math.floor(i / spokeCount)
        colors.push(
          compoundSpokeShade(
            poleHexes[spoke]!,
            baseHue + offsets[spoke]!,
            depth,
          ),
        )
      }
      return colors
    }

    case HARMONY_TYPES.DOUBLE_SPLIT_COMPLEMENTARY: {
      // Five rim poles; extras stack near poles (not center / light-cycle).
      if (colorCount === 1) return [baseHex]

      const spokeCount = Math.min(
        colorCount,
        DOUBLE_SPLIT_COMPLEMENTARY_MAX_SPOKES,
      )
      const offsets = doubleSplitComplementarySpokeOffsets(spokeCount)
      const hsv = baseColor.toHsv()
      const rimS = hsv.s
      const rimV = hsv.v

      const poleHexes = offsets.map((offset, i) => {
        if (i === 0) return baseHex
        return tinycolor({
          h: normalizeHue(baseHue + offset),
          s: rimS,
          v: rimV,
        }).toHexString()
      })

      const colors: string[] = []
      for (let i = 0; i < colorCount; i++) {
        if (i < spokeCount) {
          colors.push(poleHexes[i]!)
          continue
        }
        const spoke = i % spokeCount
        const depth = Math.floor(i / spokeCount)
        colors.push(
          compoundSpokeShade(
            poleHexes[spoke]!,
            baseHue + offsets[spoke]!,
            depth,
          ),
        )
      }
      return colors
    }

    case HARMONY_TYPES.SHADES: {
      // Adobe: shared H+S; even L ladder. Strip[0] is the wheel handle sample.
      if (colorCount === 1) return [baseHex]

      const sat = Math.max(SHADE_S_MIN, Math.min(1, baseSat || 0.7))
      return Array.from({ length: colorCount }, (_, i) => {
        const t = i / (colorCount - 1)
        const lightness = SHADE_L_MIN + (SHADE_L_MAX - SHADE_L_MIN) * t
        return hexAtHsl(baseHue, sat, lightness)
      })
    }

    case HARMONY_TYPES.MONOCHROMATIC: {
      // Adobe equal-gap ray: hue locked; sat evenly spaced rim (s=1) → near-center.
      // Strip[0] is always on the wheel edge — never keep an inward base hex.
      if (colorCount === 1) {
        return [
          hexAtHsl(
            baseHue,
            MONO_S_MAX,
            Math.max(0.2, Math.min(0.55, baseLight || 0.4)),
          ),
        ]
      }

      const sMax = MONO_S_MAX
      const sMin = Math.min(MONO_S_MIN, sMax * 0.35)
      // Keep a readable mid lightness at the rim; darken evenly toward center.
      const lMax = Math.max(0.28, Math.min(0.55, baseLight || 0.4))
      const lMin = Math.min(
        Math.max(MONO_L_MIN, lMax * 0.45),
        Math.max(0.12, lMax - 0.08),
      )

      return Array.from({ length: colorCount }, (_, i) => {
        const t = i / (colorCount - 1)
        const saturation = sMax + (sMin - sMax) * t
        const lightness = lMax + (lMin - lMax) * t
        return hexAtHsl(baseHue, saturation, lightness)
      })
    }
    case HARMONY_TYPES.CUSTOM:
    default:
      return Array(colorCount).fill(baseHex)
  }
}

/**
 * Build exactly `count` harmony hex values with the base anchored at `baseSlotIndex`.
 * Switching harmony never changes swatch count — only remaps colors in place.
 *
 * Complementary / Analogous use absolute strip roles (no baseSlotIndex rotation)
 * so spoke stacking (1st↔6th, etc.) stays stable. Selected swatch supplies hue via `baseHex`.
 */
export const buildHarmonyPalette = ({
  baseHex,
  harmonyType,
  count,
  baseSlotIndex = 0,
}: {
  baseHex: string
  harmonyType: string
  count: number
  baseSlotIndex?: number
}): string[] => {
  const colorCount = Math.max(1, count || 1)
  const type = resolveHarmonyType(harmonyType)
  if (type === HARMONY_TYPES.CUSTOM) {
    const normalized = tinycolor(baseHex).toHexString()
    return Array(colorCount).fill(normalized)
  }

  const canonical = generateHarmonyHexes(baseHex, type, colorCount)

  if (
    type === HARMONY_TYPES.COMPLEMENTARY ||
    type === HARMONY_TYPES.ANALOGOUS ||
    type === HARMONY_TYPES.TRIAD ||
    type === HARMONY_TYPES.SPLIT_COMPLEMENTARY ||
    type === HARMONY_TYPES.DOUBLE_SPLIT_COMPLEMENTARY ||
    type === HARMONY_TYPES.COMPOUND ||
    type === HARMONY_TYPES.MONOCHROMATIC ||
    type === HARMONY_TYPES.SHADES
  ) {
    return canonical
  }

  const normalizedBase = tinycolor(baseHex).toHexString()
  const base = ((baseSlotIndex % colorCount) + colorCount) % colorCount

  return Array.from({ length: colorCount }, (_, slotIndex) => {
    const role = (slotIndex - base + colorCount) % colorCount
    return role === 0 ? normalizedBase : canonical[role]!
  })
}

/**
 * @deprecated Use buildHarmonyPalette — kept for manual-check script compatibility.
 */
export const generateHarmonyColors = (
  baseColorHex: string,
  harmonyType: string,
  count: number,
): string[] =>
  buildHarmonyPalette({
    baseHex: baseColorHex,
    harmonyType,
    count,
    baseSlotIndex: 0,
  })

const colorObjectFromHex = <T extends PaletteColorLike>(
  color: T,
  hex: string,
): T => {
  const tc = tinycolor(hex)
  return {
    ...color,
    hex: tc.toHexString(),
    rgb: tc.toRgb(),
    hsl: tc.toHsl(),
  }
}

/**
 * Adobe complementary +: always append at the end of the palette and alternate
 * spokes by strip index — 3rd near 1st (index 0), 4th near 2nd (index 1), etc.
 * Selection does not change which spoke receives the next color.
 *
 * `colors` must already include the new placeholder as the last item.
 */
export const finalizeComplementaryAppend = <T extends PaletteColorLike>(
  colors: T[],
  _baseIndex = 0,
): T[] => {
  if (!colors || colors.length < 2) return colors

  const insertIndex = colors.length - 1
  const existing = colors.slice(0, insertIndex)
  if (existing.length === 0) return colors

  // First swatch defines the base spoke; opposite hue is the complement spoke.
  const baseHex = existing[0]?.hex
  if (!baseHex) return colors

  const baseHue = safeHue(tinycolor(baseHex).toHsl())
  const compHue = normalizeHue(baseHue + 180)

  // Even strip index → base spoke (1st, 3rd, 5th…); odd → complement (2nd, 4th…).
  const targetAxis = insertIndex % 2 === 0 ? "base" : "complement"
  const axisHue = targetAxis === "complement" ? compHue : baseHue

  const depthScore = (hex: string) => {
    const hsv = tinycolor(hex).toHsv()
    return (hsv.s || 0) * (hsv.v || 0)
  }

  const existingAxisIndices = existing
    .map((_, index) => index)
    .filter(
      (index) =>
        getComplementaryAxis(existing[index]!.hex!, baseHue) === targetAxis,
    )

  let poleIndex = existingAxisIndices[0] ?? (targetAxis === "base" ? 0 : 1)
  let poleScore = -1
  existingAxisIndices.forEach((index) => {
    const score = depthScore(existing[index]!.hex!)
    if (score > poleScore) {
      poleScore = score
      poleIndex = index
    }
  })

  const poleHex =
    existingAxisIndices.length > 0
      ? existing[poleIndex]!.hex!
      : targetAxis === "base"
        ? baseHex
        : hexAtHsl(
            compHue,
            tinycolor(baseHex).toHsl().s,
            tinycolor(baseHex).toHsl().l,
          )

  const result = colors.map((color) => ({ ...color }))
  const axisIndices = [...existingAxisIndices, insertIndex]
  const shadeIndices = axisIndices.filter((index) => index !== poleIndex)
  const nShades = shadeIndices.length

  if (nShades === 0) {
    result[insertIndex] = colorObjectFromHex(result[insertIndex]!, poleHex)
    return result
  }

  if (nShades === 1) {
    result[insertIndex] = colorObjectFromHex(
      result[insertIndex]!,
      adobeComplementaryAxisShade(poleHex, axisHue, 1),
    )
    return result
  }

  // Compress gaps: space every shade evenly inward; rim pole stays put.
  shadeIndices.forEach((index, i) => {
    const t = (i + 1) / nShades
    result[index] = colorObjectFromHex(
      result[index]!,
      adobeComplementaryAxisShade(poleHex, axisHue, t),
    )
  })

  return result
}

/**
 * Adobe analogous +: append at end. While under 5 colors, grow adjacent spokes
 * in the ≤60° arc. At 6+, stack inward on spoke `index % 5` (same line as 1st, 2nd…).
 * `colors` must already include the new placeholder as the last item.
 */
export const finalizeAnalogousAppend = <T extends PaletteColorLike>(
  colors: T[],
  _baseIndex = 0,
): T[] => {
  if (!colors || colors.length < 2) return colors

  const insertIndex = colors.length - 1
  const existing = colors.slice(0, insertIndex)
  if (existing.length === 0) return colors

  const baseHex = existing[0]?.hex
  if (!baseHex) return colors

  const baseHue = safeHue(tinycolor(baseHex).toHsl())
  const nextCount = colors.length

  // Growing toward 5 spokes: rebuild full analogous set (keeps global ≤60° rule).
  if (existing.length < ANALOGOUS_MAX_SPOKES) {
    const hexes = generateHarmonyHexes(
      baseHex,
      HARMONY_TYPES.ANALOGOUS,
      nextCount,
    )
    return colors.map((color, index) =>
      colorObjectFromHex(color, hexes[index]!),
    )
  }

  // Stack on spoke insertIndex % 5 (6th→1st, 7th→2nd, …).
  const offsets = analogousSpokeOffsets(ANALOGOUS_MAX_SPOKES)
  const spokeIndex = insertIndex % ANALOGOUS_MAX_SPOKES
  const axisHue = normalizeHue(baseHue + offsets[spokeIndex]!)
  const poleIndex = spokeIndex
  const poleHex = existing[poleIndex]?.hex || baseHex

  const axisIndices: number[] = []
  for (let i = spokeIndex; i < nextCount; i += ANALOGOUS_MAX_SPOKES) {
    axisIndices.push(i)
  }

  const result = colors.map((color) => ({ ...color }))
  const shadeIndices = axisIndices.filter((index) => index !== poleIndex)
  const nShades = shadeIndices.length

  if (nShades === 0) {
    result[insertIndex] = colorObjectFromHex(result[insertIndex]!, poleHex)
    return result
  }

  if (nShades === 1) {
    result[insertIndex] = colorObjectFromHex(
      result[insertIndex]!,
      adobeAnalogousSpokeShade(poleHex, axisHue, 1),
    )
    return result
  }

  shadeIndices.forEach((index, i) => {
    const t = (i + 1) / nShades
    result[index] = colorObjectFromHex(
      result[index]!,
      adobeAnalogousSpokeShade(poleHex, axisHue, t),
    )
  })

  return result
}

/**
 * Adobe triad +: append at end. Grow to 3 triangle poles, then stack
 * 4th→1st spoke, 5th→2nd, 6th→3rd, 7th→1st, … (`index % 3`).
 * `colors` must already include the new placeholder as the last item.
 */
export const finalizeTriadAppend = <T extends PaletteColorLike>(
  colors: T[],
  _baseIndex = 0,
): T[] => {
  if (!colors || colors.length < 2) return colors

  const insertIndex = colors.length - 1
  const existing = colors.slice(0, insertIndex)
  if (existing.length === 0) return colors

  const baseHex = existing[0]?.hex
  if (!baseHex) return colors

  const baseHue = safeHue(tinycolor(baseHex).toHsl())
  const nextCount = colors.length

  if (existing.length < TRIAD_MAX_SPOKES) {
    const hexes = generateHarmonyHexes(
      baseHex,
      HARMONY_TYPES.TRIAD,
      nextCount,
    )
    return colors.map((color, index) =>
      colorObjectFromHex(color, hexes[index]!),
    )
  }

  const offsets = triadSpokeOffsets(TRIAD_MAX_SPOKES)
  const spokeIndex = insertIndex % TRIAD_MAX_SPOKES
  const axisHue = normalizeHue(baseHue + offsets[spokeIndex]!)
  const poleIndex = spokeIndex
  const poleHex = existing[poleIndex]?.hex || baseHex

  const axisIndices: number[] = []
  for (let i = spokeIndex; i < nextCount; i += TRIAD_MAX_SPOKES) {
    axisIndices.push(i)
  }

  const result = colors.map((color) => ({ ...color }))
  const shadeIndices = axisIndices.filter((index) => index !== poleIndex)
  const nShades = shadeIndices.length

  if (nShades === 0) {
    result[insertIndex] = colorObjectFromHex(result[insertIndex]!, poleHex)
    return result
  }

  shadeIndices.forEach((index, i) => {
    result[index] = colorObjectFromHex(
      result[index]!,
      compoundSpokeShade(poleHex, axisHue, i + 1),
    )
  })

  return result
}

/**
 * Adobe split complementary +: append at end. Grow to 3 Y poles, then stack
 * 4th→1st spoke, 5th→2nd, 6th→3rd, 7th→1st, … (`index % 3`).
 * `colors` must already include the new placeholder as the last item.
 */
export const finalizeSplitComplementaryAppend = <T extends PaletteColorLike>(
  colors: T[],
  _baseIndex = 0,
): T[] => {
  if (!colors || colors.length < 2) return colors

  const insertIndex = colors.length - 1
  const existing = colors.slice(0, insertIndex)
  if (existing.length === 0) return colors

  const baseHex = existing[0]?.hex
  if (!baseHex) return colors

  const baseHue = safeHue(tinycolor(baseHex).toHsl())
  const nextCount = colors.length

  if (existing.length < SPLIT_COMPLEMENTARY_MAX_SPOKES) {
    const hexes = generateHarmonyHexes(
      baseHex,
      HARMONY_TYPES.SPLIT_COMPLEMENTARY,
      nextCount,
    )
    return colors.map((color, index) =>
      colorObjectFromHex(color, hexes[index]!),
    )
  }

  const offsets = splitComplementarySpokeOffsets(SPLIT_COMPLEMENTARY_MAX_SPOKES)
  const spokeIndex = insertIndex % SPLIT_COMPLEMENTARY_MAX_SPOKES
  const axisHue = normalizeHue(baseHue + offsets[spokeIndex]!)
  const poleIndex = spokeIndex
  const poleHex = existing[poleIndex]?.hex || baseHex

  const axisIndices: number[] = []
  for (
    let i = spokeIndex;
    i < nextCount;
    i += SPLIT_COMPLEMENTARY_MAX_SPOKES
  ) {
    axisIndices.push(i)
  }

  const result = colors.map((color) => ({ ...color }))
  const shadeIndices = axisIndices.filter((index) => index !== poleIndex)
  const nShades = shadeIndices.length

  if (nShades === 0) {
    result[insertIndex] = colorObjectFromHex(result[insertIndex]!, poleHex)
    return result
  }

  shadeIndices.forEach((index, i) => {
    result[index] = colorObjectFromHex(
      result[index]!,
      compoundSpokeShade(poleHex, axisHue, i + 1),
    )
  })

  return result
}

/**
 * Double Split Complementary +: append at end. Grow to 5 rim poles, then stack
 * 6th→1st spoke, 7th→2nd, … (`index % 5`), inward near the pole.
 * `colors` must already include the new placeholder as the last item.
 */
export const finalizeDoubleSplitComplementaryAppend = <
  T extends PaletteColorLike,
>(
  colors: T[],
  _baseIndex = 0,
): T[] => {
  if (!colors || colors.length < 2) return colors

  const insertIndex = colors.length - 1
  const existing = colors.slice(0, insertIndex)
  if (existing.length === 0) return colors

  const baseHex = existing[0]?.hex
  if (!baseHex) return colors

  const baseHue = safeHue(tinycolor(baseHex).toHsl())
  const nextCount = colors.length

  if (existing.length < DOUBLE_SPLIT_COMPLEMENTARY_MAX_SPOKES) {
    const hexes = generateHarmonyHexes(
      baseHex,
      HARMONY_TYPES.DOUBLE_SPLIT_COMPLEMENTARY,
      nextCount,
    )
    return colors.map((color, index) =>
      colorObjectFromHex(color, hexes[index]!),
    )
  }

  const offsets = doubleSplitComplementarySpokeOffsets(
    DOUBLE_SPLIT_COMPLEMENTARY_MAX_SPOKES,
  )
  const spokeIndex = insertIndex % DOUBLE_SPLIT_COMPLEMENTARY_MAX_SPOKES
  const axisHue = normalizeHue(baseHue + offsets[spokeIndex]!)
  const poleIndex = spokeIndex
  const poleHex = existing[poleIndex]?.hex || baseHex

  const axisIndices: number[] = []
  for (
    let i = spokeIndex;
    i < nextCount;
    i += DOUBLE_SPLIT_COMPLEMENTARY_MAX_SPOKES
  ) {
    axisIndices.push(i)
  }

  const result = colors.map((color) => ({ ...color }))
  const shadeIndices = axisIndices.filter((index) => index !== poleIndex)
  const nShades = shadeIndices.length

  if (nShades === 0) {
    result[insertIndex] = colorObjectFromHex(result[insertIndex]!, poleHex)
    return result
  }

  shadeIndices.forEach((index, i) => {
    result[index] = colorObjectFromHex(
      result[index]!,
      compoundSpokeShade(poleHex, axisHue, i + 1),
    )
  })

  return result
}

/**
 * Compound +: append at end. Grow to 4 K rim poles, then stack
 * 5th→1st spoke, 6th→2nd, 7th→3rd, 8th→4th, … (`index % 4`), inward near the
 * pole (not at the wheel center).
 * `colors` must already include the new placeholder as the last item.
 */
export const finalizeCompoundAppend = <T extends PaletteColorLike>(
  colors: T[],
  _baseIndex = 0,
): T[] => {
  if (!colors || colors.length < 2) return colors

  const insertIndex = colors.length - 1
  const existing = colors.slice(0, insertIndex)
  if (existing.length === 0) return colors

  const baseHex = existing[0]?.hex
  if (!baseHex) return colors

  const baseHue = safeHue(tinycolor(baseHex).toHsl())
  const nextCount = colors.length

  if (existing.length < COMPOUND_MAX_SPOKES) {
    const hexes = generateHarmonyHexes(
      baseHex,
      HARMONY_TYPES.COMPOUND,
      nextCount,
    )
    return colors.map((color, index) =>
      colorObjectFromHex(color, hexes[index]!),
    )
  }

  const offsets = compoundSpokeOffsets(COMPOUND_MAX_SPOKES)
  const spokeIndex = insertIndex % COMPOUND_MAX_SPOKES
  const axisHue = normalizeHue(baseHue + offsets[spokeIndex]!)
  const poleIndex = spokeIndex
  const poleHex = existing[poleIndex]?.hex || baseHex

  const axisIndices: number[] = []
  for (let i = spokeIndex; i < nextCount; i += COMPOUND_MAX_SPOKES) {
    axisIndices.push(i)
  }

  const result = colors.map((color) => ({ ...color }))
  const shadeIndices = axisIndices.filter((index) => index !== poleIndex)
  const nShades = shadeIndices.length

  if (nShades === 0) {
    result[insertIndex] = colorObjectFromHex(result[insertIndex]!, poleHex)
    return result
  }

  shadeIndices.forEach((index, i) => {
    result[index] = colorObjectFromHex(
      result[index]!,
      compoundSpokeShade(poleHex, axisHue, i + 1),
    )
  })

  return result
}

/**
 * @deprecated Use finalizeComplementaryAppend — complementary adds always append.
 * Kept so older call sites that pass afterIndex keep compiling; afterIndex is ignored.
 */
export const insertComplementaryAfter = <T extends PaletteColorLike>(
  colors: T[],
  _afterIndex: number,
  baseIndex = 0,
): T[] => {
  if (!colors?.length) return colors
  // If the new swatch isn't already last, move the afterIndex+1 slot to the end.
  const insertIndex =
    typeof _afterIndex === "number" && _afterIndex >= 0
      ? Math.min(_afterIndex + 1, colors.length - 1)
      : colors.length - 1

  if (insertIndex === colors.length - 1) {
    return finalizeComplementaryAppend(colors, baseIndex)
  }

  const next = [
    ...colors.slice(0, insertIndex),
    ...colors.slice(insertIndex + 1),
    colors[insertIndex]!,
  ]
  return finalizeComplementaryAppend(next, baseIndex)
}

export function applyHarmonyToPalette<T extends PaletteColorLike>(
  colors: T[],
  harmonyType: string,
  baseColorIndex = 0,
): T[] {
  if (!colors || colors.length === 0) return colors
  const type = resolveHarmonyType(harmonyType)
  if (type === HARMONY_TYPES.CUSTOM) return colors

  // Mono / Shades: always anchored by strip[0] (ray rim / shade handle).
  const baseIndex =
    type === HARMONY_TYPES.MONOCHROMATIC || type === HARMONY_TYPES.SHADES
      ? 0
      : Math.max(0, Math.min(baseColorIndex ?? 0, colors.length - 1))
  const baseColor = colors[baseIndex]
  if (!baseColor?.hex) return colors

  const hexes = buildHarmonyPalette({
    baseHex: baseColor.hex,
    harmonyType: type,
    count: colors.length,
    baseSlotIndex: baseIndex,
  })

  return colors.map((color, index) =>
    colorObjectFromHex(color, hexes[index]!),
  )
}

/**
 * Minimum swatches before a harmony appears in the picker (Adobe Color parity).
 * Adobe only shows rules that fit the current number of color dots on the wheel.
 * @see https://color.adobe.com/create/color-wheel
 */
export const HARMONY_MIN_COLOR_COUNT: Record<string, number> = {
  [HARMONY_TYPES.CUSTOM]: 1,
  [HARMONY_TYPES.COMPLEMENTARY]: 2,
  [HARMONY_TYPES.MONOCHROMATIC]: 2,
  [HARMONY_TYPES.SHADES]: 2,
  [HARMONY_TYPES.TRIAD]: 3,
  [HARMONY_TYPES.SPLIT_COMPLEMENTARY]: 3,
  [HARMONY_TYPES.SQUARE]: 4,
  [HARMONY_TYPES.COMPOUND]: 4,
  [HARMONY_TYPES.ANALOGOUS]: 3,
  [HARMONY_TYPES.DOUBLE_SPLIT_COMPLEMENTARY]: 5,
}

export const getHarmonyMinimumColorCount = (harmonyType: string): number => {
  const type = resolveHarmonyType(harmonyType)
  return HARMONY_MIN_COLOR_COUNT[type] ?? 1
}

export const getDefaultColorCount = (harmonyType: string): number =>
  getHarmonyMinimumColorCount(harmonyType)

export const isHarmonyAvailableForCount = (
  harmonyType: string,
  colorCount: number,
): boolean => {
  const count = Math.max(0, colorCount || 0)
  const type = resolveHarmonyType(harmonyType)
  if (type === HARMONY_TYPES.CUSTOM) return count >= 1
  if (count < 2) return false
  return count >= getHarmonyMinimumColorCount(type)
}

/** Harmonies shown in the picker for the current palette size (Adobe-style filtering). */
export const getAvailableHarmoniesForCount = (
  colorCount: number,
): HarmonyTypeId[] => {
  const count = Math.max(0, colorCount || 0)
  if (count < 2) return [HARMONY_TYPES.CUSTOM]
  return HARMONY_DROPDOWN_ORDER.filter((type) =>
    isHarmonyAvailableForCount(type, count),
  )
}

/** After add/remove, fall back to Custom when the active rule no longer fits. */
export const resolveHarmonyAfterCountChange = (
  harmonyType: string,
  colorCount: number,
): string => {
  if (isHarmonyAvailableForCount(harmonyType, colorCount)) {
    return resolveHarmonyType(harmonyType)
  }
  return HARMONY_TYPES.CUSTOM
}

/** Short hint for the harmony modal when more swatches unlock presets. */
export const getHarmonyUnlockHint = (
  colorCount: number,
): string | null => {
  const count = Math.max(0, colorCount || 0)
  if (count >= 5) return null
  const parts: string[] = []
  if (count < 3) {
    parts.push("3+ for Triad, Split Complementary & Analogous")
  }
  if (count < 4) parts.push("4+ for Square & Compound")
  if (count < 5) parts.push("5+ for Double Split Complementary")
  return parts.join(" · ")
}

// Exported for unit tests
export const __testOnly = {
  generateHarmonyHexes,
  extendByHueCycle,
  getAdobeTriadHex,
  analogousSpokeOffsets,
  adobeAnalogousSpokeShade,
}
