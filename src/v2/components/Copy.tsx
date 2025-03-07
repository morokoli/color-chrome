import { FC} from "react"
import { useGlobalState } from "@/v2/hooks/useGlobalState"

import PickBtn from "./common/PickBtn"
import ColorCodeButtons from "./ColorCodeButtons"


interface Props {
  selected: null | string
  setTab: (tab: string | null) => void
  copyToClipboard: (text: string, selection: null | string) => void
}

const Copy: FC<Props> = ({ setTab, selected, copyToClipboard}) => {
  const { state } = useGlobalState()
  const { color } = state
  const handlePickBtnClick = () => {
    setTab("PICK_PANEL")
  }

  return (
    <div className="border-2 flex justify-between w-[170px] flex-col p-[10px]">
      <div className="w-full h-full mb-2" >
        <PickBtn onClick={handlePickBtnClick}/>
      </div>
      <div className="w-full h-full mb-2">
        <ColorCodeButtons
          isCopy
          isPanelOpen
          color={color!}
          selected={selected!}
          copyToClipboard={copyToClipboard}
        />
      </div>
      <div className="w-full h-full mt-2 flex justify-center">
        <button
          onClick={() => setTab(null)}
          className="h-[40px] w-[100px] text-black text-[16px] border border-solid border-black"
        >
          Back
        </button>
      </div>
    </div>
  )
}

export default Copy
