import { config } from '@/v2/others/config'

export interface Workspace {
  _id: string
  id?: string
  name: string
  avatarUrl?: string | null
  isPersonal?: boolean
  role?: string
}

export interface WorkspacesResponse {
  workspaces?: Workspace[]
}

export async function fetchWorkspaces(jwtToken: string): Promise<Workspace[]> {
  const response = await fetch(`${config.api.baseURL}/api/workspaces`, {
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      'ngrok-skip-browser-warning': 'true',
    },
  })
  if (!response.ok) throw new Error('Failed to load workspaces')
  const data = (await response.json()) as WorkspacesResponse
  return Array.isArray(data.workspaces) ? data.workspaces : []
}
