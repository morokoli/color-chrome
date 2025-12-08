import { FC } from 'react'
import { Show } from './Show'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

type Props = {
  message: string | null
  type: "error" | "success" | "info" | null
}

export const Toast: FC<Props> = (props) => (
  <Show if={props.message !== null}>
    <div className="fixed top-2 right-2 z-50 animate-fade-in">
      <div
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded shadow-md text-[11px] ${
          props.type === "success"
            ? "bg-emerald-500 text-white"
            : props.type === "error"
            ? "bg-red-500 text-white"
            : "bg-amber-500 text-white"
        }`}
      >
        {props.type === "success" && (
          <CheckCircle className="h-3 w-3 shrink-0" />
        )}
        {props.type === "error" && (
          <XCircle className="h-3 w-3 shrink-0" />
        )}
        {props.type === "info" && (
          <AlertCircle className="h-3 w-3 shrink-0" />
        )}
        <span>{props.message}</span>
      </div>
    </div>
  </Show>
)
