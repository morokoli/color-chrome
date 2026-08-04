import { useState } from "react"
import { X } from "lucide-react"
import { isChipSeparatorKey } from "./chipInputKeys"

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

const MAX_DESIGN_TOKEN_DOTS = 4

const normalizeToken = (raw: string): string => {
  const trimmed = String(raw || "").trim().toLowerCase()
  if (!trimmed) return ""
  const segments = trimmed.split(".")
  if (segments.length > MAX_DESIGN_TOKEN_DOTS + 1) return ""
  const valid = segments.every(
    (segment) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(segment) || /^\d+$/.test(segment)
  )
  return valid ? segments.join(".") : ""
}

interface DesignTokensInputProps {
  value?: string[]
  onChange: (tokens: string[]) => void
  style?: React.CSSProperties
}

const DesignTokensInput = ({ value = [], onChange, style }: DesignTokensInputProps) => {
  const [input, setInput] = useState("")
  const tokens = Array.isArray(value) ? value : []

  const commitToken = (raw: string) => {
    const token = normalizeToken(raw)
    if (!token || tokens.includes(token)) {
      setInput("")
      return
    }
    onChange([...tokens, token])
    setInput("")
  }

  const removeToken = (idx: number) => {
    onChange(tokens.filter((_, i) => i !== idx))
  }

  return (
    <div style={{ marginBottom: 12, ...style }}>
      <label style={labelStyle}>Design tokens</label>
      <div
        style={{
          ...fieldBox,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        {tokens.map((token, idx) => (
          <span
            key={`${token}-${idx}`}
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
            {token}
            <button
              type="button"
              onClick={() => removeToken(idx)}
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
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (isChipSeparatorKey(e.key) && input.trim()) {
              e.preventDefault()
              commitToken(input)
            } else if (e.key === "Backspace" && !input && tokens.length > 0) {
              removeToken(tokens.length - 1)
            }
          }}
          onBlur={() => {
            if (input.trim()) commitToken(input)
          }}
          placeholder={
            tokens.length === 0
              ? "color.blue.primary.800 (press , Enter, or Tab)"
              : "Add another token..."
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
      </div>
      <p style={{ fontSize: 12, color: "#9B9B9B", marginTop: 4, marginBottom: 0 }}>
        Each token uses dot notation with up to 4 dots (e.g. color.blue.primary.800).
      </p>
    </div>
  )
}

export default DesignTokensInput
