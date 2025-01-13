import { Sheet, Column, RowData } from '@/types/general'

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
    slashNaming: string,
    projectName: string,
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
    slashNaming: string,
    projectName: string,
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

export type DeleteRowRequest = {
  spreadsheetId: string
  deleteRows: number[]
  sheetId?: number
}

export type DeleteRowResponse = {
  done: boolean
}