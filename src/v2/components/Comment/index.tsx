import { FC, useState } from 'react'
import { UpdateRowRequest, UpdateRowResponse } from '@/v2/types/api'
import { useGlobalState } from '@/v2/hooks/useGlobalState'
import { useToast } from '@/v2/hooks/useToast'
import { colors } from '@/v2/helpers/colors'
import { config } from '@/v2/others/config'
import { useAPI } from '@/v2/hooks/useAPI'

import Left from './Left'
import Right from './Right'

interface Props {
  selected: null | string;
  setTab: (tab: string | null) => void;
  copyToClipboard: (text: string, selection: null | string) => void
}

const initialState = {
  url: '',
  ranking: 0,
  comments: '',
  slashNaming: '',
  tags: '',
};

const Comment: FC<Props> = ({ setTab, selected, copyToClipboard }) => {
    const toast = useToast()
    const { state } = useGlobalState();
    const { colorHistory } = state;
    const [ selectedColor, setSelectedColor ] = useState<number | null>(null);
    const [ addNewColorLoading, setAddNewColorLoading ] = useState<boolean>(false);
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    const [formData, setFormData] = useState<any>(initialState);
    const [ checkValidFlag, setCheckValidFlag ] = useState<boolean>(false);

    const { call, isStatusLoading} = useAPI<UpdateRowRequest, UpdateRowResponse>({
      url: config.api.endpoints.updateRow,
      method: "PUT",
    })

    const handleSave = (newColor?:string) => {
      const selectedFileData = state.files.find(item => item.spreadsheetId === state.selectedFile);
      const selectedColorHEX = newColor ? newColor : colorHistory[selectedColor!];
  
      // Step 1: Find keys from the input object that are not in initialState
      const additionalKeys = Object.keys(formData).filter(key => !(key in initialState));
  
      // Step 2: Convert to the desired array of objects
      const additionalColumns = additionalKeys.map(key => ({
        name: key,
        value: formData[key]
      }));

      call({
        spreadsheetId: state.selectedFile!,
        sheetName: selectedFileData?.sheets?.[0]?.name || '',
        sheetId: selectedFileData?.sheets?.[0]?.id || 0,
        rowIndex: selectedColor! + 1,
        row: {
          timestamp: new Date().valueOf(),
          url: formData.url,
          hex: selectedColorHEX,
          slashNaming: formData.slashNaming,
          tags: formData.tags,
          hsl: colors.hexToHSL(selectedColorHEX),
          rgb: colors.hexToRGB(selectedColorHEX),
          comments: formData?.comments || '',
          ranking: String(formData?.ranking) || '',
          additionalColumns: additionalColumns,
        },
      })
      .then(() => {
        setCheckValidFlag(true)
        toast.display("success", "Color updated successfully")
      })
      .catch(() => {
        toast.display("error", "Failed to update color")
      })
    };

    return (
      <div className="border-2 flex w-[800px]">
        <Left
          setTab={setTab}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          selected={selected}
          copyToClipboard={copyToClipboard}
          setCheckValidFlag={setCheckValidFlag}
          setAddNewColorLoading={setAddNewColorLoading}
        />
        <Right
          setTab={setTab}
          selectedColor={selectedColor}
          initialState={initialState}
          handleSave={handleSave}
          loading={isStatusLoading || addNewColorLoading}
          formData={formData}
          setFormData={setFormData}
          checkValidFlag={checkValidFlag}
          setCheckValidFlag={setCheckValidFlag}
        />
     </div>
    )
  }

export default Comment;
