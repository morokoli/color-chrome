export const sheets = {
  BASE: "https://docs.google.com/spreadsheets/d/",
  BASE_REGEX: /^https:\/\/docs.google.com\/spreadsheets\/d\/\S+$/,

  getSpreadsheetURL(spreadsheetId: string): string {
    return this.BASE + spreadsheetId
  },

  /**
   * every google spreadsheet URL includes the unique id of the spreadsheet
   * this function checks url validity and extracts the id
   */
  extractSpreadsheetIdFromURL(url: string): string | undefined {
    url = url.trim()

    if (!url.includes("google") || !url.includes("spreadsheets")) {
      return
    }

    const pieces = url.split("/")
    if (pieces.length < 5) {
      return
    }

    return pieces[5]
  },
}
