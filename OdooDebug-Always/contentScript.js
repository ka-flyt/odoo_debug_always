const getURL = chrome.runtime.getURL.bind(chrome.runtime);

const scriptEl = document.createElement('script');
scriptEl.src = getURL('pageScript.js');
(document.head || document.documentElement).appendChild(scriptEl);

// Forward the push notification from pageScript.js to background.js.
// pageScript runs in the page context and cannot call chrome APIs directly,
// so it posts a window message that we pick up here and relay via sendMessage.
window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.type !== 'odoo-debug-detected') return;
    chrome.runtime.sendMessage({
        message: 'odooDetected',
        odooVersion: event.data.odooVersion,
        debugMode: event.data.debugMode,
        isInternalUser: event.data.isInternalUser,
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === 'getOdooDebugInfo') {
        const body = document.getElementsByTagName('body')[0];
        if (body && body.hasAttribute('data-odoo')) {
            sendResponse({
                odooVersion: body.getAttribute('data-odoo'),
                debugMode: body.getAttribute('data-odoo-debug-mode'),
                isInternalUser: body.getAttribute('data-odoo-internal-user') !== '0',
            });
        } else {
            sendResponse({ odooVersion: false });
        }
    }
});
