import { GlobalState, File, RowData, NewColumn} from '@/v2/types/general'
import { Storage } from '@/v2/helpers/storage'
import { produce } from 'immer'

const storedState = Storage.fetchState()
const initState: GlobalState = {
  files: [],
  user: null,
  color: null,
  newColumns: [],
  parsedData: [],
  colorHistory: [],
  selectedFile: null,
} as const

export const initGlobalState: GlobalState = storedState ?? initState

export type Action =
| { type: "RESET_STATE" }
| { type: "CLEAR_NEW_COLUMNS" }
| { type: "CLEAR_COLOR_HISTORY" }
| { type: "ADD_FILES"; payload: File }
| { type: "REMOVE_FILES"; payload: string }
  | { type: "SET_COLOR"; payload: string }
  | { type: "ADD_COLOR_HISTORY"; payload: string }
  | { type: "ADD_NEW_COLUMN"; payload: NewColumn }
  | { type: "SET_SELECTED_FILE"; payload: string }
  | { type: "SET_PARSED_DATA"; payload: RowData[] }
  | { type: "SET_USER"; payload: GlobalState["user"] }
  | { type: "UPDATE_ACCESS_TOKEN"; payload: { accessToken: string; expiry: number } }

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
    case "SET_COLOR":
      return produce(state, (draft) => {
        draft.color = action.payload
      })
    case "ADD_COLOR_HISTORY":
      return produce(state, (draft) => {
        draft.colorHistory.push(action.payload);
      })
    case "ADD_NEW_COLUMN":
      return produce(state, (draft) => {
        draft.newColumns.push(action.payload);
      })
    case "ADD_FILES":
      return produce(state, (draft) => {
        draft.files.push(action.payload);
      })
    case "REMOVE_FILES":
      return produce(state, (draft) => {
        draft.files = draft.files.filter(file => file.spreadsheetId !== action.payload);
      })
    case "SET_SELECTED_FILE":
      return produce(state, (draft) => {
        draft.selectedFile = action.payload;
      })
    case "SET_PARSED_DATA":
      return produce(state, (draft) => {
        draft.parsedData = action.payload
      })
    case "CLEAR_COLOR_HISTORY":
      return produce(state, (draft) => {
        draft.colorHistory = []
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
        };

        Object.assign(draft, notSignInUserState)
      })
  }
}
