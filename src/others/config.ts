export const config = {
  cookie: {
    cookieNameAuth: "auth.user",
    cookieNameSheetFileData: "sheet.file.data",
  },
  api: {
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 10_000,
    endpoints: {
      auth: "/auth",
      refreshAccessToken: "/api/auth/refresh",
      sheetCreate: "/api/sheets/create",
      sheetGetByURL: "/api/sheets/get-by-url",
      checkSheetValid: "/api/sheets/check-sheet-valid",
      addColor: "/api/sheets/add-color",
      updateRow: "/api/sheets/update-row",
      checkAddOrUpdate: "/api/sheets/check-add-or-update",
      addColumn: "/api/sheets/add-column",
      removeColumn: "/api/sheets/remove-column",
      getAdditionalColumns: "/api/sheets/get-additional-columns",
    },
  },
  toast: {
    timeout: 2_000,
  },
  limitations: {
    maxFiles: 2,
    maxAdditionalColumns: 1,
  },
}
