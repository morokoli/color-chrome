import { FC, ChangeEvent, useState, useEffect, useMemo, useRef } from "react"
import { CheckSheetValidRequest, CheckSheetValidResponse } from "@/v2/types/api"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useToast } from "@/v2/hooks/useToast"
import { RowData } from "@/v2/types/general"
import { config } from "@/v2/others/config"
import { useAPI } from "@/v2/hooks/useAPI"
import { File } from "@/v2/types/general"

import downIcon from "@/v2/assets/images/icons/menu/downIcon.svg"

interface ISelectProps {
  setTab?: (value: string) => void
  isComment?: boolean
  ckeckFlag?: boolean
  setCheckValidFlag?: (value: boolean) => void
  placeholder: string
}

const Select: FC<ISelectProps> = ({
  setTab,
  isComment = false,
  placeholder,
  setCheckValidFlag,
  ckeckFlag,
}) => {
  const toast = useToast()
  const { state, dispatch } = useGlobalState()
  const { selectedFile, files, user } = state
  const [showTooltip, setShowTooltip] = useState<boolean>(false)
  const isShowTooltip =
    (showTooltip && files.length > 0 && !selectedFile) ||
    (showTooltip && !user) ||
    (showTooltip && user && files.length === 0)
  const selectRef = useRef<HTMLSelectElement>(null)

  const tooltipText = useMemo(() => {
    let text = ""
    if (!user) {
      text = "Click to login"
    } else if (user && files.length === 0) {
      text = "Click to add sheet"
    }
    return text
  }, [user, files])

  const checkSheetValid = useAPI<
    CheckSheetValidRequest,
    CheckSheetValidResponse
  >({
    url: config.api.endpoints.checkSheetValid,
    method: "POST",
    jwtToken: user?.jwtToken,
  })

  const getParsedDataFromFile = (fileId: string) => {
    const selectedFileData = files.find((item) => item.spreadsheetId === fileId)

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

        const colorsArr = data?.sheetData?.parsed?.map(
          (color: RowData) => color.hex!,
        )

        if (colorsArr?.length > 0) {
          colorsArr.forEach((color) =>
            dispatch({ type: "ADD_COLOR_HISTORY", payload: color }),
          )
        }

        const newColumnsArr = data?.sheetData?.parsed?.[0]?.additionalColumns

        if (newColumnsArr?.length > 0) {
          newColumnsArr.forEach((column) =>
            dispatch({ type: "ADD_NEW_COLUMN", payload: column }),
          )
        }

        // toast.display("success", "Spreadsheet open successfully")
      })
      .catch((err) => {
        console.log("ERR", err)
        toast.display(
          "error",
          "Provided spreadsheet does not have valid format",
        )
      })
  }

  const onClickHandler = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedFile && files.length === 0 && setTab) {
      setTab("ADD_SHEET")
    }

    return null
  }

  const onChange = (e: ChangeEvent<HTMLSelectElement>) => {
    dispatch({ type: "SET_SELECTED_FILE", payload: e?.target?.value })
    if (e.target.value === "" && setTab) {
      setTab("ADD_SHEET")
    }
  }

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()

    if (
      !files.find((item: File) => item.spreadsheetId === selectedFile)
        ?.fileName &&
      setTab
    ) {
      setTab("ADD_SHEET")
    }
    selectRef.current?.focus()
    selectRef.current?.showPicker()
  }

  useEffect(() => {
    if ((selectedFile !== "" && isComment) || ckeckFlag) {
      getParsedDataFromFile(selectedFile!)
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
      <div className="w-full h-[24px] mb-3 relative z-5 ">
        <div className="flex items-center cursor-pointer">
          <div
            onClick={onMouseDown}
            className="px-1 py-1 text-[11px] whitespace-nowrap text-slate-800 bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none border border-slate-200 focus:border-slate-700 select"
          >
            {files.find((item: File) => item.spreadsheetId === selectedFile)
              ?.fileName || placeholder}
          </div>
          <div
            onClick={() => selectRef.current?.showPicker()}
            className="px-1 w-full flex justify-end py-1 text-[11px] text-slate-800 bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none border border-slate-200 focus:border-slate-700 select"
          >
            <img src={downIcon} alt="down" className="w-4 h-4" />
          </div>
        </div>
        <select
          value={selectedFile || ""}
          onChange={onChange}
          ref={selectRef}
          className="w-full text-transparent"
        >
          <option value="">{placeholder}</option>
          {files.map((item: File) => (
            <option
              value={item.spreadsheetId}
              key={item.fileName + item.sheets?.[0]?.name}
            >
              {item.fileName + " - " + item.sheets?.[0]?.name}
            </option>
          ))}
        </select>
      </div>

      {isShowTooltip && tooltipText !== "" && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-[9px] rounded py-1 px-2 z-10">
          {tooltipText}
        </div>
      )}
    </div>
  )
}

export default Select
