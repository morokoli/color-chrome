import { FC } from "react"
import { colors } from "@/v2/helpers/colors"
import classNames from "classnames"
import { useGlobalState } from "@/v2/hooks/useGlobalState"

type Selection = "HEX" | "RGB" | "HSL"

type Props = {
  isCopy?: boolean;
  isPanelFull: boolean;
  selected?: string | null;
  copyToClipboard?: (text: string, selection: string | null) => void
}

const ColorCodeButtons: FC<Props> = ({ isCopy, isPanelFull = false, selected, copyToClipboard }) => {
  const { state } = useGlobalState()
  const { color } = state

  const copyColorHandler = (colorCode: string, colorName: Selection) => {
    copyToClipboard?.(colorCode, colorName);
    const handle = setTimeout(() => {
      window.close()
    }, 1000)
    return () => clearTimeout(handle)
  };

  if (!isPanelFull) return null;

  return (
    <div className={`flex ${isCopy ? 'flex-col h-[130px] justify-between' : 'flex-row'}`}>
      <button
        className={classNames("px-1 py-2 w-[147px] h-[40px] mr-3 text-[14px]", {
          "bg-slate-200": selected !== "HEX",
          "bg-teal-100": selected === "HEX",
        })}
        title="Copy HEX to clipboard"
        onClick={() => copyColorHandler(color!, "HEX")}
      >
        {selected === "HEX" ? "COPIED" : color || '-'}
      </button>

      <button
        className={classNames("px-1 py-2 w-[147px] h-[40px] mr-3 text-[14px]", {
          "bg-slate-200": selected !== "RGB",
          "bg-teal-100": selected === "RGB",
        })}
        title="Copy RGB to clipboard"
        onClick={() => copyColorHandler(colors.hexToRGB(color!), "RGB")}
      >
        {selected === "RGB" ? "COPIED" : colors.hexToRGB(color!)}
      </button>

      <button
        className={classNames("px-1 py-2 w-[147px] h-[40px] mr-3 text-[14px]", {
          "bg-slate-200": selected !== "HSL",
          "bg-teal-100": selected === "HSL",
        })}
        title="Copy HSL to clipboard"
        onClick={() => copyColorHandler(colors.hexToHSL(color!), "HSL")}
      >
        {selected === "HSL" ? "COPIED" : colors.hexToHSL(color!)}
      </button>
    </div>
  )
}

export default ColorCodeButtons;