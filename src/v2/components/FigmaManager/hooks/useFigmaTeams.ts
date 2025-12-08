import { useState, useEffect, useRef } from "react"
import {
  useFigmaGetTeams,
  useFigmaAddTeam,
  useFigmaDeleteTeam,
} from "@/v2/api/figma.api"

export interface FigmaTeam {
  name: string
  id: string
}

export function useFigmaTeams(selectedAccount: string) {
  const [teams, setTeams] = useState<FigmaTeam[]>([])
  const [selectedTeam, setSelectedTeam] = useState("")

  const { data: teamsData } = useFigmaGetTeams(selectedAccount)
  const { mutateAsync: addTeamMutation } = useFigmaAddTeam()
  const { mutateAsync: deleteTeamMutation } = useFigmaDeleteTeam()

  // Modals state
  const [teamsModalOpen, setTeamsModalOpen] = useState(false)
  const [openFigmaModalOpen, setOpenFigmaModalOpen] = useState(false)

  // Deletion confirmation state
  const [deletionModalOpen, setDeletionModalOpen] = useState(false)
  const [deletionText, setDeletionText] = useState("")
  const onConfirmDeletion = useRef<() => void>(() => {})

  useEffect(() => {
    if (teamsData?.data?.teams) {
      setTeams(teamsData.data.teams)
      if (teamsData.data.teams.length > 0) {
        setSelectedTeam(teamsData.data.teams[0].name)
      }
    } else {
      setTeams([])
      setSelectedTeam("")
    }
  }, [teamsData])

  const getTeams = async () => {
    const figmaTabs = await chrome.tabs.query({ active: true })
    const figmaTab = figmaTabs[0]
    if (
      figmaTab?.url?.includes("figma.com") &&
      figmaTab?.url?.includes("team")
    ) {
      setTeamsModalOpen(true)
    } else {
      setOpenFigmaModalOpen(true)
    }
  }

  const addTeam = async (teamId: string, teamName: string) => {
    await addTeamMutation({
      teamId,
      teamName,
      email: selectedAccount,
    })
    const newTeam = { name: teamName, id: teamId }
    setTeams([...teams, newTeam])
    setSelectedTeam(teamName)
  }

  const deleteTeam = async (teamId: string) => {
    const teamName = teams.find((team) => team.id === teamId)?.name
    setDeletionText(`Are you sure you want to delete the team ${teamName}?`)
    setDeletionModalOpen(true)

    const onConfirmDeletionFunction = async () => {
      const response = await deleteTeamMutation({
        email: selectedAccount,
        teamId,
      })

      if (response.data.message === "Team deleted") {
        const remainingTeams = teams.filter((team) => team.id !== teamId)
        setTeams(remainingTeams)
        setSelectedTeam(remainingTeams[0]?.name ?? "")
      }
    }
    onConfirmDeletion.current = onConfirmDeletionFunction
  }

  const handleTeamsModalSubmit = async (teamName: string) => {
    const activeTabs = await chrome.tabs.query({ active: true })
    const figmaTab = activeTabs[0]
    const figmaUrlRegex = /\/(\d+)\//
    const figmaTeamId = figmaTab?.url?.match(figmaUrlRegex)?.[1]

    if (figmaTeamId) {
      const finalTeamName = teamName.length > 0 ? teamName : `Team ${teams.length + 1}`
      await addTeam(figmaTeamId, finalTeamName)
      setTeamsModalOpen(false)
    }
  }

  const handleOpenFigmaTab = async () => {
    setOpenFigmaModalOpen(false)
    await chrome.tabs.create({ url: "https://www.figma.com" })
  }

  return {
    teams,
    selectedTeam,
    setSelectedTeam,
    getTeams,
    addTeam,
    deleteTeam,
    // Modal state
    teamsModalOpen,
    setTeamsModalOpen,
    openFigmaModalOpen,
    setOpenFigmaModalOpen,
    handleTeamsModalSubmit,
    handleOpenFigmaTab,
    // Deletion state
    deletionModalOpen,
    setDeletionModalOpen,
    deletionText,
    onConfirmDeletion,
  }
}
