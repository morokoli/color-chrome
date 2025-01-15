import { FC } from "react"
import { AddColumnForm } from "./AddColumnForm"
import { AddColumnFormFields, Column } from "@/v1/types/general"
import { RemoveColumnButton } from "./RemoveColumnButton"
import { useToast } from "@/v1/hooks/useToast"

type Props = {
  columns: Column[]
  handleColumnAddition: (form: AddColumnFormFields) => void
  handleColumnRemoval: (id: string) => void
  setColumnValue: (id: string, value: string) => void
  spreadsheetId: string
  sheetName: string
  sheetId: number
}

const clipText = (text: string) => {
  const limit = 19
  if (text.length <= limit) return text
  return text.substr(0, limit - 1) + "..."
}

export const FileAdditionalColumns: FC<Props> = (props) => {
  const toast = useToast()

  return (
    <div className="flex flex-col space-y-1">
      {props.columns.map((column) => (
        <div className="flex" key={column.id}>
          <div className="flex flex-1">
            <label
              className="w-40 bg-slate-300 text-xs text-slate-800 py-2 px-3 my-auto rounded-l"
              title={column.name}
            >
              {clipText(column.name)}
            </label>
            <input
              type="text"
              className="flex-1 bg-slate-200 px-2 py-1 text-xs text-slate-800"
              placeholder="Column value"
              onChange={(e) => props.setColumnValue(column.id, e.target.value)}
              value={props.columns.find((c) => c.id === column.id)?.value ?? ""}
            />
          </div>

          <RemoveColumnButton
            spreadsheetId={props.spreadsheetId}
            sheetName={props.sheetName}
            sheetId={props.sheetId}
            columnName={column.name}
            handleSuccess={() => {
              props.handleColumnRemoval(column.id)
              toast.display("success", "Column removed successfully")
            }}
            handleError={() =>
              toast.display("error", "Failed to remove column")
            }
          />
        </div>
      ))}

      <div>
        <AddColumnForm
          currentAdditionalColumnCount={props.columns.length}
          onSubmit={props.handleColumnAddition}
          spreadsheetId={props.spreadsheetId}
          sheetName={props.sheetName}
          sheetId={props.sheetId}
        />
      </div>
    </div>
  )
}
