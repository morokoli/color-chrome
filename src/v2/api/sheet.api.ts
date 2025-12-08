import { axiosInstance } from "../hooks/useAPI"
import { useGlobalState } from "../hooks/useGlobalState"
import { config } from "../others/config"
import { useMutation } from "@tanstack/react-query"
import { AddMultipleColorsRequest, AddColorRequest } from "../types/api"

export const useGetSheet = (sheetId: string) => {
  const { state } = useGlobalState()
  const { mutate, data } = useMutation({
    mutationFn: async () => {
      const result = await axiosInstance.post(`${config.api.endpoints.sheetGetByURL}`, {
        url: sheetId
      }, {headers:{
        "Authorization": `Bearer ${state.user?.jwtToken}`,
      }})
      return result.data
    },
  })
  return { getSheet: mutate, data: data?.data }
}

export const useAddMultipleColors = () => {
  const { state } = useGlobalState()

  const { mutate, mutateAsync, data, isPending, isSuccess, isError, error } = useMutation({
    mutationFn: async (data: AddMultipleColorsRequest) => {
      const result = await axiosInstance.post(`${config.api.endpoints.addMultipleColors}`, { ...data }, {headers:{
        "Authorization": `Bearer ${state.user?.jwtToken}`,
      }})
      return result.data
    },
  })
  return { addMultipleColors: mutate, addMultipleColorsAsync: mutateAsync, data: data?.data, isPending, isSuccess, isError, error }
}

export const useAddColor = () => {
  const { state } = useGlobalState()

  const { mutate, mutateAsync, isPending } = useMutation({
    mutationFn: async (data: AddColorRequest) => {
      const result = await axiosInstance.post(config.api.endpoints.addColor, data, {
        headers: {
          "Authorization": `Bearer ${state.user?.jwtToken}`,
        },
      })
      return result.data
    },
  })
  return { addColor: mutate, addColorAsync: mutateAsync, isPending }
}

export const useUpsertColors = () => {
  const { state } = useGlobalState()

  const { mutate, mutateAsync, data, isPending, isSuccess, isError, error } = useMutation({
    mutationFn: async (data: AddMultipleColorsRequest) => {
      const result = await axiosInstance.post(config.api.endpoints.upsertColors, { ...data }, {
        headers: {
          "Authorization": `Bearer ${state.user?.jwtToken}`,
        },
      })
      return result.data
    },
  })
  return { upsertColors: mutate, upsertColorsAsync: mutateAsync, data: data?.data, isPending, isSuccess, isError, error }
}
