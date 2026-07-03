// Snapshot capture overlay - region or full viewport selection
(function () {
  // Allow re-inject if previous overlay was removed but flag stuck
  if (window.__cwuSnapshotActive && document.getElementById("cwu-snapshot-toolbar")) {
    return
  }
  window.__cwuSnapshotActive = false

  let overlay = null
  let toolbar = null
  let selectionBox = null
  let dimTop = null
  let dimBottom = null
  let dimLeft = null
  let dimRight = null
  let sizeLabel = null
  let mode = "idle" // idle | selecting
  let startX = 0
  let startY = 0
  let currentRect = null

  function createToolbar() {
    overlay = document.createElement("div")
    overlay.id = "cwu-snapshot-overlay"
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483646;
      pointer-events: none;
    `

    toolbar = document.createElement("div")
    toolbar.id = "cwu-snapshot-toolbar"
    toolbar.style.cssText = `
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(20, 20, 20, 0.92);
      border-radius: 10px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.35);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      pointer-events: auto;
    `

    const btnStyle = `
      padding: 8px 14px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    `

    const entireBtn = document.createElement("button")
    entireBtn.textContent = "Capture entire"
    entireBtn.style.cssText = btnStyle + "background: #fff; color: #141414;"
    entireBtn.addEventListener("mouseover", () => {
      entireBtn.style.background = "#f0f0f0"
    })
    entireBtn.addEventListener("mouseout", () => {
      entireBtn.style.background = "#fff"
    })
    entireBtn.addEventListener("click", () => {
      captureRegion({
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      })
    })

    const regionBtn = document.createElement("button")
    regionBtn.textContent = "Select portion"
    regionBtn.style.cssText =
      btnStyle + "background: #333; color: #fff; border: 1px solid #555;"
    regionBtn.addEventListener("mouseover", () => {
      regionBtn.style.background = "#444"
    })
    regionBtn.addEventListener("mouseout", () => {
      regionBtn.style.background = "#333"
    })
    regionBtn.addEventListener("click", () => {
      startRegionSelection()
    })

    const cancelBtn = document.createElement("button")
    cancelBtn.textContent = "Cancel"
    cancelBtn.style.cssText =
      btnStyle + "background: transparent; color: #aaa; border: 1px solid #555;"
    cancelBtn.addEventListener("click", () => cancel())

    toolbar.appendChild(entireBtn)
    toolbar.appendChild(regionBtn)
    toolbar.appendChild(cancelBtn)
    document.body.appendChild(toolbar)
    document.body.appendChild(overlay)
  }

  function createSelectionElements() {
    const dimStyle = `
      position: fixed;
      background: rgba(0, 0, 0, 0.45);
      pointer-events: none;
      z-index: 2147483645;
    `

    dimTop = document.createElement("div")
    dimBottom = document.createElement("div")
    dimLeft = document.createElement("div")
    dimRight = document.createElement("div")
    ;[dimTop, dimBottom, dimLeft, dimRight].forEach((el) => {
      el.style.cssText = dimStyle
      el.style.display = "none"
      document.body.appendChild(el)
    })

    selectionBox = document.createElement("div")
    selectionBox.style.cssText = `
      position: fixed;
      border: 2px solid #fff;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.3);
      background: transparent;
      pointer-events: none;
      z-index: 2147483646;
      display: none;
    `
    document.body.appendChild(selectionBox)

    sizeLabel = document.createElement("div")
    sizeLabel.style.cssText = `
      position: fixed;
      background: rgba(0,0,0,0.85);
      color: #fff;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-family: ui-monospace, monospace;
      pointer-events: none;
      z-index: 2147483647;
      display: none;
    `
    document.body.appendChild(sizeLabel)
  }

  function updateDimRects(rect) {
    if (!rect || rect.width < 2 || rect.height < 2) {
      ;[dimTop, dimBottom, dimLeft, dimRight, selectionBox, sizeLabel].forEach(
        (el) => {
          if (el) el.style.display = "none"
        },
      )
      return
    }

    const { x, y, width, height } = rect
    dimTop.style.display = "block"
    dimTop.style.top = "0"
    dimTop.style.left = "0"
    dimTop.style.width = "100vw"
    dimTop.style.height = `${y}px`

    dimBottom.style.display = "block"
    dimBottom.style.top = `${y + height}px`
    dimBottom.style.left = "0"
    dimBottom.style.width = "100vw"
    dimBottom.style.height = `${window.innerHeight - y - height}px`

    dimLeft.style.display = "block"
    dimLeft.style.top = `${y}px`
    dimLeft.style.left = "0"
    dimLeft.style.width = `${x}px`
    dimLeft.style.height = `${height}px`

    dimRight.style.display = "block"
    dimRight.style.top = `${y}px`
    dimRight.style.left = `${x + width}px`
    dimRight.style.width = `${window.innerWidth - x - width}px`
    dimRight.style.height = `${height}px`

    selectionBox.style.display = "block"
    selectionBox.style.left = `${x}px`
    selectionBox.style.top = `${y}px`
    selectionBox.style.width = `${width}px`
    selectionBox.style.height = `${height}px`

    sizeLabel.style.display = "block"
    sizeLabel.style.left = `${x}px`
    sizeLabel.style.top = `${Math.max(0, y - 28)}px`
    sizeLabel.textContent = `${Math.round(width)} × ${Math.round(height)}`
  }

  function startRegionSelection() {
    mode = "selecting"
    if (toolbar) toolbar.style.display = "none"
    overlay.style.pointerEvents = "auto"
    overlay.style.cursor = "crosshair"
    currentRect = null
    updateDimRects(null)
  }

  function handleMouseDown(e) {
    if (mode !== "selecting") return
    e.preventDefault()
    startX = e.clientX
    startY = e.clientY
    currentRect = { x: startX, y: startY, width: 0, height: 0 }
    updateDimRects(currentRect)
  }

  function handleMouseMove(e) {
    if (mode !== "selecting" || !currentRect) return
    const x = Math.min(startX, e.clientX)
    const y = Math.min(startY, e.clientY)
    const width = Math.abs(e.clientX - startX)
    const height = Math.abs(e.clientY - startY)
    currentRect = { x, y, width, height }
    updateDimRects(currentRect)
  }

  function handleMouseUp(e) {
    if (mode !== "selecting" || !currentRect) return
    if (currentRect.width < 10 || currentRect.height < 10) {
      currentRect = null
      updateDimRects(null)
      return
    }
    mode = "idle"
    captureRegion(currentRect)
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      if (mode === "selecting") {
        mode = "idle"
        currentRect = null
        updateDimRects(null)
        if (toolbar) toolbar.style.display = "flex"
        overlay.style.pointerEvents = "none"
        overlay.style.cursor = "default"
      } else {
        cancel()
      }
    }
  }

  async function captureRegion(rect) {
    if (toolbar) toolbar.style.display = "none"
    updateDimRects(null)
    if (overlay) overlay.style.pointerEvents = "none"

    // Let toolbar hide before screenshot
    await new Promise((resolve) => setTimeout(resolve, 50))

    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "CAPTURE_SCREEN" }, resolve)
      })

      if (!response || !response.dataUrl) {
        alert("Failed to capture screen. Please try again.")
        cleanup()
        return
      }

      const img = await loadImage(response.dataUrl)
      const scaleX = img.width / window.innerWidth
      const scaleY = img.height / window.innerHeight

      const sx = Math.max(0, Math.floor(rect.x * scaleX))
      const sy = Math.max(0, Math.floor(rect.y * scaleY))
      const sw = Math.min(
        img.width - sx,
        Math.max(1, Math.floor(rect.width * scaleX)),
      )
      const sh = Math.min(
        img.height - sy,
        Math.max(1, Math.floor(rect.height * scaleY)),
      )

      const canvas = document.createElement("canvas")
      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext("2d")
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)

      const dataUrl = canvas.toDataURL("image/png")

      chrome.storage.local.set(
        {
          snapshotImage: {
            dataUrl,
            width: sw,
            height: sh,
            sourceUrl: location.href,
            createdAt: Date.now(),
          },
          openTab: "SNAPSHOT",
        },
        () => {
          chrome.runtime.sendMessage({ type: "OPEN_POPUP" }, () => {
            void chrome.runtime.lastError
          })
          cleanup()
        },
      )
    } catch (err) {
      console.error("Snapshot capture error:", err)
      alert("Failed to capture snapshot.")
      cleanup()
    }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  function cancel() {
    cleanup()
    chrome.runtime.sendMessage({ type: "SNAPSHOT_CANCELLED" }, () => {
      void chrome.runtime.lastError
    })
  }

  function cleanup() {
    window.__cwuSnapshotActive = false
    toolbar?.remove()
    overlay?.remove()
    selectionBox?.remove()
    sizeLabel?.remove()
    dimTop?.remove()
    dimBottom?.remove()
    dimLeft?.remove()
    dimRight?.remove()
    document.removeEventListener("mousedown", handleMouseDown)
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
    document.removeEventListener("keydown", handleKeyDown)
  }

  function init() {
    const run = () => {
      try {
        createToolbar()
        createSelectionElements()
        document.addEventListener("mousedown", handleMouseDown)
        document.addEventListener("mousemove", handleMouseMove)
        document.addEventListener("mouseup", handleMouseUp)
        document.addEventListener("keydown", handleKeyDown)
        window.__cwuSnapshotActive = true
      } catch (err) {
        console.error("Snapshot overlay init failed:", err)
        window.__cwuSnapshotActive = false
        alert(
          "Failed to start snapshot capture. Please refresh the page and try again.",
        )
      }
    }

    if (document.body) {
      run()
    } else {
      document.addEventListener("DOMContentLoaded", run, { once: true })
    }
  }

  init()
})()
