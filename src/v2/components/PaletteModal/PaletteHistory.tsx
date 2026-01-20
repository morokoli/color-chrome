import { useState, useEffect, useMemo, useCallback } from "react"
import { List, Collapse } from "antd"
import SimplePaletteBox from "./SimplePaletteBox"

const { Panel } = Collapse

const MAX_SNAPSHOTS = 1000

const deepCloneColors = (colors: any[]) => {
  return colors.map((color) => {
    if (typeof color === "string") return color
    return {
      hex: color.hex,
      rgb: { ...color.rgb },
      hsl: { ...color.hsl },
      url: color.url,
      ranking: color.ranking,
      comments: color.comments,
      slash_naming: color.slash_naming,
      tags: [...(color.tags || [])],
      additionalColumns: (color.additionalColumns || []).map((col: any) => ({ ...col })),
    }
  })
}

const colorsHaveChanged = (colors1: any[], colors2: any[]) => {
  if (!Array.isArray(colors1) || !Array.isArray(colors2)) return colors1 !== colors2
  if (colors1.length !== colors2.length) return true

  for (let i = 0; i < colors1.length; i++) {
    const c1 = colors1[i]
    const c2 = colors2[i]
    if (typeof c1 === "string" && typeof c2 === "string") {
      if (c1 !== c2) return true
    } else if (typeof c1 === "string" || typeof c2 === "string") {
      return true
    } else {
      if (c1.hex !== c2.hex) return true
      if (c1.url !== c2.url) return true
      if (c1.ranking !== c2.ranking) return true
      if (c1.comments !== c2.comments) return true
      if (c1.slash_naming !== c2.slash_naming) return true
      if (JSON.stringify(c1.rgb) !== JSON.stringify(c2.rgb)) return true
      if (JSON.stringify(c1.hsl) !== JSON.stringify(c2.hsl)) return true
      if (JSON.stringify(c1.tags || []) !== JSON.stringify(c2.tags || [])) return true
      if (JSON.stringify(c1.additionalColumns || []) !== JSON.stringify(c2.additionalColumns || []))
        return true
    }
  }

  return false
}

interface PaletteHistoryProps {
  currentColors: any[]
  paletteId: string | null
  onApplySnapshot: (snapshotColors: any[]) => void
  onUndoStateChange: (canUndo: boolean, canRedo: boolean) => void
  onUndoRef: React.MutableRefObject<(() => void) | null>
  onRedoRef: React.MutableRefObject<(() => void) | null>
}

const PaletteHistory = ({
  currentColors,
  paletteId,
  onApplySnapshot,
  onUndoStateChange,
  onUndoRef,
  onRedoRef,
}: PaletteHistoryProps) => {
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [lastAppliedTimestamp, setLastAppliedTimestamp] = useState<number | null>(
    null
  )
  const todayKey = useMemo(() => new Date().toDateString(), [])

  const uniquePaletteId = useMemo(() => {
    return paletteId || `palette_${Date.now()}`
  }, [paletteId])

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`palette_history_${uniquePaletteId}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        setSnapshots(Array.isArray(parsed) ? parsed : [])
      }
    } catch (error) {
      console.error("Error loading palette history:", error)
      setSnapshots([])
    }
  }, [uniquePaletteId])

  const saveSnapshots = (newSnapshots: any[]) => {
    try {
      sessionStorage.setItem(
        `palette_history_${uniquePaletteId}`,
        JSON.stringify(newSnapshots)
      )
    } catch (error) {
      console.error("Error saving palette history:", error)
    }
  }

  const createSnapshot = (colors: any[], name: string | null = null) => {
    const clonedColors = deepCloneColors(colors)
    const snapshot = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      colors: clonedColors,
      name: name || new Date().toDateString(),
    }
    const newSnapshots = [snapshot, ...snapshots].slice(0, MAX_SNAPSHOTS)
    setSnapshots(newSnapshots)
    saveSnapshots(newSnapshots)
  }

  const groupedSnapshots = useMemo(() => {
    const groups: Record<string, any[]> = {}
    snapshots.forEach((snapshot) => {
      const date = new Date(snapshot.timestamp)
      const dateKey = date.toDateString()
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(snapshot)
    })
    return Object.entries(groups).map(([dateKey, snapshots]) => ({
      dateKey,
      date: new Date(dateKey),
      snapshots,
    }))
  }, [snapshots])

  const handleUndo = useCallback(() => {
    if (currentIndex < snapshots.length - 1) {
      const nextIndex = currentIndex + 1
      const snapshot = snapshots[nextIndex]
      if (snapshot && snapshot.timestamp !== lastAppliedTimestamp) {
        setCurrentIndex(nextIndex)
        setLastAppliedTimestamp(snapshot.timestamp)
        onApplySnapshot(snapshot.colors)
      }
    }
  }, [currentIndex, snapshots, lastAppliedTimestamp, onApplySnapshot])

  const handleRedo = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1
      const snapshot = snapshots[prevIndex]
      if (snapshot && snapshot.timestamp !== lastAppliedTimestamp) {
        setCurrentIndex(prevIndex)
        setLastAppliedTimestamp(snapshot.timestamp)
        onApplySnapshot(snapshot.colors)
      }
    }
  }, [currentIndex, snapshots, lastAppliedTimestamp, onApplySnapshot])

  const handleApplySnapshot = (snapshot: any) => {
    const snapshotIndex = snapshots.findIndex(
      (s) => s.timestamp === snapshot.timestamp
    )
    if (snapshotIndex !== -1) {
      setCurrentIndex(snapshotIndex)
      setLastAppliedTimestamp(snapshot.timestamp)
    }
    createSnapshot(currentColors)
    onApplySnapshot(snapshot.colors)
  }

  useEffect(() => {
    if (onUndoRef) {
      onUndoRef.current = handleUndo
    }
    if (onRedoRef) {
      onRedoRef.current = handleRedo
    }
  }, [handleUndo, handleRedo, onUndoRef, onRedoRef])

  useEffect(() => {
    if (onUndoStateChange) {
      const canUndo = currentIndex < snapshots.length - 1
      const canRedo = currentIndex > 0
      onUndoStateChange(canUndo, canRedo)
    }
  }, [currentIndex, snapshots.length, onUndoStateChange])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === "z" && !event.shiftKey) {
          event.preventDefault()
          handleUndo()
        } else if (event.key === "Z" && event.shiftKey) {
          event.preventDefault()
          handleRedo()
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleUndo, handleRedo])

  useEffect(() => {
    if (currentColors.length > 0) {
      const timeoutId = setTimeout(() => {
        const lastSnapshot = snapshots[0]
        const colorsChanged = !lastSnapshot || colorsHaveChanged(lastSnapshot.colors, currentColors)
        if (colorsChanged) {
          createSnapshot(currentColors)
        }
      }, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [currentColors, snapshots])

  if (snapshots.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "20px", color: "#999" }}>
        <div style={{ fontSize: "14px" }}>No history yet</div>
        <div style={{ fontSize: "12px", marginTop: "4px" }}>
          Changes will be saved automatically
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <Collapse defaultActiveKey={[todayKey]} ghost>
          {groupedSnapshots.map((group) => (
            <Panel
              key={group.dateKey}
              header={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "14px", fontWeight: "500" }}>
                    {group.date.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              }
            >
              <List
                dataSource={group.snapshots}
                style={{ padding: "0px 4px" }}
                renderItem={(snapshot: any) => (
                  <List.Item
                    style={{
                      border: "none",
                      cursor: "pointer",
                      borderRadius: "4px",
                      transition: "background-color 0.2s",
                      marginBottom: "4px",
                      padding: "0px 4px",
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLDivElement).style.backgroundColor = "#f5f5f5"
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"
                    }}
                    onClick={() => handleApplySnapshot(snapshot)}
                  >
                    <div style={{ width: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                        <span style={{ fontSize: "10px", color: "#999" }}>
                          {new Date(snapshot.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <SimplePaletteBox colors={snapshot.colors} style={{ height: "140px" }} />
                    </div>
                  </List.Item>
                )}
                locale={{ emptyText: "No snapshots for this date" }}
              />
            </Panel>
          ))}
        </Collapse>
      </div>

      {snapshots.length > 0 && (
        <div
          style={{
            borderTop: "1px solid #f0f0f0",
            fontSize: "12px",
            color: "#666",
            textAlign: "center",
          }}
        >
          <div>
            {snapshots.length} of {MAX_SNAPSHOTS} snapshots across {groupedSnapshots.length} day
            {groupedSnapshots.length !== 1 ? "s" : ""}
          </div>
          <div style={{ marginTop: "4px", fontSize: "10px", color: "#999" }}>
            {currentIndex < snapshots.length - 1 ? "Ctrl+Z to undo" : ""}
            {currentIndex < snapshots.length - 1 && currentIndex > 0 ? " • " : ""}
            {currentIndex > 0 ? "Ctrl+Shift+Z to redo" : ""}
          </div>
        </div>
      )}
    </div>
  )
}

export default PaletteHistory
