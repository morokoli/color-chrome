import { FC } from "react"
import { Toast } from "./Toast"
import { useToast } from "@/hooks/useToast"

export type Props = {
  children: JSX.Element | JSX.Element[]
}

export const ExtensionContainer: FC<Props> = (props) => {
  const toast = useToast()

  return (
    <div className="">
      {props.children}
      <Toast message={toast.state.message} type={toast.state.type} />
    </div>
  )
}
