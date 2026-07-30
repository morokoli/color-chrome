# color-chrome Instructions

## Scope

Vite-based Chrome extension for color picking and sync.

## Rules

- Use `rtk` before shell commands.
- Keep extension permissions, manifest changes, and background/content script boundaries as small as possible.
- Maintain the existing React, Radix, Ant Design, and Tailwind usage rather than adding parallel UI stacks.
- Do not edit `dist` or `node_modules` directly.
- Keep browser-extension specific code compatible with Chrome extension packaging and the current manifest.

## Validation

- Use `npm run build` to verify the extension bundles cleanly.
- Use `npm run dev` when you need watch-mode rebuilds during development.
- Reload the unpacked extension in Chrome to verify runtime behavior after UI or manifest changes.

