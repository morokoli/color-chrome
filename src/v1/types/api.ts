import { Sheet, Column, RowData } from "@/v1/types/general"

export type RefreshAccessTokenRequest = {
  refreshToken: string
}

export type RefreshAccessTokenResponse = {
  accessToken: string
  expiry: number
}

export type DriveFileCreateRequest = {
  fileName: string
  sheetName: string
}

export type DriveFileCreateResponse = {
  spreadsheetId: string
  sheetId: number
}

export type DriveFileGetByURLRequest = {
  url: string
}

export type DriveFileGetByURLResponse = {
  spreadsheet: {
    spreadsheetId: string
    fileName: string
    sheets: Sheet[]
  }
}

export type CheckSheetValidRequest = {
  spreadsheetId: string
  sheetName: string
  sheetId?: number
}

export type CheckSheetValidResponse = {
  valid: boolean
  additionalColumns: string[]
  sheetData: {
    parsed: RowData[]
  }
}

export type AddNewAdditionalColumnRequest = {
  spreadsheetId: string
  sheetName: string
  sheetId: number
  columnName: string
}

export type AddNewAdditionalColumnResponse = {
  created: boolean
}

export type RemoveAdditionalColumnRequest = {
  spreadsheetId: string
  sheetName: string
  sheetId: number
  columnName: string
}

export type RemoveAdditionalColumnResponse = {
  removed: boolean
}

export type CheckColorAddOrUpdateRequest = {
  spreadsheetId: string
  sheetName: string
  url: string
  colorHex: string
}

export type CheckColorAddOrUpdateResponse =
  | { add: true }
  | { add: false; rowIndex: number; row: RowData }

export type AddColorRequest = {
  spreadsheetId: string
  sheetName: string
  sheetId: number
  row: {
    timestamp: number
    url: string
    hex: string
    hsl: string
    rgb: string
    ranking?: string | number
    comments?: string | undefined
    additionalColumns: Omit<Column, "id">[]
  }
}

export type AddColorResponse = {
  done: boolean
  updatedRange: string
}

export type UpdateRowRequest = {
  spreadsheetId: string
  sheetName: string
  sheetId: number
  rowIndex: number
  row: {
    timestamp: number
    url: string
    hex: string
    hsl: string
    rgb: string
    ranking?: string | number
    comments?: string | undefined
    additionalColumns: Omit<Column, "id">[]
  }
}

export type UpdateRowResponse = {
  done: boolean
}

export type GetAdditionalColumnsRequest = {
  spreadsheetId: string
  sheetName: string
}

export type GetAdditionalColumnsResponse = {
  additionalColumns: string[]
}
