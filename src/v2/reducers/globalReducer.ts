import { GlobalState, File, RowData, NewColumn } from "@/v2/types/general"
import { Storage } from "@/v2/helpers/storage"
import { produce } from "immer"

const storedState = Storage.fetchState()
const initState: GlobalState = {
  files: [],
  user: null,
  color: null,
  newColumns: [],
  parsedData: [],
  colorHistory: [],
  selectedFile: null,
  selectedColorsFromFile: [],
} as const

export const initGlobalState: GlobalState = storedState ?? initState

export type Action =
  | { type: "RESET_STATE" }
  | { type: "CLEAR_NEW_COLUMNS" }
  | { type: "ADD_FILES"; payload: File }
  | { type: "REMOVE_FILES"; payload: string }
  | { type: "SET_COLOR"; payload: string }
  | { type: "ADD_COLOR_HISTORY"; payload: string }
  | { type: "CLEAR_COLOR_HISTORY" }
  | { type: "ADD_NEW_COLUMN"; payload: NewColumn }
  | { type: "SET_SELECTED_FILE"; payload: string }
  | { type: "SET_PARSED_DATA"; payload: RowData[] }
  | { type: "SET_USER"; payload: GlobalState["user"] }
  | {
      type: "UPDATE_ACCESS_TOKEN"
      payload: { accessToken: string; expiry: number }
    }
  | {
      type: "UPDATE_JWT_TOKEN"
      payload: { jwtToken: string; jwtExpiry: number }
    }
  | {
      type: "UPDATE_FILE_COLOR_HISTORY"
      payload: { fileName: string; colorHistory: string[] }
    }
  | {
      type: "ADD_FILE_COLOR_HISTORY"
      payload: { spreadsheetId: string; color: string }
    }
  // | { type: "ADD_SELECTED_COLOR_FROM_FILE"; payload: string }
  // | { type: "CLEAR_SELECTED_COLORS_FROM_FILE" }
  // | { type: "REMOVE_SELECTED_COLOR_FROM_FILE"; payload: string }
  | {
      type: "ADD_SELECTED_COLOR_FROM_FILE"
      payload: { color: string; slashNaming: string }
    }
  | { type: "REMOVE_SELECTED_COLOR_FROM_FILE"; payload: string }
  | { type: "CLEAR_SELECTED_COLORS_FROM_FILE" }

export function globalReducer(state: GlobalState, action: Action): GlobalState {
  switch (action.type) {
    case "SET_USER":
      return produce(state, (draft) => {
        draft.user = action.payload
      })

    case "UPDATE_ACCESS_TOKEN":
      return produce(state, (draft) => {
        if (!draft.user) return
        draft.user.accessToken = action.payload.accessToken
        draft.user.expiry = action.payload.expiry
      })

    case "UPDATE_JWT_TOKEN":
      return produce(state, (draft) => {
        if (!draft.user) return
        draft.user.jwtToken = action.payload.jwtToken
        draft.user.jwtExpiry = action.payload.jwtExpiry
      })

    case "SET_COLOR":
      return produce(state, (draft) => {
        draft.color = action.payload
      })

    case "ADD_NEW_COLUMN":
      return produce(state, (draft) => {
        draft.newColumns.push(action.payload)
      })

    case "ADD_FILES":
      return produce(state, (draft) => {
        draft.files.push({
          ...action.payload,
          colorHistory: action.payload.colorHistory ?? [],
        })
      })

    case "REMOVE_FILES":
      return produce(state, (draft) => {
        draft.files = draft.files.filter(
          (file) => file.spreadsheetId !== action.payload,
        )
      })

    case "SET_SELECTED_FILE":
      return produce(state, (draft) => {
        draft.selectedFile = action.payload
      })

    case "SET_PARSED_DATA":
      return produce(state, (draft) => {
        draft.parsedData = action.payload
      })

    case "ADD_COLOR_HISTORY":
      return produce(state, (draft) => {
        draft.colorHistory.push(action.payload)
      })

    case "CLEAR_COLOR_HISTORY":
      return produce(state, (draft) => {
        draft.colorHistory = []
      })

    case "UPDATE_FILE_COLOR_HISTORY":
      return produce(state, (draft) => {
        const file = draft.files.find(
          (f) => f.fileName === action.payload.fileName,
        )
        if (file) {
          file.colorHistory = action.payload.colorHistory
        }
      })

    case "CLEAR_NEW_COLUMNS":
      return produce(state, (draft) => {
        draft.newColumns = []
      })

    case "RESET_STATE":
      return produce(state, (draft) => {
        const notSignInUserState = {
          files: [],
          user: null,
          newColumns: [],
          parsedData: [],
          selectedFile: null,
          color: null,
          colorHistory: [],
          selectedColorsFromFile: [],
        }
        Object.assign(draft, notSignInUserState)
      })

    case "ADD_FILE_COLOR_HISTORY": {
      const { spreadsheetId, color } = action.payload

      return {
        ...state,
        files: state.files.map((file) => {
          if (file.spreadsheetId === spreadsheetId) {
            return {
              ...file,
              colorHistory: [...(file.colorHistory || []), color],
            }
          }
          return file
        }),
      }
    }
    // case "ADD_SELECTED_COLOR_FROM_FILE":
    //   return produce(state, (draft) => {
    //     if (!Array.isArray(draft.selectedColorsFromFile)) {
    //       draft.selectedColorsFromFile = []
    //     }
    //     draft.selectedColorsFromFile.unshift(action.payload)
    //   })
    case "ADD_SELECTED_COLOR_FROM_FILE":
      return produce(state, (draft) => {
        if (!Array.isArray(draft.selectedColorsFromFile)) {
          draft.selectedColorsFromFile = []
        }
        draft.selectedColorsFromFile.unshift(action.payload) // payload тепер обʼєкт
      })

    //     case "REMOVE_SELECTED_COLOR_FROM_FILE":
    // return produce(state, (draft) => {
    //   draft.selectedColorsFromFile = draft.selectedColorsFromFile.filter(
    //     (color) => color !== action.payload
    //   )
    // })

    case "REMOVE_SELECTED_COLOR_FROM_FILE":
      return produce(state, (draft) => {
        draft.selectedColorsFromFile = draft.selectedColorsFromFile.filter(
          (item) => item.color !== action.payload,
        )
      })

    case "CLEAR_SELECTED_COLORS_FROM_FILE":
      return produce(state, (draft) => {
        draft.selectedColorsFromFile = []
      })

    default:
      return state
  }
}
