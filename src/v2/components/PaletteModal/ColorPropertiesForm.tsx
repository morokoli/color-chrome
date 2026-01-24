import { createDefaultColorObject } from "@/v2/helpers/createDefaultColorObject"
import { Plus, X } from "lucide-react"
import { MultiSelectDropdown } from "@/v2/components/FigmaManager/MultiSelectDropdown"
import { useGetFolders } from "@/v2/api/folders.api"
import { useGlobalState } from "@/v2/hooks/useGlobalState"

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

  const handlePropertyChange = (property: string, value: any) => {
    const updatedColor = {
      ...colorObject,
      [property]: value,
    }
    onColorChange(updatedColor)
  }

  const handleNameChange = (value: string) => {
    // If name contains slashes, extract first part as name and full string as slash_naming
    if (value.includes("/")) {
      const firstPart = value.split("/")[0].trim()
      const updatedColor = {
        ...colorObject,
        name: firstPart || value, // Use first part as name, fallback to full value if empty
        slash_naming: value, // Full string with slashes as slash_naming
      }
      onColorChange(updatedColor)
    } else {
      // No slashes, just update name and clear slash_naming
      const updatedColor = {
        ...colorObject,
        name: value,
        slash_naming: value, // Use the name itself as slash_naming when no slashes
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

  const handleAdditionalColumnChange = (index: number, field: string, value: string) => {
    const updatedColumns = [...(colorObject.additionalColumns || [])]
    if (field === "name") {
      updatedColumns[index] = { ...updatedColumns[index], name: value }
    } else if (field === "value") {
      updatedColumns[index] = { ...updatedColumns[index], value: value }
    }
    const updatedColor = {
      ...colorObject,
      additionalColumns: updatedColumns,
    }
    onColorChange(updatedColor)
  }

  const addAdditionalColumn = () => {
    const updatedColumns = [
      ...(colorObject.additionalColumns || []),
      { name: "", value: "" },
    ]
    const updatedColor = {
      ...colorObject,
      additionalColumns: updatedColumns,
    }
    onColorChange(updatedColor)
  }

  const removeAdditionalColumn = (index: number) => {
    const updatedColumns = (colorObject.additionalColumns || []).filter(
      (_, i) => i !== index
    )
    const updatedColor = {
      ...colorObject,
      additionalColumns: updatedColumns,
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
          Name
        </label>
        <input
          type="text"
          value={colorObject.slash_naming || colorObject.name || ""}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e,g., Brand Color/Primary/Blue 01"
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "14px",
            backgroundColor: "#F5F5F5",
            outline: "none",
          }}
        />
        <p style={{ fontSize: "12px", color: "#9B9B9B", marginTop: "4px" }}>
        Use / to create nested groups (e.g., Colors/Brand/Primary)
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
          placeholder="Enter color URL"
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
          value={colorObject.ranking || 0}
          onChange={(e) =>
            handlePropertyChange("ranking", parseInt(e.target.value) || 0)
          }
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
          Google Sheet URL
        </label>
        <input
          type="text"
          value={colorObject.sheetUrl || ""}
          onChange={(e) => handlePropertyChange("sheetUrl", e.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/..."
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

      <div style={{ marginBottom: "12px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>
          Tags
        </label>
        <input
          type="text"
          value={(colorObject?.tags || []).join(", ")}
          onChange={(e) => {
            const tags = e.target.value
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
            handleTagChange(tags)
          }}
          placeholder="Enter tags (comma separated, max 3)"
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "14px",
            backgroundColor: "#F5F5F5",
            outline: "none",
          }}
        />
        {colorObject?.tags && colorObject.tags.length > 0 && (
          <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
            {colorObject.tags.map((tag: string, idx: number) => (
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
                  onClick={() =>
                    handleTagChange(
                      colorObject.tags.filter((_: any, i: number) => i !== idx)
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
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>
          Additional Columns
        </label>
        {(colorObject.additionalColumns || []).map((column: any, index: number) => (
          <div key={index} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Column name"
              value={column.name}
              onChange={(e) =>
                handleAdditionalColumnChange(index, "name", e.target.value)
              }
              style={{
                width: "120px",
                padding: "12px 16px",
                fontSize: "14px",
                backgroundColor: "#F5F5F5",
                outline: "none",
              }}
            />
            <input
              type="text"
              placeholder="Column value"
              value={column.value}
              onChange={(e) =>
                handleAdditionalColumnChange(index, "value", e.target.value)
              }
              style={{
                flex: 1,
                padding: "12px 16px",
                fontSize: "14px",
                backgroundColor: "#F5F5F5",
                outline: "none",
              }}
            />
            <button
              onClick={() => removeAdditionalColumn(index)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#ff4d4f",
                padding: "4px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={addAdditionalColumn}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            width: "100%",
            padding: "4px 15px",
            height: "32px",
            border: "1px dashed #d9d9d9",
            borderRadius: "6px",
            background: "#fff",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          <Plus className="w-4 h-4" />
          Add Column
        </button>
      </div>
    </div>
  )
}

export default ColorPropertiesForm
