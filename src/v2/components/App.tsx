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
import { openEyeDropper } from "@/v2/helpers/colorPicker"
import Copy from "./Copy"
import Comment from "./Comment"
import MainMenu from "./MainMenu"
import PickPanel from "./PickPanel"
import { Show } from "./common/Show"
import AiGenerator from "./AIGenerator"
import FigmaManager from "./FigmaManager"
import { PageColorExtraction } from "./PageColorExtraction"
import Generator from "./Generator"
import BulkEditor from "./BulkEditor"
import { ExportToSheet } from "./ExportToSheet"

const queryClient = new QueryClient()

const App = () => {
  const [state, dispatch] = useReducer(globalReducer, initGlobalState)
  const [toastState, toastDispatch] = useReducer(toastReducer, initToastState)
  const [tab, setTab] = useState<string | null>(null)
  const [selected, setSelected] = useState<null | string>(null)
  const [lastPickSource, setLastPickSource] = useState<"eyedropper" | "magnifier" | null>(null)
  const processedColorsRef = useRef<Set<string>>(new Set()) // Track processed colors to prevent duplicates
  const stateRef = useRef(state)
  stateRef.current = state

  // Sync parsedData to colorHistory on mount (fixes persisted/corrupted state where lengths differ)
  useEffect(() => {
    if (state.colorHistory.length !== state.parsedData.length) {
      console.log('[ColorBoard:App] mount sync needed', { colorHistoryLen: state.colorHistory.length, parsedDataLen: state.parsedData.length })
      dispatch({ type: "SYNC_PARSED_DATA_TO_HISTORY" })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount

  // Helper to save color to database (no sheet integration)
  const saveColorToDatabase = useCallback(async (hexColor: string, source: string) => {
    const { user, selectedFolders } = state
    if (!user?.jwtToken) return

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

    // Always save to database (no selected sheet)
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

    const colorIdPromise: Promise<string | null> = promise
      .then((response) => {
        const apiResponse = response?.data as { success?: boolean; data?: AddColorResponse } | AddColorResponse
        if (apiResponse && 'success' in apiResponse && apiResponse.success && apiResponse.data) {
          return apiResponse.data.createdColor?._id || null
        } else if (apiResponse && 'createdColor' in apiResponse) {
          return (apiResponse as AddColorResponse).createdColor?._id || null
        }
        return null
      })
      .catch(() => null)

    // Save to selected folders - ensure we always copy to ALL selected folders
    if (selectedFolders && selectedFolders.length > 0) {
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
  }, [state])

  // Handle picked color from custom magnifier
  const handlePickedColor = useCallback((pickedColor: string, pickedAt?: number, createdColor?: any) => {
    // Use the pickedAt timestamp if provided, otherwise use current time
    const timestamp = pickedAt || Date.now()
    // Create a unique key using color + exact timestamp to prevent duplicates
    const colorKey = `${pickedColor}-${timestamp}`
    
    // Check in-memory cache first (fast)
    if (processedColorsRef.current.has(colorKey)) {
      // Backfill: if we already processed but now have createdColor and last parsed is empty, update it
      if (createdColor && (createdColor._id || createdColor.id)) {
        const s = stateRef.current
        const lastIdx = s.colorHistory.length - 1
        if (lastIdx >= 0 && s.colorHistory[lastIdx] === pickedColor) {
          const lastParsed = s.parsedData[lastIdx] as any
          if (!lastParsed?._id && !lastParsed?.id) {
            dispatch({ type: "UPDATE_PARSED_AT", payload: { index: lastIdx, parsed: createdColor } })
            queryClient.invalidateQueries({ queryKey: ["folders"] })
          }
        }
      }
      return
    }

    // Check localStorage for persistent tracking (survives popup close/reopen)
    try {
      const processedStr = localStorage.getItem('processed_colors')
      if (processedStr) {
        const processed: string[] = JSON.parse(processedStr)
        if (processed.includes(colorKey)) {
          // Backfill: same as above when createdColor arrives late
          if (createdColor && (createdColor._id || createdColor.id)) {
            const s = stateRef.current
            const lastIdx = s.colorHistory.length - 1
            if (lastIdx >= 0 && s.colorHistory[lastIdx] === pickedColor) {
              const lastParsed = s.parsedData[lastIdx] as any
              if (!lastParsed?._id && !lastParsed?.id) {
                dispatch({ type: "UPDATE_PARSED_AT", payload: { index: lastIdx, parsed: createdColor } })
                queryClient.invalidateQueries({ queryKey: ["folders"] })
              }
            }
          }
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
    const hasCreatedColor = createdColor && (createdColor._id || createdColor.id)
    dispatch({
      type: "ADD_COLOR_HISTORY",
      payload: hasCreatedColor ? { hex: pickedColor, parsed: createdColor } : pickedColor,
    })

    // Invalidate folders so Comment gets fresh folder data with the new color in colorIds
    if (hasCreatedColor) {
      queryClient.invalidateQueries({ queryKey: ["folders"] })
    }

    // Clear storage immediately to prevent reprocessing on mount
    chrome.storage.local.remove(['pickedColor', 'pickedAt', 'createdColor'], () => {
      // Storage cleared
      // Note: Database saving is handled by background.js when COLOR_PICKED message is received
      // No need to save here to avoid duplicate saves
      // chrome.tabs.query({ active: true, currentWindow: true })
      //   .then((tabs) => {
      //     const currentUrl = tabs[0]?.url || "Picked Color"
      //     saveColorToDatabase(pickedColor, currentUrl)
      //   })
      //   .catch(() => {
      //     // If query fails (popup closed), still try to save with fallback URL
      //     saveColorToDatabase(pickedColor, "Picked Color")
      //   })
    })

    // Don't navigate - the on-page panel shows the results
  }, [saveColorToDatabase])

  // Listen for picked color from magnifier
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.pickedColor?.newValue) {
        // Use values from changes directly (avoids race with get) - they're set together by background
        const pickedColor = changes.pickedColor.newValue
        const pickedAt = changes.pickedAt?.newValue ?? Date.now()
        const createdColor = changes.createdColor?.newValue ?? null
        chrome.storage.local.get(['eyedropperPick', 'generatorPickingState', 'generatorPickingActive'], (storageResult) => {
          if (storageResult.generatorPickingState || storageResult.generatorPickingActive) return
          handlePickedColor(pickedColor, pickedAt, createdColor)
          if (storageResult.eyedropperPick) {
            setLastPickSource("eyedropper")
            chrome.storage.local.remove(['eyedropperPick'])
          }
        })
      }
      if (changes.pickerCancelled?.newValue) {
        setTab(null)
        chrome.storage.local.remove(['pickerCancelled', 'cancelledAt'])
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    // Check for pending color on mount (30 second window)
    chrome.storage.local.get(['pickedColor', 'pickedAt', 'createdColor', 'openTab', 'eyedropperPick'], (result) => {
      if (result.pickedColor && result.pickedAt && Date.now() - result.pickedAt < 30000) {
        // Background sets storage async after save - retry get if createdColor missing (handles mount-before-save race)
        const process = (r: typeof result) => {
          handlePickedColor(r.pickedColor!, r.pickedAt!, r.createdColor)
          if (r.eyedropperPick) {
            setLastPickSource("eyedropper")
            chrome.storage.local.remove(['eyedropperPick'])
          }
          chrome.storage.local.remove(['pickedColor', 'pickedAt', 'createdColor'])
        }
        if (result.createdColor) {
          process(result)
        } else {
          // Background sets storage async after save - retry up to 3x (popup may open before save completes)
          const retry = (attempt: number) => {
            const delay = [800, 1600, 2400][attempt] ?? 2400
            setTimeout(() => {
              chrome.storage.local.get(['pickedColor', 'pickedAt', 'createdColor', 'eyedropperPick'], (retryResult) => {
                if (retryResult.pickedColor && retryResult.pickedAt && Date.now() - retryResult.pickedAt < 30000) {
                  if (retryResult.createdColor) {
                    process({ ...result, ...retryResult })
                  } else if (attempt < 2) {
                    retry(attempt + 1)
                  } else {
                    process({ ...result, ...retryResult })
                  }
                } else {
                  chrome.storage.local.remove(['pickedColor', 'pickedAt', 'createdColor'])
                }
              })
            }, delay)
          }
          retry(0)
        }
      } else if (result.pickedColor && result.pickedAt) {
        chrome.storage.local.remove(['pickedColor', 'pickedAt', 'createdColor'])
      }
      if (result.openTab) {
        setTab(result.openTab)
        chrome.storage.local.remove(['openTab'])
      }
    })

    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [handlePickedColor])

  const syncColorPickerStateForBackground = () => {
    const { user, selectedFolders } = state
    const payload = {
      jwtToken: user?.jwtToken || null,
      selectedFileData: null,
      selectedFolders: selectedFolders && selectedFolders.length > 0 ? selectedFolders : [],
      apiUrl: config.api.baseURL,
    }
    chrome.storage.local.set({ colorPickerState: payload })
    chrome.runtime.sendMessage({ type: "COLOR_PICKER_STATE_SYNCED", payload }).catch(() => {})
  }

  const handlePickColor = () => {
    syncColorPickerStateForBackground()
    chrome.runtime.sendMessage({ type: "START_COLOR_PICKER" }, (response) => {
      if (response?.error) {
        console.error("Picker error:", response.error)
        setTab(null)
      } else {
        window.close()
      }
    })
  }

  const handlePickColorFromBrowser = async () => {
    syncColorPickerStateForBackground()
    const hex = await openEyeDropper()
    if (!hex) return
    setLastPickSource("eyedropper")
    dispatch({ type: "SET_COLOR", payload: hex })
    dispatch({ type: "ADD_COLOR_HISTORY", payload: hex })
    chrome.storage.local.set({ eyedropperPick: true }, () => {
      chrome.runtime.sendMessage({ type: "COLOR_PICKED", color: hex })
    })
  }

  const handlePickAgainEyedropper = async () => {
    syncColorPickerStateForBackground()
    const hex = await openEyeDropper()
    if (!hex) return
    dispatch({ type: "SET_COLOR", payload: hex })
    chrome.storage.local.set({ eyedropperPick: true }, () => {
      chrome.runtime.sendMessage({ type: "COLOR_PICKED", color: hex })
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

  // Sync state to chrome.storage.local for background script access (picked colors saved to selected folders)
  useEffect(() => {
    const { user, selectedFile, files, selectedFolders } = state
    const selectedFileData = files.find(file => file.spreadsheetId === selectedFile)

    const colorPickerState = {
      jwtToken: user?.jwtToken || null,
      selectedFile: selectedFile || null,
      selectedFileData: selectedFileData ? {
        spreadsheetId: selectedFileData.spreadsheetId,
        sheetName: selectedFileData.sheets?.[0]?.name || '',
        sheetId: selectedFileData.sheets?.[0]?.id ?? 0,
      } : null,
      selectedFolders: selectedFolders && selectedFolders.length > 0 ? selectedFolders : [],
      apiUrl: config.api.baseURL,
    }

    chrome.storage.local.set({ colorPickerState })
  }, [state.user, state.selectedFile, state.files, state.selectedFolders])

  return (
    <QueryClientProvider client={queryClient}>
      <GlobalStateContext.Provider value={{ state, dispatch }}>
        <ToastContext.Provider
          value={{ state: toastState, dispatch: toastDispatch }}
        >
        <ExtensionContainer>
          <Show if={tab === null}>
            <MainMenu
              setTab={setTab}
              onPickColor={handlePickColor}
              onPickColorFromBrowser={handlePickColorFromBrowser}
            />
          </Show>
          <Show if={tab === "PICK_PANEL"}>
            <PickPanel
              setTab={setTab}
              selected={selected}
              copyToClipboard={copyToClipboard}
              onPickAgain={lastPickSource === "eyedropper" ? handlePickAgainEyedropper : undefined}
              onPickColor={handlePickColor}
              onPickColorFromBrowser={handlePickColorFromBrowser}
            />
          </Show>
          <Show if={tab === "AI_GENERATOR"}>
            <AiGenerator
              setTab={setTab}
              selected={selected}
              copyToClipboard={copyToClipboard}
              onPickColor={handlePickColor}
              onPickColorFromBrowser={handlePickColorFromBrowser}
            />
          </Show>
          <Show if={tab === "COPY"}>
            <Copy
              setTab={setTab}
              selected={selected}
              copyToClipboard={copyToClipboard}
              onPickColor={handlePickColor}
              onPickColorFromBrowser={handlePickColorFromBrowser}
            />
          </Show>
          <Show if={tab === "COMMENT"}>
            <Comment
              setTab={setTab}
              selected={selected}
              copyToClipboard={copyToClipboard}
              onPickColor={handlePickColor}
              onPickColorFromBrowser={handlePickColorFromBrowser}
            />
          </Show>
          <Show if={tab === "FIGMA_MANAGER"}>
            <FigmaManager
              setTab={setTab}
              onPickColor={handlePickColor}
              onPickColorFromBrowser={handlePickColorFromBrowser}
            />
          </Show>
          <Show if={tab === "COLOR_EXTRACTION"}>
            <PageColorExtraction
              setTab={setTab}
              onPickColor={handlePickColor}
              onPickColorFromBrowser={handlePickColorFromBrowser}
            />
          </Show>
          <Show if={tab === "GENERATOR"}>
            <Generator
              setTab={setTab}
              onPickColor={handlePickColor}
              onPickColorFromBrowser={handlePickColorFromBrowser}
            />
          </Show>
          <Show if={tab === "BULK_EDITOR"}>
            <BulkEditor
              setTab={setTab}
              onPickColor={handlePickColor}
              onPickColorFromBrowser={handlePickColorFromBrowser}
            />
          </Show>
          <Show if={tab === "EXPORT_TO_SHEET"}>
            <ExportToSheet
              setTab={setTab}
              onPickColor={handlePickColor}
              onPickColorFromBrowser={handlePickColorFromBrowser}
            />
          </Show>
        </ExtensionContainer>
        </ToastContext.Provider>
      </GlobalStateContext.Provider>
    </QueryClientProvider>
  )
}

export default App
