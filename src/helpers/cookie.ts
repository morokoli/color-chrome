import { config } from "@/others/config"
import { AuthUser } from "@/types/general"

/**
 * inside the context of a chrome extension, received cookies are not stored
 * inside "document.cookie". Instead they can be accessed through "chrome.cookie".
 * this function reads and returns the contents of auth cookie, if it exists
 *
 */
export async function getAuthCookie(): Promise<AuthUser | null> {
  if (!chrome.cookies) {
    return parseDocumentCookie()
  }

  const cookie = await chrome.cookies.get({
    name: config.cookie.cookieName,
    url: config.api.baseURL + "/",
  })
  if (!cookie) return null

  /** cookie value us URL encoded */
  return JSON.parse(decodeURIComponent(cookie.value)) as AuthUser
}

function parseDocumentCookie() {
  const parseCookies = document.cookie
    .split(";")
    .map((v) => v.split("="))
    .reduce(
      (acc, v) => {
        acc[decodeURIComponent(v[0]).trim()] = decodeURIComponent(v[1])
        return acc
      },
      {} as Record<string, string>,
    )

  if (!parseCookies[config.cookie.cookieName]) {
    return null
  }

  return JSON.parse(parseCookies[config.cookie.cookieName]) as AuthUser
}

/**
 * when a user logs-out, we need to delete all existing cookies for the extension
 * cookies are set in two ways
 * - during development, cookies are set on document.cookie
 * - during production (when running as extension), cookies are set using chrome.cookies
 *
 */
export async function eraseAllCookies() {
  return new Promise<void>((resolve) => {
    if (!chrome.cookies) {
      document.cookie.split(";").forEach(function (c) {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
      })
      return resolve()
    }

    chrome.cookies
      .remove({
        name: config.cookie.cookieName,
        url: import.meta.env.VITE_API_URL,
      })
      .then(() => resolve())
  })
}
