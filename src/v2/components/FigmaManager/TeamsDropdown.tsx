import { Plus } from "lucide-react"
import { Dropdown } from "./Dropdown"
import cancelIcon from "../../assets/images/icons/menu/cancel.svg"

interface TeamsDropdownProps {
  selectedTeam: string
  teams: {
    name: string
    id: string
  }[]
  onSelectTeam: (team: string) => void
  onConnectTeam: () => void
  onDeleteTeam: (teamId: string) => void
  isVisible?: boolean
}

export const TeamsDropdown = ({
  selectedTeam,
  teams,
  onSelectTeam,
  onConnectTeam,
  onDeleteTeam,
  isVisible = true,
}: Omit<TeamsDropdownProps, "isDropdownOpen" | "onToggleDropdown">) => {
  return (
    <Dropdown
      isVisible={isVisible}
      placeholder="Select a team"
      selected={selectedTeam}
      items={teams.map((team) => team.name)}
      renderSelected={(team) => (
        <p className="text-ellipsis overflow-hidden">{team}</p>
      )}
      renderItem={(teamName) => {
        const team = teams.find((t) => t.name === teamName);
        return (
          <div className="text-ellipsis overflow-hidden flex justify-between items-center w-full group">
            <span className="text-ellipsis overflow-hidden">{teamName}</span>
            <img
              src={cancelIcon}
              alt="Delete"
              className="w-4 h-4 opacity-0 group-hover:opacity-100 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (team) onDeleteTeam(team.id);
              }}
            />
          </div>
        );
      }}
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