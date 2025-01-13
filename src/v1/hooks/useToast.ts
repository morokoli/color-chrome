import { useContext, useEffect } from "react"
import { ToastContext } from "@/v1/context/toastContext"
import { config } from "@/v1/others/config"

export function useToast() {
  const { state, dispatch } = useContext(ToastContext)

  /** autohide toast message */
  useEffect(() => {
    if (state.message) {
      const handle = setTimeout(
        () => dispatch({ type: "HIDE" }),
        config.toast.timeout,
      )
      return () => clearTimeout(handle)
    }
  }, [state.message])

  const display = (type: "error" | "success" | "info", message: string) => {
    dispatch({ type: "DISPLAY", payload: { type, message } })
  }

  return { state, display }
}
