// Background service worker for color picker

// Store the popup port for communication
let popupPort = null;

// Helper functions for color conversion
function hexToRGB(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToHSL(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

async function saveColorToDatabase(hexColor, sourceUrl) {
  try {
    const result = await chrome.storage.local.get(['colorPickerState']);
    const state = result.colorPickerState;

    // Only require JWT token, not selectedFileData
    if (!state || !state.jwtToken) return null;

    const { jwtToken, selectedFileData, selectedFolders, apiUrl } = state;
    const folderIds = Array.isArray(selectedFolders) ? selectedFolders : [];

    const addRes = await fetch(`${apiUrl}/api/database-sheets/add-color`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        spreadsheetId: selectedFileData?.spreadsheetId || null,
        sheetName: selectedFileData?.sheetName || null,
        sheetId: selectedFileData?.sheetId ?? null,
        folderIds: folderIds.length > 0 ? folderIds : undefined,
        row: {
          timestamp: Date.now(),
          url: sourceUrl,
          hex: hexColor,
          hsl: hexToHSL(hexColor),
          rgb: hexToRGB(hexColor),
          comments: '',
          ranking: '',
          slash_naming: '',
          tags: [],
          additionalColumns: [],
        },
      }),
    });

    const addJson = await addRes.json().catch(() => ({}));
    const createdColor = addJson?.data?.createdColor || addJson?.createdColor;
    return createdColor || null;
  } catch (error) {
    console.error('[ColorBoard:bg] saveColorToDatabase error', error);
    return null;
  }
}

// Listen for connections from popup
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'color-picker-popup') {
    popupPort = port;
    port.onDisconnect.addListener(() => {
      popupPort = null;
    });
  }
});

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'COLOR_PICKER_STATE_SYNCED') {
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'CAPTURE_SCREEN') {
    // Capture the visible tab
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Capture error:', chrome.runtime.lastError);
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ dataUrl });
      }
    });
    return true; // Keep the message channel open for async response
  }

  if (message.type === 'COLOR_PICKED') {
    const sourceUrl = sender.tab?.url || 'Picked Color';
    saveColorToDatabase(message.color, sourceUrl).then((createdColor) => {
      chrome.storage.local.set({
        pickedColor: message.color,
        pickedAt: Date.now(),
        createdColor: createdColor || null,
      });
    });

    if (popupPort) {
      try {
        popupPort.postMessage({ type: 'COLOR_PICKED', color: message.color });
      } catch (e) {}
    }

    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'COLOR_PICKER_CANCELLED') {
    chrome.storage.local.set({
      pickerCancelled: true,
      cancelledAt: Date.now()
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'OPEN_POPUP') {
    // Try to open popup programmatically (Chrome 127+)
    if (chrome.action && chrome.action.openPopup) {
      chrome.action.openPopup().catch(() => {
        // Fallback: just set storage, user will see it when they click extension
      });
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'START_COLOR_PICKER') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.id) {
        sendResponse({ error: 'No active tab' });
        return;
      }
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('edge://')) {
        sendResponse({ error: 'Cannot pick colors from browser pages' });
        return;
      }
      try {
        sendResponse({ success: true });
        await new Promise(resolve => setTimeout(resolve, 100));
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['colorPickerMagnifier.js']
        });
      } catch (error) {
        console.error('Injection error:', error);
      }
    });
    return true;
  }
});
