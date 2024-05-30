import { createContext } from "react"
import { ToastState, Action, initToastState } from "@/reducers/toastReducer"

type ToastContextData = {
  state: ToastState
  dispatch: (action: Action) => void
}

export const ToastContext = createContext<ToastContextData>({
  state: initToastState,
  dispatch: () => {},
})