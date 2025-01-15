import { type FC } from "react"
import { Storage } from "@/v1/helpers/storage"
import { eraseAllCookies } from "@/v1/helpers/cookie"
import { UserCircleIcon } from "@heroicons/react/24/outline"
import { Show } from "@/v1/components/Show"

type Props = {
  name: string | undefined
  email: string | undefined
  reset: () => void
}

function logoutAction(reset: () => void) {
  Storage.clearStoredState()
  eraseAllCookies().then(reset)
}

export const AccountScreen: FC<Props> = (props) => {
  return (
    <div>
      <Show if={!!props.email || !!props.name}>
        <div className="pt-4 pb-6 flex space-x-2 justify-center">
          <UserCircleIcon className="h-4 w-4 my-auto" />
          <p className="text-sm text-center my-auto">
            {props.name ?? ""} {props.email ? " - " + props.email : ""}
          </p>
        </div>
      </Show>

      <button
        className="w-full bg-slate-800 disabled:opacity-75 rounded px-4 py-2 flex"
        onClick={() => logoutAction(props.reset)}
      >
        <span className="text-white text-xs m-auto">Logout</span>
      </button>
    </div>
  )
}
