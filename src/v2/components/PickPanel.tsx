import { FC, useState } from 'react'
import { useGlobalState } from '@/v2/hooks/useGlobalState'
import classNames from 'classnames'

import PickBtn from './common/PickBtn'
import ColorCodeButtons from './ColorCodeButtons'

import homeIcon from '@/v2/assets/images/icons/home.svg'
import commentIcon from '@/v2/assets/images/icons/menu/comment.svg'

interface Props {
  selected: null | string;
  setTab: (tab: string | null) => void;
  copyToClipboard: (text: string, selection: null | string) => void
}

const PickPanel: FC<Props> = ({ setTab, selected, copyToClipboard }) => {
  const { state } = useGlobalState()
  const { color } = state;
  const [isPanelOpen, setIsPanelOpen] = useState(true)

  return (
    <div id='container' className={`${isPanelOpen ? 'w-fit' : 'w-[300px]'} h-[50px] border-2 flex items-center justify-between`}>
      <div className='ml-3 mr-3'>
        <PickBtn copyToClipboard={copyToClipboard} />
      </div>

      <ColorCodeButtons color={color!} isPanelOpen={isPanelOpen} selected={selected!} copyToClipboard={copyToClipboard} />

      <button
        onClick={() => setTab('COMMENT')}
        className="h-[40px] w-[60px] border-2 text-white text-[20px] mr-3 flex justify-center"
      >
        <img src={commentIcon} alt="comment" className="h-[40px] w-[40px]" />
      </button>

      <div className="h-full w-[60px] border-l-2 border-black flex items-center justify-center">
        <div className="h-[40px] w-[40px] cursor-pointer" onClick={() => setTab(null)}>
          <img src={homeIcon} alt="home" className="h-full w-full" />
        </div>
      </div>
      <div onClick={() => setIsPanelOpen(!isPanelOpen)} className={classNames(`cursor-pointer arrow ${isPanelOpen ? 'right' : 'left' }`)} />
    </div>
  )
}

export default PickPanel;
