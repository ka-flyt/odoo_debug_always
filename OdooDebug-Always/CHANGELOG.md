# Changelog

> **Rule:** This file must be updated for every bug fix, feature change, or behaviour change.
> The `_readme` field in `manifest.json` and `firefox_manifest.json` serves as a reminder.

---

## [5.5] – 2026-06-08

### Fixed
- **Auto-debug no longer triggers on portal/public pages** — The fallback when `session_info` is unavailable was `true`, causing auto-debug to fire on e.g. `odoo.com/my` where portal users are logged in but `window.__session_info__` is not exposed. Fallback changed to `false` for modern Odoo: if user type cannot be determined, do not auto-debug. Manual toggle via icon click still works on any Odoo page regardless of user type. Also added `window.odoo.__session_info__` as an additional detection path.

**Files changed:**
- `pageScript.js` — fallback for modern Odoo changed from `true` to `false`; added `window.odoo.__session_info__` lookup path

---

## [5.4] – 2026-06-08

### Changed
- **Auto-debug only activates for internal Odoo users** — Previously, auto-debug triggered on any Odoo page regardless of user type. Now it only activates when the logged-in user is an internal user (`is_internal_user: true` in Odoo session info). Public users and portal users visiting a foreign Odoo site will not get auto-debug.

**How it works:** `pageScript.js` reads `window.__session_info__.is_internal_user` (server-rendered into the page HTML by Odoo before any app JS loads). Falls back to `window.odoo.session_info.is_internal_user`. Defaults to `true` if neither is available (legacy Odoo), preserving existing behaviour.

**Files changed:**
- `pageScript.js` — reads `is_internal_user` from session info, sets `data-odoo-internal-user` attribute, includes in postMessage
- `contentScript.js` — forwards `isInternalUser` in both the push message and the `getOdooDebugInfo` poll response
- `background.js` — gates `ensureAutoDebug()` on `isInternalUser` in both the push handler and `adaptIcon()`

### Changed
- **Description updated** — Added GitHub repo link to extension description in both manifests.

---

## [5.3] – 2026-06-08

### Fixed
- **`debug=` no longer left in the URL when debug is disabled** — Turning off debug previously set `debug=` (legacy) or `debug=0` (modern) in the URL. Now the `debug` parameter is removed entirely, leaving a clean URL. If all other params are also absent, the trailing `?` is removed too.

**Files changed:**
- `background.js` — `debugOptions[0]` changed from `''`/`'0'` to `null`; URL construction now uses `params.delete('debug')` and omits `?` when no params remain

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
