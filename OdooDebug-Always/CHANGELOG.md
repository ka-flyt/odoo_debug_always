# Changelog

> **Rule:** This file must be updated for every bug fix, feature change, or behaviour change.
> The `_readme` field in `manifest.json` and `firefox_manifest.json` serves as a reminder.

---

## [5.2] – 2026-06-08

### Changed
- **Disabling debug now persists across navigation within the same tab** — Previously, clicking the icon to turn off debug only suppressed auto-debug for the current page (URL + path). Clicking any link would re-enable debug on the next page. Now, once you disable debug on a tab, it stays off for all pages in that tab until you manually re-enable it.

**Root cause:** `disabledAutoDebugByTab` was a `Map` storing `tab.id → pageKey` (origin + pathname). `shouldSkipAutoDebug` only matched if the current URL matched the stored key, so navigating to a new page cleared the suppression.

**Fix:** Changed `disabledAutoDebugByTab` from a `Map` to a `Set` storing only `tab.id`. Suppression now applies to the entire tab session, regardless of which page is loaded.

**Files changed:**
- `background.js` — `disabledAutoDebugByTab` changed from `Map` to `Set`; removed `getPageKey()`; `shouldSkipAutoDebug` simplified to `Set.has(tab.id)`

---

## [5.1] – 2026-06-08

### Fixed
- **Auto-debug no longer triggers on navigation** — The extension showed the correct icon but did not redirect to `?debug=1` when visiting an Odoo page.

**Root cause:** `background.js` relied on `chrome.tabs.onUpdated` firing after `pageScript.js` had finished detecting Odoo. In practice, `onUpdated` fires before the detection is complete (Odoo 17+ loads JS as ES modules, which execute late). The background received `odooVersion: false`, skipped the redirect, and left the icon in its stale state from the previous page.

**Fix:** Detection is now push-based. `pageScript.js` posts a `window.postMessage` once Odoo is confirmed. `contentScript.js` picks this up and forwards it to `background.js` via `chrome.runtime.sendMessage`. The background handles the `odooDetected` message as the primary trigger for auto-debug and icon update, independent of tab event timing.

**Files changed:**
- `pageScript.js` — adds `window.postMessage` after setting body attributes
- `contentScript.js` — adds `window.addEventListener('message', ...)` to forward to background
- `background.js` — adds `chrome.runtime.onMessage` listener for `odooDetected`; icon update is now per-tab (`tabId` passed to `setIcon`)

---

## [5.0] – prior

Initial version with auto-debug support (polling-based detection via `chrome.tabs.onUpdated`).
