import { useEffect, useState, useCallback, useMemo } from "react"
import { X, Plus } from "lucide-react"
import { createDefaultColorObject } from "@/v2/helpers/createDefaultColorObject"
import { MultiSelectDropdown } from "@/v2/components/FigmaManager/MultiSelectDropdown"
import { useGetFolders } from "@/v2/api/folders.api"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useQueryClient } from "@tanstack/react-query"
import { axiosInstance } from "@/v2/hooks/useAPI"
import { config } from "@/v2/others/config"
import { useToast } from "@/v2/hooks/useToast"
import { Slider } from "@/components/ui/slider"
import {
  buildParentIdByChildId,
  getFolderLabelWithParent,
  flattenFoldersHierarchyOrder,
} from "@/v2/utils/folderDisplayName"

interface ColorPropertiesFormProps {
  selectedColor: any
  onColorChange: (color: any) => void
  colorPickerIndex: number | null
  selectedFolderIds: string[]
  onFolderChange: (folderIds: string[]) => void
}

const ColorPropertiesForm = ({
  selectedColor,
  onColorChange,
  colorPickerIndex,
  selectedFolderIds,
  onFolderChange,
}: ColorPropertiesFormProps) => {
  const { state } = useGlobalState()
  const { data: foldersData } = useGetFolders(false)
  const foldersList = useMemo(
    () => flattenFoldersHierarchyOrder(foldersData?.folders || []),
    [foldersData?.folders]
  )
  const parentByChildId = useMemo(() => buildParentIdByChildId(foldersList), [foldersList])
  const queryClient = useQueryClient()
  const toast = useToast()
  const [tagsInput, setTagsInput] = useState("")
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [isCreatingLoading, setIsCreatingLoading] = useState(false)

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
  }, [isCreatingFolder, newFolderName, isCreatingLoading])

  if (colorPickerIndex === null) {
    return (
      <div className="text-center py-5 text-gray-500">
        Select a color to edit its properties
      </div>
    )
  }

  const colorObject =
    typeof selectedColor === "string"
      ? createDefaultColorObject(selectedColor)
      : selectedColor

  // Auto-fill URL with current browser tab when empty
  useEffect(() => {
    if (colorObject.url) return
    chrome?.tabs?.query({ active: true, currentWindow: true }).then((tabs) => {
      const url = tabs[0]?.url
      if (url && !url.startsWith("chrome://") && !url.startsWith("chrome-extension://")) {
        onColorChange({ ...colorObject, url })
      }
    }).catch(() => { })
  }, [colorPickerIndex])

  const handlePropertyChange = (property: string, value: any) => {
    const updatedColor = {
      ...colorObject,
      [property]: value,
    }
    onColorChange(updatedColor)
  }

  const handleNameChange = (value: string) => {
    // Max 4 slashes = max 5 slash-name parts; preserve trailing slash while typing
    const parts = value.split("/").map((p) => p.trim())
    const nonEmpty = parts.filter(Boolean)
    const limitedParts = nonEmpty.slice(0, 5)
    let limitedValue = limitedParts.join("/")
    if (value.endsWith("/") && limitedParts.length < 5) limitedValue += "/"

    // If name contains slashes, extract first part as name and full string as slash_naming
    if (limitedValue.includes("/")) {
      const firstPart = limitedParts[0] || limitedValue
      const updatedColor = {
        ...colorObject,
        name: firstPart,
        slash_naming: limitedValue,
      }
      onColorChange(updatedColor)
    } else {
      const updatedColor = {
        ...colorObject,
        name: limitedValue,
        slash_naming: limitedValue,
      }
      onColorChange(updatedColor)
    }
  }

  const handleTagChange = (tags: string[]) => {
    let processedTags = tags
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
    const updatedColor = {
      ...colorObject,
      tags: Array.isArray(processedTags) ? processedTags : [processedTags],
    }
    onColorChange(updatedColor)
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
            items={foldersList.map(f => f._id)}
            keyExtractor={(folderId) => folderId}
            renderItem={(folderId) => {
              const folder = foldersList.find(f => f._id === folderId)
              return folder
                ? getFolderLabelWithParent(folder, foldersList, parentByChildId)
                : folderId
            }}
            renderSelected={(selected) => {
              if (selected.length === 0) return "Select folders"
              if (selected.length === 1) {
                const folder = foldersList.find(f => f._id === selected[0])
                return folder
                  ? getFolderLabelWithParent(folder, foldersList, parentByChildId)
                  : selected[0]
              }
              return `${selected.length} folders selected`
            }}
            onSelect={(folderIds) => onFolderChange(folderIds)}
            placeholder="Select folders"
            width="100%"
            isSearchable
            checkboxAtEnd={true}
            renderFooter={renderFolderFooter}
          />
        </div>
      )}

      <div style={{ marginBottom: "12px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>
          Name
        </label>
        <input
          type="text"
          value={colorObject.slash_naming || colorObject.name || ""}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g., Brand Color/Primary/Blue 01"
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "14px",
            backgroundColor: "#F5F5F5",
            outline: "none",
          }}
        />
        <p style={{ fontSize: "12px", color: "#9B9B9B", marginTop: "4px" }}>
          Use / to create nested groups (e.g., Colors/Brand/Primary). Max 5 names (4 slashes).
        </p>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>
          URL
        </label>
        <input
          type="text"
          value={colorObject.url || ""}
          onChange={(e) => handlePropertyChange("url", e.target.value)}
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
          {(colorObject?.tags || []).map((tag: string, idx: number) => (
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
                onClick={() =>
                  handleTagChange(
                    (colorObject?.tags || []).filter((_: string, i: number) => i !== idx)
                  )
                }
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
          {(colorObject?.tags?.length ?? 0) < 3 && (
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === ",") && tagsInput.trim()) {
                  e.preventDefault()
                  const currentTags = colorObject?.tags || []
                  const newTag = tagsInput.trim()
                  if (!currentTags.includes(newTag)) {
                    handleTagChange([...currentTags, newTag].slice(0, 3))
                    setTagsInput("")
                  }
                } else if (e.key === "Backspace" && !tagsInput && (colorObject?.tags?.length ?? 0) > 0) {
                  handleTagChange((colorObject?.tags || []).slice(0, -1))
                }
              }}
              onBlur={() => {
                if (tagsInput.trim()) {
                  const currentTags = colorObject?.tags || []
                  const newTag = tagsInput.trim()
                  if (!currentTags.includes(newTag)) {
                    handleTagChange([...currentTags, newTag].slice(0, 3))
                    setTagsInput("")
                  }
                }
              }}
              placeholder={(colorObject?.tags?.length ?? 0) === 0 ? "Tags (press , or Enter, max 3)" : ""}
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
          Comments
        </label>
        <textarea
          rows={3}
          value={colorObject.comments || ""}
          onChange={(e) => handlePropertyChange("comments", e.target.value)}
          placeholder="Enter comments about this color"
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
          <span style={{ fontSize: "14px", fontWeight: 500 }}>{colorObject.ranking || 0}</span>
        </div>
        <Slider
          value={[Number(colorObject.ranking) || 0]}
          onValueChange={(value) => handlePropertyChange("ranking", value[0])}
          max={100}
          step={1}
          className="w-full"
        />
      </div>
    </div>
  )
}

export default ColorPropertiesForm
