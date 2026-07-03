import { FC, useCallback, useEffect, useState } from "react"
import { Camera, Loader2 } from "lucide-react"
import SectionHeader from "../common/SectionHeader"
import SnapshotEditor from "./SnapshotEditor"
import { SnapshotImageData } from "./types"

interface Props {
  setTab: (tab: string | null) => void
  onPickColor?: () => void
  onPickColorFromBrowser?: () => void
  onStartSnapshot?: () => void
}

const Snapshot: FC<Props> = ({
  setTab,
  onPickColor,
  onPickColorFromBrowser,
  onStartSnapshot,
}) => {
  const [snapshot, setSnapshot] = useState<SnapshotImageData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadSnapshot = useCallback(() => {
    chrome.storage.local.get(["snapshotImage"], (result) => {
      setSnapshot((result.snapshotImage as SnapshotImageData) ?? null)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    loadSnapshot()
  }, [loadSnapshot])

  useEffect(() => {
    const handleChange = (changes: {
      [key: string]: chrome.storage.StorageChange
    }) => {
      if (changes.snapshotImage?.newValue) {
        setSnapshot(changes.snapshotImage.newValue as SnapshotImageData)
        setLoading(false)
      }
    }
    chrome.storage.onChanged.addListener(handleChange)
    return () => chrome.storage.onChanged.removeListener(handleChange)
  }, [])

  if (loading) {
    return (
      <div className="snapshot-container w-[800px] h-[600px] box-border overflow-hidden flex items-center justify-center bg-white shrink-0">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!snapshot) {
    return (
      <div className="snapshot-container w-[800px] h-[600px] box-border overflow-hidden flex flex-col bg-white shrink-0">
        <SectionHeader
          title="Snapshot"
          setTab={setTab}
          onPickColor={onPickColor}
          onPickColorFromBrowser={onPickColorFromBrowser}
          onStartSnapshot={onStartSnapshot}
          className="w-[800px]"
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <Camera className="w-7 h-7 text-gray-500" />
          </div>
          <div>
            <p className="text-[14px] font-medium text-gray-800">
              Capture a page snapshot
            </p>
            <p className="text-[12px] text-gray-500 mt-1 max-w-[320px]">
              Pick colors from any region of the current page with draggable
              magnifier points.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartSnapshot}
            className="mt-2 px-5 py-2 text-[13px] font-semibold rounded-full bg-[#2680EB] text-white hover:bg-[#1473E6] transition-colors"
          >
            Start capture
          </button>
        </div>
      </div>
    )
  }

  return (
    <SnapshotEditor
      snapshot={snapshot}
      setTab={setTab}
      onPickColor={onPickColor}
      onPickColorFromBrowser={onPickColorFromBrowser}
      onStartSnapshot={onStartSnapshot}
    />
  )
}

export default Snapshot
