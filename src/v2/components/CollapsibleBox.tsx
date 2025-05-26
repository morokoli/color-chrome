import { FC, useEffect, useState } from "react"

interface CollapsibleBoxProps {
  children: React.ReactNode
  isOpen: boolean
  maxHeight: string
  transitionDuration?: number
}

export const CollapsibleBox: FC<CollapsibleBoxProps> = ({
  isOpen,
  maxHeight,
  children,
  transitionDuration = 300,
}) => {
  const [shouldRenderChildren, setShouldRenderChildren] = useState(isOpen)
  const [timeOut, setTimeOut] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
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
  }, [isOpen])

  return (
    <div
      style={{
        width: "100%",
        maxHeight: isOpen ? maxHeight : "0px",
        overflow: "hidden",
        transition: `max-height ${transitionDuration/1000}s ease-in-out`,
      }}
    >
      {shouldRenderChildren && children}
    </div>
  )
}
