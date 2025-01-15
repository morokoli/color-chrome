import { useGlobalState } from "@/v1/hooks/useGlobalState"
import { DriveFileCreateForm } from "@/v1/components/DriveFileCreateForm"
import { DriveFileOpenForm } from "@/v1/components/DriveFileOpenForm"

export function FileAddScreen() {
  const { state, dispatch } = useGlobalState()

  return (
    <div>
      <DriveFileCreateForm
        currentFileCount={state.files.length}
        onSubmit={(form) =>
          dispatch({
            type: "ADD_DRIVE_FILE",
            payload: {
              ...form,
              additionalColumns: [],
              sheet: {
                id: form.sheetId,
                name: form.sheetName,
              },
            },
          })
        }
      />

      <hr className="border-b border-dashed border-zinc-300 my-8" />

      <DriveFileOpenForm
        currentFileCount={state.files.length}
        onSubmit={(form) =>
          dispatch({
            type: "ADD_DRIVE_FILE",
            payload: {
              ...form,
              sheet: {
                id: form.sheetId,
                name: form.sheetName,
              },
            },
          })
        }
      />
    </div>
  )
}
