import { useContext, useEffect } from "react"
import { GlobalStateContext } from "@/v1/context/globalStateContext"
import { Storage } from "@/v1/helpers/storage"

export function useGlobalState() {
  const value = useContext(GlobalStateContext)

  /** persist state to local storage */
  useEffect(() => {
    Storage.storeState(value.state)
  }, [value.state])

  return value
}
