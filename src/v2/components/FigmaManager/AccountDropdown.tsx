import { Plus } from "lucide-react"
import { Dropdown } from "./Dropdown"
import cancelIcon from "../../assets/images/icons/menu/cancel.svg"

interface AccountDropdownProps {
  selectedAccount: string
  accounts: string[]
  isDropdownOpen: boolean
  onToggleDropdown: () => void
  onSelectAccount: (account: string) => void
  onConnectAccount: () => void
  onDeleteAccount: (account: string) => void
  isVisible?: boolean
}

export const AccountDropdown = ({
  selectedAccount,
  accounts,
  onSelectAccount,
  onConnectAccount,
  onDeleteAccount,
  isVisible = true,
}: Omit<AccountDropdownProps, "isDropdownOpen" | "onToggleDropdown">) => {
  return (
    <Dropdown
      isVisible={isVisible}
      placeholder="Select an account"
      selected={selectedAccount}
      items={accounts}
      renderSelected={(account) => (
        <p className="text-ellipsis overflow-hidden">{account}</p>
      )}
      renderItem={(account) => (
        <div className="flex justify-between items-center w-full group">
          <span className="text-ellipsis overflow-hidden">{account}</span>
          <img
            src={cancelIcon}
            alt="Delete"
            className="w-4 h-4 hidden group-hover:block cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              onDeleteAccount(account)
            }}
          />
        </div>
      )}
      onSelect={onSelectAccount}
      renderFooter={() => (
        <div
          onClick={onConnectAccount}
          className="flex justify-center items-center py-2 cursor-pointer hover:bg-gray-100"
        >
          <Plus size={20} />
        </div>
      )}
    />
  )
}
