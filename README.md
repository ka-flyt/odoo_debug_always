# Odoo Debug – Always

A Chrome/Edge extension that automatically enables Odoo debug mode (`?debug=1`) on every Odoo page you visit.

---

## How it works

### Detection flow

Detection is **push-based**: `pageScript.js` notifies the background as soon as Odoo is confirmed, rather than the background polling at a fixed point in the page lifecycle (which was unreliable because Odoo 17+ loads JS as ES modules that execute late).

```
Tab navigates
     │
     ▼
contentScript.js  ──injects──▶  pageScript.js  (runs in page context)
                                      │
                                 Retries until window.odoo is ready
                                 Reads window.odoo.debug
                                 Sets body[data-odoo] and
                                 body[data-odoo-debug-mode]
                                      │
                                 window.postMessage('odoo-debug-detected')
                                      │
contentScript.js  ◀── message ────────┘
     │
     └── chrome.runtime.sendMessage('odooDetected')
              │
              ▼
background.js (service worker)
     │
     ├─ Odoo page without debug=1?
     │       └─▶  chrome.tabs.update → redirect with ?debug=1
     │
     └─ Already in debug?
             └─▶  Update icon for this tab only
```

`adaptIcon()` is still called on tab switches and window focus changes to keep the icon in sync when moving between tabs, but it is no longer the trigger for auto-debug.

### Files

| File | Role |
|------|------|
| `manifest.json` | Chrome MV3 extension manifest |
| `background.js` | Service worker – orchestrates auto-debug and icon state |
| `contentScript.js` | Injected into every page – bridges background ↔ page context |
| `pageScript.js` | Runs in the page's own JS context to read `window.odoo.debug` |
| `firefox_manifest.json` | Manifest variant for Firefox (MV2) |

### Why a separate `pageScript.js`?

Content scripts run in an isolated JS environment and cannot access page variables like `window.odoo`. `pageScript.js` is injected as a `<script>` element so it runs in the page's own context, reads `window.odoo.debug`, and stores the result as `data-*` attributes on `<body>`. The content script then reads those attributes.

### Odoo version handling

| Odoo version | `odoo.debug` type | How debug mode is detected |
|---|---|---|
| Legacy (< 16) | `boolean` | Inferred from URL (`?debug` or `?debug=assets`) |
| Modern (17+) | `string` (`''`, `'1'`, `'assets'`) | Read directly from `odoo.debug` |

### Retry mechanism

Odoo 17+ loads its JS bundle as ES modules (`type="module"`), which execute *after* `DOMContentLoaded`. The content script runs at `document_idle` (≈ DOMContentLoaded), so `window.odoo` may not be defined yet when `pageScript.js` first runs.

`pageScript.js` retries detection up to 20 times with 150 ms intervals (3 seconds total) to handle this timing gap.

### Auto-debug suppression

When you manually click the extension icon to *disable* debug on a page, auto-debug is suppressed for that tab/URL combination (stored in `disabledAutoDebugByTab`). Navigating to a different page or reopening the tab will re-enable auto-debug.

> **Note:** This suppression is held in service worker memory and is lost if the browser restarts or the extension is reloaded.

---

## Usage

| Action | Result |
|--------|--------|
| Visit any Odoo page | `?debug=1` is added automatically |
| Click icon once | Toggle debug on/off for current page |
| Double-click icon | Enable `?debug=assets` (includes JS/CSS source maps) |

---

## Installation (unpacked extension)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `OdooDebug-Always/` folder

---

## Development notes

- **Update README.md and CHANGELOG.md** whenever behaviour, files, or the detection flow changes. A note in `manifest.json` (`"_readme"`) serves as a reminder. CHANGELOG.md must be updated for every bug fix.
- `disabledAutoDebugByTab` is an in-memory Map — not persisted across service worker restarts.
- `chrome.browserAction` (MV2) vs `chrome.action` (MV3) is handled by the `browserAction` constant in `background.js`.
- Firefox support uses `firefox_manifest.json` (MV2 with `browser_action`).
