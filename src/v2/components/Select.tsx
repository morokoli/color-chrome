import { FC, ChangeEvent, useState, useEffect, useMemo } from 'react';
import { CheckSheetValidRequest, CheckSheetValidResponse } from '@/v2/types/api'
import { useGlobalState } from '@/v2/hooks/useGlobalState'
import { useToast } from '@/v2/hooks/useToast'
import { RowData } from '@/v2/types/general'
import { config } from '@/v2/others/config'
import { useAPI } from '@/v2/hooks/useAPI'
import { File} from '@/v2/types/general'

interface ISelectProps {
  setTab?: (value: string) =>  void;
  isComment?: boolean;
  ckeckFlag?: boolean;
  setCheckValidFlag?: (value: boolean) => void;
  placeholder: string;
}

const Select: FC<ISelectProps> = ({ setTab, isComment = false, placeholder, setCheckValidFlag, ckeckFlag }) => {
  const toast = useToast()
  const { state, dispatch } = useGlobalState();
  const { selectedFile, files, user } = state;
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const isShowTooltip =
    (showTooltip && files.length > 0 && !selectedFile)||
    (showTooltip && !user) ||
    (showTooltip && user && files.length === 0);

  const tooltipText = useMemo(() => {
    let text = '';
    if (!user) {
      text = 'Click to login';
    } else if (user && files.length === 0) {
      text = 'Click to add sheet'
    }
    return text;
  }, [user, files])

  const checkSheetValid = useAPI<
    CheckSheetValidRequest,
    CheckSheetValidResponse
  >({
    url: config.api.endpoints.checkSheetValid,
    method: "POST",
  })

  const getParsedDataFromFile = (fileId: string) => {
    const selectedFileData = files.find(item => item.spreadsheetId === fileId);
  
    if (!selectedFileData) return

    checkSheetValid
      .call({
        spreadsheetId: fileId,
        sheetId: selectedFileData.sheets?.[0].id,
        sheetName: `'${selectedFileData.sheets?.[0].name}'`,
      })
      .then((data) => {
        dispatch({ type: "CLEAR_COLOR_HISTORY" })
        dispatch({ type: "CLEAR_NEW_COLUMNS" })
        dispatch({ type: "SET_PARSED_DATA", payload: data.sheetData.parsed })

        const colorsArr = data?.sheetData?.parsed?.map((color: RowData) => color.hex!);

        if (colorsArr?.length > 0) {
          colorsArr.forEach(color => dispatch({ type: "ADD_COLOR_HISTORY", payload: color }))
        }

        const newColumnsArr = data?.sheetData?.parsed?.[0]?.additionalColumns;

        if (newColumnsArr?.length > 0) {
          newColumnsArr.forEach(column => dispatch({ type: "ADD_NEW_COLUMN", payload: column }))
        }

        // toast.display("success", "Spreadsheet open successfully")
      })
      .catch((err) => {
        console.log('ERR', err)
        toast.display(
          "error",
          "Provided spreadsheet does not have valid format",
        )
      }
 
      )
  };

  // const onClickHandler = () => {
  //   if (!selectedFile && selectedFile !== '' && setTab) {
  //     setTab('ADD_SHEET')
  //   }

  //   return null
  // }

  const onClickHandler = () => {
    if (!selectedFile  && setTab) {
      setTab('ADD_SHEET')
    }

    return null
  }  

  const onChange = (e: ChangeEvent<HTMLSelectElement>) => {
    dispatch({ type: "SET_SELECTED_FILE", payload: e?.target?.value });
  };

  useEffect(() => {
    if (selectedFile !== '' && isComment || ckeckFlag) {
      getParsedDataFromFile(selectedFile!);
    } else {
      dispatch({ type: "CLEAR_NEW_COLUMNS" })
      dispatch({ type: "SET_PARSED_DATA", payload: [] })
    }
    if (setCheckValidFlag) {
      setCheckValidFlag(false)
    }
  }, [selectedFile, ckeckFlag])

  return (
    <div
      onClick={onClickHandler}
      className="w-full h-[24px] mb-3 relative z-5"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <select
        value={selectedFile || ''}
        onChange={onChange}
        className="select px-1 py-1 w-full text-[11px] text-slate-800 bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none border border-slate-200 focus:border-slate-700"
      >
        <option value="">{placeholder}</option>
        {files.map((item: File) => (
          <option value={item.spreadsheetId} key={item.fileName + item.sheets?.[0]?.name} >
            {item.fileName + ' - ' + item.sheets?.[0]?.name}
          </option>
        ))}
      </select>
      {isShowTooltip && tooltipText !== '' && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-[9px] rounded py-1 px-2 z-10">
          {tooltipText}
        </div>
      )}
    </div>
  )
};

export default Select;
