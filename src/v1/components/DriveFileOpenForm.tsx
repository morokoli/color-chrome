import { FC, useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { ErrorMessage } from "@hookform/error-message"
import { InputError } from "@/v1/components/InputError"
import { DriveFileCreateFormFieldsWithId } from "@/v1/types/general"
import { DriveFileURLForm } from "./DriveFileURLForm"
import { config } from "@/v1/others/config"
import { useAPI } from "@/v1/hooks/useAPI"
import { CheckSheetValidRequest, CheckSheetValidResponse } from "@/v1/types/api"
import { Loader } from "./Loader"
import { Show } from "./Show"
import { Sheet } from "@/v1/types/general"
import { useToast } from "@/v1/hooks/useToast"
import { useGlobalState } from "@/v1/hooks/useGlobalState"
import { setCookie, getSheetFileDataCookie } from '@/v1/helpers/cookie'

type Props = {
  currentFileCount: number
  onSubmit: (form: DriveFileCreateFormFieldsWithId) => void
}

const formValidators = {
  sheetName: { required: "Sheet name is required" },
}

type OpenDriveFileState = {
  spreadsheetId: string
  fileURL: string
  fileName: string
  sheets: Sheet[]
}

const initOpenDriveFileState: OpenDriveFileState = {
  spreadsheetId: "",
  fileName: "",
  fileURL: "",
  sheets: [],
}

export const DriveFileOpenForm: FC<Props> = (props) => {
  const { state, dispatch } = useGlobalState()
  const toast = useToast()
  const [stateOpenDrive, setState] = useState<OpenDriveFileState>(initOpenDriveFileState)

  const checkSheetValid = useAPI<
    CheckSheetValidRequest,
    CheckSheetValidResponse
  >({
    url: config.api.endpoints.checkSheetValid,
    method: "POST",
  })

  const {
    register,
    handleSubmit,
    // reset,
    formState: { errors },
  } = useForm<{ sheetName: string }>()

  const openFile = (form: { sheetName: string, fileData?: DriveFileCreateFormFieldsWithId }) => {
    if (props.currentFileCount === config.limitations.maxFiles) {
      toast.display("info", "Please purchase this extension to continue")
      return
    }

    checkSheetValid
      .call({
        spreadsheetId: form.fileData?.spreadsheetId || stateOpenDrive.spreadsheetId,
        sheetId: form.fileData?.sheetId || parseInt(form.sheetName),
        sheetName:
          form.fileData?.sheetName ||
          stateOpenDrive.sheets.find((s) => s.id == parseInt(form.sheetName))?.name ||
          "Unnamed",
      })
      .then((data) => {
        const fileData = {
          fileName: form.fileData?.fileName || stateOpenDrive.fileName,
          sheetName:
            form.fileData?.sheetName ||
            stateOpenDrive.sheets.find((s) => s.id == parseInt(form.sheetName))?.name ||
            "Unnamed",
          spreadsheetId: form.fileData?.spreadsheetId || stateOpenDrive.spreadsheetId,
          sheetId: form.fileData?.sheetId || parseInt(form.sheetName),
          additionalColumns: data.additionalColumns,
        };

        props.onSubmit(fileData)
        setCookie(config.cookie.cookieNameSheetFileData, fileData);
        dispatch({ type: "SWITCH_TAB", payload: "SELECT" })
        toast.display("success", "Spreadsheet added successfully")
      })
      .catch(() =>
        toast.display(
          "error",
          "Provided spreadsheet does not have valid format",
        ),
      )
  };

  useEffect(() => {
    async function getCookieAndOpenFile() {
      const sheetFileData = await getSheetFileDataCookie();
      if (sheetFileData) {
        openFile({ sheetName: sheetFileData.sheetName, fileData: sheetFileData })
      }
    }
    if (!state.selectedFile?.id) {
      getCookieAndOpenFile();
    }
  }, []);

  return (
    <div className="flex flex-col space-y-2">
      <DriveFileURLForm
        setFileInfo={(args) => {
          setState({
            spreadsheetId: args.spreadsheetId,
            fileName: args.fileName,
            fileURL: args.url,
            sheets: [...args.sheets],
          })
        }}
      />

      <form
        className="flex flex-col space-y-3"
        onSubmit={handleSubmit((form) => openFile(form))}
      >
        <fieldset className="flex flex-col space-y-1">
          <select
            className="px-3 py-2 text-xs text-slate-800 bg-slate-200 rounded disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none border border-slate-200 focus:border-slate-700"
            required
            disabled={stateOpenDrive.sheets.length === 0}
            {...register("sheetName", formValidators.sheetName)}
          >
            <option value="">Available sheets</option>
            {stateOpenDrive.sheets.map((sheet) => (
              <option value={sheet.id} key={sheet.id}>
                {sheet.name}
              </option>
            ))}
          </select>

          <ErrorMessage
            errors={errors}
            name="sheetName"
            render={({ message }) => <InputError message={message} />}
          />
        </fieldset>

        <button className="bg-slate-800 disabled:opacity-75 rounded px-4 py-2 flex">
          <div className="flex mx-auto space-x-2">
            <Show if={checkSheetValid.isStatusLoading}>
              <div className="my-auto">
                <Loader size="small" type="dark" />
              </div>
            </Show>

            <span className="text-white text-xs my-auto">
              Open existing file
            </span>
          </div>
        </button>
      </form>
    </div>
  )
}
