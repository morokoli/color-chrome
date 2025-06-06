import { useReducer, useState, useEffect } from "react"
import { ExtensionContainer } from "@/v2/components/common/ExtensionContainer"
import { initGlobalState, globalReducer } from "@/v2/reducers/globalReducer"
import { initToastState, toastReducer } from "@/v2/reducers/toastReducer"
import { GlobalStateContext } from "@/v2/context/globalStateContext"
import { ToastContext } from "@/v2/context/toastContext"
import { getAuthCookie } from "@/v2/helpers/cookie"
import { Auth } from "@/v2/helpers/auth"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
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

  return (
    <QueryClientProvider client={queryClient}>
      <GlobalStateContext.Provider value={{ state, dispatch }}>
        <ToastContext.Provider
          value={{ state: toastState, dispatch: toastDispatch }}
        >
        <ExtensionContainer>
          <Show if={tab === null}>
            <MainMenu setTab={setTab} />
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
