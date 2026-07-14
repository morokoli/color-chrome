export const isChipSeparatorKey = (
  key: string,
  { includeSlash = false }: { includeSlash?: boolean } = {},
): boolean => {
  if (key === "Enter" || key === "NumpadEnter" || key === "," || key === "Tab") {
    return true
  }
  return includeSlash && key === "/"
}
