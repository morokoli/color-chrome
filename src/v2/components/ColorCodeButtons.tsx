import { FC } from 'react'
import { colors } from '@/v2/helpers/colors'
import classNames from 'classnames'

type Selection = 'HEX' | 'RGB' | 'HSL'

type Props = {
  color: string;
  isCopy?: boolean;
  isCompact?: boolean;
  isPanelOpen: boolean;
  selected?: string | null;
  copyToClipboard?: (text: string, selection: string | null) => void
}

const ColorCodeButtons: FC<Props> = ({ color, isCopy, isCompact, isPanelOpen = false, selected, copyToClipboard }) => {
  const copyColorHandler = (colorCode: string, colorName: Selection) => {
    if (color) {
      copyToClipboard?.(colorCode, colorName);
    }
  };

  if (!isPanelOpen) return null;

  return (
    <div className={`flex ${isCopy ? 'flex-col h-[130px] justify-between' : 'flex-row'}`}>
      <button
        className={classNames("px-0.5 py-1 w-[147px] h-[40px]", {
          "bg-slate-200": selected !== "HEX",
          "bg-teal-100": selected === "HEX",
          "mr-3": !isCompact,
          "text-[14px]": !isCompact,
          "text-[11px]": isCompact,
        })}
        title="Copy HEX to clipboard"
        onClick={() => copyColorHandler(color!, "HEX")}
      >
        {selected === "HEX" ? "COPIED" : color || 'HEX'}
      </button>

      <button
        className={classNames("px-0.5 py-1 w-[147px] h-[40px]", {
          "bg-slate-200": selected !== "RGB",
          "bg-teal-100": selected === "RGB",
          "mr-3": !isCompact,
          "mx-3": isCompact,
          "text-[14px]": !isCompact,
          "text-[11px]": isCompact,
        })}
        title="Copy RGB to clipboard"
        onClick={() => copyColorHandler(colors.hexToRGB(color!), "RGB")}
      >
        {selected === "RGB" ? "COPIED" : colors.hexToRGB(color!)}
      </button>

      <button
        className={classNames("px-0.5 py-1 w-[147px] h-[40px]", {
          "bg-slate-200": selected !== "HSL",
          "bg-teal-100": selected === "HSL",
          "mr-3": !isCompact,
          "text-[14px]": !isCompact,
          "text-[11px]": isCompact,
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