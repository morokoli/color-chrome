import tinycolor from 'tinycolor2'

export const colors = {
  // Expand 3-char hex to 6-char hex
  expandHex(hex: string): string {
    const shortHex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex)
    if (shortHex) {
      return `#${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}${shortHex[3]}${shortHex[3]}`
    }
    return hex.startsWith('#') ? hex : `#${hex}`
  },

  hexToRGB(hex: string): string {
    const expandedHex = this.expandHex(hex)
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(expandedHex)
    if (!result) return "rgb(0, 0, 0)"

    const rgb = {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }

    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  },

  hexToHSL(hex: string): string {
    const expandedHex = this.expandHex(hex)
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(expandedHex)
    if (!result) return "hsl(0, 0%, 0%)"

    let r = parseInt(result[1], 16)
    let g = parseInt(result[2], 16)
    let b = parseInt(result[3], 16)

    ;(r /= 255), (g /= 255), (b /= 255)
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b)
    let h = (max + min) / 2
    let s = h
    let l = h

    if (max == min) {
      h = s = 0 // achromatic
    } else {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }
      h /= 6
    }

    s = s * 100
    s = Math.round(s)
    l = l * 100
    l = Math.round(l)
    h = Math.round(360 * h)

    return `hsl(${h}, ${s}%, ${l}%)`
  },

  isDark(color: string): boolean {
    const c = tinycolor(color)
    const lightness = c.getBrightness()
    return lightness < 128
  },
}
