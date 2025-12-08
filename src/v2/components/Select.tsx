import { FC, ChangeEvent, useState, useEffect, useRef } from "react"
import { CheckSheetValidRequest, CheckSheetValidResponse } from "@/v2/types/api"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useToast } from "@/v2/hooks/useToast"
import { RowData } from "@/v2/types/general"
import { config } from "@/v2/others/config"
import { useAPI } from "@/v2/hooks/useAPI"
import { File } from "@/v2/types/general"
import { ChevronDown } from "lucide-react"

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
  const { selectedFile, files, user, newColumns } = state
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLSelectElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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

    // If user is not logged in, just set empty parsed data
    // Local colorHistory is independent and should NOT be modified here
    if (!user?.jwtToken) {
      dispatch({ type: "SET_PARSED_DATA", payload: [] })
      return
    }

    checkSheetValid
      .call({
        spreadsheetId: fileId,
        sheetId: selectedFileData.sheets?.[0].id,
        sheetName: `'${selectedFileData.sheets?.[0].name}'`,
      })
      .then((data) => {
        // Only set parsed data for sheet metadata - do NOT touch colorHistory
        // Local colorHistory is independent and persists across login/logout
        dispatch({ type: "SET_PARSED_DATA", payload: data.sheetData.parsed })

        // Collect all unique columns from all rows in the data
        const allColumns = new Map<string, { name: string; value: string }>()
        data?.sheetData?.parsed?.forEach((row: RowData) => {
          row.additionalColumns?.forEach((col) => {
            if (!allColumns.has(col.name)) {
              allColumns.set(col.name, col)
            }
          })
        })

        // Get existing columns for this sheet (persisted locally)
        const sheetColumns = newColumns[fileId] || []
        const existingColumnNames = new Set(sheetColumns.map(col => col.name))

        // Add columns from server data that don't exist locally yet
        allColumns.forEach((column) => {
          if (!existingColumnNames.has(column.name)) {
            dispatch({ type: "ADD_NEW_COLUMN", payload: { spreadsheetId: fileId, column } })
          }
        })
      })
      .catch(() => {
        toast.display(
          "error",
          "Provided spreadsheet does not have valid format",
        )
      })
  }

  const onClickHandler = () => {
    if (!selectedFile && files.length === 0 && setTab) {
      setTab("ADD_SHEET")
      return
    }
    setIsOpen(!isOpen)
  }

  const onChange = (e: ChangeEvent<HTMLSelectElement>) => {
    dispatch({ type: "SET_SELECTED_FILE", payload: e?.target?.value })
    if (e.target.value === "" && setTab) {
      setTab("ADD_SHEET")
    }
  }

  const selectFile = (fileId: string) => {
    dispatch({ type: "SET_SELECTED_FILE", payload: fileId })
    setIsOpen(false)
  }

  useEffect(() => {
    if ((selectedFile !== "" && isComment) || ckeckFlag) {
      getParsedDataFromFile(selectedFile!)
    } else {
      // No file selected - just clear parsed data
      dispatch({ type: "SET_PARSED_DATA", payload: [] })
    }
    if (setCheckValidFlag) {
      setCheckValidFlag(false)
    }
  }, [selectedFile, ckeckFlag])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedFileName = files.find((item: File) => item.spreadsheetId === selectedFile)?.fileName

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={onClickHandler}
        className="w-full flex items-center justify-between px-3 py-2 text-[12px] bg-white border border-gray-200 rounded hover:border-gray-300 transition-colors"
      >
        <span className={selectedFileName ? 'text-gray-800' : 'text-gray-400'}>
          {selectedFileName || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && files.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 max-h-[150px] overflow-y-auto">
          {files.map((item: File) => (
            <button
              key={item.spreadsheetId}
              onClick={() => selectFile(item.spreadsheetId)}
              className={`w-full text-left px-3 py-2 text-[12px] hover:bg-gray-50 transition-colors ${
                selectedFile === item.spreadsheetId ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
              }`}
            >
              {item.fileName}
            </button>
          ))}
        </div>
      )}

      {/* Hidden native select for form compatibility */}
      <select
        value={selectedFile || ""}
        onChange={onChange}
        ref={selectRef}
        className="sr-only"
      >
        <option value="">{placeholder}</option>
        {files.map((item: File) => (
          <option value={item.spreadsheetId} key={item.spreadsheetId}>
            {item.fileName}
          </option>
        ))}
      </select>
    </div>
  )
}

export default Select
