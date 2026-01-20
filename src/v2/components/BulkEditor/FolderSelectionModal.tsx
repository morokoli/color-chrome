import { useState } from "react"
import { X } from "lucide-react"
import { useGetFolders } from "@/v2/api/folders.api"
import { Dropdown } from "../FigmaManager/Dropdown"

interface FolderSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (folderId: string) => void
  title: string
  actionType: "copy" | "move"
  isLoading?: boolean
}

export const FolderSelectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  actionType,
  isLoading: parentIsLoading = false,
}: FolderSelectionModalProps) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const { data: foldersData, isLoading: foldersLoading } = useGetFolders(false)

  if (!isOpen) return null

  const folders = foldersData?.folders || []

  const handleConfirm = () => {
    if (selectedFolderId) {
      onConfirm(selectedFolderId)
      setSelectedFolderId(null)
    }
  }

  const handleClose = () => {
    setSelectedFolderId(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-md shadow-lg border border-gray-200 w-[400px]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-[14px] font-medium text-gray-800">{title}</h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4">
            <label className="block text-[12px] text-gray-700 mb-2">
              Select Folder
            </label>
            {foldersLoading ? (
              <div className="text-center text-gray-500 text-sm py-4">
                Loading folders...
              </div>
            ) : folders.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-4">
                No folders available. Create a folder first.
              </div>
            ) : (
              <Dropdown
                selected={selectedFolderId}
                items={folders.map(f => f._id)}
                renderItem={(folderId) => {
                  const folder = folders.find(f => f._id === folderId)
                  return folder?.name || folderId
                }}
                renderSelected={(folderId) => {
                  const folder = folders.find(f => f._id === folderId)
                  return folder?.name || "Select a folder"
                }}
                onSelect={(folderId) => setSelectedFolderId(folderId)}
                placeholder="Select a folder"
                width="100%"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 py-3 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="flex-1 py-2 text-[12px] border border-gray-200 rounded bg-white hover:bg-gray-50 text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedFolderId || parentIsLoading || foldersLoading}
            className={`flex-1 py-2 text-[12px] rounded transition-colors ${
              selectedFolderId && !parentIsLoading && !foldersLoading
                ? "bg-gray-900 text-white hover:bg-gray-800"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {parentIsLoading
              ? actionType === "copy"
                ? "Copying..."
                : "Moving..."
              : actionType === "copy"
              ? "Copy"
              : "Move"}
          </button>
        </div>
      </div>
    </div>
  )
}
