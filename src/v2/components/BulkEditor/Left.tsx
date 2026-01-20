import { useState, useEffect } from "react"
import { useGetFolders, Folder, Color } from "@/v2/api/folders.api"
import { MultiSelectDropdown } from "../FigmaManager/MultiSelectDropdown"
import { CollapsibleBox } from "../CollapsibleBox"
import { ChevronDown } from "lucide-react"
import * as Tooltip from "@radix-ui/react-tooltip"

interface Props {
  setIsLeftOpen: (isOpen: boolean) => void
}

interface SelectedColor {
  color: Color
  folderId: string
  folderName: string
  originalColorId: string
}

const Left: React.FC<Props> = ({ setIsLeftOpen }) => {
  const { data: foldersData, isLoading, error, refetch } = useGetFolders(true)
  const [selectedFolders, setSelectedFolders] = useState<Folder[]>([])
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const [selectedColors, setSelectedColors] = useState<Map<string, SelectedColor>>(new Map())

  // Load saved folder selection from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bulk_editor_selected_folders')
      if (saved && foldersData?.folders) {
        const savedIds = JSON.parse(saved) as string[]
        const folders = foldersData.folders.filter(f => savedIds.includes(f._id))
        if (folders.length > 0) {
          setSelectedFolders(folders)
        }
      }
    } catch (e) {
      console.error('Error loading saved folders:', e)
    }
  }, [foldersData])

  // Save folder selection to localStorage
  useEffect(() => {
    if (selectedFolders.length > 0) {
      localStorage.setItem('bulk_editor_selected_folders', JSON.stringify(selectedFolders.map(f => f._id)))
      setIsLeftOpen(true)
    } else {
      localStorage.removeItem('bulk_editor_selected_folders')
      setIsLeftOpen(false)
    }
  }, [selectedFolders, setIsLeftOpen])

  const handleFolderToggle = (folderId: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const handleColorClick = (color: Color, folder: Folder) => {
    const colorKey = `${folder._id}_${color._id}`
    setSelectedColors(prev => {
      const next = new Map(prev)
      if (next.has(colorKey)) {
        next.delete(colorKey)
      } else {
        next.set(colorKey, {
          color,
          folderId: folder._id,
          folderName: folder.name,
          originalColorId: color._id,
        })
      }
      return next
    })
  }

  const isColorSelected = (colorId: string, folderId: string): boolean => {
    return selectedColors.has(`${folderId}_${colorId}`)
  }

  // Dispatch selected colors to global state or parent component
  useEffect(() => {
    // Store in localStorage for Right component to access
    const colorsArray = Array.from(selectedColors.values())
    localStorage.setItem('bulk_editor_selected_colors', JSON.stringify(colorsArray))
    
    // Dispatch custom event for Right component
    window.dispatchEvent(new CustomEvent('bulk-editor-colors-changed', {
      detail: { colors: colorsArray }
    }))
  }, [selectedColors])

  // Listen for folder refresh events from Right component
  useEffect(() => {
    const handleRefresh = async () => {
      const result = await refetch()
      // After refetch, update selectedFolders to use the new data
      if (selectedFolders.length > 0 && result.data?.folders) {
        const currentFolderIds = selectedFolders.map(sf => sf._id)
        const updatedFolders = result.data.folders.filter(f => 
          currentFolderIds.includes(f._id)
        )
        if (updatedFolders.length > 0) {
          setSelectedFolders(updatedFolders)
        }
      }
    }

    const handleClearSelection = () => {
      // Clear all selected colors in the left panel
      setSelectedColors(new Map())
    }

    window.addEventListener('bulk-editor-folders-refresh', handleRefresh)
    window.addEventListener('bulk-editor-clear-selection', handleClearSelection)
    return () => {
      window.removeEventListener('bulk-editor-folders-refresh', handleRefresh)
      window.removeEventListener('bulk-editor-clear-selection', handleClearSelection)
    }
  }, [refetch, selectedFolders])

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        <div className="mb-2">Loading folders...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500 text-sm">
        <div className="mb-2">Error loading folders</div>
        <div className="text-[11px] text-gray-400">{String(error)}</div>
      </div>
    )
  }

  const folders = foldersData?.folders || []

  if (folders.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        <div className="mb-2">No folders found</div>
        <div className="text-[11px] text-gray-300">Create folders in your account to use bulk editor</div>
      </div>
    )
  }

  return (
    <div className="relative h-full overflow-y-auto overflow-x-hidden p-3 w-[400px]">
      {/* Folder Selection */}
      <div className="mb-3">
        <MultiSelectDropdown
          isSearchable
          placeholder="Select Folders"
          selected={selectedFolders}
          items={folders}
          keyExtractor={(folder) => folder._id}
          renderItem={(folder) => folder.name}
          renderSelected={(selected) =>
            selected.length === folders.length
              ? "All Folders"
              : `${selected.length} Folder${selected.length === 1 ? "" : "s"}`
          }
          onSelect={(folders) => setSelectedFolders(folders)}
          width="100%"
        />
      </div>

      {/* Folders with Colors */}
      {selectedFolders.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-8">
          <div className="mb-2">Select folders above to view colors</div>
          <div className="text-[11px] text-gray-300">Click colors to add them to the editor</div>
        </div>
      ) : (
        <div className="space-y-2">
          {selectedFolders.map((folder) => {
            const colors = folder.colors || []
            const isCollapsed = collapsedFolders.has(folder._id)
            const selectedCount = colors.filter(c => isColorSelected(c._id, folder._id)).length

            return (
              <div key={folder._id} className="border border-gray-200 rounded">
                {/* Folder Header */}
                <div className="flex items-center gap-2 p-2 bg-gray-50 border-b border-gray-200">
                  <button
                    onClick={() => handleFolderToggle(folder._id)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <ChevronDown
                      size={14}
                      style={{
                        transformOrigin: "center",
                        transform: `rotate(${isCollapsed ? -90 : 0}deg)`,
                        transition: "transform 0.2s ease-in-out",
                      }}
                    />
                  </button>
                  <div className="flex-grow">
                    <div className="text-[12px] font-medium text-gray-800 truncate">
                      {folder.name}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {colors.length} color{colors.length !== 1 ? "s" : ""}
                      {selectedCount > 0 && ` • ${selectedCount} selected`}
                    </div>
                  </div>
                </div>

                {/* Colors Grid */}
                <CollapsibleBox
                  isOpen={!isCollapsed}
                  maxHeight={`${Math.ceil(colors.length / 6) * 40 + 20}px`}
                >
                  <div className="p-2">
                    {colors.length === 0 ? (
                      <div className="text-center text-gray-400 text-[11px] py-4">
                        No colors in this folder
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        <Tooltip.Provider>
                          {colors.map((color) => {
                            const isSelected = isColorSelected(color._id, folder._id)
                            return (
                              <Tooltip.Root key={color._id}>
                                <Tooltip.Trigger asChild>
                                  <div
                                    style={{
                                      backgroundColor: color.hex,
                                    }}
                                    className={`w-[32px] h-[32px] cursor-pointer border-2 transition-all ${
                                      isSelected
                                        ? "border-blue-500 ring-2 ring-blue-200"
                                        : "border-gray-300 hover:border-gray-400"
                                    }`}
                                    onClick={() => handleColorClick(color, folder)}
                                  />
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                  <Tooltip.Content
                                    className="bg-white rounded-md shadow-lg p-2 text-sm z-50"
                                    sideOffset={5}
                                  >
                                    <div className="flex flex-col gap-1">
                                      <div className="font-medium">Color Information</div>
                                      <div>Hex: {color.hex}</div>
                                      {color.rgb && (
                                        <div>
                                          RGB: {typeof color.rgb === 'string' 
                                            ? color.rgb 
                                            : `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`}
                                        </div>
                                      )}
                                      {color.hsl && (
                                        <div>
                                          HSL: {typeof color.hsl === 'string' 
                                            ? color.hsl 
                                            : `hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`}
                                        </div>
                                      )}
                                      {color.slash_naming && (
                                        <div>Slash Naming: {color.slash_naming}</div>
                                      )}
                                      {color.comments && (
                                        <div>Comments: {color.comments}</div>
                                      )}
                                    </div>
                                    <Tooltip.Arrow className="fill-white" />
                                  </Tooltip.Content>
                                </Tooltip.Portal>
                              </Tooltip.Root>
                            )
                          })}
                        </Tooltip.Provider>
                      </div>
                    )}
                  </div>
                </CollapsibleBox>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Left
