import { produce } from 'immer'

export type ToastState = {
  type: "error" | "success" | "info" | null
  message: string | null
}

export const initToastState: ToastState = {
  type: null,
  message: null,
}

export type Action =
  | {
      type: "DISPLAY"
      payload: { type: "error" | "success" | "info"; message: string }
    }
  | { type: "HIDE" }

export function toastReducer(state: ToastState, action: Action): ToastState {
  switch (action.type) {
    case "DISPLAY":
      return produce(state, (draft) => {
        draft.type = action.payload.type
        draft.message = action.payload.message
      })

    case "HIDE":
      return produce(state, (draft) => {
        draft.type = initToastState.type
        draft.message = initToastState.message
      })
  }
}
