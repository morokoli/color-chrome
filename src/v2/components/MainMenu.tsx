import { FC } from "react"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { eraseAllCookies } from "@/v2/helpers/cookie"
import {
  Pipette,
  Sparkles,
  History,
  Copy,
  FileSpreadsheet,
  LogOut,
  LogIn,
  ExternalLink,
  Figma,
  PanelTop,
  Palette,
  Edit3,
} from "lucide-react"

interface Props {
  setTab: (tab: string | null) => void
  onPickColor: () => void
}

const MainMenu: FC<Props> = ({ setTab, onPickColor }) => {
  const { state, dispatch } = useGlobalState()

  const logOutHandler = async () => {
    await eraseAllCookies()
    dispatch({ type: "RESET_STATE" })
  }

  const menuItems = [
    { title: "Pick Color", icon: Pipette, menuName: null, action: onPickColor },
    { title: "Website Colors", icon: PanelTop, menuName: "COLOR_EXTRACTION" },
    { title: "AI Generator", icon: Sparkles, menuName: "AI_GENERATOR" },
    { title: "Generator", icon: Palette, menuName: "GENERATOR" },
    { title: "History & Editor", icon: History, menuName: "COMMENT" },
    { title: "Figma", icon: Figma, menuName: "FIGMA_MANAGER" },
    { title: "Bulk Editor", icon: Edit3, menuName: "BULK_EDITOR" },
    { title: "Copy", icon: Copy, menuName: "COPY" },
    { title: "Sheet Manager", icon: FileSpreadsheet, menuName: "ADD_SHEET" },
  ]

  const logInHandler = () => {
    setTab("ADD_SHEET")
  }

  const openFileHandler = () => {
    const fileUrl =
      "https://docs.google.com/spreadsheets/d/" + state.selectedFile
    window.open(fileUrl, "_blank")
  }

  // Get selected file name
  const selectedFileName = state.files.find(
    (f) => f.spreadsheetId === state.selectedFile
  )?.fileName

  return (
    <div className="w-[200px] bg-white rounded-md shadow-sm border border-gray-200">
      {/* Menu Items */}
      <div className="py-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.title}
              onClick={() => item.action ? item.action() : setTab(item.menuName!)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-100 transition-colors cursor-pointer"
            >
              {Icon && <Icon className="w-4 h-4 text-gray-600" />}
              <span className="text-[13px] text-gray-800">{item.title}</span>
            </button>
          )
        })}
      </div>

      {/* Selected Sheet Display */}
      {state.selectedFile && (
        <>
          <div className="h-px bg-gray-200" />
          <div className="px-3 py-2">
            <p className="text-[10px] text-gray-400 mb-1">Saving to</p>
            <button
              onClick={openFileHandler}
              className="w-full flex items-center justify-between text-left group"
            >
              <span className="text-[12px] text-gray-700 truncate max-w-[150px]">
                {selectedFileName || "Sheet"}
              </span>
              <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
            </button>
          </div>
        </>
      )}

      {/* Auth Button */}
      <div className="h-px bg-gray-200" />
      {state.user ? (
        <button
          onClick={logOutHandler}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <LogOut className="w-3 h-3" />
          Log Out
        </button>
      ) : (
        <button
          onClick={logInHandler}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <LogIn className="w-3 h-3" />
          Log In
        </button>
      )}
    </div>
  )
}

export default MainMenu
