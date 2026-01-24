import { useReducer, useState, useEffect, useCallback, useRef } from "react"
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
import { AddColorResponse } from "@/v2/types/api"
import Copy from "./Copy"
import Comment from "./Comment"
import MainMenu from "./MainMenu"
import AddSheet from "./AddSheet"
import PickPanel from "./PickPanel"
import { Show } from "./common/Show"
import AiGenerator from "./AIGenerator"
import FigmaManager from "./FigmaManager"
import { PageColorExtraction } from "./PageColorExtraction"
import Generator from "./Generator"
import BulkEditor from "./BulkEditor"

const queryClient = new QueryClient()

const App = () => {
  const [state, dispatch] = useReducer(globalReducer, initGlobalState)
  const [toastState, toastDispatch] = useReducer(toastReducer, initToastState)
  const [tab, setTab] = useState<string | null>(null)
  const [selected, setSelected] = useState<null | string>(null)
  const processedColorsRef = useRef<Set<string>>(new Set()) // Track processed colors to prevent duplicates

  // Helper to save color to Google Sheets
  const saveColorToDatabase = useCallback(async (hexColor: string, source: string) => {
    const { selectedFile, files, user, selectedFolders, selectedSheets } = state
    if (!user?.jwtToken) return // Only require user to be logged in

    const colorData = {
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
    }

    const promises: Promise<any>[] = []
    let colorIdPromise: Promise<string | null> | null = null

    // Save to selected sheets (optimistic - fire all requests in parallel)
    if (selectedSheets && selectedSheets.length > 0) {
      selectedSheets.forEach(sheetId => {
        // Parse sheetId format: "spreadsheetId-sheetId"
        const [spreadsheetId, sheetIdNum] = sheetId.split('-')
        const file = files.find(f => f.spreadsheetId === spreadsheetId)
        const sheet = file?.sheets.find(s => s.id === Number(sheetIdNum))

        if (file && sheet) {
          const promise = axiosInstance.post(
            config.api.endpoints.addColor,
            {
              spreadsheetId,
              sheetName: sheet.name,
              sheetId: sheet.id,
              row: colorData,
            },
            {
              headers: {
                Authorization: `Bearer ${user.jwtToken}`,
              },
            }
          )
          promises.push(promise)
          
          // Use first response to get color ID for folders
          if (!colorIdPromise) {
            colorIdPromise = promise.then((response) => {
              // axiosInstance.post returns Axios response, so access response.data
              // Backend wraps in createOkResponse, so it's response.data.data
              const apiResponse = response?.data as { success?: boolean; data?: AddColorResponse } | AddColorResponse;
              if (apiResponse && 'success' in apiResponse && apiResponse.success && apiResponse.data) {
                return apiResponse.data.createdColor?._id || null;
              } else if (apiResponse && 'createdColor' in apiResponse) {
                return (apiResponse as AddColorResponse).createdColor?._id || null;
              }
              return null;
            }).catch(() => null)
          }
        }
      })
    } else if (selectedFile) {
      // Fallback to old behavior if no sheets selected but file is selected
      const selectedFileData = files.find(file => file.spreadsheetId === selectedFile)
      const promise = axiosInstance.post(
        config.api.endpoints.addColor,
        {
          spreadsheetId: selectedFile,
          sheetName: selectedFileData?.sheets?.[0]?.name || null,
          sheetId: selectedFileData?.sheets?.[0]?.id ?? null,
          row: colorData,
        },
        {
          headers: {
            Authorization: `Bearer ${user.jwtToken}`,
          },
        }
      )
      promises.push(promise)
      // axiosInstance.post returns Axios response, so access response.data
      // Backend wraps in createOkResponse, so it's response.data.data
      colorIdPromise = promise.then((response) => {
        const apiResponse = response?.data as { success?: boolean; data?: AddColorResponse } | AddColorResponse;
        if (apiResponse && 'success' in apiResponse && apiResponse.success && apiResponse.data) {
          return apiResponse.data.createdColor?._id || null;
        } else if (apiResponse && 'createdColor' in apiResponse) {
          return (apiResponse as AddColorResponse).createdColor?._id || null;
        }
        return null;
      }).catch(() => null)
    } else {
      // Save to "No sheet" if nothing is selected OR if only folders are selected
      // This ensures we always have a color ID to copy to folders
      const promise = axiosInstance.post(
        config.api.endpoints.addColor,
        {
          spreadsheetId: null,
          sheetName: null,
          sheetId: null,
          row: colorData,
        },
        {
          headers: {
            Authorization: `Bearer ${user.jwtToken}`,
          },
        }
      )
      promises.push(promise)
      // axiosInstance.post returns Axios response, so access response.data
      // Backend wraps in createOkResponse, so it's response.data.data
      colorIdPromise = promise.then((response) => {
        const apiResponse = response?.data as { success?: boolean; data?: AddColorResponse } | AddColorResponse;
        if (apiResponse && 'success' in apiResponse && apiResponse.success && apiResponse.data) {
          return apiResponse.data.createdColor?._id || null;
        } else if (apiResponse && 'createdColor' in apiResponse) {
          return (apiResponse as AddColorResponse).createdColor?._id || null;
        }
        return null;
      }).catch(() => null)
    }

    // Save to selected folders - ensure we always copy to ALL selected folders
    if (selectedFolders && selectedFolders.length > 0) {
      // If we don't have a colorIdPromise yet (shouldn't happen, but safety check),
      // create one by saving to "No sheet"
      if (!colorIdPromise) {
        const promise = axiosInstance.post(
          config.api.endpoints.addColor,
          {
            spreadsheetId: null,
            sheetName: null,
            sheetId: null,
            row: colorData,
          },
          {
            headers: {
              Authorization: `Bearer ${user.jwtToken}`,
            },
          }
        )
        promises.push(promise)
        colorIdPromise = promise.then((response) => {
          const apiResponse = response?.data as { success?: boolean; data?: AddColorResponse } | AddColorResponse;
          if (apiResponse && 'success' in apiResponse && apiResponse.success && apiResponse.data) {
            return apiResponse.data.createdColor?._id || null;
          } else if (apiResponse && 'createdColor' in apiResponse) {
            return (apiResponse as AddColorResponse).createdColor?._id || null;
          }
          return null;
        }).catch(() => null)
      }

      // Copy color to ALL selected folders (optimistic - all in parallel)
      colorIdPromise.then((colorId) => {
        if (colorId) {
          // Copy to each selected folder
          selectedFolders.forEach(folderId => {
            axiosInstance.post(
              `${config.api.endpoints.copyColorToFolder}/${folderId}/copy-color`,
              { colorId },
              {
                headers: {
                  Authorization: `Bearer ${user.jwtToken}`,
                },
              }
            ).catch(err => {
              console.error(`Failed to copy color to folder ${folderId}:`, err)
            })
          })
        } else {
          console.error("Failed to get color ID for folder copying")
        }
      }).catch(err => {
        console.error("Failed to get color ID for folder copying:", err)
      })
    }

    // Execute all sheet saves in parallel (optimistic - don't wait)
    if (promises.length > 0) {
      Promise.all(promises).catch(err => {
        console.error("Some color saves failed:", err)
      })
    }
  }, [state])

  // Handle picked color from custom magnifier
  const handlePickedColor = useCallback((pickedColor: string, pickedAt?: number) => {
    // Use the pickedAt timestamp if provided, otherwise use current time
    const timestamp = pickedAt || Date.now()
    // Create a unique key using color + exact timestamp to prevent duplicates
    const colorKey = `${pickedColor}-${timestamp}`
    
    // Check in-memory cache first (fast)
    if (processedColorsRef.current.has(colorKey)) {
      console.log('Skipping duplicate color save (in-memory):', pickedColor, 'at', timestamp)
      return
    }
    
    // Check localStorage for persistent tracking (survives popup close/reopen)
    try {
      const processedStr = localStorage.getItem('processed_colors')
      if (processedStr) {
        const processed: string[] = JSON.parse(processedStr)
        if (processed.includes(colorKey)) {
          console.log('Skipping duplicate color save (localStorage):', pickedColor, 'at', timestamp)
          return
        }
      }
    } catch (e) {
      console.error('Error reading processed colors from localStorage:', e)
    }
    
    // Mark as processed in both in-memory and localStorage
    processedColorsRef.current.add(colorKey)
    try {
      const processedStr = localStorage.getItem('processed_colors')
      const processed: string[] = processedStr ? JSON.parse(processedStr) : []
      processed.push(colorKey)
      // Keep only last 100 entries to prevent localStorage bloat
      const recent = processed.slice(-100)
      localStorage.setItem('processed_colors', JSON.stringify(recent))
      
      // Clean up old entries after 10 seconds
      setTimeout(() => {
        try {
          const current = localStorage.getItem('processed_colors')
          if (current) {
            const parsed: string[] = JSON.parse(current)
            const filtered = parsed.filter(key => key !== colorKey)
            localStorage.setItem('processed_colors', JSON.stringify(filtered))
          }
        } catch (e) {
          console.error('Error cleaning up processed colors:', e)
        }
        processedColorsRef.current.delete(colorKey)
      }, 10000)
    } catch (e) {
      console.error('Error saving processed color to localStorage:', e)
    }
    
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
    }

    // Clear storage immediately to prevent reprocessing on mount
    // Do this before saving to database to ensure it's cleared even if save fails
    chrome.storage.local.remove(['pickedColor', 'pickedAt'], () => {
      // Storage cleared, now save to database
      // Always save to database (will use "No sheet" if no file selected)
      // Try to get URL, but use fallback if popup is closed
      chrome.tabs.query({ active: true, currentWindow: true })
        .then((tabs) => {
          const currentUrl = tabs[0]?.url || "Picked Color"
          saveColorToDatabase(pickedColor, currentUrl)
        })
        .catch(() => {
          // If query fails (popup closed), still try to save with fallback URL
          saveColorToDatabase(pickedColor, "Picked Color")
        })
    })

    // Don't navigate - the on-page panel shows the results
  }, [state.selectedFile, saveColorToDatabase])

  // Listen for picked color from magnifier
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.pickedColor?.newValue) {
        // Get the pickedAt timestamp from storage to ensure proper deduplication
        chrome.storage.local.get(['pickedAt'], (storageResult) => {
          const pickedAt = storageResult.pickedAt || Date.now()
          // handlePickedColor will clear storage itself, so we don't need to do it here
          handlePickedColor(changes.pickedColor.newValue, pickedAt)
        })
      }
      if (changes.pickerCancelled?.newValue) {
        setTab(null)
        chrome.storage.local.remove(['pickerCancelled', 'cancelledAt'])
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    // Check for pending color on mount (30 second window)
    // Only process if it hasn't been processed yet (using timestamp for deduplication)
    chrome.storage.local.get(['pickedColor', 'pickedAt', 'openTab'], (result) => {
      if (result.pickedColor && result.pickedAt) {
        // Only process if picked within last 30 seconds
        if (Date.now() - result.pickedAt < 30000) {
          // Use the stored pickedAt timestamp for proper deduplication
          handlePickedColor(result.pickedColor, result.pickedAt)
        }
        // Always clear storage after checking to prevent reprocessing
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
          <Show if={tab === "GENERATOR"}>
            <Generator setTab={setTab} />
          </Show>
          <Show if={tab === "BULK_EDITOR"}>
            <BulkEditor setTab={setTab} />
          </Show>
        </ExtensionContainer>
        </ToastContext.Provider>
      </GlobalStateContext.Provider>
    </QueryClientProvider>
  )
}

export default App
