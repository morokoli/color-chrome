import { FC, useCallback, useState } from "react"
import ColorCodeButtons from './ColorCodeButtons';
import useEyeDropper from "use-eye-dropper";
import classNames from "classnames"
import { colors } from "@/helpers/colors"
import { useGlobalState } from "@/v2/hooks/useGlobalState"

import pickIcon from "@/v2/assets/images/icons/menu/pick.svg"
import homeIcon from "@/v2/assets/images/icons/home.svg"
import commentIcon from "@/v2/assets/images/icons/menu/comment.svg"

interface Props {
  setTab: (tab: string | null) => void;
  selected: null | string;
  copyToClipboard: (text: string, selection: null | string) => void
}

const PickPanel: FC<Props> = ({ setTab, selected, copyToClipboard }) => {
  const { open } = useEyeDropper()
  const { state, dispatch } = useGlobalState()
  const [isPanelFull, setIsPanelFull] = useState(true)
  const isIconInvert = state.color && colors.isDark(state.color);

  const openPicker = async () => {
    try {
      const color = await open()
      dispatch({ type: "SET_COLOR", payload: color.sRGBHex })
      copyToClipboard?.(color.sRGBHex, "HEX")
    } catch (e) {
      console.log(e)
    }
  }

  const pickColor = useCallback(() => {
    openPicker()
  }, [open])

  return (
    <div className={`${isPanelFull ? 'w-fit' : 'w-[300px]'} h-[50px] border-2 flex items-center justify-between`}>
      <div
        onClick={pickColor}
        className="h-[40px] w-[100px] flex items-center cursor-pointer ml-3 mr-3 border-2 justify-center"
        style={{ backgroundColor: state.color! }}
      >
        <div className={`h-[35px] w-[35px] ${isIconInvert && 'filter invert'}`}>
          <img src={pickIcon} alt="pick" className="h-full w-full" />
        </div>
      </div>

      <ColorCodeButtons isPanelFull={isPanelFull} selected={selected!} copyToClipboard={copyToClipboard} />

      <button
        onClick={() => {}}
        className="h-[40px] w-[60px] border-2 text-white text-[20px] mr-3 flex justify-center"
      >
        <img src={commentIcon} alt="pick" className="h-[40px] w-[40px]" />
      </button>

      <div className="h-full w-[60px] border-l-2 border-black flex items-center justify-center">
        <div className="h-[40px] w-[40px] cursor-pointer" onClick={() => setTab(null)}>
          <img src={homeIcon} alt="home" className="h-full w-full" />
        </div>
      </div>
      <div onClick={() => setIsPanelFull(!isPanelFull)} className={classNames(`cursor-pointer arrow ${isPanelFull ? 'left' : 'right' }`)} />
    </div>
  )
}

export default PickPanel;
