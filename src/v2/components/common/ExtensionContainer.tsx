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
      if (containerRef.current) {
        const height = containerRef.current.scrollHeight
        // Set body and html to match content height
        if (document.body) {
          document.body.style.height = `${height}px`
          document.body.style.minHeight = '0'
          document.body.style.maxHeight = 'none'
        }
        if (document.documentElement) {
          document.documentElement.style.height = `${height}px`
          document.documentElement.style.minHeight = '0'
          document.documentElement.style.maxHeight = 'none'
        }
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
      className="w-full relative" 
      style={{ 
        height: 'fit-content',
      }}
    >
      {props.children}
      <Toast message={toast.state.message} type={toast.state.type} />
    </div>
  )
}
