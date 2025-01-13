export async function getPageURL(): Promise<string | undefined> {
  if (!chrome.tabs) {
    return window.location.href
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  return tabs[0].url
}
