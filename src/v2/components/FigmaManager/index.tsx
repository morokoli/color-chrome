import { useState, useEffect, useRef } from "react"
import { ArrowLeft, Plus, X } from "lucide-react"
import { useFigmaBindAccount, useFigmaDeleteAccount, useFigmaGetAccounts } from "@/v2/api/figma.api"
import { config } from "@/v2/others/config"
import { DeletionConfirmationModal } from "./DeletionConfirmationModal"

interface Props {
  setTab: (tab: string | null) => void
}

const FigmaManager: React.FC<Props> = ({ setTab }) => {
  const { mutateAsync: bindAccountMutation } = useFigmaBindAccount()
  const { mutateAsync: deleteAccountMutation } = useFigmaDeleteAccount()
  const { data: accountsData, isLoading: isAccountsLoading } = useFigmaGetAccounts()

  const [accounts, setAccounts] = useState<string[]>([])
  const [deletionModalOpen, setDeletionModalOpen] = useState(false)
  const [deletionText, setDeletionText] = useState("")
  const onConfirmDeletion = useRef<() => void>(() => {})

  useEffect(() => {
    if (!isAccountsLoading && accountsData?.data?.accounts) {
      setAccounts(accountsData.data.accounts)
    }
  }, [isAccountsLoading, accountsData])

  const bindAccount = async () => {
    const response = await bindAccountMutation()
    if (response.data.email) {
      setAccounts([...accounts, response.data.email])
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

  return (
    <div className="bg-white rounded-md overflow-visible w-[360px]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200">
        <button
          onClick={() => setTab(null)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <span className="text-[13px] font-medium text-gray-800">Figma</span>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Add Account Button */}
        <button
          onClick={connectFigmaAccount}
          className="flex items-center justify-center gap-2 w-full py-2 px-3 text-[12px] border border-gray-200 rounded hover:bg-gray-50 transition-colors mb-4"
        >
          <Plus className="w-4 h-4 text-gray-600" />
          <span>Connect Figma Account</span>
        </button>

        {/* Accounts List */}
        {isAccountsLoading ? (
          <div className="text-center text-gray-500 text-sm py-4">
            Loading accounts...
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            <div className="mb-2">No Figma accounts connected</div>
            <div className="text-[11px] text-gray-300">
              Click the button above to connect your first account
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((account) => (
              <div
                key={account}
                className="flex items-center justify-between p-2 border-b border-gray-200 transition-colors"
              >
                <span className="text-[12px] text-gray-800 truncate flex-1">
                  {account}
                </span>
                <button
                  onClick={() => deleteAccount(account)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0 ml-2"
                  title="Delete account"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deletion Confirmation Modal */}
      <DeletionConfirmationModal
        isOpen={deletionModalOpen}
        text={deletionText}
        onClose={() => setDeletionModalOpen(false)}
        onConfirm={onConfirmDeletion}
      />
    </div>
  )
}

export default FigmaManager
