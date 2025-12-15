import { FC, useState, useEffect, useRef } from 'react'
import { AddNewAdditionalColumnRequest, AddNewAdditionalColumnResponse } from '@/v2/types/api'
import { useGlobalState } from '@/v2/hooks/useGlobalState'
import { useToast } from '@/v2/hooks/useToast'
import { colors } from '@/v2/helpers/colors'
import { config } from '@/v2/others/config'
import { useAPI } from '@/v2/hooks/useAPI'
import { useUpsertColors } from '@/v2/api/sheet.api'
import { ArrowLeft, Trash2, Copy, Check, Plus, X, Link, ExternalLink } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { HexColorPicker } from 'react-colorful'

import Select from '../Select'

const MAX_LOCAL_COLORS = 30

interface Props {
  selected: null | string;
  setTab: (tab: string | null) => void;
  copyToClipboard: (text: string, selection: null | string) => void
}

const Comment: FC<Props> = ({ setTab }) => {
  const toast = useToast()
  const { state, dispatch } = useGlobalState()
  const { colorHistory, selectedFile, parsedData, files, newColumns: allNewColumns } = state
  const sheetColumns = selectedFile ? (allNewColumns[selectedFile] || []) : []
  const [selectedColorIndices, setSelectedColorIndices] = useState<number[]>([]) // Multi-select
  const [editingColor, setEditingColor] = useState<string>('#ffffff')
  const [originalColor, setOriginalColor] = useState<string>('#ffffff') // Track original for cancel
  const [isEditing, setIsEditing] = useState<boolean>(false) // Track if user is editing
  const [ranking, setRanking] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [checkValidFlag, setCheckValidFlag] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)
  const [copiedType, setCopiedType] = useState<string>('')
  const [slashParts, setSlashParts] = useState<string[]>([])
  const [slashInput, setSlashInput] = useState<string>('')
  const [tagsList, setTagsList] = useState<string[]>([])
  const [tagsInput, setTagsInput] = useState<string>('')
  const [colorUrl, setColorUrl] = useState<string>('')
  const [currentTabUrl, setCurrentTabUrl] = useState<string>('Manually created')
  const [comment, setComment] = useState<string>('')
  const [columnValues, setColumnValues] = useState<Record<string, string>>({})
  const [newColumnName, setNewColumnName] = useState<string>('')
  const justSavedRef = useRef(false)
  const lastLoadedDataRef = useRef<string>('')  // Track what data we last loaded

  // For single color editing (first selected)
  const selectedColorIndex = selectedColorIndices.length > 0 ? selectedColorIndices[0] : null

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

  const { upsertColorsAsync } = useUpsertColors()

  // Note: deleteRow and updateRow removed - now we only add colors to sheets from local history

  const { call: addColumnAPI } = useAPI<AddNewAdditionalColumnRequest, AddNewAdditionalColumnResponse>({
    url: config.api.endpoints.addColumn,
    method: "POST",
    jwtToken: state.user?.jwtToken,
  })

  const selectedFileData = files.find(item => item.spreadsheetId === selectedFile)

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
        // Create a unique key for this data to detect changes
        const dataKey = `${selectedColorIndex}:${data.hex}:${JSON.stringify(data.additionalColumns || [])}`

        // Only reload if the data has actually changed
        if (lastLoadedDataRef.current !== dataKey) {
          lastLoadedDataRef.current = dataKey
          setRanking(Number(data.ranking) || 0)
          // Parse slash naming into parts array
          const slashNameStr = data.slash_naming || ''
          setSlashParts(slashNameStr ? slashNameStr.split('/').filter(Boolean) : [])
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
          // Load column values from color's additionalColumns matched by name
          const values: Record<string, string> = {}
          if (data.additionalColumns) {
            for (const col of data.additionalColumns) {
              values[col.name] = col.value
            }
          }
          setColumnValues(values)
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
          setColumnValues({})
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

  // Confirm editing - add as new color to local history
  const handleConfirmNewColor = () => {
    // Add new color to local history (with limit)
    if (colorHistory.length >= MAX_LOCAL_COLORS) {
      // Remove oldest color if at limit
      dispatch({ type: "REMOVE_OLDEST_COLOR_HISTORY" })
    }
    dispatch({ type: "ADD_COLOR_HISTORY", payload: editingColor })

    // Also add to file color history if a file is selected
    if (selectedFile) {
      dispatch({
        type: "ADD_FILE_COLOR_HISTORY",
        payload: { spreadsheetId: selectedFile, color: editingColor }
      })
    }

    setOriginalColor(editingColor)
    setIsEditing(false)
    toast.display("success", "Color added to history")
  }

  // Open login popup
  const openLogin = () => {
    const url = config.api.baseURL + config.api.endpoints.auth
    window.open(url, "Google Sign-in", "width=1000,height=700")
  }

  const handleSave = async () => {
    if (selectedColorIndices.length === 0) return

    // Check if user is logged in - open login popup if not
    if (!state.user?.jwtToken) {
      openLogin()
      return
    }

    if (!selectedFile) {
      toast.display("error", "Please select a sheet first")
      return
    }

    setLoading(true)

    try {
      // Build slash naming from parts array
      const slashNamingStr = slashParts.join('/')

      // Build additionalColumns from sheetColumns + columnValues
      const additionalColumnsToSave = sheetColumns.map(col => ({
        name: col.name,
        value: columnValues[col.name] || ''
      }))

      // Build all rows for batch save
      // Determine the URL - use "Manually Added" if it's a manually created color
      const finalUrl = colorUrl === 'Manually created' ? 'Manually Added' : (colorUrl || currentTabUrl)

      const rows = selectedColorIndices
        .map(colorIndex => {
          const colorHex = colorHistory[colorIndex]
          if (!colorHex) return null
          return {
            id: crypto.randomUUID(),
            timestamp: new Date().valueOf(),
            url: finalUrl,
            hex: colorHex,
            slash_naming: slashNamingStr,
            tags: tagsList.join(','),
            hsl: colors.hexToHSL(colorHex),
            rgb: colors.hexToRGB(colorHex),
            comments: comment,
            ranking: String(ranking),
            additionalColumns: additionalColumnsToSave,
          }
        })
        .filter(Boolean)

      // Save all colors using upsert (updates existing colors, adds new ones)
      await upsertColorsAsync({
        spreadsheetId: selectedFile,
        sheetName: selectedFileData?.sheets?.[0]?.name || '',
        sheetId: selectedFileData?.sheets?.[0]?.id || 0,
        rows: rows as any,
      })

      toast.display("success", `${rows.length} color${rows.length > 1 ? 's' : ''} saved to sheet`)

      // Clear values after saving
      setColumnValues({})
      setSlashParts([])
      setSlashInput('')
      setTagsList([])
      setTagsInput('')
      setComment('')
      setRanking(0)
      setColorUrl(currentTabUrl)
      setCheckValidFlag(true)
    } catch {
      toast.display("error", "Failed to save colors")
    } finally {
      setLoading(false)
    }
  }

  const addColumn = async () => {
    if (newColumnName.trim() && selectedFile && selectedFileData) {
      try {
        // Call API to add column header to the sheet
        await addColumnAPI({
          spreadsheetId: selectedFile,
          sheetName: selectedFileData.sheets?.[0]?.name || '',
          sheetId: selectedFileData.sheets?.[0]?.id || 0,
          columnName: newColumnName.trim(),
        })

        // Update local state
        dispatch({
          type: "ADD_NEW_COLUMN",
          payload: {
            spreadsheetId: selectedFile,
            column: { name: newColumnName.trim(), value: '' }
          }
        })
        setNewColumnName('')
        toast.display("success", "Column added")
      } catch {
        toast.display("error", "Failed to add column")
      }
    }
  }

  const removeColumn = (columnName: string) => {
    if (!selectedFile) return
    dispatch({
      type: "REMOVE_NEW_COLUMN",
      payload: { spreadsheetId: selectedFile, columnName }
    })
    // Also remove from columnValues
    setColumnValues(prev => {
      const updated = { ...prev }
      delete updated[columnName]
      return updated
    })
  }

  const updateColumnValue = (columnName: string, value: string) => {
    setColumnValues(prev => ({ ...prev, [columnName]: value }))
  }

  const handleDelete = async () => {
    if (selectedColorIndices.length === 0) return

    const confirmed = window.confirm(`Remove ${selectedColorIndices.length} color${selectedColorIndices.length > 1 ? 's' : ''} from history?`)
    if (!confirmed) return

    // Remove from local state
    const newHistory = colorHistory.filter((_, i) => !selectedColorIndices.includes(i))
    dispatch({ type: "CLEAR_COLOR_HISTORY" })
    newHistory.forEach(color => dispatch({ type: "ADD_COLOR_HISTORY", payload: color }))
    setSelectedColorIndices([])
    setEditingColor('#ffffff')
    toast.display("success", `${selectedColorIndices.length} color${selectedColorIndices.length > 1 ? 's' : ''} removed`)
  }

  return (
    <div className="w-[520px]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200">
        <button
          onClick={() => setTab(null)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-[14px] font-medium">History & Editor</span>
      </div>

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
                  return (
                    <div
                      key={color + index}
                      onClick={(e) => handleColorClick(index, e)}
                      className={`aspect-square cursor-pointer rounded-sm transition-all border border-gray-200 ${
                        isSelected
                          ? 'ring-2 ring-gray-900 ring-inset'
                          : 'hover:brightness-90'
                      }`}
                      style={{ backgroundColor: color }}
                      title={`${color} (Ctrl+click to multi-select)`}
                    />
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

        {/* Column 2 - Sheet Details */}
        <div className="flex-1 p-3">
          {/* Sheet Selector */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-gray-500">Save to</span>
              {selectedFile && (
                <button
                  onClick={() => window.open(`${config.spreadsheet.baseURL}${selectedFile}`, '_blank')}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Open sheet in new tab"
                >
                  <ExternalLink size={12} />
                </button>
              )}
            </div>
            <Select
              isComment
              setTab={setTab}
              ckeckFlag={checkValidFlag}
              setCheckValidFlag={setCheckValidFlag}
              placeholder="Select Sheet"
            />
          </div>

          {/* Metadata Fields - always shown */}
          <>
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
                    {slashParts.length < 4 && (
                      <input
                        type="text"
                        value={slashInput}
                        onChange={(e) => setSlashInput(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.key === 'Enter' || e.key === '/') && slashInput.trim()) {
                            e.preventDefault()
                            setSlashParts([...slashParts, slashInput.trim()])
                            setSlashInput('')
                          } else if (e.key === 'Backspace' && !slashInput && slashParts.length > 0) {
                            setSlashParts(slashParts.slice(0, -1))
                          }
                        }}
                        placeholder={slashParts.length === 0 ? "Slash Naming (press / or Enter)" : ""}
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
                    {tagsList.length < 4 && (
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

                {/* Additional Columns */}
                <div className="space-y-2 pt-1">
                  {sheetColumns.map((col) => (
                    <div key={col.name} className="flex gap-1 items-center">
                      <span className="w-[80px] px-2 py-1.5 text-[11px] text-gray-600 truncate" title={col.name}>
                        {col.name}
                      </span>
                      <input
                        type="text"
                        value={columnValues[col.name] || ''}
                        onChange={(e) => updateColumnValue(col.name, e.target.value)}
                        placeholder="Value"
                        className="flex-1 px-2 py-1.5 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-gray-400"
                      />
                      <button
                        onClick={() => removeColumn(col.name)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-1 items-center">
                    <input
                      type="text"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      placeholder="Add column..."
                      className="flex-1 px-2 py-1.5 text-[11px] border border-dashed border-gray-300 rounded focus:outline-none focus:border-gray-400"
                      onKeyDown={(e) => e.key === 'Enter' && addColumn()}
                    />
                    <button
                      onClick={addColumn}
                      disabled={!newColumnName.trim()}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={() => {
                  if (!state.user?.jwtToken) {
                    openLogin()
                  } else if (!selectedFile) {
                    setTab('ADD_SHEET')
                  } else {
                    handleSave()
                  }
                }}
                disabled={!!state.user?.jwtToken && !!selectedFile && (loading || selectedColorIndices.length === 0)}
                className="w-full mt-4 px-3 py-2.5 text-[12px] bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors disabled:bg-gray-300 flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  'Saving...'
                ) : !state.user?.jwtToken ? (
                  'Login to save'
                ) : !selectedFile ? (
                  <>
                    <Link size={12} />
                    Link a sheet
                  </>
                ) : (
                  `Save ${selectedColorIndices.length} color${selectedColorIndices.length !== 1 ? 's' : ''} to Sheet`
                )}
              </button>
            </>
        </div>
      </div>
    </div>
  )
}

export default Comment
