const getURL = chrome.runtime.getURL.bind(chrome.runtime);

const scriptEl = document.createElement('script');
scriptEl.src = getURL('pageScript.js');
(document.head || document.documentElement).appendChild(scriptEl);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === 'getOdooDebugInfo') {
        const body = document.getElementsByTagName('body')[0];
        if (body && body.hasAttribute('data-odoo')) {
            sendResponse({
                odooVersion: body.getAttribute('data-odoo'),
                debugMode: body.getAttribute('data-odoo-debug-mode'),
            });
        } else {
            sendResponse({ odooVersion: false });
        }
    }
});
