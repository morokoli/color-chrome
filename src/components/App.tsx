import { useReducer, useEffect } from "react"
import { initGlobalState, globalReducer } from "@/reducers/globalReducer"
import { ExtentionContainer } from "@/components/ExtensionContainer"
import { modeTabs } from "@/others/static"
import { Tabs } from "@/components/Tabs"
import { ModeTab } from "@/types/general"
import { GoogleSignInScreen } from "@/screens/GoogleSignInScreen"
import { getAuthCookie } from "@/helpers/cookie"
import { Show } from "./Show"
import { ToastContext } from "@/context/toastContext"
import { GlobalStateContext } from "@/context/globalStateContext"
import { FileAddScreen } from "@/screens/FileAddScreen"
import { SheetActionsScreen } from "@/screens/SheetActionsScreen"
import { AccountScreen } from "@/screens/AccountScreen"
import { initToastState, toastReducer } from "@/reducers/toastReducer"
import { Auth } from "@/helpers/auth"

export function App() {
  const [state, dispatch] = useReducer(globalReducer, initGlobalState)
  const [toastState, toastDispatch] = useReducer(toastReducer, initToastState)

  useEffect(() => {
    /** check if user is logged in  */
    getAuthCookie().then((user) => {
      dispatch({ type: "SET_USER", payload: user })

      /** refresh auth tokens in background */
      if (user && user.refreshToken) {
        const now = new Date().getTime()
        if (now > user.expiry) {
          Auth.refreshAuthToken(user.refreshToken, (data) => {
            dispatch({ type: "UPDATE_ACCESS_TOKEN", payload: data })
          })
        }
      }
    })

    /** if state was in update color mode, revert it back to add color mode */
    dispatch({ type: "SET_SUBMIT_MODE", payload: { add: true } })
    dispatch({ type: "RESET_ADDITIONAL_FIELDS" })
  }, [])

  return (
    <GlobalStateContext.Provider value={{ state, dispatch }}>
      <ToastContext.Provider
        value={{ state: toastState, dispatch: toastDispatch }}
      >
        <ExtentionContainer>
          <Show if={state.user === null}>
            <GoogleSignInScreen />
          </Show>

          <Show if={state.user !== null}>
            <Tabs
              tabs={modeTabs}
              selected={state.selectedTab}
              setSelected={(tab: ModeTab) =>
                dispatch({ type: "SWITCH_TAB", payload: tab })
              }
            />

            <div className="p-4">
              <Show if={state.selectedTab === "SELECT"}>
                <SheetActionsScreen />
              </Show>

              <Show if={state.selectedTab === "ADD"}>
                <FileAddScreen />
              </Show>

              <Show if={state.selectedTab === "ACCOUNT"}>
                <AccountScreen
                  name={state.user?.name}
                  email={state.user?.email}
                  reset={() => {
                    const isConfirmed = window.confirm(
                      "Are you sure you want to logout?",
                    )
                    if (!isConfirmed) return
                    dispatch({ type: "RESET_STATE" })
                    window.close()
                  }}
                />
              </Show>
            </div>
          </Show>
        </ExtentionContainer>
      </ToastContext.Provider>
    </GlobalStateContext.Provider>
  )
}
