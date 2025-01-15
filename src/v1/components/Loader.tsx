import { FC } from "react"
import classNames from "classnames"

type Props = {
  type: "light" | "dark"
  size: "small" | "medium"
}

export const Loader: FC<Props> = (props) => {
  return (
    <div
      className={classNames("animate-spin rounded-full border-2 border-solid", {
        "border-slate-800 border-r-slate-300": props.type === "light",
        "border-slate-100 border-r-transparent": props.type === "dark",
        "h-4 w-4": props.size === "medium",
        "h-3 w-3": props.size === "small",
      })}
      role="status"
    ></div>
  )
}
