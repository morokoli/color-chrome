import { useEffect, RefObject } from 'react'

/**
 * Hook that detects clicks outside of a referenced element
 * @param ref - Reference to the element to detect clicks outside of
 * @param callback - Function to call when a click outside is detected
 * @param enabled - Optional flag to enable/disable the hook (default: true)
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  callback: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [ref, callback, enabled])
}
