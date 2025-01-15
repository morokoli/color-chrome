import { produce } from "immer"
import { GlobalState, RowData, Column, DriveFile, ModeTab, Sheet } from "@/v1/types/general"
import { Storage } from "@/v1/helpers/storage"

const storedState = Storage.fetchState()
const initState: GlobalState = {
  user: null,
  color: "#000000",
  selectedTab: "ADD",
  files: [],
  selectedFile: null,
  submitMode: "add",
  updateRowIndex: -1,
  parsedData: [],
  colorHistory: {
    max: 16,
    recent: [],
  },
} as const

export const initGlobalState: GlobalState = storedState ?? initState

export type Action =
  | { type: "SET_USER"; payload: GlobalState["user"] }
  | {
      type: "UPDATE_ACCESS_TOKEN"
      payload: { accessToken: string; expiry: number }
    }
  | { type: "SET_COLOR"; payload: string }
  | { type: "SET_PARSED_DATA"; payload: RowData[] }
  | { type: "SET_COMMENT_PARSED_DATA"; payload: {value: string, currentColorId: number} }
  | { type: "SET_RANKING_RANGE_PARSED_DATA"; payload: {value: number, currentColorId: number} }
  | { type: "SWITCH_TAB"; payload: ModeTab }
  | {
      type: "ADD_DRIVE_FILE"
      payload: {
        spreadsheetId: string
        fileName: string
        sheet: Sheet
        additionalColumns: string[]
      }
    }
  | { type: "REMOVE_SELECTED_FILE" }
  | { type: "CHANGE_SELECTED_FILE"; payload: number }
  | { type: "SET_COMMENT"; payload: string }
  | { type: "SET_RANKING_RANGE"; payload: string}
  | { type: "ADD_COLUMN"; payload: { columnName: string } }
  | { type: "REMOVE_COLUMN"; payload: { columnId: string } }
  | { type: "SET_COLUMN_VALUE"; payload: { columnId: string; value: string } }
  // | { type: "ADD_COLOR_HISTORY"; payload: any[] }
  | { type: "CLEAR_COLOR_HISTORY" }
  | {
      type: "SET_SUBMIT_MODE"
      payload:
        | { add: true }
        | {
            add: false
            rowIndex: number
            row: {ranking: string | number,  comment: string; additionalColumns: Omit<Column, "id">[] }
          }
    }
  | { type: "RESET_ADDITIONAL_FIELDS" }
  | { type: "SYNC_ADDITIONAL_COLUMNS"; payload: string[] }
  | { type: "RESET_STATE" }

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

    case "SET_PARSED_DATA":
      return produce(state, (draft) => {
        const colorsArr = action.payload?.map((color: RowData) => color.hex!);
        const colorArrMax = colorsArr.slice(0, state.colorHistory.max);

        draft.parsedData = action.payload
        draft.colorHistory.recent = colorArrMax;
      })

    case "SET_COMMENT_PARSED_DATA":
      return produce(state, (draft) => {
        const { value, currentColorId } = action.payload;
        if (!(typeof currentColorId === 'number' && currentColorId >= 0)) {
          draft.selectedFile!.comment = value
        } else {
          draft.parsedData[currentColorId].comments = value;
        }
      })

    case "SET_RANKING_RANGE_PARSED_DATA":
      return produce(state, (draft) => {
      const { value, currentColorId } = action.payload;
      if (!(typeof currentColorId === 'number' && currentColorId >= 0)) {
        draft.selectedFile!.ranking = value
      } else {
        draft.parsedData[currentColorId].ranking = value;
      }
      })

    case "SWITCH_TAB":
      return produce(state, (draft) => {
        draft.selectedTab = action.payload
      })

    case "ADD_DRIVE_FILE":
      return produce(state, (draft) => {
        const file: DriveFile = {
          id: action.payload.spreadsheetId,
          fileName: action.payload.fileName,
          sheet: {
            id: action.payload.sheet.id,
            name: action.payload.sheet.name,
          },
          comment: "",
          ranking: "",
          additionalColumns: action.payload.additionalColumns.map((col) => ({
            id: crypto.randomUUID(),
            name: col,
            value: "",
          })),
        }

        /** dont add duplicate files */
        const found = draft.files.findIndex(
          (f) => f.id === file.id && f.sheet.id === file.sheet.id,
        )
        if (found !== -1) {
          return
        }

        /**
         * automatically select the new file if it is the only file in the
         * extension's state
         */
        if (draft.files.length === 0) {
          draft.selectedFile = file
        }
        draft.files = [...draft.files, file]
      })

    case "REMOVE_SELECTED_FILE":
      return produce(state, (draft) => {
        if (draft.selectedFile == null) return
        draft.files = draft.files.filter((f) => f.id !== draft.selectedFile?.id)
        draft.selectedFile = null
      })

    case "CHANGE_SELECTED_FILE":
      return produce(state, (draft) => {
        const [foundFile] = draft.files.filter((f) => f.sheet.id === action.payload)
        if (!foundFile) {
          draft.selectedFile = null
          return
        }
        draft.selectedFile = foundFile
      })

    case "SET_COMMENT":
      return produce(state, (draft) => {
        if (!draft.selectedFile) return
        draft.selectedFile.comment = action.payload
      })
    case "SET_RANKING_RANGE":
        return produce(state, (draft) => {
          if (!draft.selectedFile) return
          draft.selectedFile.ranking = action.payload
        })

    case "ADD_COLUMN":
      return produce(state, (draft) => {
        if (!draft.selectedFile) return
        const isNotUnique = draft.selectedFile.additionalColumns.find(
          (col) => col.name === action.payload.columnName,
        )
        if (isNotUnique) return

        const column: Column = {
          id: crypto.randomUUID(),
          name: action.payload.columnName,
          value: "",
        }

        draft.selectedFile.additionalColumns = [
          ...draft.selectedFile.additionalColumns,
          column,
        ]
        draft.files = draft.files.map((file) => {
          if (file.id === draft.selectedFile?.id) {
            file.additionalColumns = [...file.additionalColumns, column]
          }
          return file
        })
      })

    case "REMOVE_COLUMN":
      return produce(state, (draft) => {
        if (!draft.selectedFile) return

        draft.selectedFile.additionalColumns =
          draft.selectedFile.additionalColumns.filter(
            (column) => column.id !== action.payload.columnId,
          )
        draft.files = draft.files.map((file) => {
          if (file.id === draft.selectedFile?.id) {
            file.additionalColumns = file.additionalColumns.filter(
              (column) => column.id !== action.payload.columnId,
            )
          }
          return file
        })
      })

    case "SET_COLUMN_VALUE":
      return produce(state, (draft) => {
        if (!draft.selectedFile?.additionalColumns) return

        draft.selectedFile.additionalColumns =
          draft.selectedFile.additionalColumns.map((column) => {
            if (column.id === action.payload.columnId) {
              column.value = action.payload.value
            }
            return column
          })
      })

    case "CLEAR_COLOR_HISTORY":
      return produce(state, (draft) => {
        draft.colorHistory.recent = []
      })

    case "SET_SUBMIT_MODE":
      return produce(state, (draft) => {
        if (action.payload.add) {
          draft.submitMode = "add"
          draft.updateRowIndex = -1
        } else {
          draft.submitMode = "update"
          draft.updateRowIndex = action.payload.rowIndex

          if (draft.selectedFile) {
            draft.selectedFile.comment = action.payload.row.comment
            draft.selectedFile.ranking = action.payload.row.ranking
            draft.selectedFile.additionalColumns =
              action.payload.row.additionalColumns.map((col) => ({
                ...col,
                id: crypto.randomUUID(),
              }))

            draft.files = draft.files.map((file) => {
              if (file.id === draft.selectedFile!.id) {
                file.additionalColumns = [
                  ...draft.selectedFile!.additionalColumns,
                ]
              }
              return file
            })
          }
        }
      })

    case "RESET_ADDITIONAL_FIELDS":
      return produce(state, (draft) => {
        if (draft.selectedFile) {
          draft.selectedFile.ranking = ""
          draft.selectedFile.comment = ""
          draft.selectedFile.additionalColumns =
            draft.selectedFile.additionalColumns.map((col) => ({
              ...col,
              value: "",
            }))

          draft.files = draft.files.map((file) => {
            if (file.id === draft.selectedFile!.id) {
              file.additionalColumns = [
                ...draft.selectedFile!.additionalColumns,
              ]
            }
            return file
          })
        }
      })

    case "SYNC_ADDITIONAL_COLUMNS":
      return produce(state, (draft) => {
        if (!draft.selectedFile) return
        draft.selectedFile.additionalColumns = action.payload.map((col) => ({
          id: crypto.randomUUID(),
          name: col,
          value: "",
        }))

        draft.files = draft.files.map((file) => {
          if (file.id === draft.selectedFile!.id) {
            file.additionalColumns = [...draft.selectedFile!.additionalColumns]
          }
          return file
        })
      })

    case "RESET_STATE":
      return produce(state, (draft) => {
        Object.assign(draft, initState)
      })
  }
}
