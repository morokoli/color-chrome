import { Plus } from "lucide-react"
import { Dropdown } from "./Dropdown"

interface TeamsDropdownProps {
  selectedTeam: string
  teams: {
    name: string
    id: string
  }[]
  onSelectTeam: (team: string) => void
  onConnectTeam: () => void
}

export const TeamsDropdown = ({
  selectedTeam,
  teams,
  onSelectTeam,
  onConnectTeam,
}: Omit<TeamsDropdownProps, "isDropdownOpen" | "onToggleDropdown">) => {
  return (
    <Dropdown
      selected={selectedTeam}
      items={teams.map((team) => team.name)}
      renderSelected={(team) => (
        <p className="text-ellipsis overflow-hidden">{team}</p>
      )}
      renderItem={(team) => team}
      onSelect={onSelectTeam}
      renderFooter={() => (
        <div
          onClick={onConnectTeam}
          className="flex justify-center items-center py-2 cursor-pointer hover:bg-gray-100"
        >
          <Plus size={20} />
        </div>
      )}
    />
  )
}