import { FC } from "react"
import classNames from "classnames"

type Props = {
  currentColor: string
  previousColors: string[]
  max: number
  setCurrentColor: (color: string) => void
  clearHistory: () => void
}

export const ColorHistory: FC<Props> = (props) => {
  return (
    <div className="flex justify-between">
      <div className="flex space-x-2">
        {props.previousColors.map((prevColor) => (
          <div
            className={classNames("h-5 w-5 rounded border-2 cursor-pointer", {
              "border-transparent": props.currentColor !== prevColor,
              "border-slate-800 shadow": props.currentColor === prevColor,
            })}
            key={prevColor}
            style={{ backgroundColor: prevColor }}
            onClick={() => props.setCurrentColor(prevColor)}
          ></div>
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
