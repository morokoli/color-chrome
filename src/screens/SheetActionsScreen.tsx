import { useGlobalState } from "@/hooks/useGlobalState"
import { ColorPicker } from "@/components/ColorPicker"
import { SelectFile } from "@/components/SelectFile"
import { FileAdditionalColumns } from "@/components/FileAdditionalColumns"
import { CommentInput } from "@/components/CommentInput"
import { RangeSlider } from "@/components/RangeSlider"
import { ColorHistory } from "@/components/ColorHistory"
import { Loader } from "@/components/Loader"
import { Show } from "@/components/Show"
import { getPageURL } from "@/helpers/url"
import { colors } from "@/helpers/colors"
import { useToast } from "@/hooks/useToast"
import { useAPI } from "@/hooks/useAPI"
import { config } from "@/others/config"
import {
  AddColorRequest,
  AddColorResponse,
  CheckColorAddOrUpdateRequest,
  CheckColorAddOrUpdateResponse,
  UpdateRowRequest,
  UpdateRowResponse,
  GetAdditionalColumnsRequest,
  GetAdditionalColumnsResponse,
} from "@/types/api"
import { useEffect } from "react"
import { getAuthCookie } from "@/helpers/cookie"
import { Auth } from "@/helpers/auth"

export function SheetActionsScreen() {
  const { state, dispatch } = useGlobalState()
  const toast = useToast()

  const checkAddOrUpdate = useAPI<
    CheckColorAddOrUpdateRequest,
    CheckColorAddOrUpdateResponse
  >({
    url: config.api.endpoints.checkAddOrUpdate,
    method: "POST",
  })

  const addColor = useAPI<AddColorRequest, AddColorResponse>({
    url: config.api.endpoints.addColor,
    method: "POST",
  })

  const updateRow = useAPI<UpdateRowRequest, UpdateRowResponse>({
    url: config.api.endpoints.updateRow,
    method: "PUT",
  })

  const getAdditionalColumns = useAPI<
    GetAdditionalColumnsRequest,
    GetAdditionalColumnsResponse
  >({
    url: config.api.endpoints.getAdditionalColumns,
    method: "POST",
  })

  const syncColumns = () => {
    if (state.selectedFile) {
      getAdditionalColumns
        .call({
          spreadsheetId: state.selectedFile.id,
          sheetName: state.selectedFile.sheet.name,
        })
        .then((data) =>
          dispatch({
            type: "SYNC_ADDITIONAL_COLUMNS",
            payload: data.additionalColumns,
          }),
        )
        .catch(() =>
          toast.display("error", "Failed to sync additional columns"),
        )
    }
  }

  /** everytime file selection changes, sync additional columns */
  useEffect(() => {
    if (state.user != null && state.selectedFile) {
      getAuthCookie().then((user) => {
        /** refresh auth tokens in background */
        if (user && user.refreshToken) {
          const now = new Date().getTime()
          if (now > user.expiry) {
            Auth.refreshAuthToken(user.refreshToken, (data) => {
              dispatch({ type: "UPDATE_ACCESS_TOKEN", payload: data })
            }).then(syncColumns)
          } else {
            syncColumns()
          }
        }
      })
    }
  }, [state.selectedFile?.id])

  const handleSave = () => {
    getPageURL().then((url) => {
      if (!url) {
        toast.display("error", "Failed to detect page URL")
        return
      }
      if (!state.selectedFile) return

      checkAddOrUpdate
        .call({
          spreadsheetId: state.selectedFile.id,
          sheetName: state.selectedFile.sheet.name,
          url,
          colorHex: state.color,
        })
        .then((data) => {
          if (data.add) {
            addColor
              .call({
                spreadsheetId: state.selectedFile!.id,
                sheetName: state.selectedFile!.sheet.name,
                sheetId: state.selectedFile!.sheet.id,
                row: {
                  timestamp: new Date().valueOf(),
                  url,
                  hex: state.color,
                  hsl: colors.hextToHSL(state.color),
                  rgb: colors.hexToRGB(state.color),
                  ranking: state.selectedFile!.ranking,
                  comments: state.selectedFile!.comment,
                  additionalColumns: state.selectedFile!.additionalColumns.map(
                    (col) => ({
                      name: col.name,
                      value: col.value,
                    }),
                  ),
                },
              })
              .then(() => {
                toast.display("success", "Color saved successfully")
                dispatch({ type: "ADD_COLOR_HISTORY", payload: state.color })
                dispatch({ type: "RESET_ADDITIONAL_FIELDS" })
              })
              .catch((err) => toast.display("error", err))
          } else {
            dispatch({
              type: "SET_SUBMIT_MODE",
              payload: {
                add: false,
                rowIndex: data.rowIndex,
                row: {
                  ranking: data.row.ranking ?? "",
                  comment: data.row.comments ?? "",
                  additionalColumns: data.row.additionalColumns,
                },
              },
            })
          }
        })
        .catch(() => toast.display("error", "Failed to add color"))
    })
  }

  const handleUpdate = () => {
    getPageURL().then((url) => {
      if (!url) {
        toast.display("error", "Failed to detect page URL")
        return
      }
      if (!state.selectedFile) return

      updateRow
        .call({
          spreadsheetId: state.selectedFile!.id,
          sheetName: state.selectedFile!.sheet.name,
          sheetId: state.selectedFile!.sheet.id,
          rowIndex: state.updateRowIndex,
          row: {
            timestamp: new Date().valueOf(),
            url,
            hex: state.color,
            hsl: colors.hextToHSL(state.color),
            rgb: colors.hexToRGB(state.color),
            comments: state.selectedFile!.comment,
            ranking: state.selectedFile!.ranking,
            additionalColumns: state.selectedFile!.additionalColumns.map(
              (col) => ({
                name: col.name,
                value: col.value,
              }),
            ),
          },
        })
        .then(() => {
          toast.display("success", "Color updated successfully")
          dispatch({ type: "SET_SUBMIT_MODE", payload: { add: true } })
          dispatch({ type: "RESET_ADDITIONAL_FIELDS" })
          dispatch({ type: "ADD_COLOR_HISTORY", payload: state.color })
        })
        .catch(() => toast.display("error", "Failed to update color"))
    })
  }

  return (
    <>
    <div className="flex">
      <div className="flex-1">
      <SelectFile
        files={state.files}
        selectedFile={state.selectedFile}
        setSelectedFile={(fileId: string) =>
          dispatch({ type: "CHANGE_SELECTED_FILE", payload: fileId })
        }
        removeSelectedFile={() => dispatch({ type: "REMOVE_SELECTED_FILE" })}
      />

      <div className="py-4">
        {state.selectedFile && (
          <>
            <ColorPicker
              disabled={state.selectedFile === null}
              currentColor={state.color}
              handleChange={(color) =>
                dispatch({ type: "SET_COLOR", payload: color })
              }
            />

            <div className="pt-3">
              <ColorHistory
                currentColor={state.color}
                previousColors={state.colorHistory.recent}
                max={state.colorHistory.max}
                clearHistory={() => dispatch({ type: "CLEAR_COLOR_HISTORY" })}
                setCurrentColor={(color: string) => {
                  dispatch({ type: "SET_COLOR", payload: color })

                  // when user selects a previous color, get details of that color
                  // from the linked sheet and show its comments inside the
                  // extension.
                  getPageURL().then((url) => {
                    if (!url) {
                      toast.display("error", "Failed to detect page URL")
                      return
                    }
                    if (!state.selectedFile) return

                    checkAddOrUpdate
                      .call({
                        spreadsheetId: state.selectedFile.id,
                        sheetName: state.selectedFile.sheet.name,
                        url,
                        colorHex: color,
                      })
                      .then((data) => {
                        // if the selected color from the color history no longer
                        // exists inside the linked sheet, no further action is
                        //  required.
                        if (data.add) return
                        interface Column {
                          name: string;
                          value: string;
                        }
                        let additionalComment: Omit<Column, "id">[] = data.row.additionalColumns;
                        if (additionalComment.length > 0) {
                          additionalComment.forEach(obj => obj.value = '');
                        }
                        dispatch({
                          type: "SET_SUBMIT_MODE",
                          payload: {
                            add: false,
                            rowIndex: data.rowIndex,
                            row: {
                              ranking: "",
                              comment: "",
                              additionalColumns: additionalComment,
                            },
                          },
                        })
                      })
                  })
                }}
              />
            </div>
          </>
        )}
      </div>

      {state.selectedFile && (
        <div>
          <div className="justify-start space-y-1 h-24 overflow-y-auto">
            <div className="flex flex-col">
              <CommentInput
                currentValue={state.selectedFile.comment}
                setCurrentValue={(value: string) =>
                  dispatch({ type: "SET_COMMENT", payload: value })
                }
              />
            </div>

            <FileAdditionalColumns
              spreadsheetId={state.selectedFile.id}
              sheetName={state.selectedFile.sheet.name}
              sheetId={state.selectedFile.sheet.id}
              columns={state.selectedFile.additionalColumns}
              handleColumnAddition={(form) =>
                dispatch({
                  type: "ADD_COLUMN",
                  payload: { columnName: form.columnName },
                })
              }
              handleColumnRemoval={(id) =>
                dispatch({
                  type: "REMOVE_COLUMN",
                  payload: { columnId: id },
                })
              }
              setColumnValue={(columnId, value) =>
                dispatch({
                  type: "SET_COLUMN_VALUE",
                  payload: { columnId, value },
                })
              }
            />
          </div>

          <div className="pt-5">
            <div className="flex space-x-2">
              <div className="flex space-x-2">
                <Show if={state.submitMode === "add"}>
                  <button
                    className="px-3 py-2 text-xs text-white bg-slate-800 hover:enabled:bg-slate-700 disabled:opacity-75 rounded"
                    onClick={handleSave}
                  >
                    Save color
                  </button>
                </Show>

                <Show if={state.submitMode === "update"}>
                  <button
                    className="px-3 py-2 text-xs text-white bg-slate-800 hover:enabled:bg-slate-700 disabled:opacity-75 rounded"
                    onClick={handleUpdate}
                  >
                    Update color
                  </button>
                  <button
                    className="px-3 py-1 text-xs text-zinc-700 bg-transparent border border-zinc-400 rounded"
                    onClick={() => {
                      dispatch({
                        type: "SET_SUBMIT_MODE",
                        payload: { add: true },
                      })
                      dispatch({ type: "RESET_ADDITIONAL_FIELDS" })
                    }}
                  >
                    Cancel
                  </button>
                </Show>
              </div>

              <div className="flex-1 flex">
                <div className="flex-1 my-auto px-3">
                  <Show
                    if={
                      checkAddOrUpdate.isStatusLoading ||
                      addColor.isStatusLoading ||
                      updateRow.isStatusLoading
                    }
                  >
                    <Loader type="light" size="small" />
                  </Show>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
      {state.selectedFile && (
        <div className="h-full ranking-slider">
          <RangeSlider 
            rankingRange={state.selectedFile.ranking}
            setRankingRange={(value: string) =>
              dispatch({ type: "SET_RankingRange", payload: value })
            }
          />
        </div>
      )}
      
      </div>
    </>
  )
}
