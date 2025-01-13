import { useEffect, useState, useMemo } from "react"
import { useGlobalState } from "@/v1/hooks/useGlobalState"
import { ColorPicker } from "@/v1/components/ColorPicker"
import { SelectFile } from "@/v1/components/SelectFile"
import { FileAdditionalColumns } from "@/v1/components/FileAdditionalColumns"
import { CommentInput } from "@/v1/components/CommentInput"
import { RangeSlider } from "@/v1/components/RangeSlider"
import { ColorHistory } from "@/v1/components/ColorHistory"
import { Loader } from "@/v1/components/Loader"
import { Show } from "@/v1/components/Show"
import { getPageURL } from "@/v1/helpers/url"
import { colors } from "@/v1/helpers/colors"
import { useToast } from "@/v1/hooks/useToast"
import { useAPI } from "@/v1/hooks/useAPI"
import { config } from "@/v1/others/config"
import {
  AddColorRequest,
  AddColorResponse,
  CheckColorAddOrUpdateRequest,
  CheckColorAddOrUpdateResponse,
  UpdateRowRequest,
  UpdateRowResponse,
  GetAdditionalColumnsRequest,
  GetAdditionalColumnsResponse,
  CheckSheetValidRequest,
  CheckSheetValidResponse 
} from "@/v1/types/api"
import { getAuthCookie } from "@/v1/helpers/cookie"
import { Auth } from "@/v1/helpers/auth"

interface Column {
  name: string;
  value: string;
}

export function SheetActionsScreen() {
  const { state, dispatch } = useGlobalState()
  const toast = useToast()
  const [currentColorId, setCurrentColorId] = useState<number | null>(null);

  const { finalComment, finalRanking, isColorIdValid } = useMemo(
    () => {
      const isColorIdValid = typeof currentColorId === 'number' && currentColorId >= 0;
      const finalComment = isColorIdValid && state.parsedData?.[currentColorId!]?.comments || state.selectedFile?.comment || '';
      const finalRanking = isColorIdValid && (String(state.parsedData?.[currentColorId!]?.ranking)) || String(state.selectedFile?.ranking) || '0';


      return { finalComment,  finalRanking, isColorIdValid}
    },
    [currentColorId, state.parsedData, state.selectedFile]
  );

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

  const checkSheetValid = useAPI<
    CheckSheetValidRequest,
    CheckSheetValidResponse
  >({
    url: config.api.endpoints.checkSheetValid,
    method: "POST",
  })

  const getParsedDataFromFile = (fileId: number) => {
    const selectedFile = state.files.find(item => String(item.sheet.id) === String(fileId));

    if (!selectedFile) return

    if (selectedFile.id) {
      checkSheetValid
        .call({
          spreadsheetId: selectedFile.id,
          sheetId: selectedFile.sheet.id,
          sheetName: selectedFile.sheet.name,
        })
        .then((data) => {
          dispatch({ type: "SET_PARSED_DATA", payload: data.sheetData.parsed })
        })
        .catch(() =>
          toast.display(
            "error",
            "Provided spreadsheet does not have valid format",
          ),
        )
    }
  };

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
                  hsl: colors.hexToHSL(state.color),
                  rgb: colors.hexToRGB(state.color),
                  comments: finalComment,
                  ranking: finalRanking,
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
                dispatch({ type: "RESET_ADDITIONAL_FIELDS" });
                if (state.selectedFile?.sheet?.id) {
                  getParsedDataFromFile(state.selectedFile.sheet.id);
                }
              })
              .catch((err) => toast.display("error", err))
          } else {
            dispatch({
              type: "SET_SUBMIT_MODE",
              payload: {
                add: false,
                rowIndex: data.rowIndex,
                row: {
                  comment: finalComment,
                  ranking: finalRanking,
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

      const requestRanking = (state.parsedData?.[currentColorId!]?.ranking && String(state.parsedData?.[currentColorId!]?.ranking)) || '0';

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
            hsl: colors.hexToHSL(state.color),
            rgb: colors.hexToRGB(state.color),
            comments: state.parsedData?.[currentColorId!]?.comments || '',
            ranking: requestRanking,
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
          dispatch({ type: "RESET_ADDITIONAL_FIELDS" });
          if (state.selectedFile?.sheet?.id) {
            getParsedDataFromFile(state.selectedFile.sheet.id);
          }
        })
        .catch(() => toast.display("error", "Failed to update color"))
    })
  }

  useEffect(() => {
    if (!state.selectedFile) return

    getParsedDataFromFile(state.selectedFile.sheet.id);
  }, [])

  return (
    <>
    <div className="flex">
      <div className="flex-1">
      <SelectFile
        files={state.files}
        selectedFile={state.selectedFile}
        setSelectedFile={(fileId: number) => {
          getParsedDataFromFile(fileId)
          dispatch({ type: "CHANGE_SELECTED_FILE", payload: fileId })
        }}
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
                currentColorId={currentColorId!}
                setCurrentColorId={setCurrentColorId}
                currentColor={state.color}
                previousColors={state.colorHistory.recent}
                max={state.colorHistory.max}
                clearHistory={() => dispatch({ type: "CLEAR_COLOR_HISTORY" })}
                setCurrentColor={(color: string, colorIndex: number) => {
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
                        // not data.add and if URL from file === current url is update
                        if (!data.add && state.parsedData?.[colorIndex!]?.url === url) {
                          const additionalComment: Omit<Column, "id">[] = data.row.additionalColumns;
                          if (additionalComment.length > 0) {
                            additionalComment.forEach(obj => obj.value = '');
                          }
                          dispatch({
                            type: "SET_SUBMIT_MODE",
                            payload: {
                              add: false,
                              rowIndex: data.rowIndex,
                              row: {
                                ranking: 0,
                                comment: "",
                                additionalColumns: additionalComment,
                              },
                            },
                          })
                        } else {
                        // data.add is add
                          dispatch({ type: "SET_SUBMIT_MODE", payload: { add: true }})
                        }
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
                currentValue={finalComment}
                setCurrentValue={(value: string) => {
                  if (isColorIdValid) {
                    dispatch({ type: "SET_COMMENT_PARSED_DATA", payload: { value, currentColorId: currentColorId! } })
                  } else {
                    dispatch({ type: "SET_COMMENT", payload: value })
                  }
                }
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
                    disabled={!state.color}
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
            rankingRange={finalRanking}
            setRankingRange={(value: number) => {
              if (isColorIdValid) {
                dispatch({ type: "SET_RANKING_RANGE_PARSED_DATA", payload: { value, currentColorId: currentColorId! } })
              } else {
                dispatch({ type: "SET_RANKING_RANGE", payload: String(value) })
              }
            }
            }
          />
        </div>
      )}
      
      </div>
    </>
  )
}
