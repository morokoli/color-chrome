import { createContext } from "react"
import { initGlobalState, Action } from "@/reducers/globalReducer"
import { GlobalState } from "@/types/general"

export const GlobalStateContext = createContext<{
  state: GlobalState
  dispatch: (action: Action) => void
}>({ state: initGlobalState, dispatch: () => {} })
