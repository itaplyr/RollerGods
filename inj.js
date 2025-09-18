// ==UserScript==
// @name         RollerGods Auto Injector (Reload Safe)
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Ensure RollerGods script always runs, even after page reloads, without duplicates
// @author       You
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_URL = "https://itaplyr.github.io/RollerGods/leox.js";

    function injectScript(url) {
        const script = document.createElement("script");
        script.src = url + "?ts=" + Date.now(); // cache-bust
        script.type = "text/javascript";
        script.onload = () => console.log("[Injector] Injected RollerGods script");
        document.body.appendChild(script);
    }

    function ensureInjected() {
        // Prevent duplicates
        if (window.__rollergods_running__) {
            return;
        }
        window.__rollergods_running__ = true;

        console.log("[Injector] Injecting RollerGods...");
        injectScript(SCRIPT_URL);
    }

    // Run once when DOM is ready
    window.addEventListener("DOMContentLoaded", ensureInjected);

    // Safety interval in case page reloads late or body wasn’t ready yet
    setInterval(ensureInjected, 5000);

})();