import { useState } from "react"
import Left from "./Left"
import Right from "./Right"
import { CollapsibleBoxHorizontal } from "../CollapsibleBoxHorizontal"

interface Props {
  setTab: (tab: string | null) => void
}

const FigmaManager: React.FC<Props> = ({ setTab }) => {
  const [isLeftOpen, setIsLeftOpen] = useState(false)
  return (
    <div
      className={"border-2 flex w-[800px] max-h-[566px] h-full"}
      style={{
        width: isLeftOpen ? "800px" : "400px",
        transition: "width 0.3s ease-in-out",
      }}
    >
      <CollapsibleBoxHorizontal
        isOpen={isLeftOpen}
        maxWidth="400px"
        transitionDuration={300}
        renderHidden={true}
      >
        <div className="flex flex-row flex-1 min-w-0 overflow-y-scroll">
          <Left setTab={setTab} />
        </div>
      </CollapsibleBoxHorizontal>
      <div className="flex-1 min-w-0 overflow-y-scroll">
        <Right setIsLeftOpen={setIsLeftOpen} />
      </div>
    </div>
  )
}

export default FigmaManager
