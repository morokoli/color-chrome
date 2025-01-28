import { FC, useState, useEffect } from 'react'
import { UpdateRowRequest, UpdateRowResponse } from '@/v2/types/api'
import { useGlobalState } from '@/v2/hooks/useGlobalState'
import { useToast } from '@/v2/hooks/useToast'
import { colors } from '@/v2/helpers/colors'
import { config } from '@/v2/others/config'
import { useAPI } from '@/v2/hooks/useAPI'

import Input from './Input'
import Select from './Select'
import RangeSlider from './RangeSlider'
import ColorHistory from './ColorHistory'
import AddColumnForm from './AddColumnForm'
import ColorCodeButtons from './ColorCodeButtons';

import logoIcon from '@/v2/assets/images/logo.png'

interface Props {
  selected: null | string;
  setTab: (tab: string | null) => void;
  copyToClipboard: (text: string, selection: null | string) => void
}

const colData = [
  {
    name: 'url',
    placeholder: 'Url',
  },
  {
    name: 'slashNaming',
    placeholder: 'Slash Naming ex: a/b/c',
  },
  {
    name: 'projectName',
    placeholder: 'Project or Brand Name',
  },
];

const additionalColumns = [
  {name: 'comments'},
  {name: 'ranking'},
];

const initialState = {
  url: '',
  ranking: 0,
  comments: '',
  slashNaming: '',
  projectName: '',
};

const Comment: FC<Props> = ({ setTab, selected, copyToClipboard }) => {
  const toast = useToast()
  const [error, setError] = useState<boolean>(false);
  const [ selectedColor, setSelectedColor ] = useState<number | null>(null);
  const [ checkValidFlag, setCheckValidFlag ] = useState<boolean>(false);
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  const [formData, setFormData] = useState<any>(initialState);

  const { state, dispatch } = useGlobalState();
  const { selectedFile, parsedData, newColumns, colorHistory } = state;
  const isDisable = !selectedFile || !selectedColor;

  const { call, isStatusLoading} = useAPI<UpdateRowRequest, UpdateRowResponse>({
    url: config.api.endpoints.updateRow,
    method: "PUT",
  })

  const convertFromCamelCase = (str: string) => {
    // Convert the first character to uppercase
    // Replace any occurrences of uppercase letters with a space and the lowercase version of the letter
    return str
      .replace(/([A-Z])/g, ' $1') // Adds a space before uppercase letters
      .replace(/^./, (match) => match.toUpperCase()) // Capitalizes the first letter
      .trim(); // Remove any leading/trailing spaces
  }
  
  const handleSave = () => {
    const selectedFileData = state.files.find(item => item.spreadsheetId === state.selectedFile);
    const selectedColorHEX = colorHistory[selectedColor!];

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
        projectName: formData.projectName,
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
    .catch(() => toast.display("error", "Failed to update color"))
  };

  const handleChange = (event: any) => {
    const { name, value } = event.target;

    setFormData((prevState: any) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const getAdditionalColumns = (columns: any) => {
    const obj = columns.reduce((acc: any, curr: any) => {
      acc[curr.name] = curr.value;
      return acc;
  }, {});
  return obj;
  };

  const getInputValue = (inputName: string) => {
    if (selectedColor === null) return
    const valuesArr = parsedData.filter((_data, index) => selectedColor === index);
    const transformedArr = valuesArr.map(item => ({...item, ...getAdditionalColumns(item.additionalColumns)}))
    const filtered = transformedArr.map((color: any) => color?.[inputName]);
    const inputString = filtered.every(item => item === filtered[0]) ? filtered[0] : `Several ${convertFromCamelCase(inputName)}`;

    setFormData((prevState: any) => ({
      ...prevState,
      [inputName]: inputString
    }));
  };

  const handleSuccessRemoveColumn = (colName: string) => {
    const newColumnsArr = state?.newColumns?.filter(column => column.name !== colName)
    dispatch({ type: "CLEAR_NEW_COLUMNS" })

    if (newColumnsArr.length > 0) {
      newColumnsArr.forEach(column => dispatch({ type: "ADD_NEW_COLUMN", payload: column }))
    }
  };

  const handleErrorRemoveColumn = () => {
    toast.display("error", "Something went wrong, please relogin and try again")
  };

  useEffect(() => {
    const colNamesArr = [...colData, ...additionalColumns, ...newColumns]

    if (selectedColor) {
      colNamesArr.forEach(data => getInputValue(data.name))
    } else {
      setFormData(initialState)
    }
 
  }, [selectedColor, newColumns])

  useEffect(() => {
    if (!selectedFile) {
      setFormData(initialState)
    }
  }, [selectedFile])

  return (
    <div className="border-2 flex flex-col w-[275px] min-h-[370px] p-1.5 relative">
      <ColorHistory
        setTab={setTab}
        selectedColor={selectedColor!}
        setSelectedColor={setSelectedColor}
      />
      <Select
        isComment
        setTab={setTab}
        ckeckFlag={checkValidFlag}
        setCheckValidFlag={setCheckValidFlag}
        placeholder='Add Google Sheet to Save Colors'
      />
      <div className='mb-3'>
        <ColorCodeButtons
          isCompact
          isPanelFull={true}
          selected={selected!}
          copyToClipboard={copyToClipboard}
          color={colorHistory[selectedColor!]}
        />
      </div>


      {colData.map(
        data => (
          <Input
            error={error}
            key={data.name}
            name={data.name}
            setError={setError}
            disabled={isDisable}
            onChange={handleChange}
            value={formData[data.name]}
            placeholder={data.placeholder}
          />
        )
      )}
      <textarea
        name='comments'
        placeholder='Comment'
        disabled={isDisable}
        onChange={handleChange}
        value={formData['comments']}
        className="w-full h-[24px] mb-3 min-h-[25px] bg-slate-200 px-2 py-1 text-xs focus:outline-none border border-slate-200 focus:border-slate-700"
      />
      {state?.newColumns?.map(
        (data, index) => (
          <Input
            name={data.name}
            hasRemoveBtn
            disabled={isDisable}
            key={data.name + index}
            placeholder={data.name}
            onChange={handleChange}
            value={formData[data.name] || ''}
            handleError={handleErrorRemoveColumn}
            handleSuccess={() => handleSuccessRemoveColumn(data.name)}
          />
        )
      )}
      <AddColumnForm disabled={!selectedFile} />
      <RangeSlider disabled={isDisable} onChange={handleChange} value={+formData['ranking']}/>

      <div className="flex absolute bottom-1.5  justify-between w-[95%]">

      <div className="flex items-center">
        <div className="h-[27px] w-[30px] mr-1.5">
          <img src={logoIcon} alt="pick" className="w-full h-full" />
        </div>

        <a href='https://colorwithyou.com/' className="text-xs underline text-blue-600">
          colorwithyou.com
        </a>
      </div>

      <button
        onClick={handleSave}
        disabled={isDisable || error}
        className="h-[40px] w-[100px] text-white text-[16px] bg-black disabled:bg-gray-400"
      >
        {isStatusLoading ? 'Loading...' : 'Save'}
      </button>

      </div>

    </div>
  )
}

export default Comment;
