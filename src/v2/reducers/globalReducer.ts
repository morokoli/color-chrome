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
  | { type: "MERGE_FILES"; payload: File[] }
  | { type: "REMOVE_FILES"; payload: string }
  | { type: "SET_COLOR"; payload: string }
  | { type: "ADD_COLOR_HISTORY"; payload: string | { hex: string; parsed?: any } }
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
  | { type: "UPDATE_PARSED_AT"; payload: { index: number; parsed: any } }
  | { type: "UPDATE_PARSED_BY_COLOR_ID"; payload: { colorId: string; parsed: any } }
  | { type: "UPDATE_COLOR_AT"; payload: { index: number; hex?: string; parsed?: any } }
  | { type: "SYNC_PARSED_DATA_TO_HISTORY" }

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

    case "MERGE_FILES":
      return produce(state, (draft) => {
        const existingIds = new Set(draft.files.map((f) => f.spreadsheetId))
        for (const file of action.payload) {
          if (!existingIds.has(file.spreadsheetId)) {
            draft.files.push({
              ...file,
              colorHistory: file.colorHistory ?? [],
            })
          }
        }
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
        const payload = action.payload as any[]
        // Don't replace pick history with sheet data - preserves createdColor in parsedData for folder lookup
        if (payload.length === 0 || draft.colorHistory.length === 0) {
          draft.parsedData = payload
          draft.colorHistory = payload.map((row) => row?.hex ?? "#000000")
        } else if (payload.length >= draft.colorHistory.length) {
          draft.parsedData = payload
          draft.colorHistory = payload.map((row) => row?.hex ?? "#000000")
        }
        // else: keep existing - more picks than sheet rows
      })

    case "ADD_COLOR_HISTORY": {
      const payload = action.payload
      const hex = typeof payload === "string" ? payload : payload.hex
      const parsed = typeof payload === "object" && payload.parsed != null ? payload.parsed : undefined
      return produce(state, (draft) => {
        draft.colorHistory.push(hex)
        draft.parsedData.push(parsed ?? ({} as any))
      })
    }

    case "CLEAR_COLOR_HISTORY":
      return produce(state, (draft) => {
        draft.colorHistory = []
        draft.parsedData = []
      })

    case "REMOVE_OLDEST_COLOR_HISTORY":
      return produce(state, (draft) => {
        if (draft.colorHistory.length > 0) {
          draft.colorHistory.shift()
          draft.parsedData.shift()
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
        draft.user = null
        draft.files = []
        draft.selectedFile = null
        draft.selectedSheets = []
        draft.parsedData = []
        draft.color = null
        draft.colorHistory = []
        draft.newColumns = {}
        draft.selectedColorsFromFile = []
        draft.selectedFolders = []
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

    case "UPDATE_PARSED_AT": {
      const { index, parsed } = action.payload
      return produce(state, (draft) => {
        if (index >= 0 && index < draft.parsedData.length && parsed) {
          draft.parsedData[index] = { ...(draft.parsedData[index] as any), ...parsed }
        }
      })
    }

    case "UPDATE_PARSED_BY_COLOR_ID": {
      const { colorId, parsed } = action.payload
      return produce(state, (draft) => {
        if (!colorId || !parsed) return
        const idx = draft.parsedData.findIndex(
          (p: any) => (p?._id ?? p?.id) === colorId
        )
        if (idx >= 0 && idx < draft.parsedData.length) {
          draft.parsedData[idx] = { ...(draft.parsedData[idx] as any), ...parsed }
          if (parsed.hex) draft.colorHistory[idx] = parsed.hex
        }
      })
    }

    case "UPDATE_COLOR_AT": {
      const { index, hex, parsed } = action.payload
      return produce(state, (draft) => {
        if (index >= 0 && index < draft.colorHistory.length) {
          if (hex !== undefined) draft.colorHistory[index] = hex
          if (parsed && index < draft.parsedData.length) {
            draft.parsedData[index] = { ...(draft.parsedData[index] as any), ...parsed }
          }
        }
      })
    }

    case "SYNC_PARSED_DATA_TO_HISTORY":
      return produce(state, (draft) => {
        const chLen = draft.colorHistory.length
        const pdLen = draft.parsedData.length
        if (pdLen < chLen) {
          for (let i = 0; i < chLen - pdLen; i++) draft.parsedData.push({} as any)
        } else if (pdLen > chLen) {
          draft.parsedData = draft.parsedData.slice(0, chLen)
        }
      })

    default:
      return state
  }
}
