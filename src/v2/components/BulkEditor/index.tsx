import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import Left from "./Left"
import Right from "./Right"
import { CollapsibleBoxHorizontal } from "../CollapsibleBoxHorizontal"

interface Props {
  setTab: (tab: string | null) => void
}

// Check if there are any saved folder selections in localStorage
const getInitialLeftOpenState = (): boolean => {
//   try {
//     const savedFolders = localStorage.getItem('bulk_editor_selected_folders')
//     if (savedFolders) {
//       const parsed = JSON.parse(savedFolders)
//       if (Array.isArray(parsed) && parsed.length > 0) {
//         return true
//       }
//     }
//   } catch (e) {
//     // Ignore errors
//   }
  // Always show left panel initially so users can select folders
  return true
}

const BulkEditor: React.FC<Props> = ({ setTab }) => {
  const [isLeftOpen, setIsLeftOpen] = useState(getInitialLeftOpenState)
  return (
    <div
      className="bg-white rounded-md shadow-sm border border-gray-200 overflow-visible"
      style={{
        width: isLeftOpen ? "800px" : "400px",
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
        <span className="text-[13px] font-medium text-gray-800">Bulk Editor</span>
      </div>

      <div className="flex" style={{ height: "500px" }}>
        <CollapsibleBoxHorizontal
          isOpen={true}
          maxWidth="400px"
          transitionDuration={300}
        >
          <div className="flex flex-row flex-1 min-w-0 overflow-y-auto h-full border-r border-gray-200">
            <Left setIsLeftOpen={setIsLeftOpen} />
          </div>
        </CollapsibleBoxHorizontal>
        <div className="flex-1 min-w-0 overflow-hidden">
          <Right />
        </div>
      </div>
    </div>
  )
}

export default BulkEditor
