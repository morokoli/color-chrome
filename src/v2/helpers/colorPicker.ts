/**
 * Color picker helpers: Eyedropper API (pick from whole screen).
 * Used by "Pick color from browser" menu - native picker, no magnifier.
 */

/** Open the native Eyedropper to pick a color from anywhere on screen. Returns hex or null if cancelled. */
export async function openEyeDropper(): Promise<string | null> {
  if (typeof window === "undefined" || !("EyeDropper" in window)) return null
  try {
    const eyeDropper = new (window as any).EyeDropper()
    const result = await eyeDropper.open()
    return result?.sRGBHex ?? null
  } catch {
    // User cancelled or API error
    return null
  }
}
