const browserAction = chrome.action || chrome.browserAction;

class onClickListener {
    constructor(callback) {
        const CONTROL_TIME = 500; // Max time between click events occurrence
        let click = 0;
        let timer;

        if (callback && callback instanceof Function) {
            return tab => {
                click += 1;
                clearTimeout(timer);
                timer = setTimeout(() => {
                    // Clear all timers
                    clearTimeout(timer);
                    callback.apply(this, [tab, click]);
                    click = 0;
                }, CONTROL_TIME);
            };
        }
        throw new Error('[InvalidArgumentException]');
    }
}

let debugMode = '';
let odooVersion = 'legacy';
// Tracks tabs where the user has manually disabled auto-debug.
// Stored per tab (not per page), so debug stays off across all navigation
// within the same tab until the user manually re-enables it.
const disabledAutoDebugByTab = new Set();

const shouldSkipAutoDebug = (tab) => disabledAutoDebugByTab.has(tab.id);

// Auto-enable normal debug mode (debug=1) when an Odoo page is detected.
// This keeps the existing click behaviour (single click toggles, double click assets)
// but removes the need to click on every navigation.
const ensureAutoDebug = (tab) => {
    try {
        if (shouldSkipAutoDebug(tab)) {
            return;
        }
        const tabUrl = new URL(tab.url);
        const params = new URLSearchParams(tabUrl.search);
        const current = params.get('debug');
        // Already in debug=1 or debug=assets? Nothing to do.
        if (current === '1' || current === 'assets') {
            return;
        }
        // Force normal debug (not assets)
        params.set('debug', '1');
        const url = tabUrl.origin + tabUrl.pathname + `?${params.toString()}` + tabUrl.hash;
        chrome.tabs.update(tab.id, { url });
    } catch (e) {
        // Ignore invalid URLs (chrome://, about:blank, etc.)
    }
}

const onClickActivateDebugMode = (tab, click) => {
    if (click <= 2) {
        const debugOptions = {
            0: [null, '/images/icons/off_48.png'],
            1: ['1', '/images/icons/on_48.png'],
            2: ['assets', '/images/icons/super_48.png'],
        };
        const selectedMode = debugMode && click === 1 ? 0 : click;
        const tabUrl = new URL(tab.url);
        const [debugOption, path] = debugOptions[selectedMode];
        const params = new URLSearchParams(tabUrl.search);
        if (debugOption === null) {
            params.delete('debug');
        } else {
            params.set('debug', debugOption);
        }
        const paramStr = params.toString();
        const url = tabUrl.origin + tabUrl.pathname + (paramStr ? `?${paramStr}` : '') + tabUrl.hash;

        if (selectedMode === 0) {
            disabledAutoDebugByTab.add(tab.id);
        } else {
            disabledAutoDebugByTab.delete(tab.id);
        }

        browserAction.setIcon({ path });
        chrome.tabs.update(tab.id, { url });
    }
}

const adaptIcon = () => {
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        if (tabs.length) {
            chrome.tabs.sendMessage(tabs[0].id, {message: 'getOdooDebugInfo'}, response => {
                if (chrome.runtime.lastError) {
                    return;
                }
                let path = '/images/icons/off_48.png';
                if (response.odooVersion) {
                    // If it's an Odoo page and we're not in debug, auto-enable debug=1.
                    // (We do this before setting the icon so the next onUpdated will refresh state.)
                    if (response.debugMode !== '1' && response.debugMode !== 'assets') {
                        ensureAutoDebug(tabs[0]);
                    }
                    if (response.debugMode === 'assets') {
                        path = '/images/icons/super_48.png';
                    } else if (response.debugMode === '1') {
                        path = '/images/icons/on_48.png';
                    }
                    odooVersion = response.odooVersion;
                    debugMode = response.debugMode;
                }
                browserAction.setIcon({ path, tabId: tabs[0].id });
            });
        }
    });
}

// Push-based detection: pageScript.js notifies us when Odoo is found on the page.
// This is the primary trigger for auto-debug. The polling in adaptIcon() is kept
// as a fallback for tab switches and window focus changes, but auto-debug now
// relies on this message rather than on the race-prone onUpdated timing.
chrome.runtime.onMessage.addListener((request, sender) => {
    if (request.message === 'odooDetected' && sender.tab) {
        const tab = sender.tab;
        odooVersion = request.odooVersion;
        debugMode = request.debugMode;
        if (request.debugMode !== '1' && request.debugMode !== 'assets') {
            ensureAutoDebug(tab);
        }
        let path = '/images/icons/off_48.png';
        if (request.debugMode === 'assets') {
            path = '/images/icons/super_48.png';
        } else if (request.debugMode === '1') {
            path = '/images/icons/on_48.png';
        }
        browserAction.setIcon({ path, tabId: tab.id });
    }
});

browserAction.onClicked.addListener(new onClickListener((tab, click) => onClickActivateDebugMode(tab, click)));
chrome.tabs.onActivated.addListener(adaptIcon);
chrome.tabs.onUpdated.addListener(adaptIcon);
chrome.windows.onFocusChanged.addListener(adaptIcon);
chrome.tabs.onRemoved.addListener((tabId) => {
    disabledAutoDebugByTab.delete(tabId);
});
