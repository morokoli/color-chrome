import { FC, useState } from "react"
import { useForm } from "react-hook-form"
import { ErrorMessage } from "@hookform/error-message"
import { InputError } from "@/components/InputError"
import { DriveFileCreateFormFieldsWithId } from "@/types/general"
import { DriveFileURLForm } from "./DriveFileURLForm"
import { config } from "@/others/config"
import { useAPI } from "@/hooks/useAPI"
import { CheckSheetValidRequest, CheckSheetValidResponse } from "@/types/api"
import { Loader } from "./Loader"
import { Show } from "./Show"
import { Sheet } from "@/types/general"
import { useToast } from "@/hooks/useToast"

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
  const toast = useToast()
  const [state, setState] = useState<OpenDriveFileState>(initOpenDriveFileState)

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
    reset,
    formState: { errors },
  } = useForm<{ sheetName: string }>()

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
        onSubmit={handleSubmit((form) => {
          if (props.currentFileCount === config.limitations.maxFiles) {
            toast.display("info", "Please purchase this extension to continue")
            return
          }

          checkSheetValid
            .call({
              spreadsheetId: state.spreadsheetId,
              sheetId: parseInt(form.sheetName),
              sheetName:
                state.sheets.find((s) => s.id == parseInt(form.sheetName))
                  ?.name ?? "Unnamed",
            })
            .then((data) => {
              props.onSubmit({
                fileName: state.fileName,
                sheetName:
                  state.sheets.find((s) => s.id == parseInt(form.sheetName))
                    ?.name ?? "Unnamed",
                spreadsheetId: state.spreadsheetId,
                sheetId: parseInt(form.sheetName),
                additionalColumns: data.additionalColumns,
              })
              reset()
              toast.display("success", "Spreadsheet added successfully")
            })
            .catch(() =>
              toast.display(
                "error",
                "Provided spreadsheet does not have valid format",
              ),
            )
        })}
      >
        <fieldset className="flex flex-col space-y-1">
          <select
            className="px-3 py-2 text-xs text-slate-800 bg-slate-200 rounded disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none border border-slate-200 focus:border-slate-700"
            required
            disabled={state.sheets.length === 0}
            {...register("sheetName", formValidators.sheetName)}
          >
            <option value="">Available sheets</option>
            {state.sheets.map((sheet) => (
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