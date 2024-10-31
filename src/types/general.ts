export type AuthUser = {
  accessToken: string
  refreshToken: string | undefined
  name: string | undefined
  email: string | undefined
  expiry: number
}

export type GlobalState = {
  user: AuthUser | null
  color: string
  selectedTab: ModeTab
  files: DriveFile[]
  selectedFile: DriveFile | null
  submitMode: "add" | "update"
  updateRowIndex: number
  parsedData: RowData[]
  colorHistory: {
    max: number
    recent: string[]
  }
}

export type Column = {
  id: string
  name: string
  value: string
}

export type Sheet = {
  id: number
  name: string
}

export type DriveFile = {
  id: string
  fileName: string
  sheet: Sheet
  comment: string
  ranking: string | number
  additionalColumns: Column[]
}

export type DriveFileCreateFormFields = {
  fileName: string
  sheetName: string
}

export type DriveFileCreateFormFieldsWithId = DriveFileCreateFormFields & {
  spreadsheetId: string
  sheetId: number
  additionalColumns: string[]
}

export type ModeTab = "SELECT" | "ADD" | "ACCOUNT"

export type AddColumnFormFields = {
  columnName: string
}

export type RowData = {
  year: number | string
  month: number | string
  day: number | string
  hours: number | string
  minutes: number | string
  url: string
  hex: string
  hsl: string
  rgb: string
  addedBy: string
  ranking?: string | number
  comments?: string
  additionalColumns: Omit<Column, "id">[]
}
