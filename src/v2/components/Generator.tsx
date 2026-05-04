import { FC, useRef, useState } from "react"
import PaletteModal, { type PaletteModalHandle } from "./PaletteModal"
import { ChevronLeft } from "lucide-react"

interface Props {
  setTab: (tab: string | null) => void
  onPickColor?: () => void
  onPickColorFromBrowser?: () => void
}

const Generator: FC<Props> = ({ setTab }) => {
  const paletteRef = useRef<PaletteModalHandle | null>(null)
  const [primaryDisabled, setPrimaryDisabled] = useState(false)
  const [primaryLabel, setPrimaryLabel] = useState("Save")
  const [saveSelectedColorDisabled, setSaveSelectedColorDisabled] =
    useState(true)
  const [saveSelectedColorLoading, setSaveSelectedColorLoading] =
    useState(false)
  const [colorMode, setColorMode] = useState<"solid" | "gradient">("solid")
  const [activeTab, setActiveTab] = useState<"create" | "info">("create")

  const handleClose = () => {
    setTab(null)
  }

  const handleSuccess = () => {
    setTab(null)
  }

  const handleStateChange = () => {}

  return (
    <div className="w-[800px] h-[600px] flex flex-col generator-container">
      {/* Custom Header with Mode Toggle and Create/Info Tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #f0f0f0",
          flexShrink: 0,
          gap: "16px",
        }}
      >
        {/* Left: Back button + Title + Mode Toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flex: 1,
          }}
        >
          <button
            onClick={() => setTab(null)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f5f5f5"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontSize: "16px", fontWeight: 600 }}>Generator</span>

          {/* Mode Toggle (Solid/Gradient) */}
          <div
            style={{
              display: "flex",
              background: "#ededea",
              padding: "4px",
              borderRadius: "8px",
              border: "1px solid rgba(209, 209, 203, 0.5)",
              gap: 0,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setColorMode("solid")
                paletteRef.current?.setColorMode?.("solid")
              }}
              style={{
                padding: "6px 16px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                transition: "all 0.15s ease",
                background: colorMode === "solid" ? "#fff" : "transparent",
                border: "none",
                color: colorMode === "solid" ? "#141414" : "#525252",
                cursor: "pointer",
                lineHeight: 1.3,
                boxShadow:
                  colorMode === "solid"
                    ? "0 1px 3px rgba(0, 0, 0, 0.1)"
                    : "none",
              }}
              onMouseEnter={(e) => {
                if (colorMode !== "solid") {
                  e.currentTarget.style.color = "#141414"
                }
              }}
              onMouseLeave={(e) => {
                if (colorMode !== "solid") {
                  e.currentTarget.style.color = "#525252"
                }
              }}
            >
              Solid Color
            </button>
            <button
              type="button"
              onClick={() => {
                setColorMode("gradient")
                paletteRef.current?.setColorMode?.("gradient")
              }}
              style={{
                padding: "6px 16px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                transition: "all 0.15s ease",
                background: colorMode === "gradient" ? "#fff" : "transparent",
                border: "none",
                color: colorMode === "gradient" ? "#141414" : "#525252",
                cursor: "pointer",
                lineHeight: 1.3,
                boxShadow:
                  colorMode === "gradient"
                    ? "0 1px 3px rgba(0, 0, 0, 0.1)"
                    : "none",
              }}
              onMouseEnter={(e) => {
                if (colorMode !== "gradient") {
                  e.currentTarget.style.color = "#141414"
                }
              }}
              onMouseLeave={(e) => {
                if (colorMode !== "gradient") {
                  e.currentTarget.style.color = "#525252"
                }
              }}
            >
              Gradient
            </button>
          </div>
        </div>

        {/* Right: Create/Info Tabs */}
        <div
          style={{
            display: "flex",
            background: "#ededea",
            padding: "4px",
            borderRadius: "8px",
            border: "1px solid rgba(209, 209, 203, 0.5)",
            gap: 0,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab("create")
              paletteRef.current?.setActiveTab?.("create")
            }}
            style={{
              padding: "6px 16px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              transition: "all 0.15s ease",
              background: activeTab === "create" ? "#fff" : "transparent",
              border: "none",
              color: activeTab === "create" ? "#141414" : "#525252",
              cursor: "pointer",
              lineHeight: 1.3,
              boxShadow:
                activeTab === "create"
                  ? "0 1px 3px rgba(0, 0, 0, 0.1)"
                  : "none",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== "create") {
                e.currentTarget.style.color = "#141414"
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "create") {
                e.currentTarget.style.color = "#525252"
              }
            }}
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("info")
              paletteRef.current?.setActiveTab?.("info")
            }}
            style={{
              padding: "6px 16px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              transition: "all 0.15s ease",
              background: activeTab === "info" ? "#fff" : "transparent",
              border: "none",
              color: activeTab === "info" ? "#141414" : "#525252",
              cursor: "pointer",
              lineHeight: 1.3,
              boxShadow:
                activeTab === "info" ? "0 1px 3px rgba(0, 0, 0, 0.1)" : "none",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== "info") {
                e.currentTarget.style.color = "#141414"
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "info") {
                e.currentTarget.style.color = "#525252"
              }
            }}
          >
            Info
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex justify-center items-start">
        <PaletteModal
          ref={paletteRef}
          open={true}
          onClose={handleClose}
          onSuccess={handleSuccess}
          hidePrimaryActionButton={true}
          hideHeader={true}
          externalColorMode={colorMode}
          externalActiveTab={activeTab}
          onColorModeChange={setColorMode}
          onActiveTabChange={setActiveTab}
          onPrimaryActionMetaChange={({ disabled, label }) => {
            setPrimaryDisabled(disabled)
            setPrimaryLabel(label)
          }}
          onSaveSelectedColorMetaChange={({ disabled, loading }) => {
            setSaveSelectedColorDisabled(disabled)
            setSaveSelectedColorLoading(loading)
          }}
          onStateChange={handleStateChange}
        />
      </div>
      {/* Footer: Save selected color separately + Save (same row as AI Generator) */}
      <div className="px-3 pb-3 pt-2 border-t border-gray-200 flex-shrink-0 flex items-center justify-between gap-3">
        <button
          onClick={() => paletteRef.current?.saveSelectedColorSeparately()}
          disabled={saveSelectedColorDisabled}
          className={`flex items-center justify-center py-2.5 px-[15px] min-w-[180px] text-[12px] rounded transition-colors border ${
            !saveSelectedColorDisabled
              ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {saveSelectedColorLoading
            ? "Saving..."
            : "Save selected color individually"}
        </button>
        <button
          onClick={() => paletteRef.current?.submit()}
          disabled={primaryDisabled}
          className={`flex items-center justify-center py-2.5 min-w-[140px] text-[12px] rounded transition-colors ${
            !primaryDisabled
              ? "bg-gray-900 text-white hover:bg-gray-800"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  )
}

export default Generator
