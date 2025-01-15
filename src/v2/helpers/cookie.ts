import { config } from '@/v2/others/config'
import { AuthUser, DriveFileCreateFormFieldsWithId } from '@/v2/types/general'

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
    name: config.cookie.cookieNameAuth,
    url: config.api.baseURL + "/",
  })
  if (!cookie) return null

  /** cookie value us URL encoded */
  return JSON.parse(decodeURIComponent(cookie.value)) as AuthUser
}

export async function getSheetFileDataCookie(): Promise<DriveFileCreateFormFieldsWithId | null> {
  if (!chrome.cookies) return null;
  const cookie = await chrome.cookies.get({
    name: config.cookie.cookieNameSheetFileData,
    url: config.api.baseURL + "/",
  })
  if (!cookie) return null;

  return JSON.parse(cookie.value);
}

export function setCookie(cookieName: string, cookieValue: DriveFileCreateFormFieldsWithId) {
  chrome.cookies.set({
      name: cookieName,
      value: JSON.stringify(cookieValue),
      url: config.api.baseURL + "/",
      expirationDate: new Date().getTime() / 1000 + (30 * 24 * 60 * 60) // 30 days in seconds
  });
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

  if (!parseCookies[config.cookie.cookieNameAuth]) {
    return null
  }

  return JSON.parse(parseCookies[config.cookie.cookieNameAuth]) as AuthUser
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
        name: config.cookie.cookieNameAuth,
        url: import.meta.env.VITE_API_URL,
      })
      .then(() => resolve())
  })
}
