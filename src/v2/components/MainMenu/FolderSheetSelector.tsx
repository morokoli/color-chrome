import { FC, useMemo } from "react"
import { MultiSelectDropdown } from "../FigmaManager/MultiSelectDropdown"
import { useGetFolders } from "@/v2/api/folders.api"
import { Folder } from "@/v2/api/folders.api"
import { File } from "@/v2/types/general"
import { Folder as FolderIcon } from "lucide-react"

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
                    placeholder="Select folders"
                    isSearchable
                    width="100%"
                    checkboxAtEnd={true}
                    openUpward={true}
                />
            </div>
        </div>
    )
}
