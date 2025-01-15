import { FC } from 'react'
import { useGlobalState } from '@/v2/hooks/useGlobalState'

import ColorCodeButtons from './ColorCodeButtons'

interface Props {
  selected: null | string;
  copyToClipboard: (text: string, selection: null | string) => void
}

const Copy: FC<Props> = ({ selected, copyToClipboard }) => {
  const { state  } = useGlobalState()
  const { color } = state;

  return (
    <div className="border-2 flex items-center justify-between w-[150px]">
      <ColorCodeButtons
        isCopy
        isPanelFull
        color={color!}
        selected={selected!}
        copyToClipboard={copyToClipboard}
      />
    </div>
  )
}

export default Copy;
