import { FC, useEffect, useRef } from 'react'
import { useToast } from '@/v2/hooks/useToast'

import { Toast } from './Toast'

export type Props = {
  children: JSX.Element | JSX.Element[]
}

export const ExtensionContainer: FC<Props> = (props) => {
  const toast = useToast()
  const containerRef = useRef<HTMLDivElement>(null)

  // Adjust popup height based on content
  useEffect(() => {
    const adjustHeight = () => {
      if (!containerRef.current) return

      const snapshotEl = containerRef.current.querySelector(".snapshot-container")
      const root = document.getElementById("root")

      if (snapshotEl) {
        const fixed = { width: "800px", height: "600px" }
        for (const el of [document.body, document.documentElement, root]) {
          if (!el) continue
          el.style.width = fixed.width
          el.style.height = fixed.height
          el.style.minHeight = "0"
          el.style.maxWidth = fixed.width
          el.style.maxHeight = fixed.height
          el.style.overflow = "hidden"
          el.style.margin = "0"
          el.style.padding = "0"
        }
        return
      }

      const height = containerRef.current.scrollHeight
      if (document.body) {
        document.body.style.height = `${height}px`
        document.body.style.minHeight = "0"
        document.body.style.maxHeight = "none"
        document.body.style.width = ""
        document.body.style.maxWidth = ""
        document.body.style.overflow = ""
      }
      if (document.documentElement) {
        document.documentElement.style.height = `${height}px`
        document.documentElement.style.minHeight = "0"
        document.documentElement.style.maxHeight = "none"
        document.documentElement.style.width = ""
        document.documentElement.style.maxWidth = ""
        document.documentElement.style.overflow = ""
      }
      if (root) {
        root.style.width = ""
        root.style.height = ""
        root.style.maxWidth = ""
        root.style.maxHeight = ""
        root.style.overflow = ""
      }
    }

    // Adjust on mount and when content changes
    adjustHeight()
    
    // Use ResizeObserver to watch for content changes
    const resizeObserver = new ResizeObserver(() => {
      adjustHeight()
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    // Also watch for changes in children
    const timeoutId = setTimeout(adjustHeight, 100)

    return () => {
      resizeObserver.disconnect()
      clearTimeout(timeoutId)
    }
  }, [props.children])

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{
        height: "fit-content",
        width: "fit-content",
        maxWidth: "100%",
      }}
    >
      {props.children}
      <Toast message={toast.state.message} type={toast.state.type} />
    </div>
  )
}
