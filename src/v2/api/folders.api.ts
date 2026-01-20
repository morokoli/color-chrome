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
  additionalColumns?: Array<{ name: string; value: string }>
  createdAt?: string
  updatedAt?: string
}

export interface SelectedColor {
  color: Color
  folderId: string
  folderName: string
  originalColorId: string
}

export interface GetFoldersResponse {
  folders: Folder[]
}

export const useGetFolders = (populate: boolean = true) => {
  const { state } = useGlobalState()
  return useQuery<GetFoldersResponse, Error>({
    queryKey: ["folders", populate],
    queryFn: async () => {
      const response = await axiosInstance.get(config.api.endpoints.getFolders, {
        headers: {
          Authorization: `Bearer ${state.user?.jwtToken}`,
        },
        params: {
          populate: populate ? "colors" : undefined,
        },
      })
      return response.data
    },
    enabled: !!state.user?.jwtToken,
  })
}
