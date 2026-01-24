import { useState, useRef, useEffect } from "react"
import { X, Plus } from "lucide-react"
import { useDrag, useDrop } from "react-dnd"

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
    onReplaceColor: (colorData: any, index: number) => void
}

const COLOR_ITEM_TYPE = "COLOR"
const IMPORT_COLOR_TYPE = "IMPORT_COLOR"

const DraggableColorItem = ({
    color,
    index,
    onColorClick,
    onRemoveColor,
    onAddColor,
    canAddColor,
    isSelected,
    colorCount,
    dragIndex,
    hoverIndex,
    isDragging: parentIsDragging,
    onReplaceColor,
}: DraggableColorItemProps) => {
    const innerRef = useRef<HTMLDivElement>(null)
    const [isReplacing, setIsReplacing] = useState(false)

    const colorHex = getColorHex(color)

    // Use react-dnd's useDrag for reordering colors (same as web app)
    const [{ isDragging }, drag] = useDrag({
        type: COLOR_ITEM_TYPE,
        item: { index, type: COLOR_ITEM_TYPE },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    })

    // Accept drop from Import list to REPLACE this color (same behavior as webapp)
    // Only accepts IMPORT_COLOR to not interfere with parent's COLOR reordering
    const [{ isOver }, drop] = useDrop({
        accept: [IMPORT_COLOR_TYPE],
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
        hover: (item: any) => {
            // Highlight "replace" only for imported color
            if (item?.type === IMPORT_COLOR_TYPE) {
                setIsReplacing(true)
            }
        },
        drop: (item: any) => {
            setIsReplacing(false)
            if (item?.type === IMPORT_COLOR_TYPE && item?.colorData && onReplaceColor) {
                onReplaceColor(item.colorData, index) // Replace current color
                // Return dropResult so parent knows drop was handled
                return { action: "replace", index }
            }
            return undefined
        },
    })

    // Combine drag and drop refs
    drag(drop(innerRef))

    useEffect(() => {
        if (!isDragging && isReplacing) {
            setIsReplacing(false)
        }
    }, [isDragging, isReplacing])

    const getTransformStyle = () => {
        if (
            dragIndex === null ||
            hoverIndex === null ||
            dragIndex === hoverIndex ||
            !parentIsDragging
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
            ref={innerRef}
            style={{
                minWidth: "48px",
                width: "100%",
                maxWidth: "unset",
                flex: 1,
                transition: isDragging ? "none" : "transform 0.2s ease, opacity 0.2s ease",
                willChange: "transform",
                position: "relative",
                overflow: "visible",
                opacity: isDragging ? 0.5 : 1,
                zIndex: 10 - index,
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
                    transition: (isOver || isReplacing) ? "all 0.2s ease" : "none",
                    transform: (isOver || isReplacing) ? "scale(1.1)" : "none",
          boxShadow: (isOver || isReplacing) ? "0 4px 12px rgba(24, 144, 255, 0.3)" : "none",
                }}
                onClick={() => onColorClick(index)}
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
