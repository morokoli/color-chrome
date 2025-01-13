import { FC, useCallback, useState } from 'react'
import { AddColorRequest, AddColorResponse } from '@/v2/types/api'
import { useGlobalState } from '@/v2/hooks/useGlobalState'
import { useToast } from '@/v2/hooks/useToast'
import { getPageURL } from '@/v2/helpers/url'
import useEyeDropper from 'use-eye-dropper'
import { useAPI } from '@/v2/hooks/useAPI'
import { config } from '@/v2/others/config'
import { colors } from '@/helpers/colors'
import classNames from 'classnames'

import ColorCodeButtons from './ColorCodeButtons';

import homeIcon from '@/v2/assets/images/icons/home.svg'
import pickIcon from '@/v2/assets/images/icons/menu/pick.svg'
import commentIcon from '@/v2/assets/images/icons/menu/comment.svg'

interface Props {
  setTab: (tab: string | null) => void;
  selected: null | string;
  copyToClipboard: (text: string, selection: null | string) => void
}

const PickPanel: FC<Props> = ({ setTab, selected, copyToClipboard }) => {
  const toast = useToast()
  const { open } = useEyeDropper()
  const { state, dispatch } = useGlobalState()
  const { color, files, selectedFile } = state;
  const [isPanelFull, setIsPanelFull] = useState(true)
  const isIconInvert = color && colors.isDark(color);

  const addColor = useAPI<AddColorRequest, AddColorResponse>({
    url: config.api.endpoints.addColor,
    method: "POST",
  })

  const selectedFileData = files.find(file => file.spreadsheetId === selectedFile);

  const addColorToFile = (color: string) => {
    getPageURL().then((url) => {
      addColor
      .call({
        spreadsheetId: selectedFile!,
        sheetName: selectedFileData?.sheets?.[0]?.name || '',
        sheetId: selectedFileData?.sheets?.[0]?.id || null!,
        row: {
          timestamp: new Date().valueOf(),
          url: url!,
          hex: color,
          hsl: colors.hexToHSL(color),
          rgb: colors.hexToRGB(color),
          comments: '',
          ranking: '',
          slashNaming: '',
          projectName: '',
          additionalColumns: [],
        },
      })
      .then(() => {
        toast.display("success", "Color saved successfully")
      })
      .catch((err) => toast.display("error", err))

    });
  };

  const openPicker = async () => {
    try {
      const color = await open()
      dispatch({ type: "SET_COLOR", payload: color.sRGBHex })
      dispatch({ type: "ADD_COLOR_HISTORY", payload: color.sRGBHex })
      copyToClipboard?.(color.sRGBHex, "HEX")

      if (selectedFile) {
        addColorToFile(color.sRGBHex);
      }
    } catch (e) {
      console.log(e)
    }
  }

  const pickColor = useCallback(() => {
    openPicker()
  }, [open])

  return (
    <div id='container' className={`${isPanelFull ? 'w-fit' : 'w-[300px]'} h-[50px] border-2 flex items-center justify-between`}>
      <div
        id='pickBtn'
        onClick={pickColor}
        className="h-[40px] w-[100px] flex items-center cursor-pointer ml-3 mr-3 border-2 justify-center"
        style={{ backgroundColor: color! }}
      >
        <div className={`h-[35px] w-[35px] ${isIconInvert && 'filter invert'}`}>
          <img src={pickIcon} alt="pick" className="h-full w-full" />
        </div>
      </div>

      <ColorCodeButtons isPanelFull={isPanelFull} selected={selected!} copyToClipboard={copyToClipboard} />

      <button
        onClick={() => setTab('COMMENT')}
        className="h-[40px] w-[60px] border-2 text-white text-[20px] mr-3 flex justify-center"
      >
        <img src={commentIcon} alt="comment" className="h-[40px] w-[40px]" />
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
