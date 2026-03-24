import { useEffect, useRef, useState, useCallback } from "react"
import { X, Plus } from "lucide-react"
import { MultiSelectDropdown } from "@/v2/components/FigmaManager/MultiSelectDropdown"
import { useGetFolders } from "@/v2/api/folders.api"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { useQueryClient } from "@tanstack/react-query"
import { axiosInstance } from "@/v2/hooks/useAPI"
import { config } from "@/v2/others/config"
import { useToast } from "@/v2/hooks/useToast"
import { Slider } from "@/components/ui/slider"

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
  const queryClient = useQueryClient()
  const toast = useToast()
  const [tagsInput, setTagsInput] = useState("")
  const nameInputRef = useRef<HTMLInputElement>(null)
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
  }, [isCreatingFolder, newFolderName, isCreatingLoading, handleCreateFolder])

  // Auto-fill URL with current browser tab when empty
  useEffect(() => {
    if (formData.url) return
    chrome?.tabs?.query({ active: true, currentWindow: true }).then((tabs) => {
      const url = tabs[0]?.url
      if (url && !url.startsWith("chrome://") && !url.startsWith("chrome-extension://")) {
        setFormData((prev: typeof formData) => ({ ...prev, url }))
      }
    }).catch(() => {})
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
            items={(foldersData?.folders || []).map(f => f._id)}
            keyExtractor={(folderId) => folderId}
            renderItem={(folderId) => {
              const folder = foldersData?.folders?.find(f => f._id === folderId)
              return folder?.name || folderId
            }}
            renderSelected={(selected) => {
              if (selected.length === 0) return "Select folders"
              if (selected.length === 1) {
                const folder = foldersData?.folders?.find(f => f._id === selected[0])
                return folder?.name || selected[0]
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
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: nameFieldError ? "#c62828" : undefined }}>
          Palette Name *
        </label>
        <input
          ref={nameInputRef}
          type="text"
          value={formData.name}
          onChange={(e) => {
            const val = e.target.value
            const parts = val.split("/").map((p) => p.trim())
            const nonEmpty = parts.filter(Boolean)
            const limited = nonEmpty.slice(0, 4)
            let next = limited.join("/")
            if (val.trim().endsWith("/") && limited.length < 4) next += "/"
            setFormData({ ...formData, name: next })
            onClearNameFieldError?.()
          }}
          placeholder="e.g. Brand/Primary/Blue"
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "14px",
            backgroundColor: nameFieldError ? "#ffebee" : "#F5F5F5",
            outline: "none",
            border: nameFieldError ? "2px solid #c62828" : "1px solid transparent",
            borderRadius: "4px",
          }}
        />
      </div>

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
