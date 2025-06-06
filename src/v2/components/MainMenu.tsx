import { FC } from "react"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { eraseAllCookies } from "@/v2/helpers/cookie"

import Select from "@/v2/components/Select"

import pickIcon from "@/v2/assets/images/icons/menu/pick.svg"
import copyIcon from "@/v2/assets/images/icons/menu/copy.svg"
import sheetIcon from "@/v2/assets/images/icons/menu/sheet.svg"
import aigeneratorIcon from "@/v2/assets/images/icons/menu/aigenerator.svg"
import figmaIcon from "@/v2/assets/images/icons/menu/figma.svg"
import historyIcon from "@/v2/assets/images/icons/menu/history.svg"
import colorExtraction from "@/v2/assets/images/icons/menu/colorExtraction.svg"
interface Props {
  setTab: (tab: string | null) => void
}

const MainMenu: FC<Props> = ({ setTab }) => {
  const { state, dispatch } = useGlobalState()

  const logOutHandler = async () => {
    await eraseAllCookies()
    dispatch({ type: "RESET_STATE" })
  }

  const data = [
    {
      title: "Pick Color",
      icon: pickIcon,
      menuName: "PICK_PANEL",
    },
    {
      title: "Website Colors",
      icon: colorExtraction,
      menuName: "COLOR_EXTRACTION",
    },
    {
      title: "Ai Generator",
      icon: aigeneratorIcon,
      menuName: "AI_GENERATOR",
    },
    {
      title: "History",
      icon: historyIcon,
      menuName: "COMMENT",
    },
    {
      title: "Figma (Beta)",
      icon: figmaIcon,
      menuName: "FIGMA_MANAGER",
    },
    {
      title: "Copy",
      icon: copyIcon,
      menuName: "COPY",
    },
    {
      title: "Sheet Manager",
      icon: sheetIcon,
      menuName: "ADD_SHEET",
    },
  ]

  const logInHandler = () => {
    setTab("ADD_SHEET")
  }

  const openFileHandler = () => {
    const fileUrl =
      "https://docs.google.com/spreadsheets/d/" + state.selectedFile // Change to your file's URL
    window.open(fileUrl, "_blank")
  }

  return (
    // zoom - smaller main menu to 20% / title - 22px at standart
    <div className="w-[200px] border-2 zoom-08">
      {data.map((item, index) => (
        <div
          key={item.title}
          onClick={() => setTab(item.menuName!)}
          className={`cursor-pointer flex h-[40px] items-center text-2xl border-b border-solid ${
            index !== 0 ? "mt-[-2px]" : ""
          }`}
        >
          <div className="h-[23px] w-[25px] ml-2 mr-5">
            <img src={item.icon} alt="icon" className="h-full w-full" />
          </div>
          <div className="text-[18px]">{item.title}</div>
        </div>
      ))}
      <div className="text-[10px] text-center">
        Choose the Sheet to save your colors
      </div>

      <Select placeholder="Add sheet" setTab={setTab} />

      {state.selectedFile && (
        <button
          onClick={openFileHandler}
          className="h-[22px] w-full text-black text-[10px] bg-white border-b border-solid"
        >
          {"Open file"}
        </button>
      )}

      {state.user && (
        <button
          onClick={logOutHandler}
          className="h-[22px] w-full text-black text-[10px] bg-white"
        >
          {"Log Out"}
        </button>
      )}

      {!state.user && (
        <button
          onClick={logInHandler}
          className="h-[22px] w-full text-black text-[10px] bg-white"
        >
          {"Log In"}
        </button>
      )}
    </div>
  )
}

export default MainMenu
