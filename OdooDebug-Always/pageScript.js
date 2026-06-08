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
        // Strategy:
        //   1. session_info.is_internal_user — most accurate, server-rendered before app JS loads.
        //   2. URL heuristic — /web and /odoo prefixes are backend-only routes.
        //   3. DOM heuristic — .o_web_client and .o_main_navbar only exist in the backend.
        // Portal and public pages lack all three, so they correctly get isInternalUser = false.
        const sessionInfo = window.__session_info__
            || (window.odoo && window.odoo.__session_info__)
            || (window.odoo && window.odoo.session_info)
            || null;
        let isInternalUser;
        if (sessionInfo !== null) {
            isInternalUser = sessionInfo.is_internal_user === true;
        } else {
            const isBackendUrl = /^\/(web|odoo)(\/|$|#|\?)/.test(window.location.pathname);
            const hasBackendDom = !!(document.querySelector('.o_web_client') || document.querySelector('.o_main_navbar'));
            isInternalUser = isBackendUrl || hasBackendDom;
        }

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
