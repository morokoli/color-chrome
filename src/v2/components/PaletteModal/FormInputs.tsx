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
}

const FormInputs = ({ formData, setFormData, tags, setTags }: FormInputsProps) => {
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
      <div style={{ marginBottom: "24px" }}>
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
          value={formData.ranking}
          onChange={(e) => setFormData({ ...formData, ranking: parseInt(e.target.value) || 0 })}
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
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="www.domain.com/url"
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
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Description..."
          rows={3}
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
          Tags
        </label>
        <input
          type="text"
          value={tags.join(", ")}
          onChange={(e) => handleTagChange(e.target.value)}
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
