import Left from "./Left"
import Right from "./Right"
import { CollapsibleBoxHorizontal } from "../CollapsibleBoxHorizontal"
import SectionHeader from "../common/SectionHeader"

interface Props {
  setTab: (tab: string | null) => void
  onPickColor?: () => void
  onPickColorFromBrowser?: () => void
}

const BulkEditor: React.FC<Props> = ({ setTab, onPickColor, onPickColorFromBrowser }) => {
  return (
    <div
      className="bg-white rounded-md shadow-sm border border-gray-200 overflow-visible"
      style={{
        width: "800px",
        transition: "width 0.3s ease-in-out",
      }}
    >
      <SectionHeader
        title="Bulk Editor"
        setTab={setTab}
        onPickColor={onPickColor}
        onPickColorFromBrowser={onPickColorFromBrowser}
      />

      <div className="flex" style={{ height: "500px" }}>
        <CollapsibleBoxHorizontal
          isOpen={true}
          maxWidth="400px"
          transitionDuration={300}
        >
          <div className="flex flex-row flex-1 min-w-0 overflow-y-auto h-full border-r border-gray-200">
            <Left />
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
