import { FC, useMemo, useState, useCallback } from "react"
import { useFolderTreeExpanded } from "../../hooks/useFolderTreeExpanded"
import {
  buildParentIdByChildId,
  getFolderDepthById,
  getFolderPathLabelById,
  flattenFoldersHierarchyOrder,
  flattenVisibleFolderIdsInOrder,
  folderHasChildrenInList,
} from "@/v2/utils/folderDisplayName"
import { MultiSelectDropdown } from "../FigmaManager/MultiSelectDropdown"
import { useGetFolders } from "@/v2/api/folders.api"
import { Folder } from "@/v2/api/folders.api"
import { File } from "@/v2/types/general"
import { Plus } from "lucide-react"
import { FolderDropdownRow } from "@/v2/components/common/FolderDropdownRow"
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

    const folderList = useMemo(
        () => flattenFoldersHierarchyOrder(foldersData?.folders ?? []),
        [foldersData?.folders],
    )

    // Build flat list of all selectable items (folders only - sheets removed)
    const allItems = useMemo<SelectableItem[]>(() => {
        return folderList.map(folder => ({
            type: 'folder' as const,
            id: folder._id,
            name: folder.name,
            folder,
        }))
    }, [folderList])
    const parentByChildId = useMemo(() => buildParentIdByChildId(folderList), [folderList])
    const allFolderIds = useMemo(() => folderList.map((f) => f._id), [folderList])
    const existingIdSet = useMemo(() => new Set(allFolderIds), [allFolderIds])
    const { expandedIds, toggleExpanded, expandAll, collapseAll, allExpanded } =
        useFolderTreeExpanded(allFolderIds)
    const visibleFolderIds = useMemo(
        () => flattenVisibleFolderIdsInOrder(folderList, expandedIds),
        [folderList, expandedIds],
    )
    const folderItemById = useMemo(() => {
        const m = new Map<string, SelectableItem>()
        for (const it of allItems) {
            if (it.type === "folder") m.set(it.id, it)
        }
        return m
    }, [allItems])
    const visibleFolderItems = useMemo(
        () =>
            visibleFolderIds
                .map((id) => folderItemById.get(id))
                .filter((x): x is SelectableItem => x !== undefined),
        [visibleFolderIds, folderItemById],
    )

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
        if (item.type === "folder") {
            return (
                <FolderDropdownRow
                    depth={getFolderDepthById(item.id, parentByChildId)}
                    name={item.folder.name}
                    title={getFolderPathLabelById(item.id, folderList, parentByChildId) || item.folder.name}
                    hasChildren={folderHasChildrenInList(item.folder, existingIdSet)}
                    expanded={expandedIds.has(item.id)}
                    onToggleExpand={() => toggleExpanded(item.id)}
                />
            )
        }
        return <span className="text-[12px] text-gray-800">{item.name}</span>
    }

    const renderSelected = (selected: SelectableItem[]) => {
        if (selected.length === 0) {
            return "Select folders"
        }
        if (selected.length === 1) {
            const first = selected[0]
            if (first.type === "folder") {
                return getFolderPathLabelById(first.id, folderList, parentByChildId) || first.folder.name
            }
            return first.name
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
                    items={visibleFolderItems}
                    itemsWhenSearching={allItems}
                    renderHeaderWithSearch={(searchField) => {
                        const allSelected =
                            allFolderIds.length > 0 &&
                            selectedFolders.length === allFolderIds.length &&
                            allFolderIds.every((id) => selectedFolders.includes(id))
                        const someSelected = selectedFolders.length > 0 && !allSelected
                        return (
                            <div className="flex items-center gap-2 px-3 py-2 min-h-10 w-full min-w-0">
                                <button
                                    type="button"
                                    className="flex items-center justify-center w-5 h-5 shrink-0 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 rounded-sm focus:outline-none transition-colors"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        allExpanded ? collapseAll() : expandAll()
                                    }}
                                    aria-label={allExpanded ? "Collapse all" : "Expand all"}
                                >
                                    <svg
                                        width="13"
                                        height="13"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.25"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className={`transition-transform duration-150 ${allExpanded ? "rotate-90" : ""}`}
                                        aria-hidden
                                    >
                                        <path d="M9 18l6-6-6-6" />
                                    </svg>
                                </button>
                                <div className="flex-1 min-w-0">{searchField}</div>
                                <div className="shrink-0">
                                    <div className="relative flex-shrink-0" style={{ width: "16px", height: "16px" }}>
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            ref={(el) => {
                                                if (el) (el as HTMLInputElement).indeterminate = someSelected
                                            }}
                                            onChange={() => onFoldersChange(allSelected ? [] : [...allFolderIds])}
                                            onClick={(e) => e.stopPropagation()}
                                            className="cursor-pointer"
                                            style={{
                                                appearance: "none",
                                                WebkitAppearance: "none",
                                                MozAppearance: "none",
                                                width: "16px",
                                                height: "16px",
                                                minWidth: "16px",
                                                minHeight: "16px",
                                                border: allSelected ? "1.5px solid #000000" : "1.5px solid #d1d5db",
                                                borderRadius: "3px",
                                                backgroundColor: allSelected ? "#000000" : "#ffffff",
                                                transition: "all 0.15s ease-in-out",
                                                outline: "none",
                                                position: "relative",
                                                flexShrink: 0,
                                                margin: 0,
                                                padding: 0,
                                                boxSizing: "border-box",
                                                imageRendering: "crisp-edges",
                                                WebkitFontSmoothing: "antialiased",
                                                MozOsxFontSmoothing: "grayscale",
                                            }}
                                            aria-label="Select all folders"
                                        />
                                        {allSelected && (
                                            <svg
                                                className="absolute pointer-events-none"
                                                style={{
                                                    width: "10px",
                                                    height: "10px",
                                                    left: "50%",
                                                    top: "50%",
                                                    transform: "translate(-50%, -50%)",
                                                    strokeWidth: "2.5",
                                                    imageRendering: "crisp-edges",
                                                    shapeRendering: "geometricPrecision",
                                                }}
                                                viewBox="0 0 10 10"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path
                                                    d="M8 2.5L4 6.5L2.5 5"
                                                    stroke="white"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    vectorEffect="non-scaling-stroke"
                                                />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    }}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    renderSelected={renderSelected}
                    getSearchText={(item) =>
                      item.type === "folder"
                        ? [
                            item.folder.name,
                            getFolderPathLabelById(item.id, folderList, parentByChildId) || item.name,
                          ]
                            .filter(Boolean)
                            .join(" ")
                        : item.name
                    }
                    onSelect={handleSelect}
                    placeholder="Folders"
                    isSearchable
                    width="100%"
                    checkboxAtEnd={true}
                    openUpward={true}
                    renderFooter={renderFooter}
                    listMaxHeightClass="max-h-[224px]"
                    menuMaxHeightClass="max-h-[448px]"
                />
            </div>
        </div>
    )
}
