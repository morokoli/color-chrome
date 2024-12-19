import { useReducer, useState, useEffect } from "react"

import Copy from "./Copy";
import { Show } from "./Show"
import Comment from "./Comment";
import MainMenu from "./MainMenu";
import PickPanel from "./PickPanel";
import { ToastContext } from "@/v2/context/toastContext"
import { GlobalStateContext } from "@/v2/context/globalStateContext"
import { initToastState, toastReducer } from "@/v2/reducers/toastReducer"
import { ExtensionContainer } from "@/v2/components/ExtensionContainer"
import { initGlobalState, globalReducer } from "@/v2/reducers/globalReducer"

const App = () => {
  const [state, dispatch] = useReducer(globalReducer, initGlobalState)
  const [toastState, toastDispatch] = useReducer(toastReducer, initToastState)
  const [tab, setTab] = useState<string | null>(null);
  const [selected, setSelected] = useState<null | string>(null)

  const copyToClipboard = (text: string, selection: null | string) => {
    if (document.hasFocus()) {
      navigator.clipboard.writeText(text).then(() => setSelected(selection)).catch(err => {
        console.error('Clipboard error: ', err);
      });
    }
  }

  /** auto-unselect after n-miliseconds */
  useEffect(() => {
    if (selected) {
      const handle = setTimeout(() => setSelected(null), 2000)
      return () => clearTimeout(handle)
    }
  }, [selected])

  return (
    <GlobalStateContext.Provider value={{ state, dispatch }}>
      <ToastContext.Provider
        value={{ state: toastState, dispatch: toastDispatch }}
      >
        <ExtensionContainer>
          <Show if={tab === null}>
            <MainMenu setTab={setTab} />
          </Show>
          <Show if={tab === 'PICK_PANEL'}>
            <PickPanel setTab={setTab} selected={selected} copyToClipboard={copyToClipboard} />
          </Show>
          <Show if={tab === 'COPY'}>
            <Copy selected={selected} copyToClipboard={copyToClipboard} />
          </Show>
          <Show if={tab === 'COMMENT'}>
            <Comment />
          </Show>
     
        </ExtensionContainer>
      </ToastContext.Provider>
    </GlobalStateContext.Provider>
  )
}

export default App;