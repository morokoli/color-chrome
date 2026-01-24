import { MultiSelectDropdown } from "@/v2/components/FigmaManager/MultiSelectDropdown"
import { useGetFolders } from "@/v2/api/folders.api"
import { useGlobalState } from "@/v2/hooks/useGlobalState"

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
}

const FormInputs = ({ formData, setFormData, tags, setTags, selectedFolderIds, onFolderChange }: FormInputsProps) => {
  const { state } = useGlobalState()
  const { data: foldersData } = useGetFolders(false)
  
  const handleTagChange = (value: string) => {
    const newTags = value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag && !tags.includes(tag))
    if (newTags.length > 0) {
      setTags([...tags, ...newTags].slice(0, 3))
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
          {foldersData?.folders && foldersData.folders.length > 0 ? (
            <MultiSelectDropdown<string>
              selected={selectedFolderIds}
              items={foldersData.folders.map(f => f._id)}
              keyExtractor={(folderId) => folderId}
              renderItem={(folderId) => {
                const folder = foldersData.folders.find(f => f._id === folderId)
                return folder?.name || folderId
              }}
              renderSelected={(selected) => {
                if (selected.length === 0) return "Select folders"
                if (selected.length === 1) {
                  const folder = foldersData.folders.find(f => f._id === selected[0])
                  return folder?.name || selected[0]
                }
                return `${selected.length} folders selected`
              }}
              onSelect={(folderIds) => onFolderChange(folderIds)}
              placeholder="Select folders"
              width="100%"
              isSearchable
              checkboxAtEnd={true}
            />
          ) : (
            <div style={{ fontSize: "12px", color: "#999", padding: "8px 0" }}>
              No folders available. Create a folder first.
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: "12px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>
          Palette Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter palette name"
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
          Ranking
        </label>
        <input
          type="number"
          min={0}
          max={100}
          value={formData.ranking}
          onChange={(e) => setFormData({ ...formData, ranking: parseInt(e.target.value) || 0 })}
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
          URL
        </label>
        <input
          type="text"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="www.domain.com/url"
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

      <div style={{ marginBottom: "12px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>
          Tags
        </label>
        <input
          type="text"
          value={tags.join(", ")}
          onChange={(e) => handleTagChange(e.target.value)}
          placeholder="Enter tags (comma separated, max 3)"
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "14px",
            backgroundColor: "#F5F5F5",
            outline: "none",
          }}
        />
        {tags.length > 0 && (
          <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
            {tags.map((tag, idx) => (
              <span
                key={idx}
                style={{
                  padding: "2px 8px",
                  fontSize: "13px",
                  background: "#f0f0f0",
                  borderRadius: "4px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {tag}
                <button
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
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default FormInputs
