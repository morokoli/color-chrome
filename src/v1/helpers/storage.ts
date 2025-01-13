import { GlobalState } from "@/v1/types/general"

export const Storage = {
  storeKey: "color.picker.ext",

  fetchState(): GlobalState | undefined {
    const stateJSON = localStorage.getItem(this.storeKey)
    if (!stateJSON) return

    let state: GlobalState
    try {
      state = JSON.parse(stateJSON) as GlobalState
    } catch {
      return
    }

    return state
  },

  storeState(state: GlobalState) {
    const stateJSON = JSON.stringify(state)
    localStorage.setItem(this.storeKey, stateJSON)
  },

  clearStoredState() {
    localStorage.removeItem(this.storeKey)
  },
}
