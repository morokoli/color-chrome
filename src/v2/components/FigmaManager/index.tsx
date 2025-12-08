import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import Left from "./Left"
import Right from "./Right"
import { CollapsibleBoxHorizontal } from "../CollapsibleBoxHorizontal"

interface Props {
  setTab: (tab: string | null) => void
}

// Check if there are any saved Figma file selections in localStorage
const getInitialLeftOpenState = (): boolean => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('figma_selected_files_')) {
        const value = localStorage.getItem(key)
        if (value) {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed) && parsed.length > 0) {
            return true
          }
        }
      }
    }
  } catch (e) {
    // Ignore errors
  }
  return false
}

const FigmaManager: React.FC<Props> = ({ setTab }) => {
  const [isLeftOpen, setIsLeftOpen] = useState(getInitialLeftOpenState)
  return (
    <div
      className="bg-white rounded-md shadow-sm border border-gray-200 overflow-visible"
      style={{
        width: isLeftOpen ? "700px" : "360px",
        transition: "width 0.3s ease-in-out",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200">
        <button
          onClick={() => setTab(null)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <span className="text-[13px] font-medium text-gray-800">Figma</span>
      </div>

      <div className="flex">
        <CollapsibleBoxHorizontal
          isOpen={isLeftOpen}
          maxWidth="340px"
          transitionDuration={300}
          renderHidden={true}
        >
          <div className="flex flex-row flex-1 min-w-0 overflow-y-auto max-h-[450px] border-r border-gray-200">
            <Left setTab={setTab} />
          </div>
        </CollapsibleBoxHorizontal>
        <div className="flex-1 min-w-0 overflow-visible">
          <Right setIsLeftOpen={setIsLeftOpen} />
        </div>
      </div>
    </div>
  )
}

export default FigmaManager
