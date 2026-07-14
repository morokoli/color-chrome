type StartSnapshotOptions = {
  onError?: (message: string) => void
  onSuccess?: () => void
  closePopup?: boolean
}

export function startSnapshotCapture(options: StartSnapshotOptions = {}) {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      options.onError?.(
        chrome.runtime.lastError.message || "Failed to find active tab",
      )
      return
    }

    const tab = tabs[0]
    if (!tab?.id) {
      options.onError?.("No active tab found")
      return
    }

    const url = tab.url || ""
    if (
      url.startsWith("chrome://") ||
      url.startsWith("chrome-extension://") ||
      url.startsWith("edge://") ||
      url.startsWith("about:")
    ) {
      options.onError?.("Cannot capture snapshot on this page")
      return
    }

    // Fire-and-forget from popup (no callback) so closing the popup never races the port.
    // Background keeps the service worker alive with return true until injection finishes.
    chrome.runtime.sendMessage({ type: "START_SNAPSHOT", tabId: tab.id })

    options.onSuccess?.()
    if (options.closePopup !== false) {
      // Brief delay so the message is queued before the popup context is destroyed
      setTimeout(() => window.close(), 100)
    }
  })
}
