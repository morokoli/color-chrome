import { useState } from "react"
import { X, Plus } from "lucide-react"
import { useDrop } from "react-dnd"

const getColorHex = (color: any) => {
    if (typeof color === "string") return color
    return color?.hex || "#FFB3B3"
}

interface DraggableColorItemProps {
    color: any
    index: number
    onColorClick: (idx: number) => void
    onRemoveColor: (idx: number) => void
    onAddColor: (idx: number) => void
    canAddColor: boolean
    isSelected: boolean
    onMoveColor: (dragIndex: number, hoverIndex: number) => void
    colorCount: number
    dragIndex: number | null
    hoverIndex: number | null
    isDragging: boolean
    onAddColorToPalette: (colorData: any, index: number | null) => void
    setDragIndex: (idx: number | null) => void
    setHoverIndex: (idx: number | null) => void
}

const ITEM_TYPE = "IMPORT_COLOR"

const DraggableColorItem = ({
    color,
    index,
    onColorClick,
    onRemoveColor,
    onAddColor,
    canAddColor,
    isSelected,
    onMoveColor,
    colorCount,
    dragIndex,
    hoverIndex,
    isDragging,
  onAddColorToPalette,
    setDragIndex,
    setHoverIndex,
}: DraggableColorItemProps) => {
    const [isReplacing, setIsReplacing] = useState(false)

    const colorHex = getColorHex(color)

  // Accept drop from Import list to REPLACE this color (same behavior as webapp)
  const [{ isOver }, drop] = useDrop({
    accept: [ITEM_TYPE],
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
    hover: (item: any) => {
      if (item?.type === ITEM_TYPE) setIsReplacing(true)
    },
    drop: (item: any) => {
      setIsReplacing(false)
      if (item?.type === ITEM_TYPE && item?.colorData) {
        onAddColorToPalette(item.colorData, index)
        return { action: "replace", index }
      }
      return undefined
    },
  })

    const handleDragStart = (e: React.DragEvent) => {
        setDragIndex(index)
        e.dataTransfer.effectAllowed = "move"
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        if (dragIndex !== null && dragIndex !== index) {
            setHoverIndex(index)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        if (dragIndex !== null && hoverIndex !== null && dragIndex !== hoverIndex) {
            onMoveColor(dragIndex, hoverIndex)
        }
        setDragIndex(null)
        setHoverIndex(null)
    }

    const handleDragEnd = () => {
        setDragIndex(null)
        setHoverIndex(null)
    }

    const getTransformStyle = () => {
        if (
            dragIndex === null ||
            hoverIndex === null ||
            dragIndex === hoverIndex ||
            !isDragging
        ) {
            return {}
        }

        if (index === dragIndex) {
            return {
                transform: `translateX(${(hoverIndex - dragIndex) * 108}%)`,
                transition: "transform 0.2s ease",
                zIndex: 1000,
            }
        }

        if (dragIndex < hoverIndex && index > dragIndex && index <= hoverIndex) {
            return {
                transform: `translateX(-108%)`,
                transition: "transform 0.2s ease",
            }
        }

        if (dragIndex > hoverIndex && index < dragIndex && index >= hoverIndex) {
            return {
                transform: `translateX(108%)`,
                transition: "transform 0.2s ease",
            }
        }

        return {}
    }

    return (
        <div
      ref={drop}
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            style={{
                minWidth: "48px",
                width: "100%",
                maxWidth: "unset",
                flex: 1,
                transition: isDragging && dragIndex === index ? "none" : "transform 0.2s ease, opacity 0.2s ease",
                willChange: "transform",
                position: "relative",
                overflow: "visible",
                opacity: isDragging && dragIndex === index ? 0.5 : 1,
                transform: isDragging && dragIndex === index ? "rotate(5deg) scale(1.05)" : "none",
                zIndex: isDragging && dragIndex === index ? 1000 : 10 - index,
                ...getTransformStyle(),
            }}
        >
            <div
                style={{
                    width: "100%",
                    height: "90px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "4px",
                    position: "relative",
                    cursor: "pointer",
                    boxSizing: "border-box",
          border: isSelected
            ? "4px solid black"
            : isOver || isReplacing
            ? "3px dashed #1890ff"
            : "2px solid black",
                    backgroundColor: colorHex,
                    overflow: "visible",
                    transition: isReplacing ? "all 0.2s ease" : "none",
                    transform: isReplacing ? "scale(1.05)" : "none",
          boxShadow: (isOver || isReplacing) ? "0 4px 12px rgba(24, 144, 255, 0.3)" : "none",
                }}
                onClick={() => onColorClick(index)}
                onDragOver={(e) => {
                    e.preventDefault()
                    setIsReplacing(true)
                }}
                onDragLeave={() => setIsReplacing(false)}
                onDrop={(e) => {
                    e.preventDefault()
                    setIsReplacing(false)
                }}
            >
                {colorCount > 1 && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onRemoveColor(index)
                        }}
                        style={{
                            position: "absolute",
                            top: "2px",
                            right: "2px",
                            fontSize: "12px",
                            color: "#888",
              borderRadius: "0",
              padding: "0",
                            display: "block",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                        }}
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
                {canAddColor && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onAddColor(index)
                        }}
                        style={{
                            position: "absolute",
                            width: "20px",
                            height: "20px",
                            top: "50%",
                            borderRadius: "99px",
                            right: "-10px",
                            transform: "translate(0, -50%)",
                            background: "white",
                            border: "1px solid #d9d9d9",
                            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                            pointerEvents: "auto",
                            zIndex: 9999,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                )}
            </div>
        </div>
    )
}

export default DraggableColorItem
