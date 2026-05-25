import { config } from "@/v2/others/config"

/** Open web app plans page with extension session (chrome-handoff). */
export function openWebAppPlansUpgrade(jwt: string | null | undefined) {
  const base = config.webApp.baseURL.replace(/\/$/, "")
  if (!jwt) {
    chrome.tabs.create({ url: `${base}/login` })
    return
  }
  const url = `${base}/chrome-handoff?upgrade=1#token=${encodeURIComponent(jwt)}`
  chrome.tabs.create({ url })
}
