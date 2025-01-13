import { FC } from 'react'
import ColorCodeButtons from './ColorCodeButtons';

interface Props {
  selected: null | string;
  copyToClipboard: (text: string, selection: null | string) => void
}

const Copy: FC<Props> = ({ selected, copyToClipboard }) => (
  <div className="border-2 flex items-center justify-between w-[150px]">
    <ColorCodeButtons isPanelFull isCopy selected={selected!} copyToClipboard={copyToClipboard} />
  </div>
)

export default Copy;
