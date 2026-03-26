import { FC, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useGlobalState } from '@/v2/hooks/useGlobalState'
import { useToast } from '@/v2/hooks/useToast'
import { colors } from '@/v2/helpers/colors'
import { config } from '@/v2/others/config'
import { axiosInstance } from '@/v2/hooks/useAPI'
import { useGetFolders } from '@/v2/api/folders.api'
import { useQueryClient } from '@tanstack/react-query'
import { Trash2, Copy, Check, X, Plus } from 'lucide-react'
import SectionHeader from '../common/SectionHeader'
import { Slider } from '@/components/ui/slider'
import { HexColorPicker } from 'react-colorful'
import { Dropdown } from '../FigmaManager/Dropdown'
import {
  buildParentIdByChildId,
  getFolderLabelWithParent,
  flattenFoldersHierarchyOrder,
} from '@/v2/utils/folderDisplayName'

const MAX_LOCAL_COLORS = 30

/** Returns "black" or "white" for contrast on the given hex background */
function getContrastColor(hex: string): "black" | "white" {
  const h = (hex || "#808080").replace("#", "")
  if (h.length !== 6) return "white"
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5 ? "white" : "black"
}

interface Props {
  selected: null | string;
  setTab: (tab: string | null) => void;
  copyToClipboard: (text: string, selection: null | string) => void;
  onPickColor?: () => void;
  onPickColorFromBrowser?: () => void;
}

const Comment: FC<Props> = ({ setTab, onPickColor, onPickColorFromBrowser }) => {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { state, dispatch } = useGlobalState()
  const { colorHistory, parsedData } = state
  const [selectedColorIndices, setSelectedColorIndices] = useState<number[]>([]) // Multi-select
  const [editingColor, setEditingColor] = useState<string>('#ffffff')
  const [originalColor, setOriginalColor] = useState<string>('#ffffff') // Track original for cancel
  const [isEditing, setIsEditing] = useState<boolean>(false) // Track if user is editing
  const [ranking, setRanking] = useState<number>(0)
  const [updateLoading, setUpdateLoading] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)
  const [copiedType, setCopiedType] = useState<string>('')
  const [slashParts, setSlashParts] = useState<string[]>([])
  const [slashInput, setSlashInput] = useState<string>('')
  const [tagsList, setTagsList] = useState<string[]>([])
  const [tagsInput, setTagsInput] = useState<string>('')
  const [colorUrl, setColorUrl] = useState<string>('')
  const [currentTabUrl, setCurrentTabUrl] = useState<string>('Manually created')
  const [comment, setComment] = useState<string>('')
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolderLoading, setIsCreatingFolderLoading] = useState(false)
  const justSavedRef = useRef(false)
  const lastLoadedDataRef = useRef<string>('')  // Track what data we last loaded

  // For single color editing (first selected)
  const selectedColorIndex = selectedColorIndices.length > 0 ? selectedColorIndices[0] : null

  const { data: foldersData } = useGetFolders(true)
  const folders = useMemo(
    () => flattenFoldersHierarchyOrder(foldersData?.folders ?? []),
    [foldersData?.folders],
  )
  const parentByChildId = useMemo(() => buildParentIdByChildId(folders), [folders])

  const handleCreateFolder = useCallback(async () => {
    const name = newFolderName.trim()
    if (!name || !state.user?.jwtToken) return
    setIsCreatingFolderLoading(true)
    try {
      const response = await axiosInstance.post(
        config.api.endpoints.createFolder,
        { name, colorIds: [], paletteIds: [] },
        { headers: { Authorization: `Bearer ${state.user.jwtToken}` } }
      )
      const folder = response.data?.folder ?? response.data
      if (folder?._id) {
        await queryClient.invalidateQueries({ queryKey: ['folders'] })
        toast.display('success', 'Folder created')
        setNewFolderName('')
        setIsCreatingFolder(false)
      }
    } catch (err: any) {
      toast.display('error', err?.response?.data?.err || err?.response?.data?.message || 'Failed to create folder')
    } finally {
      setIsCreatingFolderLoading(false)
    }
  }, [newFolderName, state.user?.jwtToken, queryClient, toast])

  const renderFolderFooter = useCallback(() => {
    if (isCreatingFolder) {
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
              if (e.key === 'Enter') handleCreateFolder()
              if (e.key === 'Escape') {
                setIsCreatingFolder(false)
                setNewFolderName('')
              }
            }}
          />
          <button
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim() || isCreatingFolderLoading}
            className="px-3 py-1.5 text-[12px] bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingFolderLoading ? '...' : 'Save'}
          </button>
        </div>
      )
    }
    return (
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsCreatingFolder(true)
        }}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] text-gray-600 hover:bg-gray-50 border-t border-gray-100 transition-colors"
      >
        <Plus size={14} />
        Create
      </button>
    )
  }, [isCreatingFolder, newFolderName, isCreatingFolderLoading])

  // When user selects a color, show its folder if parsedData has color id (from createdColor when picked)
  // Fallback: when parsedData has no _id (e.g. padded slot), match by hex in folder.colors and store colorId for Update
  useEffect(() => {
    let folderId: string | null = null
    if (selectedColorIndex !== null && folders.length > 0) {
      const data = parsedData[selectedColorIndex] as any
      const colorId = data?._id ?? data?.id
      const colorIdStr = colorId != null ? String(colorId) : null
      const hex = colorHistory[selectedColorIndex]
      const hexNorm = hex ? String(hex).toLowerCase() : null

      if (colorIdStr) {
        const folder = folders.find((f) =>
          (f.colorIds ?? []).some((cid) => String(cid) === colorIdStr)
        )
        folderId = folder ? folder._id : null
      } else if (hexNorm && Array.isArray((folders[0] as any)?.colors)) {
        const folder = folders.find((f) =>
          (f.colors ?? []).some((c: any) => String(c?.hex ?? '').toLowerCase() === hexNorm)
        )
        if (folder) {
          folderId = folder._id
          const matchedColor = (folder.colors ?? []).find((c: any) => String(c?.hex ?? '').toLowerCase() === hexNorm)
          if (matchedColor?._id && !(data?._id ?? data?.id)) {
            dispatch({ type: "UPDATE_PARSED_AT", payload: { index: selectedColorIndex, parsed: { _id: matchedColor._id } } })
          }
        }
      }
      setSelectedFolderId(folderId)
    } else {
      setSelectedFolderId(null)
    }
  }, [selectedColorIndex, parsedData, folders, colorHistory, dispatch])

  // Fetch current tab URL on mount
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const url = tabs[0]?.url
      if (url && !url.startsWith('chrome://') && !url.startsWith('chrome-extension://')) {
        setCurrentTabUrl(url)
        setColorUrl(url)
      } else {
        setCurrentTabUrl('Manually created')
        setColorUrl('Manually created')
      }
    }).catch(() => {
      setCurrentTabUrl('Manually created')
      setColorUrl('Manually created')
    })
  }, [])

  // Load all fields when color is selected or when parsedData changes
  useEffect(() => {
    if (selectedColorIndex !== null && colorHistory[selectedColorIndex]) {
      const currentColor = colorHistory[selectedColorIndex]
      setEditingColor(currentColor)
      setOriginalColor(currentColor)
      setIsEditing(false)

      // Skip loading if we just saved (to preserve user's entered values)
      if (justSavedRef.current) {
        justSavedRef.current = false
        return
      }

      const data = parsedData[selectedColorIndex]
      if (data) {
        // Create a unique key for this data to detect changes (include name/tags so Bulk Editor updates are reflected)
        const dataKey = `${selectedColorIndex}:${data.hex}:${data.slash_naming || ''}:${JSON.stringify((data as any).tags || [])}`

        // Only reload if the data has actually changed
        if (lastLoadedDataRef.current !== dataKey) {
          lastLoadedDataRef.current = dataKey
          setRanking(Number(data.ranking) || 0)
          // Parse slash naming into parts array
          const slashNameStr = data.slash_naming || ''
          setSlashParts(slashNameStr ? slashNameStr.split('/').filter(Boolean).slice(0, 5) : [])
          setSlashInput('')
          // Parse tags into list array
          const tagsData = (data as any).tags
          if (Array.isArray(tagsData)) {
            setTagsList(tagsData)
          } else if (typeof tagsData === 'string' && tagsData) {
            setTagsList(tagsData.split(',').map((t: string) => t.trim()).filter(Boolean))
          } else {
            setTagsList([])
          }
          setTagsInput('')
          setComment(data.comments || '')
          setColorUrl((data as any).url || 'Manually created')
        }
      } else {
        // Reset fields for new colors (not in parsedData)
        if (lastLoadedDataRef.current !== `new:${selectedColorIndex}`) {
          lastLoadedDataRef.current = `new:${selectedColorIndex}`
          setRanking(0)
          setSlashParts([])
          setSlashInput('')
          setTagsList([])
          setTagsInput('')
          setComment('')
          setColorUrl(currentTabUrl)
        }
      }
    }
  }, [selectedColorIndex, colorHistory, parsedData, currentTabUrl])

  // Track when user is editing the color
  const handleColorChange = (newColor: string) => {
    setEditingColor(newColor)
    if (newColor.toLowerCase() !== originalColor.toLowerCase()) {
      setIsEditing(true)
    }
  }

  // Auto-select the last color
  useEffect(() => {
    if (colorHistory.length > 0 && selectedColorIndices.length === 0) {
      setSelectedColorIndices([colorHistory.length - 1])
    }
  }, [colorHistory.length])

  const handleColorClick = (index: number, event: React.MouseEvent) => {
    const isMultiSelect = event.ctrlKey || event.metaKey || event.shiftKey

    if (isMultiSelect) {
      // Multi-select mode
      if (selectedColorIndices.includes(index)) {
        setSelectedColorIndices(selectedColorIndices.filter(i => i !== index))
      } else {
        setSelectedColorIndices([...selectedColorIndices, index])
      }
    } else {
      // Single select mode
      if (selectedColorIndices.length === 1 && selectedColorIndices[0] === index) {
        setSelectedColorIndices([])
        setEditingColor('#ffffff')
        setOriginalColor('#ffffff')
        setIsEditing(false)
      } else {
        setSelectedColorIndices([index])
        setEditingColor(colorHistory[index])
        setOriginalColor(colorHistory[index])
        setIsEditing(false)
      }
    }
    setCopied(false)
  }

  const handleSelectAll = () => {
    setSelectedColorIndices(colorHistory.map((_, i) => i))
  }

  const handleDeselectAll = () => {
    setSelectedColorIndices([])
    setEditingColor('#ffffff')
    setOriginalColor('#ffffff')
  }

  const handleCopy = (value: string, type: string) => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setCopiedType(type)
    setTimeout(() => {
      setCopied(false)
      setCopiedType('')
    }, 1500)
  }

  // Cancel editing - revert to original color
  const handleCancel = () => {
    setEditingColor(originalColor)
    setIsEditing(false)
  }

  // Confirm editing - add as new color to local history and save to database
  const handleConfirmNewColor = () => {
    if (colorHistory.length >= MAX_LOCAL_COLORS) {
      dispatch({ type: "REMOVE_OLDEST_COLOR_HISTORY" })
    }

    const normalizedHex = colors.expandHex(editingColor)

    // Save to database if logged in
    if (state.user?.jwtToken) {
      const finalUrl = colorUrl === 'Manually created' ? 'Manually Added' : (colorUrl || currentTabUrl)
      axiosInstance.post(
        config.api.endpoints.addColor,
        {
          spreadsheetId: null,
          sheetName: null,
          sheetId: null,
          row: {
            timestamp: new Date().valueOf(),
            url: finalUrl,
            hex: normalizedHex,
            hsl: colors.hexToHSL(normalizedHex),
            rgb: colors.hexToRGB(normalizedHex),
            comments: comment,
            ranking: String(ranking || 0),
            slash_naming: slashParts.join('/'),
            tags: tagsList,
            additionalColumns: [],
          },
          folderIds: selectedFolderId ? [selectedFolderId] : [],
        },
        { headers: { Authorization: `Bearer ${state.user.jwtToken}` } }
      ).then((response) => {
        const apiResponse = response?.data?.data ?? response?.data
        const createdColor = apiResponse?.createdColor
        if (createdColor) {
          dispatch({
            type: "ADD_COLOR_HISTORY",
            payload: { hex: normalizedHex, parsed: createdColor },
          })
        } else {
          dispatch({ type: "ADD_COLOR_HISTORY", payload: normalizedHex })
        }
        toast.display("success", "Color saved successfully")
        queryClient.invalidateQueries({ queryKey: ["folders"] })
      }).catch(() => {
        dispatch({ type: "ADD_COLOR_HISTORY", payload: normalizedHex })
        toast.display("error", "Color added locally but failed to save to database")
      })
    } else {
      dispatch({ type: "ADD_COLOR_HISTORY", payload: editingColor })
      toast.display("success", "Color added to history")
    }

    setOriginalColor(editingColor)
    setIsEditing(false)
  }

  // Open login popup
  const openLogin = () => {
    const url = config.api.baseURL + config.api.endpoints.auth
    window.open(url, "Google Sign-in", "width=1000,height=700")
  }

  const handleUpdate = async () => {
    if (selectedColorIndex === null) {
      toast.display("error", "Select a color to update")
      return
    }
    const data = parsedData[selectedColorIndex] as any
    const colorId = data?._id ?? data?.id
    if (!colorId) {
      toast.display("error", "Select a saved color (with ID) to update it in the database")
      return
    }
    setUpdateLoading(true)
    try {
      const normalizedHex = colors.expandHex(editingColor)
      const slashNamingStr = slashParts.join('/')
      const finalUrl = colorUrl === 'Manually created' ? 'Manually Added' : (colorUrl || currentTabUrl)
      const row = {
        url: finalUrl,
        hex: normalizedHex,
        rgb: colors.hexToRGB(normalizedHex),
        hsl: colors.hexToHSL(normalizedHex),
        slash_naming: slashNamingStr,
        comments: comment,
        ranking: Number(ranking) || 0,
        tags: tagsList,
        additionalColumns: data?.additionalColumns ?? [],
        timestamp: Date.now(),
      }
      const response = await axiosInstance.put(
        config.api.endpoints.updateColor,
        {
          colorId,
          sheetId: null,
          isUpdateSheet: false,
          row,
        },
        {
          headers: {
            Authorization: `Bearer ${state.user?.jwtToken}`,
          },
        }
      )
      const result = response?.data?.data ?? response?.data
      const updatedColor = result?.color

      if (updatedColor) {
        const parsed = {
          _id: updatedColor._id,
          id: updatedColor._id,
          hex: updatedColor.hex,
          url: updatedColor.url,
          slash_naming: updatedColor.slash_naming,
          comments: updatedColor.comments,
          ranking: updatedColor.ranking,
          tags: updatedColor.tags,
          additionalColumns: updatedColor.additionalColumns ?? [],
        }
        dispatch({ type: "UPDATE_COLOR_AT", payload: { index: selectedColorIndex, hex: updatedColor.hex, parsed } })
      } else {
        dispatch({ type: "UPDATE_COLOR_AT", payload: { index: selectedColorIndex, hex: normalizedHex, parsed: { ...data, ...row, _id: colorId } } })
      }

      if (selectedFolderId) {
        await axiosInstance.post(
          `${config.api.endpoints.moveColorsToFolder}/${selectedFolderId}/move-colors`,
          { colorIds: [colorId], isNotFoldered: false },
          { headers: { Authorization: `Bearer ${state.user?.jwtToken}` } }
        )
        await queryClient.invalidateQueries({ queryKey: ["folders"] })
      }

      justSavedRef.current = true
      setOriginalColor(normalizedHex)
      setIsEditing(false)
      toast.display("success", "Color updated successfully")
    } catch (err: any) {
      toast.display("error", err?.response?.data?.err || err?.response?.data?.message || "Failed to update color")
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleDelete = async () => {
    if (selectedColorIndices.length === 0) return

    const confirmed = window.confirm(
      state.user?.jwtToken
        ? `Remove ${selectedColorIndices.length} color${selectedColorIndices.length > 1 ? 's' : ''} from history and from the database?`
        : `Remove ${selectedColorIndices.length} color${selectedColorIndices.length > 1 ? 's' : ''} from history?`
    )
    if (!confirmed) return

    const colorIdsToDelete: string[] = []
    console.log('selectedColorIndices', selectedColorIndices)
    console.log('parsedData', parsedData)
    selectedColorIndices.forEach((idx) => {
      const p = parsedData[idx] as any
      const id = p?._id ?? p?.id
      if (id && typeof id === 'string') colorIdsToDelete.push(id)
    })

    if (state.user?.jwtToken && colorIdsToDelete.length > 0) {
      try {
        await axiosInstance.post(
          config.api.endpoints.deleteColors,
          { colorIds: colorIdsToDelete },
          { headers: { Authorization: `Bearer ${state.user.jwtToken}` } }
        )
      } catch (err: any) {
        toast.display("error", err.response?.data?.error || "Failed to remove from database")
        return
      }
      queryClient.invalidateQueries({ queryKey: ["folders"] })
      queryClient.invalidateQueries({ queryKey: ["all-color-data"] })
    }

    const newHistory = colorHistory.filter((_, i) => !selectedColorIndices.includes(i))
    const newParsedData = parsedData.filter((_, i) => !selectedColorIndices.includes(i))
    dispatch({ type: "CLEAR_COLOR_HISTORY" })
    newHistory.forEach((color, i) =>
      dispatch({
        type: "ADD_COLOR_HISTORY",
        payload: newParsedData[i] ? { hex: color, parsed: newParsedData[i] } : color,
      })
    )
    setSelectedColorIndices([])
    setEditingColor('#ffffff')
    toast.display("success", `${selectedColorIndices.length} color${selectedColorIndices.length > 1 ? 's' : ''} removed`)
  }

  return (
    <div className="w-[520px]">
      <SectionHeader
        title="History & Editor"
        setTab={setTab}
        onPickColor={onPickColor}
        onPickColorFromBrowser={onPickColorFromBrowser}
      />

      <div className="flex">
        {/* Column 1 - Color Picker & Local Colors */}
        <div className="w-[220px] p-3 border-r border-gray-200">
          <HexColorPicker
            color={editingColor}
            onChange={handleColorChange}
            style={{ width: '100%', height: '160px' }}
          />

          {/* Color preview on top */}
          <div
            className="mt-2 h-8 w-full rounded border border-gray-200"
            style={{ backgroundColor: editingColor }}
          />

          {/* Color values below */}
          <div className="mt-2 space-y-1">
            {/* HEX */}
            <div className="flex items-center gap-1">
              <span className="w-7 text-[9px] text-gray-400">HEX</span>
              <input
                type="text"
                value={editingColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="flex-1 px-1.5 py-0.5 text-[10px] font-mono border border-gray-200 rounded focus:outline-none focus:border-gray-400 uppercase"
              />
              <button
                onClick={() => handleCopy(editingColor, 'hex')}
                className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                title="Copy HEX"
              >
                {copied && copiedType === 'hex' ? (
                  <Check size={11} className="text-emerald-500" />
                ) : (
                  <Copy size={11} className="text-gray-400" />
                )}
              </button>
            </div>
            {/* RGB */}
            <div className="flex items-center gap-1">
              <span className="w-7 text-[9px] text-gray-400">RGB</span>
              <input
                type="text"
                value={colors.hexToRGB(editingColor)}
                onChange={(e) => {
                  const hex = colors.rgbToHex(e.target.value)
                  if (hex !== '#000000' || e.target.value.includes('0, 0, 0')) {
                    handleColorChange(hex)
                  }
                }}
                className="flex-1 px-1.5 py-0.5 text-[10px] font-mono border border-gray-200 rounded focus:outline-none focus:border-gray-400"
              />
              <button
                onClick={() => handleCopy(colors.hexToRGB(editingColor), 'rgb')}
                className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                title="Copy RGB"
              >
                {copied && copiedType === 'rgb' ? (
                  <Check size={11} className="text-emerald-500" />
                ) : (
                  <Copy size={11} className="text-gray-400" />
                )}
              </button>
            </div>
            {/* HSL */}
            <div className="flex items-center gap-1">
              <span className="w-7 text-[9px] text-gray-400">HSL</span>
              <input
                type="text"
                value={colors.hexToHSL(editingColor)}
                onChange={(e) => {
                  const hex = colors.hslToHex(e.target.value)
                  if (hex !== '#000000' || e.target.value.includes('0, 0%, 0%')) {
                    handleColorChange(hex)
                  }
                }}
                className="flex-1 px-1.5 py-0.5 text-[10px] font-mono border border-gray-200 rounded focus:outline-none focus:border-gray-400"
              />
              <button
                onClick={() => handleCopy(colors.hexToHSL(editingColor), 'hsl')}
                className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                title="Copy HSL"
              >
                {copied && copiedType === 'hsl' ? (
                  <Check size={11} className="text-emerald-500" />
                ) : (
                  <Copy size={11} className="text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Cancel/OK buttons when editing */}
          {isEditing && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleCancel}
                className="flex-1 px-2 py-1.5 text-[11px] border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmNewColor}
                className="flex-1 px-2 py-1.5 text-[11px] bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
              >
                Add Color
              </button>
            </div>
          )}

          {/* Local Color Grid */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              {colorHistory.length > 0 ? (
                selectedColorIndices.length === colorHistory.length ? (
                  <button
                    onClick={handleDeselectAll}
                    className="text-[12px] text-gray-600 hover:text-gray-800"
                  >
                    Deselect all
                  </button>
                ) : (
                  <button
                    onClick={handleSelectAll}
                    className="text-[12px] text-gray-600 hover:text-gray-800"
                  >
                    Select all
                  </button>
                )
              ) : (
                <span />
              )}
              <span className="text-[12px] text-gray-500">{selectedColorIndices.length}/{colorHistory.length}</span>
            </div>
            <div className="grid gap-[3px] p-[5px] border border-gray-200 rounded min-h-[70px] max-h-[110px] overflow-y-auto overflow-x-hidden" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(24px, 1fr))' }}>
              {colorHistory.length === 0 ? (
                <div className="text-[11px] text-gray-400 col-span-7 text-center py-4">
                  No colors saved yet
                </div>
              ) : (
                [...colorHistory].reverse().map((color, reverseIndex) => {
                  const index = colorHistory.length - 1 - reverseIndex
                  const isSelected = selectedColorIndices.includes(index)
                  const contrast = getContrastColor(color)
                  return (
                    <div
                      key={color + index}
                      onClick={(e) => handleColorClick(index, e)}
                      className="aspect-square cursor-pointer rounded-sm transition-all border border-gray-200 hover:brightness-90 relative flex items-center justify-center"
                      style={{ backgroundColor: color }}
                      title={`${color} (Ctrl+click to multi-select)`}
                    >
                      {isSelected && (
                        <Check
                          size={14}
                          strokeWidth={3}
                          className={`flex-shrink-0 ${contrast === "white" ? "text-white" : "text-black"}`}
                        />
                      )}
                    </div>
                  )
                })
              )}
            </div>
            <p className="text-[9px] text-gray-400 mt-1">Ctrl+click to multi-select</p>
          </div>

          {/* Delete from local history */}
          <button
            onClick={handleDelete}
            disabled={selectedColorIndices.length === 0}
            className="w-full mt-2 flex items-center justify-center gap-1 px-2 py-2 text-[11px] border border-gray-200 rounded hover:bg-gray-50 transition-colors text-red-500 disabled:opacity-50"
          >
            <Trash2 size={12} />
            Remove {selectedColorIndices.length > 0 ? `(${selectedColorIndices.length})` : ''}
          </button>
        </div>

        {/* Column 2 - Details */}
        <div className="flex-1 p-3 flex flex-col">
          {/* Save to: Folder (color id stored in parsedData for folder lookup) */}
          <div className="mb-3">
            {/* Folder dropdown - shows selected color's folder when color has id in parsedData */}
            <div className="mb-2">
              <label className="block text-[11px] text-gray-500 mb-1">Select folder</label>

              <Dropdown
                selected={selectedFolderId}
                items={folders.map((f) => f._id)}
                renderItem={(folderId) => {
                  const folder = folders.find((f) => f._id === folderId)
                  return folder
                    ? getFolderLabelWithParent(folder, folders, parentByChildId)
                    : folderId
                }}
                renderSelected={(folderId) => {
                  const folder = folders.find((f) => f._id === folderId)
                  return folder
                    ? getFolderLabelWithParent(folder, folders, parentByChildId)
                    : 'Select a folder'
                }}
                onSelect={(folderId) => setSelectedFolderId(folderId)}
                placeholder="Select a folder"
                width="100%"
                renderFooter={renderFolderFooter}
                footerExpanded={isCreatingFolder}
              />
            </div>
          </div>

          {/* Metadata Fields - always shown */}
          <div className="flex-grow">
            {/* Metadata Fields */}
            <div className="space-y-2">
              {/* URL Source */}
              <input
                type="text"
                value={colorUrl}
                onChange={(e) => setColorUrl(e.target.value)}
                placeholder="Source URL"
                className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded focus:outline-none focus:border-gray-400 text-gray-500"
              />

              {/* Slash Naming Chip Input */}
              <div className="w-full px-2 py-1.5 border border-gray-200 rounded focus-within:border-gray-400">
                <div className="flex flex-wrap gap-1 items-center">
                  {slashParts.map((part, idx) => (
                    <span key={idx} className="inline-flex items-center">
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-gray-100 text-[11px] rounded">
                        {part}
                        <button
                          onClick={() => setSlashParts(slashParts.filter((_, i) => i !== idx))}
                          className="ml-0.5 text-gray-400 hover:text-gray-600"
                        >
                          <X size={10} />
                        </button>
                      </span>
                      {idx < slashParts.length - 1 && (
                        <span className="mx-1 text-gray-400 text-[11px]">/</span>
                      )}
                    </span>
                  ))}
                  {slashParts.length < 5 && (
                    <input
                      type="text"
                      value={slashInput}
                      onChange={(e) => {
                        const val = e.target.value
                        const parts = val.split('/').map((p) => p.trim()).filter(Boolean).slice(0, 5)
                        setSlashInput(parts.join('/'))
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === '/') {
                          const newParts = slashInput.split('/').map((p) => p.trim()).filter(Boolean)
                          const remaining = 5 - slashParts.length
                          const toAdd = newParts.slice(0, remaining)
                          if (toAdd.length > 0) {
                            e.preventDefault()
                            setSlashParts([...slashParts, ...toAdd])
                            setSlashInput('')
                          }
                        } else if (e.key === 'Backspace' && !slashInput && slashParts.length > 0) {
                          setSlashParts(slashParts.slice(0, -1))
                        }
                      }}
                      placeholder={slashParts.length === 0 ? "Slash Naming (e.g. Brand/Primary/Blue, max 5 names)" : ""}
                      className="flex-1 min-w-[80px] text-[12px] outline-none bg-transparent"
                    />
                  )}
                </div>
              </div>

              {/* Tags Chip Input */}
              <div className="w-full px-2 py-1.5 border border-gray-200 rounded focus-within:border-gray-400">
                <div className="flex flex-wrap gap-1 items-center">
                  {tagsList.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] rounded">
                      {tag}
                      <button
                        onClick={() => setTagsList(tagsList.filter((_, i) => i !== idx))}
                        className="ml-0.5 text-blue-400 hover:text-blue-600"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  {tagsList.length < 5 && (
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ',') && tagsInput.trim()) {
                          e.preventDefault()
                          setTagsList([...tagsList, tagsInput.trim()])
                          setTagsInput('')
                        } else if (e.key === 'Backspace' && !tagsInput && tagsList.length > 0) {
                          setTagsList(tagsList.slice(0, -1))
                        }
                      }}
                      placeholder={tagsList.length === 0 ? "Tags (press , or Enter)" : ""}
                      className="flex-1 min-w-[80px] text-[12px] outline-none bg-transparent"
                    />
                  )}
                </div>
              </div>

              {/* Comment Input */}
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comment"
                rows={2}
                className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded focus:outline-none focus:border-gray-400 resize-y min-h-[60px]"
              />

              {/* Priority Slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-gray-500">Priority</span>
                  <span className="text-[11px] font-medium text-gray-700">{ranking}</span>
                </div>
                <Slider
                  value={[ranking]}
                  onValueChange={(value) => setRanking(value[0])}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (!state.user?.jwtToken) {
                  openLogin()
                } else {
                  handleUpdate()
                }
              }}
              disabled={!state.user?.jwtToken || selectedColorIndex === null || updateLoading || !((parsedData[selectedColorIndex] as any)?._id ?? (parsedData[selectedColorIndex] as any)?.id)}
              className="px-4 py-2.5 text-[12px] bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors disabled:bg-gray-200 disabled:text-gray-500 flex items-center justify-center gap-1.5 min-w-[120px]"
            >
              {updateLoading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Comment
