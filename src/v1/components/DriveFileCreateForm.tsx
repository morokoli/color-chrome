import { FC } from "react"
import { useForm } from "react-hook-form"
import { ErrorMessage } from "@hookform/error-message"
import { InputError } from "@/v1/components/InputError"
import { DriveFileCreateFormFields } from "@/v1/types/general"
import { Loader } from "./Loader"
import { useAPI } from "@/v1/hooks/useAPI"
import { config } from "@/v1/others/config"
import { DriveFileCreateRequest, DriveFileCreateResponse } from "@/v1/types/api"
import { useToast } from "@/v1/hooks/useToast"

type Props = {
  currentFileCount: number
  onSubmit: (
    form: DriveFileCreateFormFields & {
      spreadsheetId: string
      sheetId: number
    },
  ) => void
}

const formValidators = {
  fileName: { required: "File name is required" },
  sheetName: { required: "Sheet name is required" },
}

export const DriveFileCreateForm: FC<Props> = (props) => {
  const toast = useToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DriveFileCreateFormFields>()

  const { call, isStatusLoading } = useAPI<
    DriveFileCreateRequest,
    DriveFileCreateResponse
  >({
    url: config.api.endpoints.sheetCreate,
    method: "POST",
  })

  return (
    <form
      className="flex flex-col space-y-2"
      onSubmit={handleSubmit((form: DriveFileCreateFormFields) => {
        if (props.currentFileCount === config.limitations.maxFiles) {
          toast.display("info", "Please purchase this extension to continue")
          return
        }

        call(form)
          .then((data) => {
            props.onSubmit({
              ...form,
              spreadsheetId: data.spreadsheetId,
              sheetId: data.sheetId,
            })
            toast.display(
              "success",
              "Spreadsheet file created successfully at your Goole Drive Root folder",
            )
            reset()
          })
          .catch(() =>
            toast.display("error", "Failed to create spreadsheet file"),
          )
      })}
    >
      <fieldset className="flex flex-col space-y-1">
        <input
          placeholder="File name"
          className="px-3 py-2 text-xs bg-slate-200 rounded focus:outline-none border border-slate-200 focus:border-slate-700"
          type="text"
          required
          {...register("fileName", formValidators.fileName)}
        />
        <ErrorMessage
          errors={errors}
          name="fileName"
          render={({ message }) => <InputError message={message} />}
        />
      </fieldset>

      <fieldset className="flex flex-col space-y-1">
        <input
          placeholder="Sheet name"
          className="px-3 py-2 text-xs text-slate-800 bg-slate-200 rounded focus:outline-none border border-slate-200 focus:border-slate-700"
          type="text"
          required
          {...register("sheetName", formValidators.sheetName)}
        />
        <ErrorMessage
          errors={errors}
          name="sheetName"
          render={({ message }) => <InputError message={message} />}
        />
      </fieldset>

      <button className="bg-slate-800 disabled:opacity-75 rounded px-4 py-2 flex">
        <div className="flex mx-auto space-x-2">
          {isStatusLoading && (
            <span className="my-auto">
              <Loader type="dark" size="small" />
            </span>
          )}
          <span className="text-white text-xs my-auto">Create new file</span>
        </div>
      </button>
    </form>
  )
}
