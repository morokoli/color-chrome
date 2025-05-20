import { useEffect, useMemo, useState } from "react"
import { useGlobalState } from "@/v2/hooks/useGlobalState"
import { config } from "@/v2/others/config"
import {
  useFigmaAddColors,
  useFigmaAddTeam,
  useFigmaBindAccount,
  useFigmaDeleteAccount,
  useFigmaDeleteTeam,
  useFigmaGetAccounts,
  useFigmaGetProjects,
  useFigmaGetTeams,
  useFigmaMultipleProjectsFiles,
} from "@/v2/api/figma.api"
import { ColorList } from "@/v2/components/FigmaManager/ColorList"
import { AccountDropdown } from "./AccountDropdown"
import { TeamsModal, OpenFigmaModal } from "./FigmaModals"
import { SlashNameInputs } from "./SlashNameInputs"
import { TeamsDropdown } from "./TeamsDropdown"
import { ProjectDropdown } from "./ProjectDropdown"
import { MultiSelectDropdown } from "./MultiSelectDropdown"
import { useToast } from "@/v2/hooks/useToast"
import { UpdateRowResponse } from "@/v2/types/api"
import { useAPI } from "@/v2/hooks/useAPI"
import { UpdateRowRequest } from "@/v2/types/api"

interface FigmaFile {
  name: string
  key: string
}

const Right = () => {
  const { state, dispatch } = useGlobalState()
  const { selectedColorsFromFile } = state
  const [slashNameInputs, setSlashNameInputs] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
  ])
  const [activeColors, setActiveColors] = useState<number[]>([])
  const toast = useToast()

  const { mutateAsync: bindAccountMutation } = useFigmaBindAccount()
  const { mutateAsync: deleteAccountMutation } = useFigmaDeleteAccount()
  const { mutateAsync: deleteTeamMutation } = useFigmaDeleteTeam()
  const { mutateAsync: addColorsMutation } = useFigmaAddColors()
  const { data: accountsData, isLoading: isAccountsLoading } =
    useFigmaGetAccounts()
  const { mutateAsync: addTeamMutation } = useFigmaAddTeam()

  const [accounts, setAccounts] = useState<string[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>("")

  const [teamsModalOpen, setTeamsModalOpen] = useState(false)
  const [openFigmaModalOpen, setFigmaModalOpen] = useState(false)

  const [selectedFiles, setSelectedFiles] = useState<FigmaFile[]>([])

  const [projects, setProjects] = useState<
    {
      name: string
      id: string
    }[]
  >([])

  const { data: teamsData } = useFigmaGetTeams(selectedAccount)

  const [selectedTeam, setSelectedTeam] = useState("Figma Team")
  const [teams, setTeams] = useState([
    { name: "Figma Team 1", id: "" },
    { name: "Figma Team 2", id: "" },
  ])

  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [files, setFiles] = useState<FigmaFile[]>([])

  // Get files from all selected projects
  const selectedProjectIds = useMemo(
    () =>
      selectedProjects
        .map((projectName) => projects.find((p) => p.name === projectName)?.id)
        .filter(Boolean) as string[],
    [selectedProjects, projects],
  )

  const { data: projectsData } = useFigmaGetProjects(
    teams.find((team) => team.name === selectedTeam)?.id,
    selectedAccount,
  )
  const multipleProjectsData = useFigmaMultipleProjectsFiles(
    selectedProjectIds,
    selectedAccount,
  )
  const isLoading = multipleProjectsData.some(
    (result) => result?.isLoading || !result,
  )
  // Fetch files from all selected projects
  useEffect(() => {
    if (multipleProjectsData && !isLoading) {
      const allFiles = multipleProjectsData
        .map((project) => project?.data?.files)
        .flat()
      setFiles(allFiles)
    }
  }, [isLoading, selectedProjects])

  useEffect(() => {
    if (projectsData?.data?.projects) {
      setProjects(projectsData.data.projects)
      if (projectsData.data.projects.length > 0) {
        setSelectedProjects([projectsData.data.projects[0].name])
      }
    } else {
      setSelectedProjects([])
      setSelectedFiles([])
      setFiles([])
    }
  }, [projectsData])

  useEffect(() => {
    if (teamsData?.data?.teams) {
      setTeams(teamsData.data.teams)
      if (teamsData.data.teams.length > 0) {
        setSelectedTeam(teamsData.data.teams[0].name)
      }
    } else {
      setTeams([])
      setProjects([])
      setSelectedProjects([])
      setSelectedFiles([])
      setFiles([])
      setSelectedTeam("")
    }
  }, [teamsData])

  const handleSelectTeam = (team: string) => {
    setSelectedTeam(team)
  }

  const handleCheckboxClick = (colorId: number) => {
    if (activeColors.includes(colorId)) {
      const filteredColors = activeColors.filter((color) => color !== colorId)
      setActiveColors(filteredColors)
      if (filteredColors.length === 0) {
        setSlashNameInputs(["", "", "", "", ""])
      } else {
        const parts = selectedColorsFromFile[filteredColors[0]]?.slashNaming
          .split("/")
          .map((p) => p.trim())
          .slice(0, 5)
        const filled = [...parts, "", "", "", "", ""].slice(0, 5)
        setSlashNameInputs(filled)
      }
    } else {
      const parts = selectedColorsFromFile[colorId]?.slashNaming
        .split("/")
        .map((p) => p.trim())
        .slice(0, 5)
      const filled = [...parts, "", "", "", "", ""].slice(0, 5)
      setSlashNameInputs(filled)
      setActiveColors([...activeColors, colorId])
    }
  }

  useEffect(() => {
    if (!isAccountsLoading && accountsData?.data?.accounts) {
      setAccounts(accountsData.data.accounts)
      setSelectedAccount(accountsData.data.accounts[0] ?? "")
    }
  }, [isAccountsLoading, accountsData])

  const getTeams = async () => {
    const figmaTabs = await chrome.tabs.query({ active: true })
    const figmaTab = figmaTabs[0]
    if (
      figmaTab?.url?.includes("figma.com") &&
      figmaTab?.url?.includes("team")
    ) {
      setTeamsModalOpen(true)
    } else {
      setFigmaModalOpen(true)
    }
  }

  const handleChangeSlashNaming = () => {
    if (!activeColors.length) return
    const newSlashNaming = slashNameInputs.filter(Boolean).join(" / ")
    dispatch({
      type: "UPDATE_SELECTED_COLOR_SLASHNAMING",
      payload: { colors: activeColors, slashNaming: newSlashNaming },
    })
  }

  const bindAccount = async () => {
    const response = await bindAccountMutation()
    console.log("response", response)
    if (response.data.email) {
      setAccounts([...accounts, response.data.email])
      setSelectedAccount(response.data.email)
      chrome.cookies.remove({
        name: config.cookie.cookieNameFigmaJwt,
        url: config.api.baseURL,
      })
    }
  }

  const deleteAccount = async (email: string) => {
    const response = await deleteAccountMutation({
      email: email,
    })
    if (response.data.message === "Account deleted") {
      setAccounts(accounts.filter((account) => account !== email))
      setSelectedAccount(
        accounts.find((account) => account !== email)?.name ?? "",
      )
    }
    console.log("response", response)
  }

  const deleteTeam = async (teamId: string) => {
    const response = await deleteTeamMutation({
      email: selectedAccount,
      teamId: teamId,
    })

    if (response.data.message === "Team deleted") {
      setTeams(teams.filter((team) => team.id !== teamId))
      setSelectedTeam(
        teams.find((team) => team.id !== teamId)?.name ?? "Figma Team",
      )
    }
    console.log("response", response)
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

  useEffect(() => {
    const getFigmaJwt = async () => {
      const figmaJwt = await chrome.cookies.get({
        name: config.cookie.cookieNameFigmaJwt,
        url: config.api.baseURL,
      })
      console.log("figmaJwt", figmaJwt)
      if (figmaJwt?.value) {
        await bindAccount()
      }
    }
    getFigmaJwt()
  }, [])

  const handleSelectAccount = (account: string) => {
    setSelectedAccount(account)
  }

  const handleSelectProjects = (projects: string[]) => {
    setSelectedProjects(projects)
  }

  const handleAddTeam = async (teamId: string, teamName: string) => {
    addTeamMutation({
      teamId: teamId,
      teamName: teamName,
      email: selectedAccount,
    })
  }

  const updateRow = useAPI<UpdateRowRequest, UpdateRowResponse>({
    url: config.api.endpoints.updateRow,
    method: "PUT",
    jwtToken: state.user?.jwtToken,
  })

  const handleSaveChanges = async () => {
    const promises = selectedColorsFromFile.map(async (color) => {
      const response = await updateRow.call({
        spreadsheetId: color.color.sheetData.spreadsheetId,
        sheetId: color.color.sheetData.sheetId,
        rowIndex: color.color.rowIndex,
        sheetName: color.color.sheetData.sheetName,
        row: {
          ...color.color,
          slashNaming: color.slashNaming,
          timestamp: Date.now(),
        },
      })
      return response
    })

    await Promise.all(promises)
  }

  const handleAddColors = async () => {
    const response = await addColorsMutation({
      fileIds: selectedFiles.map((file) => file.key),
      colors: selectedColorsFromFile.map((color) => ({
        hex: color.color.hex,
        slashName: color.slashNaming,
      })),
      email: selectedAccount,
    })
    toast.display("success", response.data.message[0].message)
  }

  let warning = ''

  if (!selectedAccount) {
    warning = "Please select a figma account to continue"
  } else if (!selectedTeam) {
    warning = "Please select a team to continue"
  } else if (!(selectedProjects.length > 0)) {
    warning = "Please select a project to continue"
  } else if (!(selectedFiles.length > 0)) {
    warning = "Please select a file to continue"
  }

  return (
    <div className="relative min-h-[100vh] overflow-y-auto p-4">
      <div className="flex mb-4 gap-4 grid grid-cols-2">
        <AccountDropdown
          selectedAccount={selectedAccount}
          accounts={accounts}
          onSelectAccount={handleSelectAccount}
          onConnectAccount={connectFigmaAccount}
          onDeleteAccount={deleteAccount}
        />

        {selectedAccount && (
          <TeamsDropdown
            selectedTeam={selectedTeam}
            teams={teams}
            onSelectTeam={handleSelectTeam}
            onConnectTeam={getTeams}
            onDeleteTeam={deleteTeam}
          />
        )}

        {selectedTeam && (
          <ProjectDropdown
            selectedProjects={selectedProjects}
            projects={projects}
            onSelectProjects={handleSelectProjects}
          />
        )}

        {selectedProjects.length > 0 && (
          <MultiSelectDropdown<FigmaFile>
            placeholder="Select Files"
            selected={selectedFiles}
            items={files}
            onSelect={(newSelected) => setSelectedFiles(newSelected)}
            renderItem={(file: FigmaFile) => file?.name}
            renderSelected={(selected: FigmaFile[]) => {
              if (selected.length === 0) return "Select Files"
              if (selected.length === 1) return selected[0]?.name
              return `${selected.length} files selected`
            }}
          />
        )}

        {/* <button
          onClick={connectFigmaAccount}
          className="border p-1 w-full text-sm"
        >
          Connect Figma Account
        </button> */}
      </div>

      {warning && (
        <div className="bg-[#F6FF03] p-2 mb-4 border text-sm">
          {warning}
        </div>
      )}


      <SlashNameInputs
        inputs={slashNameInputs}
        onInputChange={setSlashNameInputs}
        onChangeSlashNaming={handleChangeSlashNaming}
      />

      <div className="bg-[#F6FF03] p-2 mb-4 border text-sm">
        <strong>!!! Warning !!!:</strong> Slash Name changes are temporarily to
        export into Figma.
      </div>

      <ColorList
        colors={selectedColorsFromFile}
        activeColors={activeColors}
        onCheckboxClick={handleCheckboxClick}
        onRemoveColor={(color) =>
          dispatch({
            type: "REMOVE_SELECTED_COLOR_FROM_FILE",
            payload: color,
          })
        }
      />

      {selectedFiles.length > 0 && (
        <div className="flex justify-between mt-2">
          <button onClick={handleSaveChanges} className="border p-2">
            Save Changes
          </button>
          <button onClick={handleAddColors} className="bg-black text-white p-2">
            Export
          </button>
        </div>
      )}

      <TeamsModal
        isOpen={teamsModalOpen}
        onClose={() => setTeamsModalOpen(false)}
        selectedAccount={selectedAccount}
        onSubmit={async (teamName: string) => {
          const activeTabs = await chrome.tabs.query({
            active: true,
          })
          const figmaTab = activeTabs[0]
          const figmaUrlRegex = /\/(\d+)\//
          const figmaTeamId = figmaTab?.url?.match(figmaUrlRegex)?.[1]
          if (figmaTeamId) {
            setTeams([
              ...teams,
              {
                name:
                  teamName.length > 0 ? teamName : `Team ${teams.length + 1}`,
                id: figmaTeamId,
              },
            ])
            setSelectedTeam(
              teamName.length > 0 ? teamName : `Team ${teams.length + 1}`,
            )
            handleAddTeam(
              figmaTeamId,
              teamName.length > 0 ? teamName : `Team ${teams.length + 1}`,
            )
            setTeamsModalOpen(false)
          }
        }}
      />

      <OpenFigmaModal
        isOpen={openFigmaModalOpen}
        onClose={() => setFigmaModalOpen(false)}
        onOpenTab={async () => {
          setFigmaModalOpen(false)
          await chrome.tabs.create({ url: "https://www.figma.com" })
        }}
      />
    </div>
  )
}

export default Right
