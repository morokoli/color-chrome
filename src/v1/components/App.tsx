import { useReducer, useEffect } from "react"
import { initGlobalState, globalReducer } from "@/v1/reducers/globalReducer"
import { ExtensionContainer } from "@/v1/components/ExtensionContainer"
import { modeTabs } from "@/v1/others/static"
import { Tabs } from "@/v1/components/Tabs"
import { ModeTab } from "@/v1/types/general"
import { GoogleSignInScreen } from "@/v1/screens/GoogleSignInScreen"
import { getAuthCookie } from "@/v1/helpers/cookie"
import { Show } from "./Show"
import { ToastContext } from "@/v1/context/toastContext"
import { GlobalStateContext } from "@/v1/context/globalStateContext"
import { FileAddScreen } from "@/v1/screens/FileAddScreen"
import { SheetActionsScreen } from "@/v1/screens/SheetActionsScreen"
import { AccountScreen } from "@/v1/screens/AccountScreen"
import { initToastState, toastReducer } from "@/v1/reducers/toastReducer"
import { Auth } from "@/v1/helpers/auth"

export function App() {
  const [state, dispatch] = useReducer(globalReducer, initGlobalState)
  const [toastState, toastDispatch] = useReducer(toastReducer, initToastState)

  useEffect(() => {
    /** check if user is logged in */
    const intervalId = setInterval(() => {
      getAuthCookie().then((user) => {
        if (user) {
          dispatch({ type: "SET_USER", payload: user })
          clearInterval(intervalId);
          
          /** refresh auth tokens in background */
          if (user.refreshToken) {
            const now = new Date().getTime()
            if (now > user.expiry) {
              Auth.refreshAuthToken(user.refreshToken, (data) => {
                dispatch({ type: "UPDATE_ACCESS_TOKEN", payload: data })
              })
            }
          }
        }
      })
    }, 2000);

    /** if state was in update color mode, revert it back to add color mode */
    dispatch({ type: "SET_SUBMIT_MODE", payload: { add: true } })
    dispatch({ type: "RESET_ADDITIONAL_FIELDS" })
  }, [])

  return (
    <GlobalStateContext.Provider value={{ state, dispatch }}>
      <ToastContext.Provider
        value={{ state: toastState, dispatch: toastDispatch }}
      >
        <ExtensionContainer>
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
        </ExtensionContainer>
      </ToastContext.Provider>
    </GlobalStateContext.Provider>
  )
}
