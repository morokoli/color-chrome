import { FC } from "react"
import { useForm } from "react-hook-form"
import { PlusCircleIcon } from "@heroicons/react/24/outline"
import { AddColumnFormFields } from "@/v1/types/general"
import { useAPI } from "@/v1/hooks/useAPI"
import { config } from "@/v1/others/config"
import {
  AddNewAdditionalColumnRequest,
  AddNewAdditionalColumnResponse,
} from "@/v1/types/api"
import { Loader } from "./Loader"
import { Show } from "./Show"
import { useToast } from "@/v1/hooks/useToast"

type Props = {
  onSubmit: (form: AddColumnFormFields) => void
  spreadsheetId: string
  sheetName: string
  sheetId: number
  currentAdditionalColumnCount: number
}

const formValidators = {
  columnName: { required: "Column name is required" },
}

export const AddColumnForm: FC<Props> = (props) => {
  const { register, handleSubmit, reset } = useForm<AddColumnFormFields>()
  const toast = useToast()

  const addColumn = useAPI<
    AddNewAdditionalColumnRequest,
    AddNewAdditionalColumnResponse
  >({
    url: config.api.endpoints.addColumn,
    method: "POST",
  })

  return (
    <form
      className="flex"
      onSubmit={handleSubmit((form) => {
        if (
          props.currentAdditionalColumnCount ===
          config.limitations.maxAdditionalColumns
        ) {
          toast.display("info", "Please purchase this extension to continue")
          return
        }
        addColumn
          .call({
            spreadsheetId: props.spreadsheetId,
            sheetName: props.sheetName,
            sheetId: props.sheetId,
            columnName: form.columnName,
          })
          .then(() => {
            toast.display("success", "Column added successfully")
            props.onSubmit(form)
            reset()
          })
          .catch(() => toast.display("error", "Failed to add column"))
      })}
    >
      <fieldset className="flex flex-1">
        <input
          type="text"
          placeholder="Column name"
          title="Column name for new additional column"
          className="flex-1 rounded-l bg-slate-200 text-xs px-2 py-1 focus:outline-none border border-slate-200 focus:border-slate-700"
          {...register("columnName", formValidators.columnName)}
        />
      </fieldset>

      <button
        className="px-2 py-1 bg-slate-200 rounded-r hover:enabled:bg-emerald-100 enabled:cursor-pointer"
        title="Add column"
      >
        <Show if={!addColumn.isStatusLoading}>
          <PlusCircleIcon className="h-5 w-5 text-custom-green my-auto" />
        </Show>

        <Show if={addColumn.isStatusLoading}>
          <div className="px-1">
            <Loader size="small" type="light" />
          </div>
        </Show>
      </button>
    </form>
  )
}
