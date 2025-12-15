// Color Picker with Magnifying Glass
(function() {
  // Prevent multiple injections
  if (window.__colorPickerMagnifierActive) {
    return;
  }
  window.__colorPickerMagnifierActive = true;

  const MAGNIFIER_SIZE = 150;
  const ZOOM_LEVEL = 10;
  const PIXEL_COUNT = Math.floor(MAGNIFIER_SIZE / ZOOM_LEVEL);

  let canvas, ctx, magnifier, colorPreview, hexLabel, overlay;
  let imageData = null;
  let currentColor = '#000000';

  // Create the overlay and magnifier elements
  function createElements() {
    // Custom crosshair cursor (bigger, thinner center, with center dot)
    const cursorSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <line x1="16" y1="0" x2="16" y2="13" stroke="black" stroke-width="1.5"/>
        <line x1="16" y1="19" x2="16" y2="32" stroke="black" stroke-width="1.5"/>
        <line x1="0" y1="16" x2="13" y2="16" stroke="black" stroke-width="1.5"/>
        <line x1="19" y1="16" x2="32" y2="16" stroke="black" stroke-width="1.5"/>
        <line x1="16" y1="0" x2="16" y2="13" stroke="white" stroke-width="0.5"/>
        <line x1="16" y1="19" x2="16" y2="32" stroke="white" stroke-width="0.5"/>
        <line x1="0" y1="16" x2="13" y2="16" stroke="white" stroke-width="0.5"/>
        <line x1="19" y1="16" x2="32" y2="16" stroke="white" stroke-width="0.5"/>
        <circle cx="16" cy="16" r="2" fill="black" stroke="white" stroke-width="0.5"/>
      </svg>
    `;
    const cursorDataUrl = `data:image/svg+xml;base64,${btoa(cursorSvg)}`;

    // Full page overlay
    overlay = document.createElement('div');
    overlay.id = 'color-picker-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483647;
      cursor: url('${cursorDataUrl}') 16 16, crosshair;
    `;

    // Magnifier container
    magnifier = document.createElement('div');
    magnifier.id = 'color-picker-magnifier';
    magnifier.style.cssText = `
      position: fixed;
      width: ${MAGNIFIER_SIZE}px;
      height: ${MAGNIFIER_SIZE}px;
      border-radius: 50%;
      border: 4px solid #000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(0,0,0,0.1);
      pointer-events: none;
      overflow: hidden;
      z-index: 2147483647;
      background: #fff;
      left: ${window.innerWidth / 2}px;
      top: ${window.innerHeight / 2}px;
      transform: translate(-50%, -50%);
      opacity: 0;
    `;

    // Canvas for magnified view
    canvas = document.createElement('canvas');
    canvas.width = MAGNIFIER_SIZE;
    canvas.height = MAGNIFIER_SIZE;
    canvas.style.cssText = `
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
    `;
    ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Center crosshair
    const crosshair = document.createElement('div');
    crosshair.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: ${ZOOM_LEVEL}px;
      height: ${ZOOM_LEVEL}px;
      border: 2px solid #fff;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.5);
      pointer-events: none;
      box-sizing: border-box;
    `;

    // Hex label below magnifier
    const infoContainer = document.createElement('div');
    infoContainer.style.cssText = `
      position: absolute;
      bottom: -40px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
    `;

    colorPreview = document.createElement('div');
    colorPreview.style.cssText = `
      width: 28px;
      height: 28px;
      border-radius: 4px;
      border: 2px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      background: #000;
    `;

    hexLabel = document.createElement('div');
    hexLabel.style.cssText = `
      background: rgba(0,0,0,0.85);
      color: #fff;
      padding: 6px 12px;
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
      font-size: 14px;
      font-weight: 500;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    hexLabel.textContent = '#000000';

    infoContainer.appendChild(colorPreview);
    infoContainer.appendChild(hexLabel);

    magnifier.appendChild(canvas);
    magnifier.appendChild(crosshair);
    magnifier.appendChild(infoContainer);
    overlay.appendChild(magnifier);
    document.body.appendChild(overlay);
  }

  // Capture the visible tab
  async function captureScreen() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'CAPTURE_SCREEN' }, (response) => {
        if (response && response.dataUrl) {
          const img = new Image();
          img.onload = () => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
            tempCtx.drawImage(img, 0, 0);

            // Calculate scale based on actual captured image vs viewport
            const scaleX = img.width / window.innerWidth;
            const scaleY = img.height / window.innerHeight;

            imageData = {
              canvas: tempCanvas,
              ctx: tempCtx,
              width: img.width,
              height: img.height,
              scaleX: scaleX,
              scaleY: scaleY
            };
            resolve(true);
          };
          img.src = response.dataUrl;
        } else {
          resolve(false);
        }
      });
    });
  }

  // Get color at position
  function getColorAtPosition(x, y) {
    if (!imageData) return '#000000';

    const px = Math.floor(x * imageData.scaleX);
    const py = Math.floor(y * imageData.scaleY);

    if (px < 0 || py < 0 || px >= imageData.width || py >= imageData.height) {
      return '#000000';
    }

    const pixel = imageData.ctx.getImageData(px, py, 1, 1).data;
    return `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`.toUpperCase();
  }

  // Draw magnified view
  function drawMagnifier(mouseX, mouseY) {
    if (!imageData || !ctx) return;

    const { scaleX, scaleY } = imageData;
    const halfPixels = Math.floor(PIXEL_COUNT / 2);

    // Clear canvas
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);

    // Draw checkerboard pattern for transparency
    for (let i = 0; i < PIXEL_COUNT; i++) {
      for (let j = 0; j < PIXEL_COUNT; j++) {
        if ((i + j) % 2 === 0) {
          ctx.fillStyle = '#ccc';
          ctx.fillRect(i * ZOOM_LEVEL, j * ZOOM_LEVEL, ZOOM_LEVEL, ZOOM_LEVEL);
        }
      }
    }

    // Draw pixels
    for (let i = 0; i < PIXEL_COUNT; i++) {
      for (let j = 0; j < PIXEL_COUNT; j++) {
        const srcX = Math.floor((mouseX + (i - halfPixels)) * scaleX);
        const srcY = Math.floor((mouseY + (j - halfPixels)) * scaleY);

        if (srcX >= 0 && srcY >= 0 && srcX < imageData.width && srcY < imageData.height) {
          const pixel = imageData.ctx.getImageData(srcX, srcY, 1, 1).data;
          ctx.fillStyle = `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${pixel[3] / 255})`;
          ctx.fillRect(i * ZOOM_LEVEL, j * ZOOM_LEVEL, ZOOM_LEVEL, ZOOM_LEVEL);
        }
      }
    }

    // Draw grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= PIXEL_COUNT; i++) {
      ctx.beginPath();
      ctx.moveTo(i * ZOOM_LEVEL, 0);
      ctx.lineTo(i * ZOOM_LEVEL, MAGNIFIER_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * ZOOM_LEVEL);
      ctx.lineTo(MAGNIFIER_SIZE, i * ZOOM_LEVEL);
      ctx.stroke();
    }

    // Update current color
    currentColor = getColorAtPosition(mouseX, mouseY);
    colorPreview.style.background = currentColor;
    hexLabel.textContent = currentColor;

    // Update magnifier border to show current color
    magnifier.style.borderColor = currentColor;
  }

  // Handle mouse move
  function handleMouseMove(e) {
    const x = e.clientX;
    const y = e.clientY;

    // Position magnifier to bottom-right of cursor (small gap)
    let magX = x + 10;
    let magY = y + 10;

    // Keep magnifier in viewport - flip to other side if needed
    if (magX + MAGNIFIER_SIZE + 10 > window.innerWidth) {
      magX = x - MAGNIFIER_SIZE - 10;
    }
    if (magY + MAGNIFIER_SIZE + 50 > window.innerHeight) {
      magY = y - MAGNIFIER_SIZE - 60;
    }

    magnifier.style.left = `${magX}px`;
    magnifier.style.top = `${magY}px`;
    magnifier.style.transform = 'none';
    magnifier.style.opacity = '1';

    drawMagnifier(x, y);
  }

  // Helper to convert hex to RGB
  function hexToRGB(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${r}, ${g}, ${b})`;
  }

  // Helper to convert hex to HSL
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

  // Show result panel after picking
  function showResultPanel(color, x, y) {
    const panel = document.createElement('div');
    panel.id = 'color-picker-result';
    panel.style.cssText = `
      position: fixed;
      left: ${x + 15}px;
      top: ${y + 15}px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-width: 200px;
    `;

    const rgb = hexToRGB(color);
    const hsl = hexToHSL(color);

    panel.innerHTML = `
      <div style="position: absolute; top: 6px; right: 6px; display: flex; gap: 4px; z-index: 10;">
        <button id="history-panel-btn" style="padding: 4px; background: #f0f0f0; border: none; cursor: pointer; border-radius: 4px; line-height: 0;" title="History & Editor">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </button>
        <button id="close-panel-btn" style="padding: 4px; background: #f0f0f0; border: none; cursor: pointer; border-radius: 4px; line-height: 0;" title="Close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div style="padding: 30px 12px 12px 12px;">
        <div style="display: flex; gap: 12px; align-items: flex-start;">
          <div style="width: 60px; height: 60px; background: ${color}; border-radius: 6px; border: 1px solid #e5e5e5; flex-shrink: 0;"></div>
          <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 28px; font-size: 10px; color: #888;">HEX</span>
              <div style="flex: 1; padding: 4px 8px; font-size: 11px; font-family: monospace; background: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 4px; text-transform: uppercase;">${color}</div>
              <button class="copy-btn" data-value="${color}" style="padding: 4px; background: none; border: none; cursor: pointer; border-radius: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              </button>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 28px; font-size: 10px; color: #888;">RGB</span>
              <div style="flex: 1; padding: 4px 8px; font-size: 11px; font-family: monospace; background: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 4px;">${rgb}</div>
              <button class="copy-btn" data-value="${rgb}" style="padding: 4px; background: none; border: none; cursor: pointer; border-radius: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              </button>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 28px; font-size: 10px; color: #888;">HSL</span>
              <div style="flex: 1; padding: 4px 8px; font-size: 11px; font-family: monospace; background: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 4px;">${hsl}</div>
              <button class="copy-btn" data-value="${hsl}" style="padding: 4px; background: none; border: none; cursor: pointer; border-radius: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Keep panel in viewport
    const rect = panel.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      panel.style.left = (x - rect.width - 15) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      panel.style.top = (y - rect.height - 15) + 'px';
    }

    // Close button handler
    const closeBtn = panel.querySelector('#close-panel-btn');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.remove();
    });
    closeBtn.addEventListener('mouseover', () => closeBtn.style.background = '#e0e0e0');
    closeBtn.addEventListener('mouseout', () => closeBtn.style.background = '#f0f0f0');

    // History button handler - opens extension to history/editor tab
    const historyBtn = panel.querySelector('#history-panel-btn');
    historyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Wait for storage to be set before opening popup
      chrome.storage.local.set({ openTab: 'COMMENT' }, () => {
        chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
      });
      panel.remove();
    });
    historyBtn.addEventListener('mouseover', () => historyBtn.style.background = '#e0e0e0');
    historyBtn.addEventListener('mouseout', () => historyBtn.style.background = '#f0f0f0');

    // Copy button handlers
    panel.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(btn.dataset.value);
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(() => {
          btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
        }, 1500);
      });
      btn.addEventListener('mouseover', () => btn.style.background = '#f0f0f0');
      btn.addEventListener('mouseout', () => btn.style.background = 'none');
    });

    // Close on click outside
    const closePanel = (e) => {
      if (!panel.contains(e.target)) {
        panel.remove();
        document.removeEventListener('click', closePanel);
      }
    };
    setTimeout(() => document.addEventListener('click', closePanel), 100);

    // Close on escape
    const closeOnEsc = (e) => {
      if (e.key === 'Escape') {
        panel.remove();
        document.removeEventListener('keydown', closeOnEsc);
      }
    };
    document.addEventListener('keydown', closeOnEsc);
  }

  // Handle click - pick color
  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const color = currentColor;
    const x = e.clientX;
    const y = e.clientY;
    cleanup();

    // Show result panel on page
    showResultPanel(color, x, y);

    // Also send to extension storage
    chrome.runtime.sendMessage({
      type: 'COLOR_PICKED',
      color: color
    });
  }

  // Handle escape - cancel, R - recapture
  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      cleanup();
      chrome.runtime.sendMessage({
        type: 'COLOR_PICKER_CANCELLED'
      });
    }
    // Press R to recapture the screen
    if (e.key === 'r' || e.key === 'R') {
      recaptureScreen();
    }
  }

  // Recapture screen without restarting
  async function recaptureScreen() {
    magnifier.style.opacity = '0.5';
    await captureScreen();
    magnifier.style.opacity = '1';
  }

  // Cleanup
  function cleanup() {
    window.__colorPickerMagnifierActive = false;
    overlay?.remove();
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown);
  }

  // Initialize
  async function init() {
    // Allow cancellation during loading
    let cancelled = false;
    const cancelDuringLoad = (e) => {
      if (e.key === 'Escape') {
        cancelled = true;
        window.__colorPickerMagnifierActive = false;
        document.removeEventListener('keydown', cancelDuringLoad);
        chrome.runtime.sendMessage({ type: 'COLOR_PICKER_CANCELLED' });
      }
    };
    document.addEventListener('keydown', cancelDuringLoad);

    // Small delay to let the page fully render (helps with dynamic content)
    await new Promise(resolve => setTimeout(resolve, 150));

    document.removeEventListener('keydown', cancelDuringLoad);
    if (cancelled) return;

    createElements();

    const captured = await captureScreen();

    if (!captured) {
      cleanup();
      alert('Failed to capture screen');
      return;
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown);

    // Initial position
    magnifier.style.left = '50%';
    magnifier.style.top = '50%';
  }

  init();
})();
