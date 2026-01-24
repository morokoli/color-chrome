import { useState } from "react"
import { X } from "lucide-react"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { Dropdown } from "../FigmaManager/Dropdown"
import { useAPI } from "@/v2/hooks/useAPI"
import { config } from "@/v2/others/config"
import {
  DriveFileGetByURLRequest,
  DriveFileGetByURLResponse,
} from "@/v2/types/api"
import { Sheet } from "@/v2/types/general"

interface SheetSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (spreadsheetId: string, sheetId: number, sheetName: string) => void
  isLoading?: boolean
}

export const SheetSelectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading: parentIsLoading = false,
}: SheetSelectionModalProps) => {
  const { state } = useGlobalState()
  const { files, user } = state
  const [selectedSheet, setSelectedSheet] = useState<{
    spreadsheetId: string
    sheetId: number
    sheetName: string
  } | null>(null)
  const [sheetUrl, setSheetUrl] = useState("")
  const [useUrl, setUseUrl] = useState(false)
  const [fetchedSpreadsheet, setFetchedSpreadsheet] = useState<{
    spreadsheetId: string
    fileName: string
    sheets: Sheet[]
  } | null>(null)
  const [selectedSheetId, setSelectedSheetId] = useState<number | null>(null)
  const [isFetching, setIsFetching] = useState(false)

  const { call: callGetSheetByUrl, isStatusLoading: loadingGetSheetByUrl } = useAPI<
    DriveFileGetByURLRequest,
    DriveFileGetByURLResponse
  >({
    url: config.api.endpoints.sheetGetByURL,
    method: "POST",
    jwtToken: user?.jwtToken,
  })

  if (!isOpen) return null

  // Build flat list of all sheets from files
  const allSheets: Array<{
    id: string
    spreadsheetId: string
    sheetId: number
    sheetName: string
    displayName: string
  }> = []
  
  files.forEach((file) => {
    file.sheets.forEach((sheet) => {
      allSheets.push({
        id: `${file.spreadsheetId}-${sheet.id}`,
        spreadsheetId: file.spreadsheetId,
        sheetId: sheet.id,
        sheetName: sheet.name,
        displayName: `${file.fileName} - ${sheet.name}`,
      })
    })
  })

  const handleFetchSheet = async () => {
    if (!sheetUrl.trim()) {
      return
    }
    setIsFetching(true)
    try {
      const data = await callGetSheetByUrl({ url: sheetUrl })
      if (data.spreadsheet) {
        setFetchedSpreadsheet({
          spreadsheetId: data.spreadsheet.spreadsheetId,
          fileName: data.spreadsheet.fileName,
          sheets: data.spreadsheet.sheets,
        })
        if (data.spreadsheet.sheets.length > 0) {
          setSelectedSheetId(data.spreadsheet.sheets[0].id)
        }
      }
    } catch (error: any) {
      console.error("Error fetching sheet:", error)
    } finally {
      setIsFetching(false)
    }
  }

  const handleConfirm = () => {
    if (useUrl && fetchedSpreadsheet && selectedSheetId !== null) {
      const sheet = fetchedSpreadsheet.sheets.find(s => s.id === selectedSheetId)
      if (sheet) {
        onConfirm(fetchedSpreadsheet.spreadsheetId, sheet.id, sheet.name)
        handleClose()
      }
    } else if (!useUrl && selectedSheet) {
      onConfirm(selectedSheet.spreadsheetId, selectedSheet.sheetId, selectedSheet.sheetName)
      handleClose()
    }
  }

  const handleClose = () => {
    setSelectedSheet(null)
    setSheetUrl("")
    setUseUrl(false)
    setFetchedSpreadsheet(null)
    setSelectedSheetId(null)
    onClose()
  }

  const canConfirm = useUrl
    ? fetchedSpreadsheet !== null && selectedSheetId !== null
    : selectedSheet !== null

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-md shadow-lg border border-gray-200 w-[500px] max-h-[600px] flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-[14px] font-medium text-gray-800">Export to Google Sheet</h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* Toggle between existing sheets and URL */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setUseUrl(false)}
              className={`flex-1 py-2 text-[12px] rounded transition-colors ${
                !useUrl
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Select Sheet
            </button>
            <button
              onClick={() => setUseUrl(true)}
              className={`flex-1 py-2 text-[12px] rounded transition-colors ${
                useUrl
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Add Sheet URL
            </button>
          </div>

          {!useUrl ? (
            <div className="mb-4">
              <label className="block text-[12px] text-gray-700 mb-2">
                Select Sheet
              </label>
              {allSheets.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-4">
                  No sheets available. Add a sheet first.
                </div>
              ) : (
                <Dropdown<string>
                  selected={selectedSheet ? `${selectedSheet.spreadsheetId}-${selectedSheet.sheetId}` : null}
                  items={allSheets.map(s => s.id)}
                  renderItem={(sheetId) => {
                    const sheet = allSheets.find(s => s.id === sheetId)
                    return sheet?.displayName || sheetId
                  }}
                  renderSelected={(sheetId) => {
                    const sheet = allSheets.find(s => s.id === sheetId)
                    return sheet?.displayName || "Select a sheet"
                  }}
                  onSelect={(sheetId) => {
                    const sheet = allSheets.find(s => s.id === sheetId)
                    if (sheet) {
                      setSelectedSheet({
                        spreadsheetId: sheet.spreadsheetId,
                        sheetId: sheet.sheetId,
                        sheetName: sheet.sheetName,
                      })
                    }
                  }}
                  placeholder="Select a sheet"
                  width="100%"
                  isSearchable
                  usePortal={true}
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] text-gray-700 mb-2">
                  Sheet URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="flex-1 px-3 py-2 text-[12px] border border-gray-200 rounded focus:outline-none focus:border-gray-400"
                  />
                  <button
                    onClick={handleFetchSheet}
                    disabled={!sheetUrl.trim() || isFetching || loadingGetSheetByUrl}
                    className={`px-4 py-2 text-[12px] rounded transition-colors ${
                      sheetUrl.trim() && !isFetching && !loadingGetSheetByUrl
                        ? "bg-gray-900 text-white hover:bg-gray-800"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isFetching || loadingGetSheetByUrl ? "Loading..." : "Fetch"}
                  </button>
                </div>
              </div>

              {fetchedSpreadsheet && (
                <div>
                  <div className="bg-gray-50 rounded p-2 mb-2">
                    <p className="text-[11px] text-gray-500">File</p>
                    <p className="text-[13px] text-gray-800 font-medium truncate">
                      {fetchedSpreadsheet.fileName}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[12px] text-gray-700 mb-2">
                      Select Tab
                    </label>
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
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 py-3 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={handleClose}
            className="flex-1 py-2 text-[12px] border border-gray-200 rounded bg-white hover:bg-gray-50 text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || parentIsLoading || isFetching || loadingGetSheetByUrl}
            className={`flex-1 py-2 text-[12px] rounded transition-colors ${
              canConfirm && !parentIsLoading && !isFetching && !loadingGetSheetByUrl
                ? "bg-gray-900 text-white hover:bg-gray-800"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {parentIsLoading ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  )
}
