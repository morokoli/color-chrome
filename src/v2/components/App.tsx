import { useReducer, useState, useEffect, useCallback } from "react"
import { ExtensionContainer } from "@/v2/components/common/ExtensionContainer"
import { initGlobalState, globalReducer } from "@/v2/reducers/globalReducer"
import { initToastState, toastReducer } from "@/v2/reducers/toastReducer"
import { GlobalStateContext } from "@/v2/context/globalStateContext"
import { ToastContext } from "@/v2/context/toastContext"
import { getAuthCookie } from "@/v2/helpers/cookie"
import { Auth } from "@/v2/helpers/auth"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { colors } from "@/v2/helpers/colors"
import { config } from "@/v2/others/config"
import { axiosInstance } from "@/v2/hooks/useAPI"
import Copy from "./Copy"
import Comment from "./Comment"
import MainMenu from "./MainMenu"
import AddSheet from "./AddSheet"
import PickPanel from "./PickPanel"
import { Show } from "./common/Show"
import AiGenerator from "./AIGenerator"
import FigmaManager from "./FigmaManager"
import { PageColorExtraction } from "./PageColorExtraction"

const queryClient = new QueryClient()

const App = () => {
  const [state, dispatch] = useReducer(globalReducer, initGlobalState)
  const [toastState, toastDispatch] = useReducer(toastReducer, initToastState)
  const [tab, setTab] = useState<string | null>(null)
  const [selected, setSelected] = useState<null | string>(null)

  // Helper to save color to Google Sheets
  const saveColorToSheet = useCallback(async (hexColor: string, source: string) => {
    const { selectedFile, files, user } = state
    if (!selectedFile || !user?.jwtToken) return

    const selectedFileData = files.find(file => file.spreadsheetId === selectedFile)
    if (!selectedFileData) return

    try {
      await axiosInstance.post(
        config.api.endpoints.addColor,
        {
          spreadsheetId: selectedFile,
          sheetName: selectedFileData.sheets?.[0]?.name || "",
          sheetId: selectedFileData.sheets?.[0]?.id ?? 0,
          row: {
            timestamp: new Date().valueOf(),
            url: source,
            hex: hexColor,
            hsl: colors.hexToHSL(hexColor),
            rgb: colors.hexToRGB(hexColor),
            comments: "",
            ranking: "",
            slash_naming: "",
            tags: [],
            additionalColumns: [],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user.jwtToken}`,
          },
        }
      )
    } catch (error) {
      console.error("Failed to save color to sheet:", error)
    }
  }, [state])

  // Handle picked color from custom magnifier
  const handlePickedColor = useCallback((pickedColor: string) => {
    dispatch({ type: "SET_COLOR", payload: pickedColor })
    dispatch({ type: "ADD_COLOR_HISTORY", payload: pickedColor })

    // Add to file color history if a file is selected
    if (state.selectedFile) {
      dispatch({
        type: "ADD_FILE_COLOR_HISTORY",
        payload: {
          spreadsheetId: state.selectedFile,
          color: pickedColor,
        },
      })

      // Get current tab URL and save to sheet
      chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        const currentUrl = tabs[0]?.url || "Picked Color"
        saveColorToSheet(pickedColor, currentUrl)
      })
    }

    // Don't navigate - the on-page panel shows the results
  }, [state.selectedFile, saveColorToSheet])

  // Listen for picked color from magnifier
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.pickedColor?.newValue) {
        handlePickedColor(changes.pickedColor.newValue)
        chrome.storage.local.remove(['pickedColor', 'pickedAt'])
      }
      if (changes.pickerCancelled?.newValue) {
        setTab(null)
        chrome.storage.local.remove(['pickerCancelled', 'cancelledAt'])
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    // Check for pending color on mount (30 second window)
    chrome.storage.local.get(['pickedColor', 'pickedAt', 'openTab'], (result) => {
      if (result.pickedColor && result.pickedAt && Date.now() - result.pickedAt < 30000) {
        handlePickedColor(result.pickedColor)
        chrome.storage.local.remove(['pickedColor', 'pickedAt'])
      }
      // Check if we should open a specific tab
      if (result.openTab) {
        setTab(result.openTab)
        chrome.storage.local.remove(['openTab'])
      }
    })

    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [handlePickedColor])

  const handlePickColor = async () => {
    // Start the custom magnifier picker
    chrome.runtime.sendMessage({ type: 'START_COLOR_PICKER' }, (response) => {
      if (response?.error) {
        console.error('Picker error:', response.error)
        setTab(null)
      } else {
        // Close popup so it doesn't appear in screenshot
        window.close()
      }
    })
  }

  const copyToClipboard = (text: string, selection: null | string) => {
    if (document.hasFocus()) {
      navigator.clipboard
        .writeText(text)
        .then(() => setSelected(selection))
        .catch((err) => {
          console.error("Clipboard error: ", err)
        })
    }
  }

  /** auto-unselect for Copy after n-miliseconds */
  useEffect(() => {
    if (selected) {
      const handle = setTimeout(() => setSelected(null), 2000)
      return () => clearTimeout(handle)
    }
  }, [selected])

  useEffect(() => {
    /** check if user is logged in */
    const intervalId = setInterval(() => {
      getAuthCookie().then((user) => {
        if (user) {
          dispatch({ type: "SET_USER", payload: user })

          /** refresh auth tokens in background */
          if (user.jwtToken) {
            Auth.refreshAuthToken(user.jwtToken, (data) => {
              dispatch({ type: "UPDATE_ACCESS_TOKEN", payload: data })
            })
          }

          clearInterval(intervalId)
        }
      })
    }, 1000)
  }, [])

  // Sync state to chrome.storage.local for background script access
  useEffect(() => {
    const { user, selectedFile, files } = state
    const selectedFileData = files.find(file => file.spreadsheetId === selectedFile)

    const colorPickerState = {
      jwtToken: user?.jwtToken || null,
      selectedFile: selectedFile || null,
      selectedFileData: selectedFileData ? {
        spreadsheetId: selectedFileData.spreadsheetId,
        sheetName: selectedFileData.sheets?.[0]?.name || '',
        sheetId: selectedFileData.sheets?.[0]?.id ?? 0,
      } : null,
      apiUrl: config.api.baseURL,
    }

    chrome.storage.local.set({ colorPickerState })
  }, [state.user, state.selectedFile, state.files])

  return (
    <QueryClientProvider client={queryClient}>
      <GlobalStateContext.Provider value={{ state, dispatch }}>
        <ToastContext.Provider
          value={{ state: toastState, dispatch: toastDispatch }}
        >
        <ExtensionContainer>
          <Show if={tab === null}>
            <MainMenu setTab={setTab} onPickColor={handlePickColor} />
          </Show>
          <Show if={tab === "PICK_PANEL"}>
            <PickPanel
              setTab={setTab}
              selected={selected}
              copyToClipboard={copyToClipboard}
            />
          </Show>
          <Show if={tab === "AI_GENERATOR"}>
            <AiGenerator
              setTab={setTab}
              selected={selected}
              copyToClipboard={copyToClipboard}
            />
          </Show>
          <Show if={tab === "COPY"}>
            <Copy
              setTab={setTab}
              selected={selected}
              copyToClipboard={copyToClipboard}
            />
          </Show>
          <Show if={tab === "COMMENT"}>
            <Comment
              setTab={setTab}
              selected={selected}
              copyToClipboard={copyToClipboard}
            />
          </Show>
          <Show if={tab === "FIGMA_MANAGER"}>
            <FigmaManager setTab={setTab}/>
          </Show>
          <Show if={tab === "ADD_SHEET"}>
            <AddSheet setTab={setTab} />
          </Show>
          <Show if={tab === "COLOR_EXTRACTION"}>
            <PageColorExtraction setTab={setTab} />
          </Show>
        </ExtensionContainer>
        </ToastContext.Provider>
      </GlobalStateContext.Provider>
    </QueryClientProvider>
  )
}

export default App
