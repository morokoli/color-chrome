import { FC } from 'react'
import { useToast } from '@/v2/hooks/useToast'

import { Toast } from './Toast'

export type Props = {
  children: JSX.Element | JSX.Element[]
}

export const ExtensionContainer: FC<Props> = (props) => {
  const toast = useToast()

  return (
    <div className="w-full relative">
      {props.children}
      <Toast message={toast.state.message} type={toast.state.type} />
    </div>
  )
}
