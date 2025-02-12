import { FC, useEffect, useState } from 'react'
import { AddColorRequest, AddColorResponse } from '@/v2/types/api'
import { useGlobalState } from '@/v2/hooks/useGlobalState'
import { useToast } from '@/v2/hooks/useToast'
import { PhotoshopPicker } from 'react-color'
import { getPageURL } from '@/v2/helpers/url'
import { colors } from '@/v2/helpers/colors'
import { config } from '@/v2/others/config'
import { useAPI } from '@/v2/hooks/useAPI'

import ColorHistory from '../ColorHistory'
import ColorCodeButtons from '../ColorCodeButtons';

interface Props {
  selectedColor: null | number;
  setSelectedColor: (colorId: number | null) => void;
  selected: null | string;
  copyToClipboard: (text: string, selection: null | string) => void
  handleSave: (color: string) => void;
  setCheckValidFlag: (value: boolean) => void
  setAddNewColorLoading: (value: boolean) => void
}

const Left: FC<Props> = ({
  selectedColor,
  setSelectedColor,
  selected,
  copyToClipboard,
  handleSave,
  setCheckValidFlag,
  setAddNewColorLoading,
}) => {
  const toast = useToast();
  const { state } = useGlobalState();
  const { files, selectedFile, colorHistory } = state;
  const [colorFromPallete, setColorFromPallete] = useState<string>('#fff');
  const [currentColor, setCurrentColor] = useState<string>('#fff');

  const addColor = useAPI<AddColorRequest, AddColorResponse>({
    url: config.api.endpoints.addColor,
    method: "POST",
  })

  const selectedFileData = files.find(file => file.spreadsheetId === selectedFile);

  const addColorToFile = (color: string) => {
    setAddNewColorLoading(true);
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
        setAddNewColorLoading(false);
        setCheckValidFlag(true)
        toast.display("success", "Color saved successfully")
      })
      .catch((err) => toast.display("error", err))
    });
  };

  const handleClickAccept = () => {
    if (selectedColor === null) {
      addColorToFile(colorFromPallete);
    } else {
      handleSave(colorFromPallete);
      setCurrentColor(colorFromPallete);
    }
  };

  useEffect(() => {
    if (selectedColor !== null) {
      setCurrentColor(colorHistory[selectedColor]);
      setColorFromPallete(colorHistory[selectedColor]);
    }
  }, [selectedColor])
  
  return (
    <div className="relative">
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
        />
      </div>
      <div className='absolute bottom-[6px] left-[40px]'>
        <ColorCodeButtons
          isCompact
          isPanelFull={true}
          selected={selected!}
          copyToClipboard={copyToClipboard}
          color={colorHistory[selectedColor!]}
        />
      </div>
    </div>
  )
}

export default Left;
