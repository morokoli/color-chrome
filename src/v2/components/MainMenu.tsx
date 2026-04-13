import { FC, useMemo } from "react"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { eraseAllCookies } from "@/v2/helpers/cookie"
import { LogIn } from "lucide-react"
import { SECTION_MENU_ITEMS } from "@/v2/constants/sectionMenu"
import { FolderSheetSelector } from "./MainMenu/FolderSheetSelector"
import { config } from "@/v2/others/config"

interface Props {
  setTab: (tab: string | null) => void
  onPickColor: () => void
  onPickColorFromBrowser: () => void
}

const MainMenu: FC<Props> = ({ setTab, onPickColor, onPickColorFromBrowser }) => {
  const { state, dispatch } = useGlobalState()

  const logOutHandler = async () => {
    await eraseAllCookies()
    dispatch({ type: "RESET_STATE" })
  }

  const menuSections = useMemo(() => {
    const sections: { title: string | null; items: typeof SECTION_MENU_ITEMS }[] = []
    const bySection = new Map<string | null, (typeof SECTION_MENU_ITEMS)[number][]>()
    SECTION_MENU_ITEMS.forEach((item) => {
      const key = item.section
      if (!bySection.has(key)) bySection.set(key, [])
      bySection.get(key)!.push(item)
    })
    const order: (string | null)[] = ["Color Actions", null, "Integration", "Export to"]
    order.forEach((sectionTitle) => {
      const items = bySection.get(sectionTitle) ?? []
      if (items.length > 0) sections.push({ title: sectionTitle, items })
    })
    return sections
  }, [])

  const logInHandler = () => {
    const url = config.api.baseURL + config.api.endpoints.auth
    chrome.tabs.create({ url })
  }

  const openWebApp = () => {
    const jwt = state.user?.jwtToken
    if (!jwt) {
      logInHandler()
      return
    }
    const url = `${config.webApp.baseURL}/chrome-handoff#token=${encodeURIComponent(jwt)}`
    chrome.tabs.create({ url })
  }

  const firstSectionWithHeading = 0

  return (
    <div className="w-[300px] p-4 bg-white rounded-md shadow-sm border border-gray-200">
      {/* Menu Sections */}
      <div className="py-1 mb-2">
        {menuSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {section.title && (
              <div
                className={`mb-[4px] px-4 ${
                  sectionIndex === firstSectionWithHeading
                    ? "flex items-center justify-between gap-2"
                    : ""
                }`}
              >
                <p className="text-[15px] text-[#7D7D7D]">{section.title}</p>
                {sectionIndex === firstSectionWithHeading && (
                  <button
                    type="button"
                    onClick={openWebApp}
                    className="shrink-0 rounded px-3 py-1 text-[12px] font-medium bg-black text-white hover:bg-gray-900 transition-colors"
                  >
                    Go to library
                  </button>
                )}
              </div>
            )}
            <div className="flex flex-col">
              {section.items.map((item) => {
                const Icon = item.Icon
                const handleClick = () => {
                  if (item.actionKey === "pickColor") onPickColor()
                  else if (item.actionKey === "pickFromBrowser") onPickColorFromBrowser()
                  else if (item.menuName != null) setTab(item.menuName)
                }
                return (
                  <button
                    key={item.title}
                    onClick={handleClick}
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
