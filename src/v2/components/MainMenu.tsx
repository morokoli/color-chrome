import { FC, useEffect, useMemo, useState } from "react"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { eraseAllCookies } from "@/v2/helpers/cookie"
import { LogIn } from "lucide-react"
import { SECTION_MENU_ITEMS } from "@/v2/constants/sectionMenu"
import { FolderSheetSelector } from "./MainMenu/FolderSheetSelector"
import { config } from "@/v2/others/config"
import { fetchWorkspaces, type Workspace } from "@/v2/api/workspaces.api"

interface Props {
  setTab: (tab: string | null) => void
  onPickColor: () => void
  onPickColorFromBrowser: () => void
}

const MainMenu: FC<Props> = ({ setTab, onPickColor, onPickColorFromBrowser }) => {
  const { state, dispatch } = useGlobalState()
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null)
  const [workspaceAvatarFailed, setWorkspaceAvatarFailed] = useState(false)

  useEffect(() => {
    const jwtToken = state.user?.jwtToken
    if (!jwtToken) {
      setActiveWorkspace(null)
      return
    }
    let cancelled = false
    const loadWorkspace = async () => {
      try {
        const stored = await chrome.storage.local.get("activeWorkspaceId")
        const workspaceId = typeof stored.activeWorkspaceId === "string" ? stored.activeWorkspaceId : null
        const workspaces = await fetchWorkspaces(jwtToken)
        if (!cancelled) setActiveWorkspace(workspaces.find((item) => item._id === workspaceId) || null)
      } catch {
        if (!cancelled) setActiveWorkspace(null)
      }
    }
    void loadWorkspace()
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === "local" && changes.activeWorkspaceId) void loadWorkspace()
    }
    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => {
      cancelled = true
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [state.user?.jwtToken])

  useEffect(() => {
    setWorkspaceAvatarFailed(false)
  }, [activeWorkspace?._id, activeWorkspace?.avatarUrl])

  const workspaceInitials = (workspace: Workspace | null) => {
    const words = String(workspace?.name || "WS").trim().split(/\s+/).filter(Boolean)
    return words.length > 1
      ? `${words[0][0]}${words[1][0]}`.toUpperCase()
      : (words[0] || "WS").slice(0, 2).toUpperCase()
  }

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
      {state.user && activeWorkspace && (
        <div className="flex items-center gap-2 px-4 pb-3 mb-2 border-b border-gray-200">
          {activeWorkspace.avatarUrl && !workspaceAvatarFailed ? (
            <img
              src={activeWorkspace.avatarUrl}
              alt=""
              className="w-7 h-7 rounded-md object-cover shrink-0"
              onError={() => setWorkspaceAvatarFailed(true)}
            />
          ) : (
            <span className="w-7 h-7 rounded-md bg-black text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
              {workspaceInitials(activeWorkspace)}
            </span>
          )}
          <span className="min-w-0 truncate text-xs font-semibold text-gray-900">{activeWorkspace.name}</span>
        </div>
      )}
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
