import { FC, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useGlobalState } from '@/v2/hooks/useGlobalState'
import { useToast } from '@/v2/hooks/useToast'
import { colors } from '@/v2/helpers/colors'
import { config } from '@/v2/others/config'
import { axiosInstance } from '@/v2/hooks/useAPI'
import { useGetFolders } from '@/v2/api/folders.api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, Copy, Check, X, Plus } from 'lucide-react'
import SectionHeader from '../common/SectionHeader'
import { FolderDropdownRow } from '@/v2/components/common/FolderDropdownRow'
import { Slider } from '@/components/ui/slider'
import { HexColorPicker } from 'react-colorful'
import { MultiSelectDropdown } from '../FigmaManager/MultiSelectDropdown'
import { useFolderTreeExpanded } from '../../hooks/useFolderTreeExpanded'
import {
  buildParentIdByChildId,
  flattenFoldersHierarchyOrder,
  flattenVisibleFolderIdsInOrder,
  folderHasChildrenInList,
  getFolderDepthById,
  getFolderPathLabelById,
} from '@/v2/utils/folderDisplayName'

const MAX_LOCAL_COLORS = 30

/** Same rules as BulkEditor batch name + Generator: max 5 parts, `/` separators, optional trailing `/` while typing. */
function normalizeSlashNamingInput(raw: string): string {
  const val = raw
  const parts = val.split("/").map((p) => p.trim())
  const nonEmpty = parts.filter(Boolean)
  const limited = nonEmpty.slice(0, 5)
  let next = limited.join("/")
  if (val.trim().endsWith("/") && limited.length < 5) next += "/"
  return next
}

function normalizeTagsArray(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean)
  if (typeof tags === "string" && tags) return tags.split(",").map((t) => t.trim()).filter(Boolean)
  return []
}

function tagsEqualAcross(a: unknown, b: unknown): boolean {
  const sa = [...normalizeTagsArray(a)].sort().join("\0")
  const sb = [...normalizeTagsArray(b)].sort().join("\0")
  return sa === sb
}

/** Neutral hex for color picker when multiple colors differ (picker still needs a valid color). */
const MIXED_HEX_FALLBACK = "#bdbdbd"

function normalizeUrlForCompare(u: unknown): string {
  const s = u == null || u === "" ? "Manually created" : String(u)
  return s === "Manually Added" ? "Manually created" : s
}

function normalizeAdditionalColumnsForCompare(cols: unknown): string {
  if (!Array.isArray(cols)) return "[]"
  const normalized = cols
    .map((c: any) => ({
      name: String(c?.name ?? "").trim(),
      value: String(c?.value ?? "").trim(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return JSON.stringify(normalized)
}

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
  const [slashNaming, setSlashNaming] = useState<string>("")
  const [tagsList, setTagsList] = useState<string[]>([])
  const [tagsInput, setTagsInput] = useState<string>('')
  const [colorUrl, setColorUrl] = useState<string>('')
  const [currentTabUrl, setCurrentTabUrl] = useState<string>('Manually created')
  const [comment, setComment] = useState<string>('')
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([])
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolderLoading, setIsCreatingFolderLoading] = useState(false)
  /** When true (multi-select loaded with differing folder sets), skip folder API on save until user changes folder dropdown. */
  const [skipFolderSyncUntilChange, setSkipFolderSyncUntilChange] = useState(false)
  const [hexMixed, setHexMixed] = useState(false)
  const [urlMixed, setUrlMixed] = useState(false)
  const [slashMixed, setSlashMixed] = useState(false)
  const [tagsMixed, setTagsMixed] = useState(false)
  const [commentMixed, setCommentMixed] = useState(false)
  const [rankingMixed, setRankingMixed] = useState(false)
  const justSavedRef = useRef(false)
  const lastLoadedDataRef = useRef<string>('')  // Track what data we last loaded

  const selectedIndicesSorted = useMemo(
    () => [...selectedColorIndices].sort((a, b) => a - b),
    [selectedColorIndices],
  )
  // Primary index for backwards-compatible single-selection logic
  const selectedColorIndex = selectedIndicesSorted.length > 0 ? selectedIndicesSorted[0] : null

  const { data: foldersData } = useGetFolders(true)
  const folders = useMemo(
    () => flattenFoldersHierarchyOrder(foldersData?.folders ?? []),
    [foldersData?.folders],
  )
  const { data: allColorData } = useQuery({
    queryKey: ["all-color-data"],
    queryFn: async () => {
      const response = await axiosInstance.get("/api/database-sheets/all-color-data", {
        headers: {
          Authorization: `Bearer ${state.user?.jwtToken}`,
        },
      })
      return response.data?.data || response.data
    },
    enabled: !!state.user?.jwtToken,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  })

  /** Latest DB color snapshot by color id (folders + non-foldered). */
  const latestColorById = useMemo(() => {
    const m = new Map<string, any>()
    const folderColors = (foldersData?.folders || []).flatMap((f: any) => f?.colors || [])
    folderColors.forEach((c: any) => {
      if (c?._id != null) m.set(String(c._id), c)
    })
    const nonFoldered = Array.isArray(allColorData?.colorsWithoutFolders)
      ? allColorData.colorsWithoutFolders
      : []
    nonFoldered.forEach((c: any) => {
      if (c?._id != null) m.set(String(c._id), c)
    })
    return m
  }, [foldersData?.folders, allColorData?.colorsWithoutFolders])
  const parentByChildId = useMemo(() => buildParentIdByChildId(folders), [folders])
  const allFolderIds = useMemo(() => folders.map((f) => f._id), [folders])
  const existingIdSet = useMemo(() => new Set(allFolderIds), [allFolderIds])
  const { expandedIds, toggleExpanded, expandAll, collapseAll, allExpanded } =
    useFolderTreeExpanded(allFolderIds)
  const visibleFolderIds = useMemo(
    () => flattenVisibleFolderIdsInOrder(folders, expandedIds),
    [folders, expandedIds],
  )

  // Keep History/Editor rows aligned with latest DB values when color has a stable id.
  useEffect(() => {
    if (!latestColorById.size || !Array.isArray(parsedData) || parsedData.length === 0) return
    parsedData.forEach((p: any) => {
      const colorId = p?._id ?? p?.id
      if (colorId == null) return
      const latest = latestColorById.get(String(colorId))
      if (!latest) return

      const nextTags = normalizeTagsArray(latest.tags)
      const prevTags = normalizeTagsArray(p?.tags)
      const nextAdditional = latest.additionalColumns ?? latest.additional_columns ?? []
      const prevAdditional = p?.additionalColumns ?? p?.additional_columns ?? []
      const hasDiff =
        String(latest.hex ?? "").toLowerCase() !== String(p?.hex ?? "").toLowerCase() ||
        normalizeUrlForCompare(latest.url) !== normalizeUrlForCompare(p?.url) ||
        String(latest.slash_naming ?? "") !== String(p?.slash_naming ?? "") ||
        String(latest.comments ?? "") !== String(p?.comments ?? "") ||
        String(latest.ranking ?? "") !== String(p?.ranking ?? "") ||
        JSON.stringify(nextTags.sort()) !== JSON.stringify(prevTags.sort()) ||
        normalizeAdditionalColumnsForCompare(nextAdditional) !==
          normalizeAdditionalColumnsForCompare(prevAdditional)

      if (!hasDiff) return

      dispatch({
        type: "UPDATE_PARSED_BY_COLOR_ID",
        payload: {
          colorId: String(colorId),
          parsed: {
            _id: latest._id ?? p?._id ?? p?.id,
            id: latest._id ?? p?.id ?? p?._id,
            hex: latest.hex ?? p?.hex,
            url: latest.url ?? p?.url ?? "Manually created",
            ranking: latest.ranking ?? p?.ranking ?? 0,
            comments: latest.comments ?? p?.comments ?? "",
            slash_naming: latest.slash_naming ?? p?.slash_naming ?? "",
            tags: nextTags,
            additionalColumns: nextAdditional,
            rgb: latest.rgb ?? p?.rgb,
            hsl: latest.hsl ?? p?.hsl,
          },
        },
      })
    })
  }, [latestColorById, parsedData, dispatch])

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

  const collectFolderIdsForIndex = useCallback(
    (idx: number): string[] => {
      const data = parsedData[idx] as any
      const colorId = data?._id ?? data?.id
      const colorIdStr = colorId != null ? String(colorId) : null
      const hex = colorHistory[idx]
      const hexNorm = hex ? String(hex).toLowerCase() : null
      const foundIds: string[] = []
      if (colorIdStr) {
        for (const f of folders) {
          if ((f.colorIds ?? []).some((cid) => String(cid) === colorIdStr)) {
            foundIds.push(f._id)
          }
        }
      } else if (hexNorm && Array.isArray((folders[0] as any)?.colors)) {
        for (const f of folders) {
          if ((f.colors ?? []).some((c: any) => String(c?.hex ?? '').toLowerCase() === hexNorm)) {
            foundIds.push(f._id)
          }
        }
      }
      return foundIds
    },
    [parsedData, folders, colorHistory],
  )

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

  // Load form + folders from selection; resolve missing ids; multi-select shows shared values only when all match
  useEffect(() => {
    if (selectedColorIndex === null || !colorHistory[selectedColorIndex]) return
    const sorted = selectedIndicesSorted

    sorted.forEach((idx) => {
      const data = parsedData[idx] as any
      const hexNorm = colorHistory[idx] ? String(colorHistory[idx]).toLowerCase() : null
      if ((data?._id ?? data?.id) == null && hexNorm && Array.isArray((folders[0] as any)?.colors)) {
        let dispatched = false
        for (const f of folders) {
          if ((f.colors ?? []).some((c: any) => String(c?.hex ?? '').toLowerCase() === hexNorm)) {
            const matchedColor = (f.colors ?? []).find(
              (c: any) => String(c?.hex ?? '').toLowerCase() === hexNorm,
            )
            if (matchedColor?._id && !dispatched) {
              dispatch({
                type: "UPDATE_PARSED_AT",
                payload: { index: idx, parsed: { _id: matchedColor._id } },
              })
              dispatched = true
            }
            break
          }
        }
      }
    })

    if (justSavedRef.current) {
      justSavedRef.current = false
      return
    }

    const dataKey =
      `${sorted.join(",")}:` +
      sorted
        .map(
          (i) =>
            `${i}:${(parsedData[i] as any)?.hex ?? ""}:${(parsedData[i] as any)?.slash_naming ?? ""}:${JSON.stringify((parsedData[i] as any)?.tags ?? [])}`,
        )
        .join("|")

    if (lastLoadedDataRef.current === dataKey) return
    lastLoadedDataRef.current = dataKey

    setIsEditing(false)
    setSkipFolderSyncUntilChange(false)
    setHexMixed(false)
    setUrlMixed(false)
    setSlashMixed(false)
    setTagsMixed(false)
    setCommentMixed(false)
    setRankingMixed(false)

    const primary = sorted[0]
    setOriginalColor(colorHistory[primary])

    if (sorted.length === 1 && !parsedData[primary]) {
      setEditingColor(colorHistory[primary])
      setHexMixed(false)
      setRanking(0)
      setRankingMixed(false)
      setSlashNaming("")
      setSlashMixed(false)
      setTagsList([])
      setTagsMixed(false)
      setTagsInput("")
      setComment("")
      setCommentMixed(false)
      setColorUrl(currentTabUrl)
      setUrlMixed(false)
      setSelectedFolderIds(collectFolderIdsForIndex(primary))
      setSkipFolderSyncUntilChange(false)
      return
    }

    if (sorted.some((i) => !parsedData[i])) {
      setEditingColor(MIXED_HEX_FALLBACK)
      setHexMixed(true)
      setRanking(0)
      setRankingMixed(true)
      setSlashNaming("")
      setSlashMixed(true)
      setTagsList([])
      setTagsInput("")
      setTagsMixed(true)
      setComment("")
      setCommentMixed(true)
      setColorUrl("")
      setUrlMixed(true)
      setSelectedFolderIds([])
      setSkipFolderSyncUntilChange(true)
      return
    }

    const datas = sorted.map((i) => parsedData[i] as any)

    const hexNorms = sorted.map((i) => colors.expandHex(colorHistory[i] || "#ffffff").toLowerCase())
    if (hexNorms.every((h) => h === hexNorms[0])) {
      setEditingColor(colorHistory[primary])
      setHexMixed(false)
    } else {
      setEditingColor(MIXED_HEX_FALLBACK)
      setHexMixed(true)
    }

    const urls = datas.map((d) => normalizeUrlForCompare(d?.url))
    if (urls.every((u) => u === urls[0])) {
      setColorUrl(urls[0] === "Manually created" ? "Manually created" : String(datas[0]?.url ?? "Manually created"))
      setUrlMixed(false)
    } else {
      setColorUrl("")
      setUrlMixed(true)
    }

    const slashes = datas.map((d) => String(d?.slash_naming ?? "").trim())
    if (slashes.every((s) => s === slashes[0])) {
      setSlashNaming(slashes[0])
      setSlashMixed(false)
    } else {
      setSlashNaming("")
      setSlashMixed(true)
    }

    if (datas.every((d, j) => j === 0 || tagsEqualAcross(d.tags, datas[0].tags))) {
      const t0 = normalizeTagsArray(datas[0].tags)
      setTagsList(t0)
      setTagsMixed(false)
    } else {
      setTagsList([])
      setTagsMixed(true)
    }
    setTagsInput("")

    const comments = datas.map((d) => String(d?.comments ?? "").trim())
    if (comments.every((c) => c === comments[0])) {
      setComment(comments[0])
      setCommentMixed(false)
    } else {
      setComment("")
      setCommentMixed(true)
    }

    const ranks = datas.map((d) => Number(d?.ranking) || 0)
    if (ranks.every((r) => r === ranks[0])) {
      setRanking(ranks[0])
      setRankingMixed(false)
    } else {
      setRanking(0)
      setRankingMixed(true)
    }

    const folderLists = sorted.map((idx) => collectFolderIdsForIndex(idx).slice().sort())
    const sameFolders = folderLists.every((fl) => fl.join(",") === folderLists[0].join(","))
    if (sameFolders) {
      setSelectedFolderIds(folderLists[0] ?? [])
      setSkipFolderSyncUntilChange(false)
    } else {
      setSelectedFolderIds([])
      setSkipFolderSyncUntilChange(true)
    }
  }, [
    selectedColorIndex,
    selectedIndicesSorted,
    colorHistory,
    parsedData,
    currentTabUrl,
    folders,
    dispatch,
    collectFolderIdsForIndex,
  ])

  // Track when user is editing the color
  const handleColorChange = (newColor: string) => {
    setHexMixed(false)
    setEditingColor(newColor)
    if (selectedIndicesSorted.length <= 1) {
      if (newColor.toLowerCase() !== originalColor.toLowerCase()) {
        setIsEditing(true)
      }
    } else {
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
  const handleConfirmNewColor = async () => {
    if (colorHistory.length >= MAX_LOCAL_COLORS) {
      dispatch({ type: "REMOVE_OLDEST_COLOR_HISTORY" })
    }

    const normalizedHex = colors.expandHex(editingColor)

    // Save to database if logged in
    if (state.user?.jwtToken) {
      const finalUrl = colorUrl === 'Manually created' ? 'Manually Added' : (colorUrl || currentTabUrl)
      const folderIdsForCreate =
        selectedFolderIds.length > 0 ? [selectedFolderIds[0]] : []
      const auth = { headers: { Authorization: `Bearer ${state.user.jwtToken}` } }
      try {
        const response = await axiosInstance.post(
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
              slash_naming: slashNaming,
              tags: tagsList,
              additionalColumns: [],
            },
            folderIds: folderIdsForCreate,
          },
          auth
        )
        const apiResponse = response?.data?.data ?? response?.data
        const createdColor = apiResponse?.createdColor
        const newColorId = createdColor?._id ?? createdColor?.id
        if (newColorId && selectedFolderIds.length > 1) {
          await Promise.all(
            selectedFolderIds.slice(1).map((fid) =>
              axiosInstance.post(
                `${config.api.endpoints.copyColorToFolder}/${fid}/copy-color`,
                { colorId: String(newColorId) },
                auth
              )
            )
          )
        }
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
      } catch {
        dispatch({ type: "ADD_COLOR_HISTORY", payload: normalizedHex })
        toast.display("error", "Color added locally but failed to save to database")
      }
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
    const indices = selectedIndicesSorted
    for (const idx of indices) {
      const p = parsedData[idx] as any
      const id = p?._id ?? p?.id
      if (!id) {
        toast.display(
          "error",
          indices.length > 1
            ? "Every selected color must be saved to the database before bulk update"
            : "Select a saved color (with ID) to update it in the database",
        )
        return
      }
    }

    setUpdateLoading(true)
    try {
      const authHeaders = {
        Authorization: `Bearer ${state.user?.jwtToken ?? ""}`,
      }
      let anyFolderChange = false
      let lastRowHex = colors.expandHex(editingColor)

      for (const idx of indices) {
        const data = parsedData[idx] as any
        const colorId = data?._id ?? data?.id
        const rowHex = hexMixed
          ? colors.expandHex(colorHistory[idx] || "#ffffff")
          : colors.expandHex(editingColor)
        const ru = (data as any)?.url
        const finalUrl = urlMixed
          ? !ru || ru === "Manually created" || ru === "Manually Added"
            ? "Manually Added"
            : String(ru)
          : colorUrl === "Manually created"
            ? "Manually Added"
            : colorUrl || currentTabUrl
        const row = {
          url: finalUrl,
          hex: rowHex,
          rgb: colors.hexToRGB(rowHex),
          hsl: colors.hexToHSL(rowHex),
          slash_naming: slashMixed ? String(data.slash_naming ?? "") : slashNaming,
          comments: commentMixed ? String(data.comments ?? "") : comment,
          ranking: rankingMixed ? Number(data.ranking) || 0 : Number(ranking) || 0,
          tags: tagsMixed ? normalizeTagsArray(data.tags) : tagsList,
          additionalColumns: data?.additionalColumns ?? [],
          timestamp: Date.now(),
        }
        lastRowHex = rowHex

        const response = await axiosInstance.put(
          config.api.endpoints.updateColor,
          {
            colorId,
            sheetId: null,
            isUpdateSheet: false,
            row,
          },
          { headers: authHeaders },
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
          dispatch({
            type: "UPDATE_COLOR_AT",
            payload: { index: idx, hex: updatedColor.hex, parsed },
          })
        } else {
          dispatch({
            type: "UPDATE_COLOR_AT",
            payload: {
              index: idx,
              hex: rowHex,
              parsed: { ...data, ...row, _id: colorId },
            },
          })
        }

        if (state.user?.jwtToken && !skipFolderSyncUntilChange) {
          const colorIdStr = String(colorId)
          const currentFolderIds = folders
            .filter((f) => (f.colorIds ?? []).some((cid) => String(cid) === colorIdStr))
            .map((f) => f._id)
          const desired = new Set(selectedFolderIds)
          const current = new Set(currentFolderIds)
          const toRemove = currentFolderIds.filter((id) => !desired.has(id))
          const toAdd = selectedFolderIds.filter((id) => !current.has(id))
          const stayingFolderIds = currentFolderIds.filter((id) => desired.has(id))
          const folderAuth = { headers: authHeaders }

          for (const fid of toRemove) {
            await axiosInstance.delete(
              `${config.api.endpoints.copyColorToFolder}/${fid}/remove-color`,
              { data: { colorId: colorIdStr }, ...folderAuth },
            )
          }
          if (toAdd.length > 0) {
            if (stayingFolderIds.length > 0) {
              await Promise.all(
                toAdd.map((fid) =>
                  axiosInstance.post(
                    `${config.api.endpoints.copyColorToFolder}/${fid}/copy-color`,
                    { colorId: colorIdStr },
                    folderAuth,
                  ),
                ),
              )
            } else {
              const [firstAdd, ...restAdd] = toAdd
              await axiosInstance.post(
                `${config.api.endpoints.copyColorToFolder}/${firstAdd}/add-color`,
                { colorId: colorIdStr },
                folderAuth,
              )
              if (restAdd.length > 0) {
                await Promise.all(
                  restAdd.map((fid) =>
                    axiosInstance.post(
                      `${config.api.endpoints.copyColorToFolder}/${fid}/copy-color`,
                      { colorId: colorIdStr },
                      folderAuth,
                    ),
                  ),
                )
              }
            }
          }
          if (toRemove.length > 0 || toAdd.length > 0) anyFolderChange = true
        }
      }

      if (anyFolderChange) {
        await queryClient.invalidateQueries({ queryKey: ["folders"] })
      }

      justSavedRef.current = true
      setOriginalColor(lastRowHex)
      setIsEditing(false)
      toast.display(
        "success",
        indices.length > 1 ? `Updated ${indices.length} colors` : "Color updated successfully",
      )
    } catch (err: any) {
      toast.display(
        "error",
        err?.response?.data?.err || err?.response?.data?.message || "Failed to update color",
      )
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
            color={hexMixed ? MIXED_HEX_FALLBACK : editingColor}
            onChange={handleColorChange}
            style={{ width: '100%', height: '160px' }}
          />

          {/* Color preview on top */}
          <div
            className="mt-2 h-8 w-full rounded border border-gray-200"
            style={{
              backgroundColor: hexMixed ? MIXED_HEX_FALLBACK : editingColor,
            }}
          />

          {/* Color values below */}
          <div className="mt-2 space-y-1">
            {/* HEX */}
            <div className="flex items-center gap-1">
              <span className="w-7 text-[9px] text-gray-400">HEX</span>
              <input
                type="text"
                value={hexMixed ? "" : editingColor}
                placeholder={hexMixed ? "Multiple" : ""}
                onChange={(e) => handleColorChange(e.target.value)}
                className="flex-1 px-1.5 py-0.5 text-[10px] font-mono border border-gray-200 rounded focus:outline-none focus:border-gray-400 uppercase"
              />
              <button
                onClick={() => handleCopy(hexMixed ? "" : editingColor, "hex")}
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
                value={hexMixed ? "" : colors.hexToRGB(editingColor)}
                placeholder={hexMixed ? "Multiple" : ""}
                onChange={(e) => {
                  const hex = colors.rgbToHex(e.target.value)
                  if (hex !== '#000000' || e.target.value.includes('0, 0, 0')) {
                    handleColorChange(hex)
                  }
                }}
                className="flex-1 px-1.5 py-0.5 text-[10px] font-mono border border-gray-200 rounded focus:outline-none focus:border-gray-400"
              />
              <button
                onClick={() =>
                  handleCopy(hexMixed ? "" : colors.hexToRGB(editingColor), "rgb")
                }
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
                value={hexMixed ? "" : colors.hexToHSL(editingColor)}
                placeholder={hexMixed ? "Multiple" : ""}
                onChange={(e) => {
                  const hex = colors.hslToHex(e.target.value)
                  if (hex !== '#000000' || e.target.value.includes('0, 0%, 0%')) {
                    handleColorChange(hex)
                  }
                }}
                className="flex-1 px-1.5 py-0.5 text-[10px] font-mono border border-gray-200 rounded focus:outline-none focus:border-gray-400"
              />
              <button
                onClick={() =>
                  handleCopy(hexMixed ? "" : colors.hexToHSL(editingColor), "hsl")
                }
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
              <label className="block text-[11px] text-gray-500 mb-1">Select folders</label>

              <MultiSelectDropdown<string>
                selected={selectedFolderIds}
                items={visibleFolderIds}
                itemsWhenSearching={folders.map((f) => f._id)}
                renderHeader={() => {
                  const allSelected =
                    allFolderIds.length > 0 &&
                    selectedFolderIds.length === allFolderIds.length &&
                    allFolderIds.every((id) => selectedFolderIds.includes(id))
                  const someSelected = selectedFolderIds.length > 0 && !allSelected
                  return (
                    <div className="flex items-center justify-between h-8 px-3">
                      <button
                        type="button"
                        className="flex items-center justify-center w-5 h-5 shrink-0 mr-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 rounded-sm focus:outline-none transition-colors"
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
                      <div className="shrink-0">
                        <div className="relative flex-shrink-0" style={{ width: "16px", height: "16px" }}>
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => {
                              if (el) (el as HTMLInputElement).indeterminate = someSelected
                            }}
                            onChange={() => setSelectedFolderIds(allSelected ? [] : [...allFolderIds])}
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
                keyExtractor={(folderId) => folderId}
                renderItem={(folderId) => {
                  const folder = folders.find((f) => f._id === folderId)
                  return folder
                    ? (
                      <FolderDropdownRow
                        depth={getFolderDepthById(folderId, parentByChildId)}
                        name={folder.name}
                        title={getFolderPathLabelById(folderId, folders, parentByChildId) || folder.name}
                        hasChildren={folderHasChildrenInList(folder, existingIdSet)}
                        expanded={expandedIds.has(folder._id)}
                        onToggleExpand={() => toggleExpanded(folder._id)}
                      />
                    )
                    : folderId
                }}
                renderSelected={(selected) => {
                  if (selected.length === 0) return "Select folders"
                  if (selected.length === 1) {
                    const folder = folders.find((f) => f._id === selected[0])
                    return folder
                      ? (getFolderPathLabelById(selected[0], folders, parentByChildId) || folder.name)
                      : selected[0]
                  }
                  return `${selected.length} folders selected`
                }}
                getSearchText={(folderId) => {
                  const folder = folders.find((f) => f._id === folderId)
                  return folder
                    ? (getFolderPathLabelById(folderId, folders, parentByChildId) || folder.name)
                    : String(folderId)
                }}
                onSelect={(folderIds) => {
                  setSkipFolderSyncUntilChange(false)
                  setSelectedFolderIds(folderIds)
                }}
                placeholder="Select folders"
                width="100%"
                isSearchable
                checkboxAtEnd={true}
                renderFooter={renderFolderFooter}
                listMaxHeightClass="max-h-[224px]"
                menuMaxHeightClass="max-h-[448px]"
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
                value={urlMixed ? "" : colorUrl}
                onChange={(e) => {
                  setUrlMixed(false)
                  setColorUrl(e.target.value)
                }}
                placeholder={urlMixed ? "Multiple values" : "Source URL"}
                className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded focus:outline-none focus:border-gray-400 text-gray-500"
              />

              <input
                type="text"
                value={slashMixed ? "" : slashNaming}
                onChange={(e) => {
                  setSlashMixed(false)
                  setSlashNaming(normalizeSlashNamingInput(e.target.value))
                }}
                placeholder={
                  slashMixed
                    ? "Multiple values"
                    : "Slash naming (e.g. Brand/Primary/Blue, max 5 parts)"
                }
                className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded focus:outline-none focus:border-gray-400"
              />

              {/* Tags Chip Input */}
              <div className="w-full px-2 py-1.5 border border-gray-200 rounded focus-within:border-gray-400">
                <div className="flex flex-wrap gap-1 items-center">
                  {tagsList.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] rounded">
                      {tag}
                      <button
                        onClick={() => {
                          setTagsMixed(false)
                          setTagsList(tagsList.filter((_, i) => i !== idx))
                        }}
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
                          setTagsMixed(false)
                          setTagsList([...tagsList, tagsInput.trim()])
                          setTagsInput('')
                        } else if (e.key === 'Backspace' && !tagsInput && tagsList.length > 0) {
                          setTagsMixed(false)
                          setTagsList(tagsList.slice(0, -1))
                        }
                      }}
                      placeholder={
                        tagsList.length === 0
                          ? tagsMixed
                            ? "Multiple values"
                            : "Tags (press , or Enter)"
                          : ""
                      }
                      className="flex-1 min-w-[80px] text-[12px] outline-none bg-transparent"
                    />
                  )}
                </div>
              </div>

              {/* Comment Input */}
              <textarea
                value={commentMixed ? "" : comment}
                onChange={(e) => {
                  setCommentMixed(false)
                  setComment(e.target.value)
                }}
                placeholder={commentMixed ? "Multiple values" : "Comment"}
                rows={2}
                className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded focus:outline-none focus:border-gray-400 resize-y min-h-[60px]"
              />

              {/* Priority Slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-gray-500">Priority</span>
                  <span className="text-[11px] font-medium text-gray-700">
                    {rankingMixed ? "—" : ranking}
                  </span>
                </div>
                <Slider
                  value={[rankingMixed ? 0 : ranking]}
                  onValueChange={(value) => {
                    setRankingMixed(false)
                    setRanking(value[0])
                  }}
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
              disabled={
                !state.user?.jwtToken ||
                selectedColorIndex === null ||
                updateLoading ||
                !selectedIndicesSorted.every((i) => {
                  const p = parsedData[i] as any
                  return p?._id ?? p?.id
                })
              }
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
