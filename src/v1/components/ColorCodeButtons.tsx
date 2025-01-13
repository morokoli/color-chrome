import { FC, useEffect, useState } from "react"
import { colors } from "@/v1/helpers/colors"
import classNames from "classnames"

type Props = {
  color: string
}

type Selection = "HEX" | "RGB" | "HSL"

export const ColorCodeButtons: FC<Props> = (props) => {
  const [selected, setSelected] = useState<Selection | null>(null)

  const copyToClipboard = (text: string, selection: Selection) => {
    navigator.clipboard.writeText(text).then(() => setSelected(selection))
  }

  /** auto-unselect afer n-miliseconds */
  useEffect(() => {
    if (selected) {
      const handle = setTimeout(() => setSelected(null), 2000)
      return () => clearTimeout(handle)
    }
  }, [selected])

  return (
    <div className="flex flex-row space-x-1">
      <button
        className={classNames("flex-1 text-xs px-1 py-2 rounded-b", {
          "bg-slate-200": selected !== "HEX",
          "bg-emerald-200": selected === "HEX",
        })}
        title="Copy HEX to clipboard"
        onClick={() => copyToClipboard(props.color, "HEX")}
      >
        {selected === "HEX" ? "Copied" : props.color}
      </button>

      <button
        className={classNames("flex-1 text-xs px-1 py-2 rounded-b", {
          "bg-slate-200": selected !== "RGB",
          "bg-emerald-200": selected === "RGB",
        })}
        title="Copy RGB to clipboard"
        onClick={() => copyToClipboard(colors.hexToRGB(props.color), "RGB")}
      >
        {selected === "RGB" ? "Copied" : colors.hexToRGB(props.color)}
      </button>

      <button
        className={classNames("flex-1 text-xs px-1 py-2 rounded-b", {
          "bg-slate-200": selected !== "HSL",
          "bg-emerald-200": selected === "HSL",
        })}
        title="Copy HSL to clipboard"
        onClick={() => copyToClipboard(colors.hexToHSL(props.color), "HSL")}
      >
        {selected === "HSL" ? "Copied" : colors.hexToHSL(props.color)}
      </button>
    </div>
  )
}
