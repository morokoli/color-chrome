import { FC, useEffect, useState } from 'react'
import { AddColorRequest, AddColorResponse } from '@/v2/types/api'
import { useGlobalState } from '@/v2/hooks/useGlobalState'
import { useToast } from '@/v2/hooks/useToast'
import { PhotoshopPicker } from 'react-color'
import { getPageURL } from '@/v2/helpers/url'
import { colors } from '@/v2/helpers/colors'
import { config } from '@/v2/others/config'
import { useAPI } from '@/v2/hooks/useAPI'

import PickBtn from '../common/PickBtn'
import ColorHistory from '../ColorHistory'
import ColorCodeButtons from '../ColorCodeButtons';

interface Props {
  selectedColor: null | number;
  setSelectedColor: (colorId: number | null) => void;
  selected: null | string;
  copyToClipboard: (text: string, selection: null | string) => void
  setCheckValidFlag: (value: boolean) => void
  setAddNewColorLoading: (value: boolean) => void
  setTab: (tab: string | null) => void;
}

const Left: FC<Props> = ({
  setTab,
  selectedColor,
  setSelectedColor,
  selected,
  copyToClipboard,
  setCheckValidFlag,
  setAddNewColorLoading,
}) => {
  const toast = useToast();
  const { state, dispatch } = useGlobalState();
  const { files, selectedFile, colorHistory } = state;
  const [colorFromPallete, setColorFromPallete] = useState<string>('#fff');
  const [currentColor, setCurrentColor] = useState<string>('#fff');
  const [isManualInput, setIsManualInput] = useState(false);

  const addColor = useAPI<AddColorRequest, AddColorResponse>({
    url: config.api.endpoints.addColor,
    method: "POST",
  })

  const selectedFileData = files.find(file => file.spreadsheetId === selectedFile);

  const addColorToFile = (color: string) => {
    setAddNewColorLoading(true);
    getPageURL().then((url) => {
      const colorUrl = isManualInput ? 'Manual Input' : url;
      addColor
      .call({
        spreadsheetId: selectedFile!,
        sheetName: selectedFileData?.sheets?.[0]?.name || '',
        sheetId: selectedFileData?.sheets?.[0]?.id || null!,
        row: {
          timestamp: new Date().valueOf(),
          url: colorUrl!,
          hex: color,
          hsl: colors.hexToHSL(color),
          rgb: colors.hexToRGB(color),
          comments: '',
          ranking: '',
          slashNaming: '',
          tags: '',
          additionalColumns: [],
        },
      })
      .then(() => {
        setAddNewColorLoading(false);
        setCheckValidFlag(true)
        toast.display("success", "Color saved successfully")
      })
      .catch((err) => toast.display("error", err))
    });
  };

  const handleClickAccept = () => {
    if (!selectedFile) {
      dispatch({ type: "ADD_COLOR_HISTORY", payload: colorFromPallete })
      
    } else {
      addColorToFile(colorFromPallete);
    }

    setCurrentColor(colorFromPallete);
  };

  useEffect(() => {
    if (selectedColor !== null) {
      setCurrentColor(colorHistory[selectedColor]);
      setColorFromPallete(colorHistory[selectedColor]);
      setIsManualInput(true); 
    }
  }, [selectedColor, colorHistory])
  
  return (
    <div className="relative min-h-[423px]">
      <PhotoshopPicker
        color={colorFromPallete}
        onChange={color => setColorFromPallete(color.hex)}
        onAccept={handleClickAccept}
        onCancel={() => setColorFromPallete(currentColor)}
      />
      <div className='w-[56px] h-[34px] absolute left-[332px] top-[71px]' style={{ background: currentColor }}/>
      <div className='border-2 absolute right-[20px] top-[77px]'>
        <ColorHistory
          selectedColor={selectedColor!}
          setSelectedColor={setSelectedColor}
          setCurrentColor={setCurrentColor}
          setColorFromPallete={setColorFromPallete}
          setCheckValidFlag={setCheckValidFlag}
        />
      </div>
      <div className='absolute top-[326px] left-[15px] w-[385px]'>
        <ColorCodeButtons
          isCompact
          isPanelOpen={true}
          selected={selected!}
          copyToClipboard={copyToClipboard}
          color={colorHistory[selectedColor!]}
        />
      </div>
      <div className='h-[40px] w-[85px] absolute bottom-[5px] left-[15px]'>
        <PickBtn onSuccess={() => setCheckValidFlag(true)} onClick={() => setTab('PICK_PANEL')} />
      </div>
    </div>
  )
}

export default Left;
