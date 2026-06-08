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

        // Detect whether the current user is an internal Odoo user.
        // window.__session_info__ is server-rendered into the page HTML before any app JS loads.
        // window.odoo.__session_info__ and window.odoo.session_info are fallbacks for versions
        // that expose it differently.
        // For modern Odoo: default to false if unavailable — safer than assuming internal,
        // prevents auto-debug on portal/public pages where session_info may not be exposed.
        const sessionInfo = window.__session_info__
            || (window.odoo && window.odoo.__session_info__)
            || (window.odoo && window.odoo.session_info)
            || null;
        const isInternalUser = sessionInfo ? sessionInfo.is_internal_user === true : false;

        body.setAttribute('data-odoo', odooVersion);
        body.setAttribute('data-odoo-debug-mode', debugMode);
        body.setAttribute('data-odoo-internal-user', isInternalUser ? '1' : '0');
        // Push detection result to contentScript so background.js acts immediately,
        // instead of relying on the polling adaptIcon() which runs before this point.
        window.postMessage({ type: 'odoo-debug-detected', odooVersion, debugMode, isInternalUser }, '*');
    } else if (retries > 0) {
        setTimeout(() => detectOdoo(retries - 1), 150);
    }
};
detectOdoo(20);
