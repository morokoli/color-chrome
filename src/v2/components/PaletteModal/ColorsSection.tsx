import { useState, useRef, useEffect } from "react"
import { CollapsibleBox } from "@/v2/components/CollapsibleBox"
import { useDrop } from "react-dnd"
import DraggableColorItem from "./DraggableColorItem"

const MAX_COLORS = 10
const IMPORT_COLOR_TYPE = "IMPORT_COLOR"
const COLOR_TYPE = "COLOR"

interface ColorsSectionProps {
  colors: any[]
  colorPickerIndex: number
  onColorClick: (idx: number) => void
  onRemoveColor: (idx: number) => void
  onAddColor: (idx: number) => void
  onMoveColor: (dragIndex: number, hoverIndex: number) => void
  onAddColorToPalette: (colorData: any, index: number | null) => void
  onReplaceColor: (colorData: any, index: number) => void
}

const ColorsSection = ({
  colors,
  colorPickerIndex,
  onColorClick,
  onRemoveColor,
  onAddColor,
  onMoveColor,
  onAddColorToPalette,
  onReplaceColor,
}: ColorsSectionProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const dropRef = useRef<HTMLDivElement | null>(null)

  // Main drop zone that accepts both COLOR (for reordering) and IMPORT_COLOR (for adding)
  const [{ isOver }, drop] = useDrop({
    accept: [IMPORT_COLOR_TYPE, COLOR_TYPE],
    drop: (item: any, monitor) => {
      // If nested target already handled drop (e.g., replace on DraggableColorItem) - exit
      if (monitor.didDrop()) {
        setIsDragging(false)
        setHoveredIndex(null)
        setDragIndex(null)
        setHoverIndex(null)
        setIsImporting(false)
        return
      }

      setIsDragging(false)
      setHoveredIndex(null)
      setDragIndex(null)
      setHoverIndex(null)
      setIsImporting(false)

      if (item.type === IMPORT_COLOR_TYPE && onAddColorToPalette && item.colorData) {
        const insertIndex = hoveredIndex !== null ? hoveredIndex : colors.length
        onAddColorToPalette(item.colorData, insertIndex)
      } else if (
        item.type === COLOR_TYPE &&
        dragIndex !== null &&
        hoverIndex !== null &&
        dragIndex !== hoverIndex
      ) {
        onMoveColor(dragIndex, hoverIndex)
      }
    },
    hover: (item: any, monitor) => {
      setIsDragging(true)

      if (item.type === COLOR_TYPE) {
        setDragIndex(item.index)
        setIsImporting(false)
      } else if (item.type === IMPORT_COLOR_TYPE) {
        setIsImporting(true)
      }

      const clientOffset = monitor.getClientOffset()
      if (!clientOffset) return

      const containerRect = dropRef.current?.getBoundingClientRect()
      if (!containerRect) return

      const relativeX = clientOffset.x - containerRect.left
      const containerWidth = containerRect.width

      if (item.type === IMPORT_COLOR_TYPE) {
        const sectionWidth = containerWidth / colors.length
        const colorIndex = Math.floor(relativeX / sectionWidth)

        const colorStart = colorIndex * sectionWidth
        const colorCenter = colorStart + sectionWidth / 2
        const distanceFromCenter = Math.abs(relativeX - colorCenter)

        // If close to center of a color, don't show drop zone (will trigger replace instead)
        if (distanceFromCenter < sectionWidth * 0.2) {
          setHoveredIndex(null)
          setHoverIndex(null)
          return
        }
      }

      // Normal logic for insertion zones
      const sectionWidth = containerWidth / colors.length
      let nextHoverIndex = Math.floor(relativeX / sectionWidth)

      nextHoverIndex = Math.min(Math.max(0, nextHoverIndex), colors.length)

      setHoveredIndex(nextHoverIndex)
      setHoverIndex(nextHoverIndex)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: false }),
    }),
  })

  // Clean up dragging state when not hovering
  useEffect(() => {
    if (!isOver && isDragging) {
      const timer = setTimeout(() => {
        setIsDragging(false)
        setHoveredIndex(null)
        setDragIndex(null)
        setHoverIndex(null)
        setIsImporting(false)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOver, isDragging])

  const DropZone = ({ index }: { index: number }) => {
    const [{ isOver: isZoneOver }, zoneDrop] = useDrop({
      accept: [IMPORT_COLOR_TYPE],
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
      drop: (item: any) => {
        if (item?.type === IMPORT_COLOR_TYPE && item?.colorData) {
          onAddColorToPalette(item.colorData, index)
          return { action: "insert", index }
        }
        return undefined
      },
    })

    return (
      <div
        ref={zoneDrop}
        style={{
          width: "20px",
          height: "90px",
          border: isZoneOver ? "2px dashed #1890ff" : "1px dashed #e0e0e0",
          borderRadius: "4px",
          margin: "0 2px",
          display: isDragging && colors.length < MAX_COLORS && isImporting ? "flex" : "none",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
          backgroundColor: isZoneOver
            ? "rgba(24, 144, 255, 0.1)"
            : "rgba(240, 240, 240, 0.3)",
          cursor: "pointer",
          minWidth: "20px",
          flexShrink: 0,
        }}
        title={`Drop color here to insert at position ${index + 1}`}
      >
        {isZoneOver ? (
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
        ref={(node) => {
          drop(node)
          ;(dropRef as React.MutableRefObject<HTMLDivElement | null>).current = node
        }}
        style={{
          border: isDragging && isOver ? "2px dashed #1890ff" : "2px dashed transparent",
          borderRadius: "8px",
          padding: "8px",
          transition: "border-color 0.2s ease",
          backgroundColor: isDragging && isOver ? "rgba(24, 144, 255, 0.05)" : "transparent",
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
                onReplaceColor={onReplaceColor}
              />
              <DropZone index={idx + 1} />
            </div>
          ))}
          {/* Drop zone after the last color */}
          {colors.length < MAX_COLORS && (
            <DropZone index={colors.length} />
          )}
        </div>
      </div>
    </div>
  )
}

export default ColorsSection
