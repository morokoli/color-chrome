import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { X, Plus } from "lucide-react"
import { FolderDropdownRow } from "@/v2/components/common/FolderDropdownRow"
import { MultiSelectDropdown } from "@/v2/components/FigmaManager/MultiSelectDropdown"
import { useGetFolders } from "@/v2/api/folders.api"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useQueryClient } from "@tanstack/react-query"
import { axiosInstance } from "@/v2/hooks/useAPI"
import { config } from "@/v2/others/config"
import { useToast } from "@/v2/hooks/useToast"
import { useFolderTreeExpanded } from "../../hooks/useFolderTreeExpanded"
import {
  buildParentIdByChildId,
  flattenFoldersHierarchyOrder,
  flattenVisibleFolderIdsInOrder,
  folderHasChildrenInList,
  getFolderDepthById,
  getFolderPathLabelById,
} from "@/v2/utils/folderDisplayName"
import SingleThumbSlider from "./SingleThumbSlider"

interface GradientStop {
  id: string
  color: string
  position: number
  hsl?: { h: number; s: number; l: number }
}

interface GradientMetadata {
  name: string
  slash_naming: string
  url: string
  tags: string[]
  comments: string
  ranking: number
}

interface GradientPropertiesFormProps {
  gradient: {
    type: "linear" | "radial" | "conic"
    angle: number
    position: { x: number; y: number }
    stops: GradientStop[]
    metadata?: GradientMetadata
  }
  onGradientMetadataChange: (metadata: GradientMetadata) => void
  selectedFolderIds?: string[]
  onFolderChange: (ids: string[]) => void
}

const generateGradientString = (gradient: GradientPropertiesFormProps["gradient"]) => {
  if (!gradient || !gradient.stops || gradient.stops.length === 0) {
    return "linear-gradient(90deg, #000 0%, #fff 100%)"
  }
  const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position)
  const stopsString =
    gradient.type === "conic"
      ? sortedStops.map((stop) => `${stop.color} ${stop.position}deg`).join(", ")
      : sortedStops.map((stop) => `${stop.color} ${stop.position}%`).join(", ")

  switch (gradient.type) {
    case "linear":
      return `linear-gradient(${gradient.angle}deg, ${stopsString})`
    case "radial":
      return `radial-gradient(circle at ${gradient.position.x}% ${gradient.position.y}%, ${stopsString})`
    case "conic":
      return `conic-gradient(from ${gradient.angle}deg at ${gradient.position.x}% ${gradient.position.y}%, ${stopsString})`
    default:
      return `linear-gradient(${gradient.angle}deg, ${stopsString})`
  }
}

const fieldBox: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  fontSize: "14px",
  backgroundColor: "#F5F5F5",
  outline: "none",
  border: "1px solid transparent",
  borderRadius: "4px",
  boxSizing: "border-box",
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontSize: 14,
  fontWeight: 500,
}

const GradientPropertiesForm = ({
  gradient,
  onGradientMetadataChange,
  selectedFolderIds = [],
  onFolderChange,
}: GradientPropertiesFormProps) => {
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
  const isInternalUpdate = useRef(false)
  const [nameInput, setNameInput] = useState("")
  const [nameSegments, setNameSegments] = useState<string[]>([])
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [isCreatingLoading, setIsCreatingLoading] = useState(false)

  const metadata: GradientMetadata = gradient?.metadata || {
    name: "",
    slash_naming: "",
    url: "",
    tags: [],
    comments: "",
    ranking: 0,
  }

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

  const handlePropertyChange = (property: keyof GradientMetadata, value: any) => {
    onGradientMetadataChange({
      ...metadata,
      [property]: value,
    })
  }

  const applyNameState = (segments: string[], inputValue: string) => {
    const limitedParts = (segments || [])
      .map((p) => String(p || "").trim())
      .filter(Boolean)
      .slice(0, 5)
    const currentInput = String(inputValue || "")
    setNameSegments(limitedParts)
    setNameInput(currentInput)
    const inputPart = currentInput.trim()
    const limitedValue = [...limitedParts, ...(inputPart ? [inputPart] : [])]
      .slice(0, 5)
      .join("/")
    const firstPart = limitedParts[0] || ""
    isInternalUpdate.current = true
    onGradientMetadataChange({
      ...metadata,
      name: firstPart || limitedValue,
      slash_naming: limitedValue,
    })
  }

  const handleTagChange = (tags: string[]) => {
    let processedTags: string[] = tags
    if (Array.isArray(tags)) {
      processedTags = tags.flatMap((tag) =>
        typeof tag === "string" && tag.includes(",")
          ? tag.split(",").map((t) => t.trim()).filter(Boolean)
          : tag
      )
    }
    if (processedTags.length > 3) {
      processedTags = processedTags.slice(0, 3)
    }
    onGradientMetadataChange({
      ...metadata,
      tags: Array.isArray(processedTags) ? processedTags : [String(processedTags)],
    })
  }

  useEffect(() => {
    if (metadata.url) return
    chrome?.tabs?.query({ active: true, currentWindow: true }).then((tabs) => {
      const url = tabs[0]?.url
      if (url && !url.startsWith("chrome://") && !url.startsWith("chrome-extension://")) {
        handlePropertyChange("url", url)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false
      return
    }
    setTagsInput("")
    const initial = String(metadata?.slash_naming || metadata?.name || "")
    if (initial.includes("/")) {
      const parts = initial
        .split("/")
        .map((p) => p.trim())
        .filter(Boolean)
        .slice(0, 5)
      setNameSegments(parts)
      setNameInput("")
    } else {
      setNameSegments([])
      setNameInput(initial)
    }
  }, [gradient])

  return (
    <div style={{ width: "100%" }}>
      {/* Gradient preview bar in Info tab */}
      <div
        style={{
          width: "100%",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          position: "relative",
          cursor: "default",
          boxSizing: "border-box",
          border: "3px solid black",
          background: generateGradientString(gradient),
          overflow: "visible",
          transition: "none",
          transform: "none",
          boxShadow: "rgba(0, 0, 0, 0.14) 0px 2px 8px, rgba(0, 0, 0, 0.08) 0px 0px 0px 1px",
        }}
      />
      
      {state.user?.jwtToken && (
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Saving to</label>
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

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Name</label>
        <div
          style={{
            ...fieldBox,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          {nameSegments.map((segment, idx) => (
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
                    applyNameState(
                      nameSegments.filter((_, i) => i !== idx),
                      nameInput
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
              {idx < nameSegments.length - 1 && (
                <span style={{ color: "#8c8c8c", fontWeight: 600 }}>/</span>
              )}
            </div>
          ))}
          {nameSegments.length > 0 && (
            <span style={{ color: "#8c8c8c", fontWeight: 600 }}>/</span>
          )}
          {nameSegments.length < 5 && (
            <input
              type="text"
              value={nameInput}
              onChange={(e) => applyNameState(nameSegments, e.target.value)}
              onKeyDown={(e) => {
                if ((e.key === "/" || e.key === ",") && nameInput.trim()) {
                  e.preventDefault()
                  applyNameState([...nameSegments, nameInput], "")
                } else if (e.key === "Backspace" && !nameInput && nameSegments.length > 0) {
                  applyNameState(nameSegments.slice(0, -1), "")
                }
              }}
              placeholder={
                nameSegments.length === 0
                  ? "Name segments (type / to create chip, max 5)"
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
        <p style={{ fontSize: 12, color: "#9B9B9B", marginTop: 4, marginBottom: 0 }}>
          Use / to create nested groups (e.g., Gradients/Brand/Hero). Max 5 names
          (4 slashes).
        </p>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>URL</label>
        <input
          type="text"
          value={metadata.url || ""}
          onChange={(e) => handlePropertyChange("url", e.target.value)}
          placeholder="Source URL"
          style={fieldBox}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Tags</label>
        <div
          style={{
            ...fieldBox,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          {(metadata?.tags || []).map((tag, idx) => (
            <span
              key={`${tag}-${idx}`}
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
              {tag}
              <button
                type="button"
                onClick={() =>
                  handleTagChange(
                    (metadata?.tags || []).filter((_, i) => i !== idx)
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
          ))}
          {(metadata?.tags?.length ?? 0) < 3 && (
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onKeyDown={(e) => {
                if (
                  (e.key === "Enter" || e.key === ",") &&
                  tagsInput.trim()
                ) {
                  e.preventDefault()
                  const currentTags = metadata?.tags || []
                  const newTag = tagsInput.trim()
                  if (!currentTags.includes(newTag)) {
                    handleTagChange([...currentTags, newTag].slice(0, 3))
                    setTagsInput("")
                  }
                } else if (
                  e.key === "Backspace" &&
                  !tagsInput &&
                  (metadata?.tags?.length ?? 0) > 0
                ) {
                  handleTagChange((metadata?.tags || []).slice(0, -1))
                }
              }}
              onBlur={() => {
                if (tagsInput.trim()) {
                  const currentTags = metadata?.tags || []
                  const newTag = tagsInput.trim()
                  if (!currentTags.includes(newTag)) {
                    handleTagChange([...currentTags, newTag].slice(0, 3))
                    setTagsInput("")
                  }
                }
              }}
              placeholder={
                (metadata?.tags?.length ?? 0) === 0
                  ? "Tags (press , or Enter, max 3)"
                  : ""
              }
              style={{
                flex: 1,
                minWidth: 80,
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

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Comments</label>
        <textarea
          rows={3}
          value={metadata.comments || ""}
          onChange={(e) => handlePropertyChange("comments", e.target.value)}
          placeholder="Enter comments about this gradient"
          style={{ ...fieldBox, resize: "vertical" }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <SingleThumbSlider
          value={Number(metadata.ranking) || 0}
          onValueChange={(v) => handlePropertyChange("ranking", v)}
          max={100}
          min={0}
          step={1}
          label="Ranking"
          inlineLabel={false}
        />
      </div>
    </div>
  )
}

export default GradientPropertiesForm
