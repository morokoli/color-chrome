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

async function saveColorToSheet(hexColor, sourceUrl) {
  try {
    const result = await chrome.storage.local.get(['colorPickerState']);
    const state = result.colorPickerState;

    if (!state || !state.jwtToken || !state.selectedFileData) return;

    const { jwtToken, selectedFileData, apiUrl } = state;

    await fetch(`${apiUrl}/api/database-sheets/add-color`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        spreadsheetId: selectedFileData.spreadsheetId,
        sheetName: selectedFileData.sheetName,
        sheetId: selectedFileData.sheetId,
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
  } catch (error) {
    // Silently fail
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
    chrome.storage.local.set({
      pickedColor: message.color,
      pickedAt: Date.now()
    });

    if (popupPort) {
      try {
        popupPort.postMessage({ type: 'COLOR_PICKED', color: message.color });
      } catch (e) {}
    }

    saveColorToSheet(message.color, sender.tab?.url || 'Picked Color');
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
    // Get the active tab and inject the color picker script
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.id) {
        sendResponse({ error: 'No active tab' });
        return;
      }

      // Check if we can inject into this tab
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('edge://')) {
        sendResponse({ error: 'Cannot pick colors from browser pages' });
        return;
      }

      try {
        // Send response immediately so popup can close
        sendResponse({ success: true });

        // Small delay to ensure popup has closed before capturing
        await new Promise(resolve => setTimeout(resolve, 100));

        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['colorPickerMagnifier.js']
        });
      } catch (error) {
        console.error('Injection error:', error);
        // Can't sendResponse here as channel is already closed
      }
    });
    return true; // Keep channel open for async
  }
});
