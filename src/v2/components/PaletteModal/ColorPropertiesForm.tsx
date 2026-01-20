import { createDefaultColorObject } from "@/v2/helpers/createDefaultColorObject"
import { Plus, X } from "lucide-react"

interface ColorPropertiesFormProps {
  selectedColor: any
  onColorChange: (color: any) => void
  colorPickerIndex: number | null
}

const ColorPropertiesForm = ({
  selectedColor,
  onColorChange,
  colorPickerIndex,
}: ColorPropertiesFormProps) => {
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
      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>
          Name
        </label>
        <input
          type="text"
          value={colorObject.name || ""}
          onChange={(e) => handlePropertyChange("name", e.target.value)}
          placeholder="Enter color name"
          style={{
            width: "100%",
            height: "32px",
            padding: "4px 11px",
            fontSize: "14px",
            border: "1px solid #d9d9d9",
            borderRadius: "6px",
            outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#4096ff")}
          onBlur={(e) => (e.target.style.borderColor = "#d9d9d9")}
        />
      </div>

      <div style={{ marginBottom: "24px" }}>
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
            height: "32px",
            padding: "4px 11px",
            fontSize: "14px",
            border: "1px solid #d9d9d9",
            borderRadius: "6px",
            outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#4096ff")}
          onBlur={(e) => (e.target.style.borderColor = "#d9d9d9")}
        />
      </div>

      <div style={{ marginBottom: "24px" }}>
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
            height: "32px",
            padding: "4px 11px",
            fontSize: "14px",
            border: "1px solid #d9d9d9",
            borderRadius: "6px",
            outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#4096ff")}
          onBlur={(e) => (e.target.style.borderColor = "#d9d9d9")}
        />
      </div>

      <div style={{ marginBottom: "24px" }}>
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
            height: "32px",
            padding: "4px 11px",
            fontSize: "14px",
            border: "1px solid #d9d9d9",
            borderRadius: "6px",
            outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#4096ff")}
          onBlur={(e) => (e.target.style.borderColor = "#d9d9d9")}
        />
      </div>

      <div style={{ marginBottom: "24px" }}>
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
            padding: "4px 11px",
            fontSize: "14px",
            border: "1px solid #d9d9d9",
            borderRadius: "6px",
            outline: "none",
            resize: "vertical",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#4096ff")}
          onBlur={(e) => (e.target.style.borderColor = "#d9d9d9")}
        />
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>
          Slash Naming
        </label>
        <input
          type="text"
          value={colorObject.slash_naming || ""}
          onChange={(e) => handlePropertyChange("slash_naming", e.target.value)}
          placeholder="Enter slash naming (e.g. a/b/c)"
          style={{
            width: "100%",
            height: "32px",
            padding: "4px 11px",
            fontSize: "14px",
            border: "1px solid #d9d9d9",
            borderRadius: "6px",
            outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#4096ff")}
          onBlur={(e) => (e.target.style.borderColor = "#d9d9d9")}
        />
        <p style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
          Format: a/b/c, no spaces, max 3 "/"
        </p>
      </div>

      <div style={{ marginBottom: "24px" }}>
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
            height: "32px",
            padding: "4px 11px",
            fontSize: "14px",
            border: "1px solid #d9d9d9",
            borderRadius: "6px",
            outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#4096ff")}
          onBlur={(e) => (e.target.style.borderColor = "#d9d9d9")}
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
                height: "32px",
                padding: "4px 11px",
                fontSize: "14px",
                border: "1px solid #d9d9d9",
                borderRadius: "6px",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#4096ff")}
              onBlur={(e) => (e.target.style.borderColor = "#d9d9d9")}
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
                height: "32px",
                padding: "4px 11px",
                fontSize: "14px",
                border: "1px solid #d9d9d9",
                borderRadius: "6px",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#4096ff")}
              onBlur={(e) => (e.target.style.borderColor = "#d9d9d9")}
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
