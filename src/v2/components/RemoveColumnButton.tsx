import { FC } from 'react'
import { RemoveAdditionalColumnRequest, RemoveAdditionalColumnResponse } from '@/v2/types/api'
import { config } from '@/v2/others/config'
import { useAPI } from '@/v2/hooks/useAPI'

import { Show } from './common/Show'
import { Loader } from './common/Loader'

import { MinusCircleIcon } from '@heroicons/react/24/outline'

type Props = {
  sheetId: number
  sheetName: string
  columnName: string
  spreadsheetId: string
  handleError: () => void
  handleSuccess: () => void
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
      className="px-2 py-1 bg-slate-200 hover:bg-red-100 cursor-pointer z-10"
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
