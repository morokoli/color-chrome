import { useState, useEffect, useRef } from "react"
import { config } from "@/v2/others/config"
import {
  useFigmaBindAccount,
  useFigmaDeleteAccount,
  useFigmaGetAccounts,
} from "@/v2/api/figma.api"

export function useFigmaAccounts() {
  const [accounts, setAccounts] = useState<string[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>("")

  const { mutateAsync: bindAccountMutation } = useFigmaBindAccount()
  const { mutateAsync: deleteAccountMutation } = useFigmaDeleteAccount()
  const { data: accountsData, isLoading: isAccountsLoading } = useFigmaGetAccounts()

  // Deletion confirmation state
  const [deletionModalOpen, setDeletionModalOpen] = useState(false)
  const [deletionText, setDeletionText] = useState("")
  const onConfirmDeletion = useRef<() => void>(() => {})

  useEffect(() => {
    if (!isAccountsLoading && accountsData?.data?.accounts) {
      setAccounts(accountsData.data.accounts)
      setSelectedAccount(accountsData.data.accounts[0] ?? "")
    }
  }, [isAccountsLoading, accountsData])

  const bindAccount = async () => {
    const response = await bindAccountMutation()
    if (response.data.email) {
      setAccounts([...accounts, response.data.email])
      setSelectedAccount(response.data.email)
      chrome.cookies.remove({
        name: config.cookie.cookieNameFigmaJwt,
        url: config.api.baseURL,
      })
    }
  }

  const connectFigmaAccount = async () => {
    const figmaLoginWindow = await window.open(
      `${config.api.baseURL}${config.api.endpoints.figmaAuth}`,
      "Figma Sign-in",
      "width=1000,height=700",
    )

    const loginPromise = new Promise((resolve) => {
      const interval = setInterval(() => {
        if (figmaLoginWindow?.closed) {
          clearInterval(interval)
          chrome.cookies
            .get({
              name: config.cookie.cookieNameFigmaJwt,
              url: config.api.baseURL,
            })
            .then((res) => {
              resolve(res?.value)
            })
        }
      }, 1000)
    })

    loginPromise.then(async (res) => {
      if (res) {
        await bindAccount()
      }
    })
  }

  const deleteAccount = async (email: string) => {
    setDeletionText(`Are you sure you want to delete the account ${email}?`)
    setDeletionModalOpen(true)

    const onConfirmDeletionFunction = async () => {
      const response = await deleteAccountMutation({ email })
      if (response.data.message === "Account deleted") {
        setAccounts(accounts.filter((account) => account !== email))
        setSelectedAccount(accounts.find((account) => account !== email) ?? "")
      }
    }
    onConfirmDeletion.current = onConfirmDeletionFunction
  }

  // Check for existing Figma JWT on mount
  useEffect(() => {
    const getFigmaJwt = async () => {
      const figmaJwt = await chrome.cookies.get({
        name: config.cookie.cookieNameFigmaJwt,
        url: config.api.baseURL,
      })
      if (figmaJwt?.value) {
        await bindAccount()
      }
    }
    getFigmaJwt()
  }, [])

  return {
    accounts,
    selectedAccount,
    setSelectedAccount,
    connectFigmaAccount,
    deleteAccount,
    deletionModalOpen,
    setDeletionModalOpen,
    deletionText,
    onConfirmDeletion,
  }
}
