import { Plus } from "lucide-react"
import { Dropdown } from "./Dropdown"

interface AccountDropdownProps {
  selectedAccount: string
  accounts: string[]
  isDropdownOpen: boolean
  onToggleDropdown: () => void
  onSelectAccount: (account: string) => void
  onConnectAccount: () => void
}

export const AccountDropdown = ({
  selectedAccount,
  accounts,
  onSelectAccount,
  onConnectAccount,
}: Omit<AccountDropdownProps, "isDropdownOpen" | "onToggleDropdown">) => {
  return (
    <Dropdown
      selected={selectedAccount}
      items={accounts}
      renderSelected={(account) => (
        <p className="text-ellipsis overflow-hidden">{account}</p>
      )}
      renderItem={(account) => account}
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
