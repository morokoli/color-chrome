import { axiosInstance } from "@/v2/hooks/useAPI"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { config } from "@/v2/others/config"
import { useEffect, useState } from "react"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
}

interface TeamsModalProps extends ModalProps {
  onSubmit: (teamName: string) => void
  selectedAccount: string
}

interface OpenFigmaModalProps extends ModalProps {
  onOpenTab: () => void
}

export const TeamsModal = ({
  isOpen,
  onSubmit,
  selectedAccount,
}: TeamsModalProps) => {
  const [teamName, setTeamName] = useState("")

  const { state } = useGlobalState()

  useEffect(() => {
    if (isOpen) {
      const getFigmaTeamId = async () => {
        const activeTabs = await chrome.tabs.query({
          active: true,
        })
        const figmaTab = activeTabs[0]
        const figmaUrlRegex = /\/(\d+)\//
        const figmaTeamId = figmaTab?.url?.match(figmaUrlRegex)?.[1]
        if (figmaTeamId) {
          const result = await axiosInstance.get(
            config.api.endpoints.figmaGetProjects,
            {
              headers: {
                Authorization: `Bearer ${state.user?.jwtToken}`,
              },
              params: {
                teamId: figmaTeamId,
                email: selectedAccount,
              },
            },
          )

          console.log(result.data)
          setTeamName(result.data.teamName)
        }
      }
      getFigmaTeamId()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 w-[300px] rounded border flex flex-col justify-center gap-4">
        <h2 className="text-xl text-center">Figma team</h2>
        <p>
          Select a team that you want to add in the figma tab and click submit
        </p>
        <input
          value={teamName}
          type="text"
          placeholder="Custom Team Name"
          onChange={(e) => {
            setTeamName(e.target.value)
          }}
        />
        <button className="border p-1 text-sm" onClick={() => onSubmit(teamName)}>
          Submit
        </button>
      </div>
    </div>
  )
}

export const OpenFigmaModal = ({
  isOpen,
  onOpenTab,
}: OpenFigmaModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 m-6 rounded border flex flex-col justify-center gap-4">
        <h2 className="text-xl mb-4 text-center">Adding a team</h2>
        <p>
          To add a team, open figma, select the team you want to add and click
          this button again
        </p>
        <button className="border p-1 text-sm" onClick={onOpenTab}>
          Open tab
        </button>
      </div>
    </div>
  )
}
