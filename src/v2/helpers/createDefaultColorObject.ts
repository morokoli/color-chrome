import tinycolor from "tinycolor2"

export const createDefaultColorObject = (hex = "#FFB3B3") => {
  const tc = tinycolor(hex)
  const rgb = tc.toRgb()
  const hsl = tc.toHsl()
  
  return {
    hex,
    rgb: { r: rgb.r, g: rgb.g, b: rgb.b },
    hsl: { h: Math.round(hsl.h * 360), s: Math.round(hsl.s * 100), l: Math.round(hsl.l * 100) },
    url: "",
    name: "",
    ranking: 0,
    comments: "",
    slash_naming: "",
    tags: [] as string[],
    additionalColumns: [] as Array<{ name: string; value: string }>,
  }
}
