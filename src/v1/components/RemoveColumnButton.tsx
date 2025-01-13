import { FC } from "react"
import { useAPI } from "@/v1/hooks/useAPI"
import { config } from "@/v1/others/config"
import { Loader } from "./Loader"
import { Show } from "./Show"
import { MinusCircleIcon } from "@heroicons/react/24/outline"
import {
  RemoveAdditionalColumnRequest,
  RemoveAdditionalColumnResponse,
} from "@/v1/types/api"

type Props = {
  spreadsheetId: string
  sheetName: string
  sheetId: number
  columnName: string
  handleSuccess: () => void
  handleError: () => void
}

export const RemoveColumnButton: FC<Props> = (props) => {
  const removeColumn = useAPI<
    RemoveAdditionalColumnRequest,
    RemoveAdditionalColumnResponse
  >({
    url: config.api.endpoints.removeColumn,
    method: "PUT",
  })

  return (
    <button
      className="px-2 py-1 bg-slate-200 hover:bg-red-100 cursor-pointer rounded-r"
      title="Remove Column"
      onClick={() => {
        const isConfirmed = window.confirm(
          "Deleting the column will also delete all data in the column. This action cannot be reversed. Are you sure you want to delete the column?",
        )
        if (!isConfirmed) return

        removeColumn
          .call({
            spreadsheetId: props.spreadsheetId,
            sheetName: props.sheetName,
            sheetId: props.sheetId,
            columnName: props.columnName,
          })
          .then(props.handleSuccess)
          .catch(props.handleError)
      }}
    >
      <Show if={!removeColumn.isStatusLoading}>
        <MinusCircleIcon className="h-5 w-5 text-red-600 my-auto" />
      </Show>

      <Show if={removeColumn.isStatusLoading}>
        <div className="px-1">
          <Loader size="small" type="light" />
        </div>
      </Show>
    </button>
  )
}
