import { FC } from "react"
import classNames from "classnames"
import { DriveFile } from "@/v1/types/general"
import { Show } from "./Show"
import { sheets } from "@/v1/helpers/sheets"

type Props = {
  files: DriveFile[]
  selectedFile: DriveFile | null
  setSelectedFile: (fileId: number) => void
  removeSelectedFile: () => void
}

export const SelectFile: FC<Props> = (props) => {
  return (
    <div className="flex flex-row space-x-1">
      <select
        name="drive-files"
        disabled={props.files.length === 0}
        className={classNames(
          "w-full text-xs text-slate-800 px-3 py-2 bg-slate-300 rounded flex-1",
          {
            "cursor-not-allowed": props.files.length === 0,
            rounded: props.selectedFile === null,
          },
        )}
        value={props.selectedFile?.sheet?.id}
        onChange={(e) => props.setSelectedFile(+e.target.value)}
      >
        <option value="">Please pick a file</option>
        {props.files.map((file) => (
          <option key={file.sheet.id} value={file.sheet.id}>
            {file.fileName} - {file.sheet.name}
          </option>
        ))}
      </select>

      <Show if={props.selectedFile !== null}>
        <a
          className="bg-slate-800 hover:opacity-90 text-white rounded px-3 py-2 text-xs"
          href={sheets.getSpreadsheetURL(props.selectedFile?.id ?? "")}
          target="_blank"
        >
          Open file
        </a>

        <button
          className="bg-slate-800 hover:opacity-90 text-white rounded px-3 py-2 text-xs"
          onClick={() => {
            const isConfirmed = window.confirm(
              `The selected sheet will not be deleted from your Google Drive, it will only be removed from the chrome extension. Are you sure you want to remove "${props.selectedFile?.fileName} - ${props.selectedFile?.sheet.name}" from chrome extension?`,
            )
            if (!isConfirmed) return
            props.removeSelectedFile()
          }}
          title="Remove selected file from chrome extension"
        >
          Remove
        </button>
      </Show>
    </div>
  )
}
