import { useState, useEffect } from "react"
import { X, Plus, ExternalLink } from "lucide-react"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { MultiSelectDropdown } from "../FigmaManager/MultiSelectDropdown"
import { useAPI } from "@/v2/hooks/useAPI"
import { config } from "@/v2/others/config"
import type { DriveFileCreateRequest, DriveFileCreateResponse } from "@/v2/types/api"
import { useToast } from "@/v2/hooks/useToast"
import { useGetUserSheets } from "@/v2/api/sheet.api"

export type SheetOption = {
  id: string
  spreadsheetId: string
  sheetId: number
  sheetName: string
  displayName: string
}

export type SheetSelection = {
  spreadsheetId: string
  sheetId: number
  sheetName: string
}

function googleSheetEditUrl(spreadsheetId: string, sheetId: number): string {
  const base = config.spreadsheet.baseURL.replace(/\/$/, "")
  return `${base}/${spreadsheetId}/edit#gid=${sheetId}`
}

interface SheetSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (sheets: SheetSelection[]) => void
  isLoading?: boolean
}

export const SheetSelectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading: parentIsLoading = false,
}: SheetSelectionModalProps) => {
  const toast = useToast()
  const { state, dispatch } = useGlobalState()
  const { files, user } = state
  const [selectedSheets, setSelectedSheets] = useState<SheetOption[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [fileName, setFileName] = useState("")
  const [sheetName, setSheetName] = useState("")

  const { data: userSheetsData, isLoading: isLoadingUserSheets } = useGetUserSheets()

  useEffect(() => {
    if (userSheetsData?.data && Array.isArray(userSheetsData.data)) {
      dispatch({ type: "MERGE_FILES", payload: userSheetsData.data })
    }
  }, [userSheetsData])

  const { call: callCreateSheet, isStatusLoading: isCreatingSheet } = useAPI<
    DriveFileCreateRequest,
    DriveFileCreateResponse
  >({
    url: config.api.endpoints.sheetCreate,
    method: "POST",
    jwtToken: user?.jwtToken,
  })

  const allSheets: SheetOption[] = []
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

  if (!isOpen) return null

  const handleConfirm = () => {
    if (selectedSheets.length > 0) {
      onConfirm(
        selectedSheets.map((s) => ({
          spreadsheetId: s.spreadsheetId,
          sheetId: s.sheetId,
          sheetName: s.sheetName,
        }))
      )
      handleClose()
    }
  }

  const handleClose = () => {
    setSelectedSheets([])
    onClose()
  }

  const canConfirm = selectedSheets.length > 0

  const handleCreateSheet = async () => {
    const trimmedFile = fileName.trim()
    const trimmedTab = sheetName.trim() || "Sheet1"

    if (!trimmedFile) {
      toast.display("error", "Please enter a sheet name")
      return
    }

    try {
      const data = await callCreateSheet({ fileName: trimmedFile, sheetName: trimmedTab })
      if (!data?.spreadsheetId) throw new Error("Failed to create spreadsheet")

      const fileObj = {
        fileName: trimmedFile,
        spreadsheetId: data.spreadsheetId,
        sheets: [
          {
            name: trimmedTab,
            id: data.sheetId,
          },
        ],
      }

      dispatch({
        type: "ADD_FILES",
        payload: {
          ...(fileObj as any),
          colorHistory: [],
        },
      })
      dispatch({ type: "SET_SELECTED_FILE", payload: data.spreadsheetId })

      const newSheet: SheetOption = {
        id: `${data.spreadsheetId}-${data.sheetId}`,
        spreadsheetId: data.spreadsheetId,
        sheetId: data.sheetId,
        sheetName: trimmedTab,
        displayName: `${trimmedFile} - ${trimmedTab}`,
      }
      setSelectedSheets((prev) => (prev.some((s) => s.id === newSheet.id) ? prev : [...prev, newSheet]))

      toast.display("success", "Spreadsheet created successfully")
      setFileName("")
      setSheetName("")
      setIsCreateOpen(false)
    } catch {
      toast.display("error", "Failed to create spreadsheet")
    }
  }

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

        {/* Content - multi-select sheets (same pattern as folders dropdown) */}
        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          <label className="block text-[12px] text-gray-700 mb-2">
            Select sheet(s)
          </label>
          <MultiSelectDropdown<SheetOption>
            selected={selectedSheets}
            items={allSheets}
            keyExtractor={(sheet) => sheet.id}
            renderItem={(sheet) => (
              <span className="text-[12px] truncate">{sheet.displayName}</span>
            )}
            renderSelected={(selected) => {
              if (isLoadingUserSheets) return "Loading your sheets..."
              if (selected.length === 0) return "Select a sheet"
              if (selected.length === 1) return selected[0].displayName
              return `${selected.length} sheets selected`
            }}
            onSelect={setSelectedSheets}
            placeholder="Select a sheet"
            width="100%"
            isSearchable
            checkboxAtEnd
            getSearchText={(sheet) => sheet.displayName}
            renderTrailingActions={(sheet) => (
              <a
                href={googleSheetEditUrl(sheet.spreadsheetId, sheet.sheetId)}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in Google Sheets"
                className="inline-flex rounded p-0.5 text-gray-500 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                aria-label={`Open ${sheet.displayName} in Google Sheets`}
              >
                <ExternalLink size={14} strokeWidth={2} />
              </a>
            )}
            usePortal
            emptyMessage={isLoadingUserSheets ? "" : "No sheets yet. Create one below."}
            renderFooter={() => (
              <div className="border-t border-gray-100 p-2">
                {!isCreateOpen ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsCreateOpen(true)
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 text-[12px] text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Plus size={14} />
                    Add sheet
                  </button>
                ) : (
                  <div
                    className="space-y-2"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex gap-2">
                      <input
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        placeholder="Sheet name"
                        className="flex-1 h-8 px-2 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-gray-200"
                      />
                      <input
                        value={sheetName}
                        onChange={(e) => setSheetName(e.target.value)}
                        placeholder="Tab name"
                        className="flex-1 h-8 px-2 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-gray-200"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreateOpen(false)
                          setFileName("")
                          setSheetName("")
                        }}
                        className="flex-1 h-8 text-[12px] border border-gray-200 rounded bg-white hover:bg-gray-50 text-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateSheet}
                        disabled={isCreatingSheet}
                        className={`flex-1 h-8 text-[12px] rounded transition-colors ${
                          !isCreatingSheet
                            ? "bg-gray-900 text-white hover:bg-gray-800"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        {isCreatingSheet ? "Creating..." : "Create"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          />
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
            disabled={!canConfirm || parentIsLoading}
            className={`flex-1 py-2 text-[12px] rounded transition-colors ${
              canConfirm && !parentIsLoading
                ? "bg-gray-900 text-white hover:bg-gray-800"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {parentIsLoading
              ? "Exporting..."
              : selectedSheets.length > 1
                ? `Export to ${selectedSheets.length} sheets`
                : "Export"}
          </button>
        </div>
      </div>
    </div>
  )
}
