import {
  HARMONY_TYPES,
  applyHarmonyToPalette,
  finalizeAnalogousAppend,
  finalizeComplementaryAppend,
  finalizeCompoundAppend,
  finalizeDoubleSplitComplementaryAppend,
  finalizeSplitComplementaryAppend,
  finalizeTriadAppend,
  isHarmonyAvailableForCount,
  resolveHarmonyAfterCountChange,
  resolveHarmonyType,
} from "./colorHarmonies"

/** Synced from colorappfrontend/src/helpers/harmonyLifecycle.js */
export const MAX_PALETTE_COLORS = 10

type PaletteColorLike = { hex?: string; [key: string]: unknown }

export const isHarmonyActive = (harmonyType: string): boolean =>
  resolveHarmonyType(harmonyType) !== HARMONY_TYPES.CUSTOM

export const resolveHarmonyBaseIndex = (
  colorPickerIndex: number | null | undefined,
  colorsLength: number,
): number => {
  if (colorsLength <= 0) return 0
  if (
    typeof colorPickerIndex === "number" &&
    colorPickerIndex >= 0 &&
    colorPickerIndex < colorsLength
  ) {
    return colorPickerIndex
  }
  return 0
}

export const reharmonizePalette = <T extends PaletteColorLike>(
  colors: T[],
  harmonyType: string,
  baseIndex: number,
): T[] => {
  if (!colors?.length || !isHarmonyActive(harmonyType)) return colors
  const base = resolveHarmonyBaseIndex(baseIndex, colors.length)
  return applyHarmonyToPalette(colors, harmonyType, base)
}

export const harmonizeAfterCountChange = <T extends PaletteColorLike>(
  nextColors: T[],
  harmonyType: string,
  baseIndex: number,
): T[] => {
  if (!nextColors?.length) return nextColors
  const resolved = resolveHarmonyAfterCountChange(
    harmonyType,
    nextColors.length,
  )
  if (!isHarmonyActive(resolved)) return nextColors
  return reharmonizePalette(nextColors, resolved, baseIndex)
}

export const harmonizeAfterInsert = <T extends PaletteColorLike>(
  nextColors: T[],
  harmonyType: string,
  _afterIndex: number,
  baseIndex: number,
): T[] => {
  if (!nextColors?.length) return nextColors
  const resolved = resolveHarmonyAfterCountChange(
    harmonyType,
    nextColors.length,
  )
  if (!isHarmonyActive(resolved)) return nextColors

  if (resolved === HARMONY_TYPES.COMPLEMENTARY) {
    return finalizeComplementaryAppend(nextColors, baseIndex)
  }

  if (resolved === HARMONY_TYPES.ANALOGOUS) {
    return finalizeAnalogousAppend(nextColors, baseIndex)
  }

  if (resolved === HARMONY_TYPES.TRIAD) {
    return finalizeTriadAppend(nextColors, baseIndex)
  }

  if (resolved === HARMONY_TYPES.SPLIT_COMPLEMENTARY) {
    return finalizeSplitComplementaryAppend(nextColors, baseIndex)
  }

  if (resolved === HARMONY_TYPES.DOUBLE_SPLIT_COMPLEMENTARY) {
    return finalizeDoubleSplitComplementaryAppend(nextColors, baseIndex)
  }

  if (resolved === HARMONY_TYPES.COMPOUND) {
    return finalizeCompoundAppend(nextColors, baseIndex)
  }

  return reharmonizePalette(nextColors, resolved, baseIndex)
}

export const shouldResetHarmonyAfterCountChange = (
  harmonyType: string,
  nextCount: number,
): boolean => {
  const resolved = resolveHarmonyAfterCountChange(harmonyType, nextCount)
  return (
    isHarmonyActive(harmonyType) &&
    resolved === HARMONY_TYPES.CUSTOM &&
    resolveHarmonyType(harmonyType) !== HARMONY_TYPES.CUSTOM
  )
}

/** Analogous or Compound: any remove breaks the rule and exits to Custom. */
export const shouldBreakHarmonyOnRemove = (harmonyType: string): boolean => {
  const resolved = resolveHarmonyType(harmonyType)
  return (
    resolved === HARMONY_TYPES.ANALOGOUS ||
    resolved === HARMONY_TYPES.COMPOUND
  )
}

/** @deprecated Use shouldBreakHarmonyOnRemove */
export const shouldBreakAnalogousOnRemove = shouldBreakHarmonyOnRemove

export { isHarmonyAvailableForCount, resolveHarmonyAfterCountChange }

export const resolveBaseIndexAfterRemove = (
  removedIndex: number,
  currentBaseIndex: number,
): number => {
  if (removedIndex === currentBaseIndex) return 0
  if (removedIndex < currentBaseIndex) return currentBaseIndex - 1
  return currentBaseIndex
}

export const resolvePickerIndexAfterMove = (
  dragIndex: number,
  hoverIndex: number,
  pickerIndex: number,
): number => {
  if (dragIndex === hoverIndex) return pickerIndex
  if (dragIndex === pickerIndex) return hoverIndex
  if (dragIndex < pickerIndex && hoverIndex >= pickerIndex) {
    return pickerIndex - 1
  }
  if (dragIndex > pickerIndex && hoverIndex <= pickerIndex) {
    return pickerIndex + 1
  }
  return pickerIndex
}
