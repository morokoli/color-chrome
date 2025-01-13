import { createContext } from "react"
import { initGlobalState, Action } from "@/v1/reducers/globalReducer"
import { GlobalState } from "@/v1/types/general"

export const GlobalStateContext = createContext<{
  state: GlobalState
  dispatch: (action: Action) => void
}>({ state: initGlobalState, dispatch: () => {} })
