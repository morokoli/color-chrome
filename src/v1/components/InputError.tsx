import { FC } from "react"

type Props = {
  message: string
}

export const InputError: FC<Props> = (props) => {
  return <p className="text-xs text-red-700">{props.message}</p>
}
