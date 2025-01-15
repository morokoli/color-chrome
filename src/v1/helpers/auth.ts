import { config } from "@/v1/others/config"
import {
  RefreshAccessTokenRequest,
  RefreshAccessTokenResponse,
} from "@/v1/types/api"

export const Auth = {
  async refreshAuthToken(
    refreshToken: string,
    setToken: (data: RefreshAccessTokenResponse) => void,
  ): Promise<void> {
    const url = config.api.baseURL + config.api.endpoints.refreshAccessToken
    const body: RefreshAccessTokenRequest = { refreshToken }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      const bodyJson = await res.json()
      setToken(bodyJson.data as RefreshAccessTokenResponse)
    } catch (err) {
      console.warn(err)
    }
  },
}
