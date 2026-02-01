import { FC, useState } from "react"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { colors } from "@/v2/helpers/colors"
import { Pipette, Copy as CopyIcon, Check } from "lucide-react"
import SectionHeader from "./common/SectionHeader"

interface Props {
  selected: null | string
  setTab: (tab: string | null) => void
  copyToClipboard: (text: string, selection: null | string) => void
  onPickColor?: () => void
  onPickColorFromBrowser?: () => void
}

const Copy: FC<Props> = ({ setTab, copyToClipboard, onPickColor, onPickColorFromBrowser }) => {
  const { state } = useGlobalState()
  const { color } = state
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null)

  const handlePickBtnClick = () => {
    setTab("PICK_PANEL")
  }

  const handleCopy = (format: string, value: string) => {
    copyToClipboard(value, format)
    setCopiedFormat(format)
    setTimeout(() => setCopiedFormat(null), 1500)
  }

  const colorFormats = color ? [
    { key: "HEX", value: color },
    { key: "RGB", value: colors.hexToRGB(color) },
    { key: "HSL", value: colors.hexToHSL(color) },
  ] : []

  return (
    <div className="w-[240px]">
      <SectionHeader
        title="Copy"
        setTab={setTab}
        onPickColor={onPickColor}
        onPickColorFromBrowser={onPickColorFromBrowser}
      />

      <div className="p-3">
      {/* Color Preview */}
      {color && (
        <div className="mb-3">
          <div
            className="w-full h-16 rounded-md border border-gray-200"
            style={{ backgroundColor: color }}
          />
        </div>
      )}

      {/* Color Format Buttons */}
      <div className="space-y-2 mb-3">
        {colorFormats.map(({ key, value }) => (
          <button
            key={key}
            onClick={() => handleCopy(key, value)}
            className="w-full flex items-center justify-between px-3 py-2 text-[12px] border border-gray-200 rounded hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-500">{key}</span>
            <span className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-gray-900">{value}</span>
              {copiedFormat === key ? (
                <Check size={14} className="text-emerald-500" />
              ) : (
                <CopyIcon size={14} className="text-gray-400" />
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Pick Another Color Button */}
      <button
        onClick={handlePickBtnClick}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[12px] bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
      >
        <Pipette size={14} />
        Pick Another Color
      </button>
      </div>
    </div>
  )
}

export default Copy
