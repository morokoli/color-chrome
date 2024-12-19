import { FC } from "react"
// import { useGlobalState } from "@/v2/hooks/useGlobalState"

import pickIcon from "@/v2/assets/images/icons/menu/pick.svg"
import copyIcon from "@/v2/assets/images/icons/menu/copy.svg"
import commentIcon from "@/v2/assets/images/icons/menu/comment.svg"
import sheetIcon from "@/v2/assets/images/icons/menu/sheet.svg"

interface Props {
  setTab: (tab: string | null) => void;
}

const MainMenu: FC<Props> = ({ setTab }) => {
  // const { dispatch } = useGlobalState()

  const data = [
    {
      title: 'Pick Color',
      icon: pickIcon,
      menuName: "PICK_PANEL",
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
      title: 'Add Sheet',
      icon: sheetIcon,
    },
  ];

  return (
    <div className="w-[200px] border-2">
      {data.map((item, index) => (
        <div
          key={item.title}
          className={`cursor-pointer flex h-[40px] items-center text-2xl border-b border-solid ${index !== 0 ? 'mt-[-2px]' : ''}`}
          onClick={() => setTab(item.menuName!)}
        >
          <div className="h-[25px] w-[25px]  ml-2 mr-5" >
            <img src={item.icon} alt="google" className="h-full w-full" />
          </div>
          <div>{item.title}</div>
        </div>
      ))}
      <div className="text-[10px]">
        Chose the Sheet to save your colors
      </div>
      <div className="text-[12px]">
        Add sheet
      </div>
    </div>
  )
}

export default MainMenu;
