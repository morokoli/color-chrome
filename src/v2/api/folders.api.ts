import { useQuery } from "@tanstack/react-query"
import { config } from "../others/config"
import { axiosInstance } from "../hooks/useAPI"
import { useGlobalState } from "../hooks/useGlobalState"

export interface Folder {
  _id: string
  name: string
  ownerId: string
  colorIds: string[]
  paletteIds: string[]
  childFolders?: string[]
  colors?: Color[]
  createdAt?: string
  updatedAt?: string
}

export interface Color {
  _id: string
  hex: string
  rgb?: string | { r: number; g: number; b: number }
  hsl?: string | { h: number; s: number; l: number }
  slash_naming?: string
  comments?: string
  ranking?: number
  tags?: string[]
  designTokens?: string[]
  additionalColumns?: Array<{ name: string; value: string }>
  createdAt?: string
  updatedAt?: string
  type?: "color" | "gradient"
  gradient_data?: {
    type: "linear" | "radial" | "conic"
    angle: number
    position: { x: number; y: number }
    stops: Array<{
      id: string
      color: string
      position: number
      hsl?: { h: number; s: number; l: number }
    }>
    figma?: any
  }
}

export interface SelectedColor {
  color: Color
  folderId: string
  folderName: string
  originalColorId: string
}

export interface GetFoldersResponse {
  folders: Folder[]
  folderTree?: Folder[]
}

/** Map API color payloads to client shape (designTokens only). */
function normalizeColor(raw: Record<string, unknown>): Color {
  const designTokens = Array.isArray(raw.designTokens)
    ? (raw.designTokens as string[])
    : Array.isArray(raw.design_tokens)
      ? (raw.design_tokens as string[])
      : []

  const { design_tokens: _omit, ...rest } = raw
  return {
    ...(rest as unknown as Color),
    designTokens,
  }
}

function normalizeFolder(raw: Record<string, unknown>): Folder {
  const colors = Array.isArray(raw.colors)
    ? raw.colors.map((c) => normalizeColor(c as Record<string, unknown>))
    : undefined
  const children = Array.isArray((raw as { children?: unknown[] }).children)
    ? (raw as { children: Record<string, unknown>[] }).children.map(normalizeFolder)
    : undefined

  return {
    ...(raw as unknown as Folder),
    colors,
    ...(children ? { children } : {}),
  } as Folder
}

function normalizeFoldersResponse(data: GetFoldersResponse): GetFoldersResponse {
  return {
    ...data,
    folders: (data.folders || []).map((f) =>
      normalizeFolder(f as unknown as Record<string, unknown>),
    ),
    folderTree: data.folderTree
      ? data.folderTree.map((f) =>
          normalizeFolder(f as unknown as Record<string, unknown>),
        )
      : undefined,
  }
}

export const useGetFolders = (populate: boolean = true) => {
  const { state } = useGlobalState()
  const workspaceId = state.activeWorkspaceId
  return useQuery<GetFoldersResponse, Error>({
    queryKey: ["folders", workspaceId, populate],
    refetchOnMount: "always",
    queryFn: async () => {
      const response = await axiosInstance.get(config.api.endpoints.getFolders, {
        headers: {
          Authorization: `Bearer ${state.user?.jwtToken}`,
        },
        params: {
          populate: populate ? "colors" : undefined,
        },
      })
      return normalizeFoldersResponse(response.data)
    },
    enabled: !!state.user?.jwtToken && !!workspaceId,
  })
}
