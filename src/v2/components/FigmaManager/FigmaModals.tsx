import { axiosInstance } from "@/v2/hooks/useAPI"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { config } from "@/v2/others/config"
import { useEffect, useState } from "react"
import figmaScreenshot from "@/v2/assets/images/figmaScreenshot.png"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ExternalLink } from "lucide-react"

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
  onClose,
  onSubmit,
  selectedAccount,
}: TeamsModalProps) => {
  const [teamName, setTeamName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

  const { state } = useGlobalState()

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      setHasError(false)
      setTeamName("")

      const getFigmaTeamId = async () => {
        const activeTabs = await chrome.tabs.query({
          active: true,
        })
        const figmaTab = activeTabs[0]
        const figmaUrlRegex = /\/(\d+)\//
        const figmaTeamId = figmaTab?.url?.match(figmaUrlRegex)?.[1]
        if (figmaTeamId) {
          try {
            console.log('Fetching team with:', { teamId: figmaTeamId, email: selectedAccount })
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
            console.log('Team result:', result.data)
            if (result.data.message === "User does not have access to this team." || !result.data.teamName) {
              setTeamName("No access - make sure the Figma account email matches the team owner")
              setHasError(true)
            } else {
              setTeamName(result.data.teamName)
              setHasError(false)
            }
          } catch (error: any) {
            console.error('Team loading error:', error.response?.data || error.message)
            setHasError(true)
            if (error.response?.data?.message === "User does not have access to this team.") {
              setTeamName("No access - make sure you're logged into the correct Figma account")
            } else {
              setTeamName(`Error: ${error.response?.data?.message || error.message || 'Unknown error'}`)
            }
          }
        } else {
          setTeamName("No team found in URL")
          setHasError(true)
        }
        setIsLoading(false)
      }
      getFigmaTeamId()
    }
  }, [isOpen])

  const canSubmit = !isLoading && !hasError && teamName.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[320px] p-4 gap-3">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-sm font-medium">Figma team</DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Select a team that you want to add in the figma tab and click submit
          </DialogDescription>
        </DialogHeader>

        <div className={`text-center py-3 px-2 rounded-md ${hasError ? 'bg-red-50 text-red-600' : 'bg-gray-50'}`}>
          {isLoading ? (
            <span className="text-xs text-gray-500">Loading...</span>
          ) : (
            <span className={`text-sm font-medium ${hasError ? 'text-red-600' : 'text-gray-900'}`}>
              {teamName}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-xs border border-gray-200 rounded hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => onSubmit(teamName)}
            disabled={!canSubmit}
            className={`flex-1 py-2 text-xs rounded transition-colors ${
              canSubmit
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Submit
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const OpenFigmaModal = ({
  isOpen,
  onClose,
  onOpenTab,
}: OpenFigmaModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[320px] p-4 gap-3">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-sm font-medium">Adding a team</DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Open Figma, select your team from the sidebar, then click the button below.
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full h-[100px] overflow-hidden rounded-md border border-gray-200">
          <img
            src={figmaScreenshot}
            alt="Figma team selection"
            className="absolute top-0 left-0 w-full object-cover object-top"
            style={{ height: "200%" }}
          />
        </div>

        <button
          onClick={onOpenTab}
          className="flex items-center justify-center gap-2 w-full py-2 text-xs bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Open Figma
        </button>
      </DialogContent>
    </Dialog>
  )
}
