import { FC } from "react"
import classNames from "classnames"
import { Show } from "./Show"
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline"

type Props = {
  message: string | null
  type: "error" | "success" | "info" | null
}

export const Toast: FC<Props> = (props) => {
  return (
    <Show if={props.message !== null}>
      <div
        className={classNames(
          "flex space-x-2 px-4 py-2 text-xs w-100 absolute top-0 left-0 w-full border-b-2",
          {
            "bg-custom-green border-custom-green text-white":
              props.type === "success",
            "bg-red-600 border-red-600 text-white": props.type === "error",
            "bg-orange-600 border-orange-600 text-white": props.type === "info",
          },
        )}
      >
        {props.type === "success" && (
          <CheckCircleIcon className="h-4 w-4 text-white my-auto" />
        )}
        {props.type === "error" && (
          <XCircleIcon className="h-4 w-4 text-white my-auto" />
        )}
        {props.type === "info" && (
          <InformationCircleIcon className="h-4 w-4 text-white my-auto" />
        )}
        <span className="my-auto">{props.message}</span>
      </div>
    </Show>
  )
}
