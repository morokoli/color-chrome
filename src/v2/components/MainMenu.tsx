import { FC } from "react"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { eraseAllCookies } from "@/v2/helpers/cookie"
import {
  Pipette,
  Sparkles,
  History,
  Copy,
  FileSpreadsheet,
  LogIn,
  Figma,
  PanelTop,
  Palette,
  Edit3,
} from "lucide-react"
import { FolderSheetSelector } from "./MainMenu/FolderSheetSelector"

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

  // Organized menu sections
  const menuSections = [
    {
      title: "Color Actions",
      items: [
        { title: "Pick Color", icon: Pipette, menuName: null, action: onPickColor },
        { title: "Website Colors", icon: PanelTop, menuName: "COLOR_EXTRACTION" },
        { title: "Generate Palette", icon: Palette, menuName: "GENERATOR" },
        { title: "AI Generator", icon: Sparkles, menuName: "AI_GENERATOR" },
      ],
    },
    {
      title: null, // No header for general actions
      items: [
        { title: "Copy", icon: Copy, menuName: "COPY" },
        { title: "History & Editor", icon: History, menuName: "COMMENT" },
        { title: "Bulk Editor", icon: Edit3, menuName: "BULK_EDITOR" },
      ],
    },
    {
      title: "Integration",
      items: [
        { title: "Figma", icon: Figma, menuName: "FIGMA_MANAGER" },
      ],
    },
    {
      title: "Export to",
      items: [
        { title: "Sheet", icon: FileSpreadsheet, menuName: "ADD_SHEET" },
      ],
    },
  ]

  const logInHandler = () => {
    setTab("ADD_SHEET")
  }

  return (
    <div className="w-[300px] p-4 bg-white rounded-md shadow-sm border border-gray-200">
      {/* Menu Sections */}
      <div className="py-1 mb-2">
        {menuSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {section.title && (
              <div className="mb-[4px] px-4">
                <p className="text-[15px] text-[#7D7D7D]">
                  {section.title}
                </p>
              </div>
            )}
            <div className="flex flex-col">
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.title}
                    onClick={() => item.action ? item.action() : setTab(item.menuName!)}
                    className="w-full flex items-center px-4 gap-2.5 py-1.5 text-left hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    {Icon && <Icon className="w-4 h-4 text-gray-600" />}
                    <span className="text-[13px] text-gray-800">{item.title}</span>
                  </button>
                )
              })}
            </div>
            {sectionIndex < menuSections.length - 1 && (
              <div className="h-px bg-[#9B9B9B] my-2 mx-4" />
            )}
          </div>
        ))}
      </div>

      {/* Folder/Sheet Selector */}
      {state.user && (
        <FolderSheetSelector
          selectedFolders={state.selectedFolders || []}
          selectedSheets={state.selectedSheets || []}
          files={state.files}
          onFoldersChange={(folderIds) => {
            dispatch({ type: "SET_SELECTED_FOLDERS", payload: folderIds })
          }}
          onSheetsChange={(sheetIds) => {
            dispatch({ type: "SET_SELECTED_SHEETS", payload: sheetIds })
          }}
          userToken={state.user?.jwtToken}
        />
      )}

      {/* Auth Button */}
      {state.user ? (
        <button
          onClick={logOutHandler}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[16px] text-[#CC0000] transition-colors"
        >
          Log Out
        </button>
      ) : (
        <button
          onClick={logInHandler}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[16px] text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <LogIn className="w-3 h-3" />
          Log In
        </button>
      )}
    </div>
  )
}

export default MainMenu
