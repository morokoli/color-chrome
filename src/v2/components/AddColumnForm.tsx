import { FC, useState } from 'react'
import { AddNewAdditionalColumnRequest, AddNewAdditionalColumnResponse } from '@/v1/types/api'
import { useGlobalState } from '@/v2/hooks/useGlobalState'
import { useToast } from '@/v2/hooks/useToast'
import { config } from '@/v2/others/config'
import { useAPI } from '@/v2/hooks/useAPI'

import { Show } from './common/Show'
import { Loader } from './common/Loader'

import { PlusCircleIcon } from '@heroicons/react/24/outline'

type Props = {
  disabled: boolean;
}

const AddColumnForm: FC<Props> = ({ disabled }) => {
  const toast = useToast()
  const [columnName, setColumnName] = useState('');
  const { state, dispatch } = useGlobalState();

  const { call, isStatusLoading } = useAPI<
    AddNewAdditionalColumnRequest,
    AddNewAdditionalColumnResponse
  >({
    url: config.api.endpoints.addColumn,
    method: "POST",
  })

  const addNewColumn = () => {
    const file = state.files.find(file => file.spreadsheetId === state.selectedFile);
    
    if (!file) {
      return;
    }

    call({
      spreadsheetId: file.spreadsheetId,
      sheetName: file.sheets[0].name,
      sheetId: file.sheets[0].id,
      columnName: columnName,
     })
    .then(() => {
      dispatch({ type: "ADD_NEW_COLUMN", payload: { name: columnName, value: '' } })
      setColumnName('')

      toast.display("success", "Column created successfully")
    })
    .catch(() => toast.display("error", "Failed to create a column"))
  };

  return (
    <div className="flex">
      <fieldset className="flex flex-1">
        <input
          type="text"
          value={columnName}
          disabled={disabled}
          placeholder="Column name"
          onChange={(e) => setColumnName(e.target.value)}
          title="Column name for new additional column"
          className="flex-1 bg-slate-200 text-xs px-2 py-1 focus:outline-none border border-slate-200 focus:border-slate-700"
        />
      </fieldset>

      <button
        onClick={addNewColumn}
        disabled={disabled || columnName === ''}
        className="px-2 py-1 bg-slate-200 hover:enabled:bg-emerald-100 enabled:cursor-pointer"
      >
        <Show if={!isStatusLoading}>
          <PlusCircleIcon className="h-5 w-5 text-custom-green my-auto" />
        </Show>

        <Show if={isStatusLoading}>
          <div className="px-1">
            <Loader size="small" type="light" />
          </div>
        </Show>
      </button>
    </div>
  )
}

export default AddColumnForm;
