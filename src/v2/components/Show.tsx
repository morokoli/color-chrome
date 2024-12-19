import { FC } from "react"

type Props = {
  children: JSX.Element | JSX.Element[]
  if: boolean
}

export const Show: FC<Props> = (props) => {
  if (props.if) {
    return <>{props.children}</>
  }

  return <></>
}
