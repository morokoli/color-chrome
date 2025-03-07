import { FC } from 'react'
import { useGlobalState } from '@/v2/hooks/useGlobalState'
import { eraseAllCookies } from '@/v2/helpers/cookie'

import Select from '@/v2/components/Select'

import pickIcon from '@/v2/assets/images/icons/menu/pick.svg'
import copyIcon from '@/v2/assets/images/icons/menu/copy.svg'
import sheetIcon from '@/v2/assets/images/icons/menu/sheet.svg'
import commentIcon from '@/v2/assets/images/icons/menu/comment.svg'
import aigeneratorIcon from '@/v2/assets/images/icons/menu/aigenerator.svg'

interface Props {
  setTab: (tab: string | null) => void;
}

const MainMenu: FC<Props> = ({ setTab }) => {
  const { state, dispatch } = useGlobalState()
  
  const logOutHandler = async () => {
    await eraseAllCookies();
    dispatch({ type: "RESET_STATE" })
  }

  const data = [
    {
      title: 'Pick Color',
      icon: pickIcon,
      menuName: "PICK_PANEL",
    },
    {
      title: 'Ai Generator',
      icon: aigeneratorIcon,
      menuName: "AI_GENERATOR",
    },
    {
      title: 'Copy',
      icon: copyIcon,
      menuName: "COPY",
    },
    {
      title: 'Comment',
      icon: commentIcon,
      menuName: "COMMENT",
    },
    {
      title: 'Sheet Manager',
      icon: sheetIcon,
      menuName: "ADD_SHEET",
    },
  ];

  const openFileHandler = () => {
    const fileUrl = "https://docs.google.com/spreadsheets/d/" + state.selectedFile;  // Change to your file's URL
    window.open(fileUrl, '_blank');
  }

  return (
    // zoom - smaller main menu to 20% / title - 22px at standart
    <div className="w-[200px] border-2 zoom-08">
      {data.map((item, index) => (
        <div
          key={item.title}
          onClick={() => setTab(item.menuName!)}
          className={`cursor-pointer flex h-[40px] items-center text-2xl border-b border-solid ${index !== 0 ? 'mt-[-2px]' : ''}`}
        >
          <div className="h-[23px] w-[25px] ml-2 mr-5" >
            <img src={item.icon} alt="icon" className="h-full w-full" />
          </div>
          <div className='text-[18px]'>{item.title}</div> 
        </div>
      ))} 
      <div className="text-[10px] text-center">
        Chose the Sheet to save your colors
      </div>

      <Select placeholder='Add sheet' setTab={setTab} />

      {state.selectedFile && (
        <button
          onClick={openFileHandler}
          className="h-[22px] w-full text-black text-[10px] bg-white border-b border-solid"
        >
          {'Open file'}
        </button>
      )}

      {state.user && (
        <button
          onClick={logOutHandler}
          className="h-[22px] w-full text-black text-[10px] bg-white"
        >
          {'Log Out'}
        </button>
      )}

    </div>
  )
}

export default MainMenu;
