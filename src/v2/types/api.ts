import { Sheet, Column, RowData } from "@/v1/types/general"

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
    slash_naming: string
    tags: string[]
    additionalColumns: Omit<Column, "id">[]
  }
}

export type AddMultipleColorsRequest = {
  spreadsheetId: string
  sheetName: string
  sheetId: number
  rows: {
    timestamp: number
    url: string
    hex: string
    hsl: string
    rgb: string
    ranking?: string | number
    comments?: string | undefined
    slash_naming: string
    tags: string
    additionalColumns: Omit<Column, "id">[]
  }
}

export type FigmaGetAccountsResponse = {
  data: {
    accounts: string[]
  }
}

export type FigmaBindAccountResponse = {
  data: {
    email: string
    message: string
  }
}

export type FigmaGetTeamsResponse = {
  data: {
    teams: {
      id: string
      name: string
    }[]
  }
}

export type FigmaAddTeamResponse = {
  message: string
}

export type FigmaGetProjectsResponse = {
  data: {
    projects: {
      name: string
      id: string
    }[]
  }
}

export type FigmaGetFilesResponse = {
  data: {
    files: {
      name: string
      key: string
    }[]
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
    slash_naming: string
    tags: string
    ranking?: string | number
    comments?: string | undefined
    additionalColumns: Omit<Column, "id">[]
    colorId?: string
  }
}

export type UpdateRowResponse = {
  done: boolean
}

export type AiGeneratedColorResponse = {
  cmyk: number[]
  rgb: number[]
  color_description: string
  hex_code: string
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
