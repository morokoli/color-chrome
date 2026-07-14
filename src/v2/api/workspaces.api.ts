import { useMutation, useQuery } from "@tanstack/react-query"
import { axiosInstance } from "../hooks/useAPI"
import { config } from "../others/config"
import { useGlobalState } from "../hooks/useGlobalState"
import type { Workspace } from "../types/general"

export interface ListWorkspacesResponse {
  data?: Array<{ workspace: Workspace; membership?: { role?: string } }>
  workspaces?: Workspace[]
  activeWorkspaceId?: string | null
  defaultWorkspaceId?: string | null
}

export function normalizeWorkspacesResponse(
  response: ListWorkspacesResponse,
): { workspaces: Workspace[]; activeWorkspaceId: string | null } {
  const fromData = Array.isArray(response.data)
    ? response.data
        .map((item) => {
          const ws = item?.workspace
          if (!ws) return null
          const id = ws._id || (ws as { id?: string }).id
          if (!id) return null
          return {
            ...ws,
            _id: id,
            role: ws.role || item.membership?.role,
          } as Workspace
        })
        .filter(Boolean) as Workspace[]
    : []

  const workspaces =
    fromData.length > 0
      ? fromData
      : (response.workspaces || []).map((ws) => ({
          ...ws,
          _id: ws._id || (ws as { id?: string }).id || "",
        }))

  const activeWorkspaceId =
    response.activeWorkspaceId ||
    response.defaultWorkspaceId ||
    workspaces[0]?._id ||
    null

  return { workspaces, activeWorkspaceId }
}

export async function fetchWorkspaces(jwtToken: string): Promise<{
  workspaces: Workspace[]
  activeWorkspaceId: string | null
}> {
  const response = await axiosInstance.get<ListWorkspacesResponse>(
    config.api.endpoints.workspaces,
    {
      headers: { Authorization: `Bearer ${jwtToken}` },
    },
  )
  return normalizeWorkspacesResponse(response.data)
}

export async function setActiveWorkspaceOnServer(
  jwtToken: string,
  workspaceId: string,
): Promise<{ activeWorkspaceId?: string; defaultWorkspaceId?: string }> {
  const response = await axiosInstance.post(
    config.api.endpoints.setActiveWorkspace,
    { workspaceId },
    { headers: { Authorization: `Bearer ${jwtToken}` } },
  )
  return response.data
}

export const WORKSPACE_QUERY_KEY = ["workspaces"] as const

export function useGetWorkspaces() {
  const { state } = useGlobalState()
  return useQuery({
    queryKey: WORKSPACE_QUERY_KEY,
    queryFn: () => fetchWorkspaces(state.user!.jwtToken),
    enabled: !!state.user?.jwtToken,
    staleTime: 30_000,
  })
}

export function useSetActiveWorkspace() {
  const { state } = useGlobalState()
  return useMutation({
    mutationFn: (workspaceId: string) =>
      setActiveWorkspaceOnServer(state.user!.jwtToken, workspaceId),
  })
}
