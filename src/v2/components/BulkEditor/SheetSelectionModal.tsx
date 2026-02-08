import { useState } from "react"
import { X, Plus } from "lucide-react"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { Dropdown } from "../FigmaManager/Dropdown"
import { useAPI } from "@/v2/hooks/useAPI"
import { config } from "@/v2/others/config"
import type { DriveFileCreateRequest, DriveFileCreateResponse } from "@/v2/types/api"
import { useToast } from "@/v2/hooks/useToast"

type SheetOption = {
  id: string
  spreadsheetId: string
  sheetId: number
  sheetName: string
  displayName: string
}

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
  const toast = useToast()
  const { state, dispatch } = useGlobalState()
  const { files, user } = state
  const [selectedSheet, setSelectedSheet] = useState<SheetOption | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [fileName, setFileName] = useState("")
  const [sheetName, setSheetName] = useState("")

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
    if (selectedSheet) {
      onConfirm(selectedSheet.spreadsheetId, selectedSheet.sheetId, selectedSheet.sheetName)
      handleClose()
    }
  }

  const handleClose = () => {
    setSelectedSheet(null)
    onClose()
  }

  const canConfirm = selectedSheet !== null

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

      setSelectedSheet({
        id: `${data.spreadsheetId}-${data.sheetId}`,
        spreadsheetId: data.spreadsheetId,
        sheetId: data.sheetId,
        sheetName: trimmedTab,
        displayName: `${trimmedFile} - ${trimmedTab}`,
      })

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

        {/* Content - dropdown to select sheet, with Add sheet in footer */}
        <div className="p-4 overflow-y-auto flex-1">
          <label className="block text-[12px] text-gray-700 mb-2">
            Select sheet
          </label>
          {allSheets.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-4">
              No sheets available. Create one below.
            </div>
          ) : (
            <Dropdown<SheetOption>
              selected={selectedSheet}
              items={allSheets}
              renderItem={(sheet) => (
                <span className="text-[12px] truncate">{sheet.displayName}</span>
              )}
              renderSelected={(sheet) => sheet.displayName}
              onSelect={(sheet) => setSelectedSheet(sheet)}
              placeholder="Select a sheet"
              width="100%"
              isSearchable
              usePortal
              renderFooter={
                () => (
                  <div className="border-t border-gray-100">
                    {!isCreateOpen ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsCreateOpen(true)
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <Plus size={14} />
                        Add sheet
                      </button>
                    ) : (
                      <div
                        className="px-3 py-2"
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
                        <div className="flex gap-2 mt-2">
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
                )
              }
            />
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
            disabled={!canConfirm || parentIsLoading}
            className={`flex-1 py-2 text-[12px] rounded transition-colors ${
              canConfirm && !parentIsLoading
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
