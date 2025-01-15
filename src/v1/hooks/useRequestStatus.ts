import { useState } from "react"

export const requestStatus = {
  IDLE: "IDLE",
  LOADING: "LOADING",
  ERRORED: "ERRORED",
}

export function useRequestStatus() {
  const [status, setRequestStatus] = useState(requestStatus.IDLE)

  return {
    setStatusIdle: () => setRequestStatus(requestStatus.IDLE),
    setStatusLoading: () => setRequestStatus(requestStatus.LOADING),
    setStatusErrored: () => setRequestStatus(requestStatus.ERRORED),
    isStatusIdle: status === requestStatus.IDLE,
    isStatusLoading: status === requestStatus.LOADING,
    isStatusErrored: status === requestStatus.ERRORED,
  }
}
