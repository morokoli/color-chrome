import { createContext } from 'react'
import { initGlobalState, Action } from '@/v2/reducers/globalReducer'
import { GlobalState } from '@/v2/types/general'

export const GlobalStateContext = createContext<{
  state: GlobalState
  dispatch: (action: Action) => void
}>({ state: initGlobalState, dispatch: () => {} })
