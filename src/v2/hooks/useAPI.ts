import { useRequestStatus } from './useRequestStatus'
import { config } from '@/v2/others/config'
import axios, { AxiosError } from 'axios'

export const axiosInstance = axios.create({
  baseURL: config.api.baseURL,
  timeout: config.api.timeout,
  withCredentials: true,
})

type APIArguments = {
  url: string
  method: "GET" | "POST" | "PUT" | "DELETE",
  jwtToken?: string,
}

export type APIResponse<T extends Record<string, unknown>> =
  | { success: true; data: T }
  | { success: false; error: string; statusCode: number }

export function useAPI<T, E extends Record<string, unknown>>(
  args: APIArguments,
) {
  const {
    setStatusIdle,
    setStatusLoading,
    setStatusErrored,
    isStatusLoading,
    isStatusErrored,
    isStatusIdle,
  } = useRequestStatus()

  const call = (payload: T | undefined = undefined) => {
    return new Promise<E>((resolve, reject) => {
      setStatusLoading()
      axiosInstance
        .request({ url: args.url, method: args.method, data: payload, headers: {
          "Authorization": args.jwtToken ? `Bearer ${args.jwtToken}` : undefined
        } })
        .then((res) => {
          setStatusIdle()
          const data = res.data as APIResponse<E>
          if (data.success) {
            resolve(data.data)
          } else {
            reject(data.error)
          }
        })
        .catch((err): void => {
          setStatusErrored()
          if (err instanceof AxiosError) {
            const message: string =
              err.response?.data.error ?? "Unexpected API error"
            return reject(message)
          }

          reject(err)
        })
    })
  }

  return {
    isStatusLoading,
    isStatusErrored,
    isStatusIdle,
    call,
  }
}
