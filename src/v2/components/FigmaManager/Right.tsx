import { useEffect, useMemo, useRef, useState } from "react"
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
import { omit } from "es-toolkit/object"
import { ColorList } from "@/v2/components/FigmaManager/ColorList"
import { AccountDropdown } from "./AccountDropdown"
import { TeamsModal, OpenFigmaModal } from "./FigmaModals"
import { TeamsDropdown } from "./TeamsDropdown"
import { ProjectDropdown } from "./ProjectDropdown"
import { MultiSelectDropdown } from "./MultiSelectDropdown"
import { useToast } from "@/v2/hooks/useToast"
import { UpdateRowResponse } from "@/v2/types/api"
import { useAPI } from "@/v2/hooks/useAPI"
import { UpdateRowRequest } from "@/v2/types/api"
import { DeletionConfirmationModal } from "./DeletionConfirmationModal"
import { CollapsibleBox } from "../CollapsibleBox"
import { SlashNameInputs } from "./SlashNameInputs"

interface FigmaFile {
  name: string
  key: string
}

const Right = ({
  setIsLeftOpen,
}: {
  setIsLeftOpen: (isOpen: boolean) => void
}) => {
  const { state, dispatch } = useGlobalState()
  const { selectedColorsFromFile } = state
  const [slash_nameInputs, setslash_nameInputs] = useState<string[]>([
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

  const [deletionConfirmationModalOpen, setDeletionConfirmationModalOpen] =
    useState(false)
  const [onDeletionText, setOnDeletionText] = useState("")
  const onConfirmDeletion = useRef<() => void>(() => {})

  const { data: teamsData } = useFigmaGetTeams(selectedAccount)

  const [selectedTeam, setSelectedTeam] = useState("Figma Team")
  const [teams, setTeams] = useState([
    { name: "Figma Team 1", id: "" },
    { name: "Figma Team 2", id: "" },
  ])

  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [files, setFiles] = useState<FigmaFile[]>([])

  useEffect(() => {
    setIsLeftOpen(selectedFiles.length > 0)
  }, [selectedFiles])

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
      setFiles(allFiles as any)
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
    const getslash_nameParts = (colorId: number) => {
      const parts = selectedColorsFromFile[colorId]?.slash_naming
        .split("/")
        .map((p) => p.trim())
        .slice(0, 5)
      return parts
    }

    // Handling the "Select All" checkbox
    if (colorId === selectedColorsFromFile.length) {
      if (activeColors.length === 0) {
        setActiveColors(selectedColorsFromFile.map((_, i) => i))
        const parts = getslash_nameParts(0)
        const sharedParts = parts.map((part) =>
          selectedColorsFromFile.every((color) =>
            color.slash_naming.includes(part),
          )
            ? part
            : "",
        )
        const filled = [...sharedParts, "", "", "", "", ""].slice(0, 5)
        setslash_nameInputs(filled)
      } else {
        setActiveColors([])
        setslash_nameInputs(["", "", "", "", ""])
      }
      return
    }

    if (activeColors.includes(colorId)) {
      const filteredColors = activeColors.filter((color) => color !== colorId)
      setActiveColors(filteredColors)

      if (filteredColors.length === 0) {
        setslash_nameInputs(["", "", "", "", ""])
      } else if (filteredColors.length === 1) {
        const parts = getslash_nameParts(filteredColors[0])
        const filled = [...parts, "", "", "", "", ""].slice(0, 5)
        setslash_nameInputs(filled)
      } else {
        const parts = getslash_nameParts(filteredColors[0])
        const sharedParts = parts.map((part) =>
          selectedColorsFromFile
            .filter(
              (_, index) => activeColors.includes(index) && index !== colorId,
            )
            .every((color) => color.slash_naming.includes(part))
            ? part
            : "",
        )
        const filled = [...sharedParts, "", "", "", "", ""].slice(0, 5)
        setslash_nameInputs(filled)
      }
    } else {
      const parts = getslash_nameParts(colorId)
      const sharedParts = parts.map((part) =>
        selectedColorsFromFile
          .filter((_, index) => activeColors.includes(index))
          .every((color) => color.slash_naming.includes(part))
          ? part
          : "",
      )
      const filled = [...sharedParts, "", "", "", "", ""].slice(0, 5)
      setslash_nameInputs(filled)
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

  const handleChangeslash_naming = () => {
    if (!activeColors.length) return
    const newslash_naming = slash_nameInputs.filter(Boolean).join(" / ")
    dispatch({
      type: "UPDATE_SELECTED_COLOR_slash_naming",
      payload: { colors: activeColors, slash_naming: newslash_naming },
    })
  }

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

  const deleteAccount = async (email: string) => {
    setOnDeletionText(`Are you sure you want to delete the account ${email}?`)
    setDeletionConfirmationModalOpen(true)
    const onConfirmDeletionFunction = async () => {
      const response = await deleteAccountMutation({
        email: email,
      })
      if (response.data.message === "Account deleted") {
        setAccounts(accounts.filter((account) => account !== email))
        setSelectedAccount(accounts.find((account) => account !== email) ?? "")
      }
    }
    onConfirmDeletion.current = onConfirmDeletionFunction
  }

  const deleteTeam = async (teamId: string) => {
    setOnDeletionText(
      `Are you sure you want to delete the team ${teams.find((team) => team.id === teamId)?.name}?`,
    )
    setDeletionConfirmationModalOpen(true)

    const onConfirmDeletionFunction = async () => {
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
    }
    onConfirmDeletion.current = onConfirmDeletionFunction
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
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        spreadsheetId: color.color.sheetData.spreadsheetId,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        sheetId: color.color.sheetData.sheetId,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        rowIndex: color.color.rowIndex,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        sheetName: color.color.sheetData.sheetName,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        row: {
          ...omit(color.color as Record<string, any>, [
            "id",
            "year",
            "month",
            "day",
            "hours",
            "minutes",
            "addedBy",
            "hue",
            "saturation",
            "lightness",
            "sheetData",
            "rowIndex",
            "tags",
          ]),
          colorId: (color.color as any).id,
          tags: ((color.color as any).tags ? [(color.color as any).tags] : []) as any,
          slash_naming: color.slash_naming,
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
        slash_name: color.slash_naming,
      })),
      email: selectedAccount,
    })
    toast.display("success", response.data.message[0].message)
  }

  const handleManualslash_namingChange = (
    colorId: number,
    slash_nameInput: string,
  ) => {
    const newslash_naming = slash_nameInput
      .replace(/\s+/g, "")
      .replace(/ /g, "/")
      .replace(/\//g, " / ")
    dispatch({
      type: "UPDATE_SELECTED_COLOR_slash_naming",
      payload: { colors: [colorId], slash_naming: newslash_naming },
    })
  }

  const clearColors = () => {
    setActiveColors([])
    setslash_nameInputs(["", "", "", "", ""])
    dispatch({ type: "CLEAR_SELECTED_COLORS_FROM_FILE" })
  }

  let warning = ""

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
      <div
        className="flex mb-4 gap-4 grid"
        style={{
          gridTemplateColumns: selectedFiles.length > 0 ? "47.5% 47.5%" : "1fr",
        }}
      >
        <AccountDropdown
          selectedAccount={selectedAccount}
          accounts={accounts}
          onSelectAccount={handleSelectAccount}
          onConnectAccount={connectFigmaAccount}
          onDeleteAccount={deleteAccount}
        />

        <TeamsDropdown
          isVisible={selectedAccount.length > 0}
          selectedTeam={selectedTeam}
          teams={teams}
          onSelectTeam={handleSelectTeam}
          onConnectTeam={getTeams}
          onDeleteTeam={deleteTeam}
        />

        <ProjectDropdown
          isVisible={selectedTeam.length > 0}
          selectedProjects={selectedProjects}
          projects={projects}
          onSelectProjects={handleSelectProjects}
        />

        <MultiSelectDropdown<FigmaFile>
          isVisible={selectedProjects.length > 0}
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

        {/* <button
          onClick={connectFigmaAccount}
          className="border p-1 w-full text-sm"
        >
          Connect Figma Account
        </button> */}
      </div>

      <CollapsibleBox
        isOpen={warning.length > 0}
        maxHeight="100px"
        transitionDuration={300}
      >
        <div className="bg-[#F6FF03] p-2 mb-4 border text-sm">
          {warning || "All done!"}
        </div>
      </CollapsibleBox>
      <CollapsibleBox
        isOpen={selectedFiles.length > 0}
        transitionDuration={500}
        maxHeight={`${selectedColorsFromFile.length * 100 + 500}px`}
      >
        <SlashNameInputs
          inputs={slash_nameInputs}
          onInputChange={setslash_nameInputs}
          onChangeslash_naming={handleChangeslash_naming}
        />

        <div className="bg-[#F6FF03] p-2 mb-4 border text-sm">
          Slash Name changes are applied for Figma Export only. If you want to
          save them to the spreadsheet, you need to click the "Save Changes"
          button.
        </div>

        <ColorList
          clearColors={clearColors}
          colors={selectedColorsFromFile}
          activeColors={activeColors}
          onCheckboxClick={handleCheckboxClick}
          onRemoveColor={(color) =>
            dispatch({
              type: "REMOVE_SELECTED_COLOR_FROM_FILE",
              payload: color,
            })
          }
          handleManualslash_namingChange={handleManualslash_namingChange}
        />

        <div
          style={{ width: "360px" }}
          className="fixed bottom-4 width flex justify-between mt-2"
        >
          <button onClick={handleSaveChanges} className="border bg-white p-2">
            Save Changes
          </button>
          <button onClick={handleAddColors} className="bg-black text-white p-2">
            Export
          </button>
        </div>
        <div style={{ height: "50px" }}/>
      </CollapsibleBox>

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

      <DeletionConfirmationModal
        isOpen={deletionConfirmationModalOpen}
        text={onDeletionText}
        onClose={() => setDeletionConfirmationModalOpen(false)}
        onConfirm={onConfirmDeletion}
      />
    </div>
  )
}

export default Right
