import { FC } from "react"
import classNames from "classnames"

type Props = {
  currentColor: string
  currentColorId: number
  previousColors: string[]
  max: number
  setCurrentColor: (color: string, colorIndex: number) => void
  setCurrentColorId: (color: number) => void
  clearHistory: () => void
}

export const ColorHistory: FC<Props> = (props) => {
  return (
    <div className="flex justify-between">
      <div className="flex space-x-2">
        {props.previousColors.map((prevColor, index) => (
          <div
            className={classNames("h-5 w-5 rounded border-2 cursor-pointer", {
              "border-transparent": props.currentColorId !== index,
              "border-slate-800 shadow": props.currentColorId === index,
            })}
            key={prevColor}
            style={{ backgroundColor: prevColor }}
            onClick={() => {
              props.setCurrentColorId(index)
              props.setCurrentColor(prevColor, index)
            }}
          />
        ))}
      </div>
      <button
        className="text-xs text-zinc-800 underline h-5"
        onClick={props.clearHistory}
      >
        Clear
      </button>
    </div>
  )
}
