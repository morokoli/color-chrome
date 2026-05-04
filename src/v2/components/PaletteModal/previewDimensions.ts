/**
 * Library + Version History use identical preview strips and equal sidebar lanes.
 * Strip width matches measured History layout; column adds shell padding + scrollbar reserve.
 */
export const PALETTE_SIDEBAR_STRIP_WIDTH_PX = 89
export const PALETTE_SIDEBAR_STRIP_HEIGHT_PX = 95

export const PALETTE_SIDEBAR_STRIP_BORDER = "1px solid black"

/** Padding inside each sidebar shell (Library / Versions) */
export const PALETTE_SIDEBAR_SHELL_PADDING_PX = 10

/**
 * Extra lane width so `scrollbar-gutter: stable` does not steal space from the strip vs the other panel.
 */
export const PALETTE_SIDEBAR_SCROLLBAR_GUTTER_PX = 17

/** Total grid column width when sidebar is open — symmetric left/right */
export const PALETTE_SIDEBAR_COLUMN_WIDTH_PX =
  PALETTE_SIDEBAR_SHELL_PADDING_PX * 2 +
  PALETTE_SIDEBAR_STRIP_WIDTH_PX +
  PALETTE_SIDEBAR_SCROLLBAR_GUTTER_PX
