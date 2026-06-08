const detectOdoo = (retries) => {
    if (window.odoo && 'debug' in window.odoo) {
        let odooVersion = 'legacy';
        let debugMode = '';
        const body = document.getElementsByTagName('body')[0];
        if (typeof odoo.debug === 'boolean') {
            const url = window.location.href;
            if (url.search(/[&|?]debug=assets/) !== -1) {
                debugMode = 'assets';
            } else if (url.search(/[&|?]debug/) !== -1) {
                debugMode = '1';
            }
        } else {
            odooVersion = 'new';
            debugMode = odoo.debug;
        }
        debugMode = debugMode === '0' ? '' : debugMode;  // In Firefox Odoo add '0' for no debug instead of empty string ''.
        body.setAttribute('data-odoo', odooVersion);
        body.setAttribute('data-odoo-debug-mode', debugMode);
        // Push detection result to contentScript so background.js acts immediately,
        // instead of relying on the polling adaptIcon() which runs before this point.
        window.postMessage({ type: 'odoo-debug-detected', odooVersion, debugMode }, '*');
    } else if (retries > 0) {
        setTimeout(() => detectOdoo(retries - 1), 150);
    }
};
detectOdoo(20);
