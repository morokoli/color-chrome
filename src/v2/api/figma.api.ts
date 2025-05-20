// I'm starting to use react-query from here on out, to save on the headache of managing data

import { useMutation, useQueries, useQuery } from "@tanstack/react-query"
import { config } from "../others/config"
import {
  FigmaAddTeamResponse,
  FigmaBindAccountResponse,
  FigmaGetAccountsResponse,
  FigmaGetFilesResponse,
  FigmaGetProjectsResponse,
  FigmaGetTeamsResponse,
} from "../types/api"
import { axiosInstance } from "../hooks/useAPI"
import { useGlobalState } from "../hooks/useGlobalState"

export const useFigmaGetAccounts = () => {
  const { state } = useGlobalState()
  return useQuery<FigmaGetAccountsResponse, Error>({
    queryKey: ["figma-get-accounts"],
    queryFn: () => {
      return axiosInstance.get(config.api.endpoints.figmaGetAccounts, {
        headers: {
          Authorization: `Bearer ${state.user?.jwtToken}`,
        },
      })
    },
  })
}

export const useFigmaBindAccount = () => {
  const { state } = useGlobalState()
  return useMutation<FigmaBindAccountResponse, Error>({
    mutationFn: () => {
      return axiosInstance.post(
        config.api.endpoints.figmaBindAccount,
        {},
        {
          headers: {
            Authorization: `Bearer ${state.user?.jwtToken}`,
          },
        },
      )
    },
  })
}

export const useFigmaGetTeams = (email: string | undefined) => {
  const { state } = useGlobalState()
  return useQuery<FigmaGetTeamsResponse, Error>({
    queryKey: ["figma-get-teams", email],
    enabled: !!state.user?.jwtToken && !!email,
    queryFn: () => {
      return axiosInstance.get(config.api.endpoints.figmaGetTeams, {
        headers: {
          Authorization: `Bearer ${state.user?.jwtToken}`,
        },
        params: {
          email,
        },
      })
    },
  })
}

export const useFigmaAddTeam = () => {
  const { state } = useGlobalState()
  return useMutation<
    FigmaAddTeamResponse,
    Error,
    { teamId: string; teamName: string; email: string }
  >({
    mutationFn: ({ teamId, teamName, email }) => {
      return axiosInstance.post(
        config.api.endpoints.figmaAddTeam,
        { teamId, teamName, email },
        {
          headers: {
            Authorization: `Bearer ${state.user?.jwtToken}`,
          },
        },
      )
    },
  })
}

export const useFigmaGetProjects = (
  teamId: string | undefined,
  email: string | undefined,
) => {
  const { state } = useGlobalState()
  return useQuery<FigmaGetProjectsResponse, Error>({
    queryKey: ["figma-get-projects", teamId, email],
    enabled: !!teamId,
    queryFn: () => {
      return axiosInstance.get(config.api.endpoints.figmaGetProjects, {
        headers: {
          Authorization: `Bearer ${state.user?.jwtToken}`,
        },
        params: {
          teamId,
          email,
        },
      })
    },
  })
}

export const useFigmaMultipleProjects = (
  teamIds: string[],
  email: string | undefined,
) => {
  const { state } = useGlobalState()
  return useQueries<FigmaGetProjectsResponse[]>({
    queries: teamIds.map((teamId) => ({
      queryKey: ["figma-get-projects", teamId, email],
      queryFn: () => {
        return axiosInstance.get(config.api.endpoints.figmaGetProjects, {
          headers: {
            Authorization: `Bearer ${state.user?.jwtToken}`,
          },
          params: {
            teamId,
            email,
          },
        })
      },
    })),
  })
}

export const useFigmaGetFiles = (
  projectId: string | undefined,
  email: string | undefined,
) => {
  const { state } = useGlobalState()
  return useQuery<FigmaGetFilesResponse, Error>({
    queryKey: ["figma-get-files", projectId, email],
    enabled: !!projectId,
    queryFn: () => {
      return axiosInstance.get(config.api.endpoints.figmaGetFiles, {
        headers: {
          Authorization: `Bearer ${state.user?.jwtToken}`,
        },
        params: {
          projectId,
          email,
        },
      })
    },
  })
}

export const useFigmaMultipleProjectsFiles = (
  projectIds: string[],
  email: string | undefined,
) => {
  const { state } = useGlobalState()
  return useQueries<FigmaGetFilesResponse[]>({
    queries: projectIds.map((projectId) => ({
      queryKey: ["figma-get-files", projectId, email],
      queryFn: async () => {
        const response = await axiosInstance.get(
          config.api.endpoints.figmaGetFiles,
          {
            headers: {
              Authorization: `Bearer ${state.user?.jwtToken}`,
            },
            params: {
              projectId,
              email,
            },
          },
        )
        return response.data
      },
    })),
  })
}
export const useFigmaAddColors = () => {
  const { state } = useGlobalState()
  return useMutation<
    any,
    Error,
    {
      fileIds: string[]
      colors: { hex: string; slashName: string }[]
      email: string
    }
  >({
    mutationFn: ({ fileIds, colors, email }) => {
      return axiosInstance.post(
        config.api.endpoints.figmaAddColors,
        { fileIds, colors, email },
        {
          headers: {
            Authorization: `Bearer ${state.user?.jwtToken}`,
          },
        },
      )
    },
  })
}

export const useFigmaDeleteAccount = () => {
  const { state } = useGlobalState()
  return useMutation<any, Error, { email: string }>({
    mutationFn: ({ email }) => {
      return axiosInstance.delete(config.api.endpoints.figmaDeleteAccount, {
        headers: {
          Authorization: `Bearer ${state.user?.jwtToken}`,
        },
        data: { email },
      })
    },
  })
}

export const useFigmaDeleteTeam = () => {
  const { state } = useGlobalState()
  return useMutation<any, Error, { email: string; teamId: string }>({
    mutationFn: ({ email, teamId }) => {
      return axiosInstance.delete(config.api.endpoints.figmaDeleteTeam, {
        headers: {
          Authorization: `Bearer ${state.user?.jwtToken}`,
        },
        data: { email, teamId },
      })
    },
  })
}
