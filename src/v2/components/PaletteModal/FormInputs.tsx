import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { X, Plus } from "lucide-react"
import { FolderDropdownRow } from "@/v2/components/common/FolderDropdownRow"
import { MultiSelectDropdown } from "@/v2/components/FigmaManager/MultiSelectDropdown"
import { useGetFolders } from "@/v2/api/folders.api"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useQueryClient } from "@tanstack/react-query"
import { axiosInstance } from "@/v2/hooks/useAPI"
import { config } from "@/v2/others/config"
import { useToast } from "@/v2/hooks/useToast"
import { Slider } from "@/components/ui/slider"
import { useFolderTreeExpanded } from "../../hooks/useFolderTreeExpanded"
import {
  buildParentIdByChildId,
  flattenFoldersHierarchyOrder,
  flattenVisibleFolderIdsInOrder,
  folderHasChildrenInList,
  getFolderDepthById,
  getFolderPathLabelById,
} from "@/v2/utils/folderDisplayName"

interface FormInputsProps {
  formData: {
    name: string
    url: string
    description: string
    ranking: number
  }
  setFormData: (data: any) => void
  tags: string[]
  setTags: (tags: string[]) => void
  selectedFolderIds: string[]
  onFolderChange: (folderIds: string[]) => void
  nameFieldError?: boolean
  onClearNameFieldError?: () => void
}

const FormInputs = ({ formData, setFormData, tags, setTags, selectedFolderIds, onFolderChange, nameFieldError, onClearNameFieldError }: FormInputsProps) => {
  const { state } = useGlobalState()
  const { data: foldersData } = useGetFolders(false)
  const foldersList = useMemo(
    () => flattenFoldersHierarchyOrder(foldersData?.folders || []),
    [foldersData?.folders]
  )
  const parentByChildId = useMemo(() => buildParentIdByChildId(foldersList), [foldersList])
  const allFolderIds = useMemo(() => foldersList.map((f) => f._id), [foldersList])
  const existingIdSet = useMemo(() => new Set(allFolderIds), [allFolderIds])
  const { expandedIds, toggleExpanded, expandAll, collapseAll, allExpanded } =
    useFolderTreeExpanded(allFolderIds)
  const visibleFolderIds = useMemo(
    () => flattenVisibleFolderIdsInOrder(foldersList, expandedIds),
    [foldersList, expandedIds],
  )
  const queryClient = useQueryClient()
  const toast = useToast()
  const [tagsInput, setTagsInput] = useState("")
  const nameInputRef = useRef<HTMLInputElement>(null)
  const isInternalNameUpdate = useRef(false)
  const [paletteNameInput, setPaletteNameInput] = useState("")
  const [paletteNameSegments, setPaletteNameSegments] = useState<string[]>([])
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [isCreatingLoading, setIsCreatingLoading] = useState(false)

  const applyPaletteNameState = (segments: string[], inputValue: string) => {
    const limitedParts = (segments || [])
      .map((p) => String(p || "").trim())
      .filter(Boolean)
      .slice(0, 4)
    const currentInput = String(inputValue || "")
    setPaletteNameSegments(limitedParts)
    setPaletteNameInput(currentInput)
    const inputPart = currentInput.trim()
    const full = [...limitedParts, ...(inputPart ? [inputPart] : [])]
      .slice(0, 4)
      .join("/")
    isInternalNameUpdate.current = true
    setFormData((prev: typeof formData) => ({ ...prev, name: full }))
    onClearNameFieldError?.()
  }

  useEffect(() => {
    if (isInternalNameUpdate.current) {
      isInternalNameUpdate.current = false
      return
    }
    const initial = String(formData?.name || "")
    if (initial.includes("/")) {
      const parts = initial
        .split("/")
        .map((p) => p.trim())
        .filter(Boolean)
        .slice(0, 4)
      setPaletteNameSegments(parts)
      setPaletteNameInput("")
    } else {
      setPaletteNameSegments([])
      setPaletteNameInput(initial)
    }
  }, [formData?.name])

  const handleCreateFolder = useCallback(async () => {
    const name = newFolderName.trim()
    if (!name || !state.user?.jwtToken) return
    setIsCreatingLoading(true)
    try {
      const response = await axiosInstance.post(
        config.api.endpoints.createFolder,
        { name, colorIds: [], paletteIds: [] },
        { headers: { Authorization: `Bearer ${state.user.jwtToken}` } }
      )
      const folder = response.data?.folder ?? response.data
      if (folder?._id) {
        await queryClient.invalidateQueries({ queryKey: ["folders"] })
        toast.display("success", "Folder created")
        setNewFolderName("")
        setIsCreatingFolder(false)
      }
    } catch (err: any) {
      toast.display("error", err?.response?.data?.err || err?.response?.data?.message || "Failed to create folder")
    } finally {
      setIsCreatingLoading(false)
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
              if (e.key === "Enter") handleCreateFolder()
              if (e.key === "Escape") {
                setIsCreatingFolder(false)
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
          setIsCreatingFolder(true)
        }}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] text-gray-600 hover:bg-gray-50 border-t border-gray-100 transition-colors"
      >
        <Plus size={14} />
        Create
      </button>
    )
  }, [isCreatingFolder, newFolderName, isCreatingLoading, handleCreateFolder])

  // Auto-fill URL with current browser tab when empty
  useEffect(() => {
    if (formData.url) return
    chrome?.tabs?.query({ active: true, currentWindow: true }).then((tabs) => {
      const url = tabs[0]?.url
      if (url && !url.startsWith("chrome://") && !url.startsWith("chrome-extension://")) {
        setFormData((prev: typeof formData) => ({ ...prev, url }))
      }
    }).catch(() => { })
  }, [])

  // When name field has validation error, focus and scroll into view
  useEffect(() => {
    if (nameFieldError && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [nameFieldError])

  const addTag = (newTag: string) => {
    const t = newTag.trim()
    if (t && !tags.includes(t)) {
      setTags([...tags, t].slice(0, 3))
      setTagsInput("")
    }
  }

  return (
    <div style={{ width: "100%" }}>
      {/* Saving to Dropdown */}
      {state.user?.jwtToken && (
        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>
            Saving to
          </label>
          <MultiSelectDropdown<string>
            selected={selectedFolderIds}
            items={visibleFolderIds}
            itemsWhenSearching={foldersList.map((f) => f._id)}
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
                        onChange={() => onFolderChange(allSelected ? [] : [...allFolderIds])}
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
              const folder = foldersList.find(f => f._id === folderId)
              return folder
                ? (
                  <FolderDropdownRow
                    depth={getFolderDepthById(folderId, parentByChildId)}
                    name={folder.name}
                    title={getFolderPathLabelById(folderId, foldersList, parentByChildId) || folder.name}
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
                const folder = foldersList.find(f => f._id === selected[0])
                return folder
                  ? (getFolderPathLabelById(selected[0], foldersList, parentByChildId) || folder.name)
                  : selected[0]
              }
              return `${selected.length} folders selected`
            }}
            getSearchText={(folderId) => {
              const folder = foldersList.find(f => f._id === folderId)
              return folder
                ? (getFolderPathLabelById(folderId, foldersList, parentByChildId) || folder.name)
                : String(folderId)
            }}
            onSelect={(folderIds) => onFolderChange(folderIds)}
            placeholder="Select folders"
            width="100%"
            isSearchable
            checkboxAtEnd={true}
            renderFooter={renderFolderFooter}
            listMaxHeightClass="max-h-[160px]"
            menuMaxHeightClass="max-h-[300px]"
          />
        </div>
      )}

      <div style={{ marginBottom: "12px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>
          URL
        </label>
        <input
          type="text"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="Source URL (auto-filled from browser)"
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "14px",
            backgroundColor: "#F5F5F5",
            outline: "none",
          }}
        />
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: nameFieldError ? "#c62828" : undefined }}>
          Palette Name *
        </label>
        <div
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "14px",
            backgroundColor: nameFieldError ? "#ffebee" : "#F5F5F5",
            outline: "none",
            border: nameFieldError ? "2px solid #c62828" : "1px solid transparent",
            borderRadius: "4px",
            boxSizing: "border-box",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
          onClick={() => nameInputRef.current?.focus()}
        >
          {paletteNameSegments.map((segment, idx) => (
            <div
              key={`${segment}-${idx}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  fontSize: 13,
                  background: "#f0f0f0",
                  borderRadius: 4,
                }}
              >
                {segment}
                <button
                  type="button"
                  onClick={() =>
                    applyPaletteNameState(
                      paletteNameSegments.filter((_, i) => i !== idx),
                      paletteNameInput
                    )
                  }
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#666",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={10} />
                </button>
              </span>
              {idx < paletteNameSegments.length - 1 && (
                <span style={{ color: "#8c8c8c", fontWeight: 600 }}>/</span>
              )}
            </div>
          ))}
          {paletteNameSegments.length > 0 && (
            <span style={{ color: "#8c8c8c", fontWeight: 600 }}>/</span>
          )}
          {paletteNameSegments.length < 4 && (
            <input
              ref={nameInputRef}
              type="text"
              value={paletteNameInput}
              onChange={(e) => applyPaletteNameState(paletteNameSegments, e.target.value)}
              onKeyDown={(e) => {
                if ((e.key === "/" || e.key === ",") && paletteNameInput.trim()) {
                  e.preventDefault()
                  applyPaletteNameState([...paletteNameSegments, paletteNameInput], "")
                } else if (e.key === "Backspace" && !paletteNameInput && paletteNameSegments.length > 0) {
                  applyPaletteNameState(paletteNameSegments.slice(0, -1), "")
                }
              }}
              onBlur={() => {
                if (paletteNameInput.trim()) {
                  applyPaletteNameState([...paletteNameSegments, paletteNameInput], "")
                }
              }}
              placeholder={
                paletteNameSegments.length === 0
                  ? "Palette name segments (type / to create chip, max 4)"
                  : ""
              }
              style={{
                flex: 1,
                minWidth: 120,
                fontSize: 14,
                outline: "none",
                background: "transparent",
                border: "none",
                padding: 0,
              }}
            />
          )}
        </div>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>
          Tags
        </label>
        <div
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "14px",
            backgroundColor: "#F5F5F5",
            outline: "none",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            alignItems: "center",
          }}
        >
          {tags.map((tag, idx) => (
            <span
              key={idx}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 8px",
                fontSize: "13px",
                background: "#f0f0f0",
                borderRadius: "4px",
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#666",
                  padding: 0,
                  fontSize: "14px",
                }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          {tags.length < 3 && (
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === ",") && tagsInput.trim()) {
                  e.preventDefault()
                  addTag(tagsInput)
                } else if (e.key === "Backspace" && !tagsInput && tags.length > 0) {
                  setTags(tags.slice(0, -1))
                }
              }}
              onBlur={() => {
                if (tagsInput.trim()) addTag(tagsInput)
              }}
              placeholder={tags.length === 0 ? "Tags (press , or Enter, max 3)" : ""}
              style={{
                flex: 1,
                minWidth: "80px",
                fontSize: "14px",
                outline: "none",
                background: "transparent",
                border: "none",
                padding: 0,
              }}
            />
          )}
        </div>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Description..."
          rows={3}
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "14px",
            backgroundColor: "#F5F5F5",
            outline: "none",
            resize: "vertical",
          }}
        />
      </div>

      <div style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <label style={{ fontSize: "14px", fontWeight: 500 }}>Ranking</label>
          <span style={{ fontSize: "14px", fontWeight: 500 }}>{formData.ranking}</span>
        </div>
        <Slider
          value={[formData.ranking]}
          onValueChange={(value) => setFormData({ ...formData, ranking: value[0] })}
          max={100}
          step={1}
          className="w-full"
        />
      </div>
    </div>
  )
}

export default FormInputs
