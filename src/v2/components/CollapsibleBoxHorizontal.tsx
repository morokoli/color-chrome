import { FC, useEffect, useState } from "react"

interface CollapsibleBoxProps {
  children: React.ReactNode
  isOpen: boolean
  maxWidth: string
  transitionDuration?: number
  renderHidden?: boolean
}

export const CollapsibleBoxHorizontal: FC<CollapsibleBoxProps> = ({
  isOpen,
  maxWidth,
  children,
  transitionDuration = 300,
  renderHidden = false,
}) => {
  const [shouldRenderChildren, setShouldRenderChildren] = useState(
    isOpen || renderHidden,
  )
  const [timeOut, setTimeOut] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!renderHidden) {
      if (isOpen) {
        if (timeOut) {
          clearTimeout(timeOut)
        }
        setShouldRenderChildren(true)
      } else {
        const timeout = setTimeout(() => {
          setShouldRenderChildren(false)
        }, transitionDuration)
        setTimeOut(timeout)
      }
      return () => {
        if (timeOut) {
          clearTimeout(timeOut)
        }
      }
    }
  }, [isOpen])

  return (
    <div
      style={{
        width: "100%",
        maxWidth: isOpen ? maxWidth : "0px",
        overflowX: "hidden",
        transition: `max-width ${transitionDuration / 1000}s ease-in-out`,
      }}
    >
      {shouldRenderChildren && children}
    </div>
  )
}
