import { GlobalState, File, RowData, NewColumn } from "@/v2/types/general"
import { Storage } from "@/v2/helpers/storage"
import { produce } from "immer"

const storedState = Storage.fetchState()
const initState: GlobalState = {
  files: [],
  user: null,
  color: null,
  newColumns: {},
  parsedData: [],
  colorHistory: [],
  selectedFile: null,
  selectedFolders: [],
  selectedSheets: [],
  selectedColorsFromFile: [],
} as const

// Migrate old state format (newColumns was array, now it's object)
const migrateState = (state: GlobalState | null | undefined): GlobalState | null => {
  if (!state) return null

  // If newColumns is an array (old format), convert to empty object
  if (Array.isArray(state.newColumns)) {
    return {
      ...state,
      newColumns: {}
    }
  }

  // Ensure newColumns is an object
  if (typeof state.newColumns !== 'object' || state.newColumns === null) {
    return {
      ...state,
      newColumns: {}
    }
  }

  return state
}

export const initGlobalState: GlobalState = migrateState(storedState) ?? initState

export type Action =
  | { type: "RESET_STATE" }
  | { type: "CLEAR_NEW_COLUMNS"; payload: string }  // payload is spreadsheetId
  | { type: "ADD_FILES"; payload: File }
  | { type: "REMOVE_FILES"; payload: string }
  | { type: "SET_COLOR"; payload: string }
  | { type: "ADD_COLOR_HISTORY"; payload: string }
  | { type: "CLEAR_COLOR_HISTORY" }
  | { type: "REMOVE_OLDEST_COLOR_HISTORY" }
  | { type: "ADD_NEW_COLUMN"; payload: { spreadsheetId: string; column: NewColumn } }
  | { type: "REMOVE_NEW_COLUMN"; payload: { spreadsheetId: string; columnName: string } }
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
  | {
      type: "ADD_SELECTED_COLOR_FROM_FILE"
      payload: { color: { hex: string; hsl: string; rgb: string, additionalColumns: { name: string, value: string }[] }; slash_naming: string }
    }
  | { type: "REMOVE_SELECTED_COLOR_FROM_FILE"; payload: string }
  | { type: "CLEAR_SELECTED_COLORS_FROM_FILE" }
  | {
      type: "UPDATE_SELECTED_COLOR_slash_naming"
      payload: { colors: number[]; slash_naming: string }
    }
  | { type: "SET_SELECTED_FOLDERS"; payload: string[] }
  | { type: "SET_SELECTED_SHEETS"; payload: string[] }

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
        const { spreadsheetId, column } = action.payload
        if (!draft.newColumns[spreadsheetId]) {
          draft.newColumns[spreadsheetId] = []
        }
        // Only add if not already exists
        if (!draft.newColumns[spreadsheetId].some(c => c.name === column.name)) {
          draft.newColumns[spreadsheetId].push(column)
        }
      })

    case "REMOVE_NEW_COLUMN":
      return produce(state, (draft) => {
        const { spreadsheetId, columnName } = action.payload
        if (draft.newColumns[spreadsheetId]) {
          draft.newColumns[spreadsheetId] = draft.newColumns[spreadsheetId].filter(
            (col) => col.name !== columnName
          )
        }
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

    case "REMOVE_OLDEST_COLOR_HISTORY":
      return produce(state, (draft) => {
        if (draft.colorHistory.length > 0) {
          draft.colorHistory.shift() // Remove the oldest (first) color
        }
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
        draft.newColumns[action.payload] = []
      })

    case "RESET_STATE":
      return produce(state, (draft) => {
        // Preserve files, selectedFile, and colorHistory on logout
        // Only clear user auth and temporary data
        draft.user = null
        draft.parsedData = []
        draft.color = null
        draft.selectedColorsFromFile = []
        // Keep: files, selectedFile, newColumns, colorHistory
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
        const colorIndex = draft.selectedColorsFromFile.findIndex(item => item.color.hex === action.payload.color.hex)
        draft.selectedColorsFromFile.forEach((item, index) => {
          if(index !== colorIndex) {
            item.animated = 0
          }
        })

        if(colorIndex === -1) {
          draft.selectedColorsFromFile.unshift(action.payload)
        } else {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          draft.selectedColorsFromFile[colorIndex].animated = draft.selectedColorsFromFile[colorIndex].animated ? draft?.selectedColorsFromFile[colorIndex]?.animated + 1 : 1
        }
         // payload тепер обʼєкт
      })

    //     case "REMOVE_SELECTED_COLOR_FROM_FILE":
    // return produce(state, (draft) => {
    //   draft.selectedColorsFromFile = draft.selectedColorsFromFile.filter(
    //     (color) => color !== action.payload
    //   )
    // })

    case "REMOVE_SELECTED_COLOR_FROM_FILE":
      return produce(state, (draft) => {
        const colorIndex = draft.selectedColorsFromFile.findIndex(
          (item) => item.color.hex === action.payload,
        )
        if (colorIndex !== -1) {
          draft.selectedColorsFromFile.splice(colorIndex, 1)
        }
      })

    case "CLEAR_SELECTED_COLORS_FROM_FILE":
      return produce(state, (draft) => {
        draft.selectedColorsFromFile = []
      })

    case "UPDATE_SELECTED_COLOR_slash_naming":
      return produce(state, (draft) => {
        // 🔁 Оновлюємо в selectedColorsFromFile
        for (const colorId of action.payload.colors) {
          draft.selectedColorsFromFile[colorId].slash_naming =
            action.payload.slash_naming
        }

        // 🔁 Оновлюємо напряму в parsedData
        for (const colorId of action.payload.colors) {
          const row = draft.parsedData.find(
            (row) => row.hex === draft.selectedColorsFromFile[colorId].color.hex,
          )
          if (row) {
            row.slash_naming = action.payload.slash_naming
          }
        }
      })

    case "SET_SELECTED_FOLDERS":
      return produce(state, (draft) => {
        draft.selectedFolders = action.payload
      })

    case "SET_SELECTED_SHEETS":
      return produce(state, (draft) => {
        draft.selectedSheets = action.payload
      })

    default:
      return state
  }
}
