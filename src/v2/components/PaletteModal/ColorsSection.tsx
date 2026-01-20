import { useState } from "react"
import { CollapsibleBox } from "@/v2/components/CollapsibleBox"
import { useDrop, useDragLayer } from "react-dnd"
import DraggableColorItem from "./DraggableColorItem"

const MAX_COLORS = 10
const ITEM_TYPE = "IMPORT_COLOR"

interface ColorsSectionProps {
  colors: any[]
  colorPickerIndex: number
  onColorClick: (idx: number) => void
  onRemoveColor: (idx: number) => void
  onAddColor: (idx: number) => void
  onMoveColor: (dragIndex: number, hoverIndex: number) => void
  onAddColorToPalette: (colorData: any, index: number | null) => void
}

const ColorsSection = ({
  colors,
  colorPickerIndex,
  onColorClick,
  onRemoveColor,
  onAddColor,
  onMoveColor,
  onAddColorToPalette,
}: ColorsSectionProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const { isImportDragging } = useDragLayer((monitor) => ({
    isImportDragging: monitor.isDragging() && monitor.getItemType() === ITEM_TYPE,
  }))

  const DropZone = ({ index }: { index: number }) => {
    const [{ isOver }, drop] = useDrop({
      accept: [ITEM_TYPE],
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
      drop: (item: any) => {
        if (item?.type === ITEM_TYPE && item?.colorData) {
          onAddColorToPalette(item.colorData, index)
          return { action: "insert", index }
        }
        return undefined
      },
    })

    return (
      <div
        ref={drop}
        style={{
          width: "20px",
          height: "90px",
          border: isOver ? "2px dashed #1890ff" : "1px dashed #e0e0e0",
          borderRadius: "4px",
          margin: "0 2px",
          display: isImportDragging && colors.length < MAX_COLORS ? "flex" : "none",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
          backgroundColor: isOver
            ? "rgba(24, 144, 255, 0.1)"
            : "rgba(240, 240, 240, 0.3)",
          cursor: "pointer",
          minWidth: "20px",
          flexShrink: 0,
        }}
        title={`Drop color here to insert at position ${index + 1}`}
      >
        {isOver ? (
          <div
            style={{
              width: "4px",
              height: "40px",
              backgroundColor: "#1890ff",
              borderRadius: "2px",
              boxShadow: "0 0 8px rgba(24, 144, 255, 0.5)",
            }}
          />
        ) : (
          <div
            style={{
              width: "2px",
              height: "20px",
              backgroundColor: "#e0e0e0",
              borderRadius: "1px",
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div>
      <CollapsibleBox maxHeight="100px" isOpen={colors.length === MAX_COLORS}>
        <div style={{ textAlign: "center", padding: "16px", color: "#999", fontSize: "14px" }}>
          You can only add up to {MAX_COLORS} colors to a palette
        </div>
      </CollapsibleBox>
      <div
        style={{
          border: isDragging ? "2px dashed #1890ff" : "2px dashed transparent",
          borderRadius: "8px",
          padding: "8px",
          transition: "border-color 0.2s ease",
          backgroundColor: isDragging ? "rgba(24, 144, 255, 0.05)" : "transparent",
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => {
          setIsDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <DropZone index={0} />
          {colors.map((color, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                flex: 1,
                minWidth: 0,
              }}
            >
              <DraggableColorItem
                color={color}
                index={idx}
                onColorClick={onColorClick}
                onRemoveColor={onRemoveColor}
                onAddColor={onAddColor}
                canAddColor={colors.length < MAX_COLORS}
                isSelected={colorPickerIndex === idx}
                onMoveColor={onMoveColor}
                colorCount={colors.length}
                dragIndex={dragIndex}
                hoverIndex={hoverIndex}
                isDragging={isDragging}
                onAddColorToPalette={onAddColorToPalette}
                setDragIndex={setDragIndex}
                setHoverIndex={setHoverIndex}
              />
              <DropZone index={idx + 1} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ColorsSection
