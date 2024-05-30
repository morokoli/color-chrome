import { FC } from "react"
import { Toast } from "./Toast"
import { useToast } from "@/hooks/useToast"

export type Props = {
  children: JSX.Element | JSX.Element[]
}

export const ExtentionContainer: FC<Props> = (props) => {
  const toast = useToast()

  return (
    <div className="w-128 h-96 bg-slate-50 relative">
      {props.children}
      <Toast message={toast.state.message} type={toast.state.type} />
    </div>
  )
}
