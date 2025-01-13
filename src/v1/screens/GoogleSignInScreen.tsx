import { FC } from "react"
import { config } from "@/v1/others/config"
import googleIcon from "@/assets/images/google.png"

const handleClick = () => {
  const url = config.api.baseURL + config.api.endpoints.auth
  window.open(url, "Google Sign-in", "width=1000,height=700")
}

export const GoogleSignInScreen: FC = () => {
  return (
    <div className="w-full h-full flex">
      <button
        className="m-auto bg-slate-300 hover:opacity-80 rounded px-3 py-2 text-sm flex"
        onClick={handleClick}
      >
        <div className="m-auto flex space-x-2">
          <img src={googleIcon} alt="google" className="h-5 w-5" />
          <span className="my-auto">Sign-in with Google</span>
        </div>
      </button>
    </div>
  )
}
