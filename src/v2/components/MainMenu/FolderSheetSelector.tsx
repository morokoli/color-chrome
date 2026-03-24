import { FC, useMemo, useState, useCallback } from "react"
import { MultiSelectDropdown } from "../FigmaManager/MultiSelectDropdown"
import { useGetFolders } from "@/v2/api/folders.api"
import { Folder } from "@/v2/api/folders.api"
import { File } from "@/v2/types/general"
import { Folder as FolderIcon, Plus } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { axiosInstance } from "@/v2/hooks/useAPI"
import { config } from "@/v2/others/config"
import { useToast } from "@/v2/hooks/useToast"

interface FolderSheetSelectorProps {
    selectedFolders: string[]
    selectedSheets: string[]
    files: File[]
    onFoldersChange: (folderIds: string[]) => void
    onSheetsChange: (sheetIds: string[]) => void
    userToken: string | undefined
}

type SelectableItem =
    | { type: 'folder'; id: string; name: string; folder: Folder }
    | { type: 'sheet'; id: string; name: string; file: File }

export const FolderSheetSelector: FC<FolderSheetSelectorProps> = ({
    selectedFolders,
    selectedSheets,
    files: _files, // Unused - kept for backward compatibility (sheets removed)
    onFoldersChange,
    onSheetsChange,
    userToken,
}) => {
    const { data: foldersData } = useGetFolders(false)
    const queryClient = useQueryClient()
    const toast = useToast()
    const [isCreating, setIsCreating] = useState(false)
    const [newFolderName, setNewFolderName] = useState("")
    const [isCreatingLoading, setIsCreatingLoading] = useState(false)

    const handleCreateFolder = useCallback(async () => {
        const name = newFolderName.trim()
        if (!name || !userToken) return
        setIsCreatingLoading(true)
        try {
            const response = await axiosInstance.post(
                config.api.endpoints.createFolder,
                { name, colorIds: [], paletteIds: [] },
                { headers: { Authorization: `Bearer ${userToken}` } }
            )
            const folder = response.data?.folder ?? response.data
            if (folder?._id) {
                await queryClient.invalidateQueries({ queryKey: ["folders"] })
                toast.display("success", "Folder created")
                setNewFolderName("")
                setIsCreating(false)
            }
        } catch (err: any) {
            toast.display("error", err?.response?.data?.err || err?.response?.data?.message || "Failed to create folder")
        } finally {
            setIsCreatingLoading(false)
        }
    }, [newFolderName, userToken, queryClient, toast])

    // Build flat list of all selectable items (folders only - sheets removed)
    const allItems = useMemo<SelectableItem[]>(() => {
        const items: SelectableItem[] = []

        // Add folders only (sheets removed per user request)
        if (foldersData?.folders) {
            foldersData.folders.forEach(folder => {
                items.push({
                    type: 'folder',
                    id: folder._id,
                    name: folder.name,
                    folder,
                })
            })
        }

        // Sheets removed - only showing folders now

        return items
    }, [foldersData])

    // Get selected items
    const selectedItems = useMemo(() => {
        return allItems.filter(item => {
            if (item.type === 'folder') {
                return selectedFolders.includes(item.id)
            } else {
                return selectedSheets.includes(item.id)
            }
        })
    }, [allItems, selectedFolders, selectedSheets])

    const handleSelect = (items: SelectableItem[]) => {
        const folderIds: string[] = []
        // Sheets removed - only folders are selectable now
        const sheetIds: string[] = []

        items.forEach(item => {
            if (item.type === 'folder') {
                folderIds.push(item.id)
            }
            // Sheet selection removed
        })

        onFoldersChange(folderIds)
        onSheetsChange(sheetIds) // Keep empty array for backward compatibility
    }

    const renderItem = (item: SelectableItem) => {
        // Only folders are shown now (sheets removed)
        return (
            <div className="flex items-center gap-2">
                <FolderIcon className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[12px]">{item.name}</span>
            </div>
        )
    }

    const renderSelected = (selected: SelectableItem[]) => {
        if (selected.length === 0) {
            return "Select folders"
        }
        if (selected.length === 1) {
            return selected[0].name
        }
        // Only folders now - sheets removed
        const folderCount = selected.filter(s => s.type === 'folder').length
        return `${folderCount} folder${folderCount > 1 ? 's' : ''}`
    }

    if (!userToken) {
        return null
    }

    const renderFooter = useCallback(() => {
        if (isCreating) {
            return (
                <div className="p-2 border-t border-gray-100 flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Folder name"
                        className="flex-1 px-2 py-1.5 text-[12px] border border-gray-200 rounded focus:outline-none focus:border-gray-400"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateFolder()
                            if (e.key === "Escape") {
                                setIsCreating(false)
                                setNewFolderName("")
                            }
                        }}
                    />
                    <button
                        onClick={handleCreateFolder}
                        disabled={!newFolderName.trim() || isCreatingLoading}
                        className="px-3 py-1.5 text-[12px] bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCreatingLoading ? "..." : "Save"}
                    </button>
                </div>
            )
        }
        return (
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    setIsCreating(true)
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] text-gray-600 hover:bg-gray-50 border-t border-gray-100 transition-colors"
            >
                <Plus size={14} />
                Create
            </button>
        )
    }, [isCreating, newFolderName, isCreatingLoading, handleCreateFolder])

    return (
        <div className="px-4">
            <div className="pb-4">
                <p className="text-[13px] text-gray-800 mb-2">Saving colors to</p>
                <MultiSelectDropdown<SelectableItem>
                    selected={selectedItems}
                    items={allItems}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    renderSelected={renderSelected}
                    onSelect={handleSelect}
                    placeholder="Folders"
                    isSearchable
                    width="100%"
                    checkboxAtEnd={true}
                    openUpward={true}
                    renderFooter={renderFooter}
                />
            </div>
        </div>
    )
}
