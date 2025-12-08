import { FC, useState, useEffect, memo, ChangeEvent } from 'react'
import { useGlobalState } from '@/v2/hooks/useGlobalState'
import { useToast } from "@/v2/hooks/useToast"
import { config } from '@/v2/others/config'
import { useAPI } from "@/v2/hooks/useAPI"
import {
  DriveFileCreateRequest,
  DriveFileCreateResponse,
  DriveFileGetByURLRequest,
  DriveFileGetByURLResponse,
} from "@/v2/types/api"
import { Sheet } from "@/v2/types/general"
import {
  Link,
  FilePlus,
  Trash2,
  ArrowLeft,
  CheckCircle,
  Check,
  ChevronDown,
} from "lucide-react"

import Input from '@/v2/components/Input';
import Select from '@/v2/components/Select'

interface Props {
  setTab: (tab: string | null) => void;
}

type TabType = 'select' | 'exist' | 'new' | 'remove'

const tabs: { id: TabType; label: string; icon: typeof Link }[] = [
  { id: 'select', label: 'Select', icon: CheckCircle },
  { id: 'exist', label: 'Link', icon: Link },
  { id: 'new', label: 'Create', icon: FilePlus },
  { id: 'remove', label: 'Remove', icon: Trash2 },
]

const AddSheet: FC<Props> = memo(({ setTab }) => {
  const toast = useToast()
  const { state, dispatch } = useGlobalState();
  const { user, selectedFile, files } = state;
  const [tabName, setTabName] = useState<TabType>(files.length > 0 ? 'select' : 'exist');
  const [sheetUrl, setSheetUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [sheetName, setSheetName] = useState('');

  // State for fetched spreadsheet (Link tab)
  const [fetchedSpreadsheet, setFetchedSpreadsheet] = useState<{
    spreadsheetId: string
    fileName: string
    sheets: Sheet[]
  } | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<number | null>(null);

  const { call: callCreateSheet, isStatusLoading: loadingCreateSheet } = useAPI<
    DriveFileCreateRequest,
    DriveFileCreateResponse
  >({
    url: config.api.endpoints.sheetCreate,
    method: "POST",
    jwtToken: user?.jwtToken,
  })

  const { call: callGetSheetByUrl, isStatusLoading: loadindGetSheetByUrl } = useAPI<
    DriveFileGetByURLRequest,
    DriveFileGetByURLResponse
  >({
    url: config.api.endpoints.sheetGetByURL,
    method: "POST",
    jwtToken: user?.jwtToken,
  })

  const handleChangeUrl = (event: ChangeEvent<HTMLInputElement>) => {
    setSheetUrl(event.target.value);
  };

  const getFileDataByUrl = () => {
    callGetSheetByUrl({ url: sheetUrl})
      .then((data) => {
        if (data.spreadsheet) {
          // Check if sheet already exists
          const alreadyExists = state.files.some(
            (f) => f.spreadsheetId === data.spreadsheet.spreadsheetId
          )
          if (alreadyExists) {
            toast.display("error", "This sheet is already added")
            return
          }

          // If only one tab, add directly; otherwise show tab selector
          if (data.spreadsheet.sheets.length === 1) {
            addSpreadsheetToState(data.spreadsheet, data.spreadsheet.sheets[0].id)
          } else {
            setFetchedSpreadsheet(data.spreadsheet)
            setSelectedSheetId(data.spreadsheet.sheets[0].id)
          }
        }
      })
      .catch(() =>
        toast.display("error", "Failed to fetch spreadsheet details"),
      )
  };

  const addSpreadsheetToState = (spreadsheet: typeof fetchedSpreadsheet, sheetId: number) => {
    if (!spreadsheet) return

    // Filter to only include the selected sheet
    const selectedSheet = spreadsheet.sheets.find(s => s.id === sheetId)
    if (!selectedSheet) return

    dispatch({
      type: "ADD_FILES",
      payload: {
        ...spreadsheet,
        sheets: [selectedSheet],
        colorHistory: [],
      },
    })
    dispatch({ type: "SET_SELECTED_FILE", payload: spreadsheet.spreadsheetId });
    toast.display("success", "Spreadsheet added successfully")
    setSheetUrl('')
    setFetchedSpreadsheet(null)
    setSelectedSheetId(null)
  };

  const confirmTabSelection = () => {
    if (fetchedSpreadsheet && selectedSheetId !== null) {
      addSpreadsheetToState(fetchedSpreadsheet, selectedSheetId)
    }
  };

  const cancelTabSelection = () => {
    setFetchedSpreadsheet(null)
    setSelectedSheetId(null)
  };

  const createSheetFile = () => {
    const finalSheetName = sheetName || 'Sheet1'
    callCreateSheet({ fileName, sheetName: finalSheetName })
    .then((data) => {
      if (data.spreadsheetId) {
        const fileObj = {
          fileName,
          spreadsheetId: data.spreadsheetId,
          sheets: [{
            name: finalSheetName,
            id: data.sheetId,
          }],
        };

        dispatch({
          type: "ADD_FILES",
          payload: {
            ...fileObj,
            colorHistory: [],
          },
        })
        dispatch({ type: "SET_SELECTED_FILE", payload: data.spreadsheetId });
        toast.display("success", "Spreadsheet created successfully")
        setFileName('')
        setSheetName('')
      }

    })
    .catch(() =>
      toast.display("error", "Failed to create spreadsheet"),
    )
  };

  const removeFileHandler = () => {
    dispatch({ type: "REMOVE_FILES", payload: selectedFile! });
    dispatch({ type: "SET_SELECTED_FILE", payload: '' });
    toast.display("success", "Sheet removed successfully")
  };

  const openLogin = () => {
    const url = config.api.baseURL + config.api.endpoints.auth;
    window.open(url, "Google Sign-in", "width=1000,height=700")
  }

  useEffect(() => {
    if (!user) {
      setTab(null);
      openLogin();
    }
  }, [user]);

  return (
    <div className="w-[340px] bg-white rounded-md shadow-sm border border-gray-200">
      {/* Header with back button */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200">
        <button
          onClick={() => setTab(null)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <span className="text-[13px] font-medium text-gray-800">Sheet Manager</span>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tabName === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setTabName(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] transition-colors ${
                isActive
                  ? 'text-gray-900 border-b-2 border-gray-900 -mb-px'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="p-3">
        {tabName === 'select' && (
          <div className="space-y-2">
            {files.length === 0 ? (
              <div className="text-center py-4 text-[12px] text-gray-500">
                No sheets linked yet. Use "Link" or "Create" to add a sheet.
              </div>
            ) : (
              <>
                <p className="text-[11px] text-gray-500 mb-2">Select a sheet to save colors to:</p>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {files.map((file) => (
                    <button
                      key={file.spreadsheetId}
                      onClick={() => {
                        dispatch({ type: "SET_SELECTED_FILE", payload: file.spreadsheetId })
                        toast.display("success", `Selected: ${file.fileName}`)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-[12px] rounded border transition-colors ${
                        selectedFile === file.spreadsheetId
                          ? 'bg-gray-100 border-gray-400 font-medium'
                          : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <span className="truncate text-gray-900">{file.fileName}</span>
                      {selectedFile === file.spreadsheetId && (
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tabName === 'exist' && (
          <div className="space-y-3">
            {!fetchedSpreadsheet ? (
              <>
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Google Sheet URL</label>
                  <Input
                    key='url'
                    name='url'
                    placeholder="Paste sheet URL here"
                    value={sheetUrl}
                    onChange={handleChangeUrl}
                  />
                </div>
                <button
                  disabled={!sheetUrl || loadindGetSheetByUrl}
                  onClick={getFileDataByUrl}
                  className="w-full py-2 text-[12px] text-white bg-gray-900 rounded hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loadindGetSheetByUrl ? 'Fetching...' : 'Fetch Sheet'}
                </button>
              </>
            ) : (
              <>
                <div className="bg-gray-50 rounded p-2 mb-2">
                  <p className="text-[11px] text-gray-500">File</p>
                  <p className="text-[13px] text-gray-800 font-medium truncate">{fetchedSpreadsheet.fileName}</p>
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Select Tab</label>
                  <div className="relative">
                    <select
                      value={selectedSheetId ?? ''}
                      onChange={(e) => setSelectedSheetId(Number(e.target.value))}
                      className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded bg-white appearance-none cursor-pointer hover:border-gray-300 focus:outline-none focus:border-gray-400"
                    >
                      {fetchedSpreadsheet.sheets.map((sheet) => (
                        <option key={sheet.id} value={sheet.id}>
                          {sheet.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={cancelTabSelection}
                    className="flex-1 py-2 text-[12px] text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmTabSelection}
                    className="flex-1 py-2 text-[12px] text-white bg-gray-900 rounded hover:bg-gray-800 transition-colors"
                  >
                    Add Sheet
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {tabName === 'new' && (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">File Name</label>
              <Input
                key='sheetName'
                name='sheetName'
                placeholder="My Color Palette"
                value={fileName}
                onChange={e => setFileName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">Tab Name <span className="text-gray-400">(optional)</span></label>
              <Input
                key='tabName'
                name='tabName'
                placeholder="Sheet1"
                value={sheetName}
                onChange={e => setSheetName(e.target.value)}
              />
            </div>
            <button
              disabled={!fileName || loadingCreateSheet}
              onClick={createSheetFile}
              className="w-full py-2 text-[12px] text-white bg-gray-900 rounded hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loadingCreateSheet ? 'Creating...' : 'Create Sheet'}
            </button>
          </div>
        )}

        {tabName === 'remove' && (
          <div className="space-y-3">
            <Select placeholder='Select sheet to remove' />
            <button
              disabled={!selectedFile || loadindGetSheetByUrl}
              onClick={removeFileHandler}
              className="w-full py-2 text-[12px] text-white bg-red-600 rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loadindGetSheetByUrl ? 'Removing...' : 'Remove Sheet'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

export default AddSheet;
