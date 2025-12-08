import { useState, useEffect, useMemo } from "react"
import {
  useFigmaGetProjects,
  useFigmaMultipleProjectsFiles,
} from "@/v2/api/figma.api"
import { FigmaTeam } from "./useFigmaTeams"

export interface FigmaProject {
  name: string
  id: string
}

export interface FigmaFile {
  name: string
  key: string
}

export function useFigmaProjectsFiles(
  teams: FigmaTeam[],
  selectedTeam: string,
  selectedAccount: string
) {
  const [projects, setProjects] = useState<FigmaProject[]>([])
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [files, setFiles] = useState<FigmaFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<FigmaFile[]>([])

  const selectedTeamId = teams.find((team) => team.name === selectedTeam)?.id

  const { data: projectsData } = useFigmaGetProjects(selectedTeamId, selectedAccount)

  // Get project IDs from selected project names
  const selectedProjectIds = useMemo(
    () =>
      selectedProjects
        .map((projectName) => projects.find((p) => p.name === projectName)?.id)
        .filter(Boolean) as string[],
    [selectedProjects, projects]
  )

  const multipleProjectsData = useFigmaMultipleProjectsFiles(
    selectedProjectIds,
    selectedAccount
  )

  const isLoading = multipleProjectsData.some(
    (result) => result?.isLoading || !result
  )

  // Update projects when team changes
  useEffect(() => {
    if (projectsData?.data?.projects) {
      setProjects(projectsData.data.projects)
      if (projectsData.data.projects.length > 0) {
        setSelectedProjects([projectsData.data.projects[0].name])
      }
    } else {
      setProjects([])
      setSelectedProjects([])
      setSelectedFiles([])
      setFiles([])
    }
  }, [projectsData])

  // Update files when projects change
  useEffect(() => {
    if (multipleProjectsData && !isLoading) {
      const allFiles = multipleProjectsData
        .map((project) => project?.data?.files)
        .flat()
        .filter(Boolean) as FigmaFile[]
      setFiles(allFiles)
    }
  }, [isLoading, selectedProjects])

  // Reset when team changes
  const resetOnTeamChange = () => {
    setProjects([])
    setSelectedProjects([])
    setSelectedFiles([])
    setFiles([])
  }

  return {
    projects,
    selectedProjects,
    setSelectedProjects,
    files,
    selectedFiles,
    setSelectedFiles,
    isLoading,
    resetOnTeamChange,
  }
}
