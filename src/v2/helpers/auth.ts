import { config } from '@/v2/others/config'
import { RefreshAccessTokenResponse } from '@/v2/types/api'

export const Auth = {
  async refreshAuthToken(
    jwtToken: string,
    setToken: (data: RefreshAccessTokenResponse) => void,
  ): Promise<void> {
    const url = config.api.baseURL + config.api.endpoints.refreshAccessToken

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwtToken}`
        },
      })

      const bodyJson = await res.json()
      setToken(bodyJson.data as RefreshAccessTokenResponse)
    } catch (err) {
      console.warn(err)
    }
  },
}
