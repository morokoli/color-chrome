export type GlobalState = {
  files: File[]
  color: string | null
  user: AuthUser | null
  parsedData: RowData[]
  colorHistory: string[]
  newColumns: NewColumn[]
  selectedFile: string | null
}

export type File = {
  fileName: string
  sheets: Sheet[]
  spreadsheetId: string
}

export type AuthUser = {
  accessToken: string
  refreshToken: string | undefined
  name: string | undefined
  email: string | undefined
  expiry: number
}

export type Column = {
  id: string
  name: string
  value: string
}

export type NewColumn = {
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
