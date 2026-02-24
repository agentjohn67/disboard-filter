// ==UserScript==
// @name         Disboard Filter
// @namespace    https://github.com/agentjohn67
// @version      1.0
// @description  Filters disboard server listings and removes gateways
// @author       agentjohn67
// @match        https://disboard.org/*
// @updateURL    https://raw.githubusercontent.com/agentjohn67/disboard-filter/main/script.user.js
// @downloadURL  https://raw.githubusercontent.com/agentjohn67/disboard-filter/main/script.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

(function () {
    'use strict';
    const BLOCKLIST_URL = 'https://raw.githubusercontent.com/agentjohn67/disboard-filter/main/blocklist.txt';
    const BLOCKLIST_CACHE_MS = 6 * 60 * 60 * 1000; // 6 hours
    let hiddenServers = GM_getValue('hiddenServers', []);
    let remoteBlocklist = new Set(GM_getValue('cachedBlocklist', []));
    let filteredServersFragment = document.createDocumentFragment();
    function mergeBlocklist() {
        remoteBlocklist.forEach(id => {
            if (!hiddenServers.includes(id)) hiddenServers.push(id);
        });
    }
    mergeBlocklist();

    function fetchBlocklist(callback) {
        const lastFetch = GM_getValue('blocklistLastFetch', 0);
        const lastUrl = GM_getValue('blocklistLastUrl', '');
        const urlChanged = lastUrl !== BLOCKLIST_URL;
        const cacheValid = !urlChanged && (Date.now() - lastFetch < BLOCKLIST_CACHE_MS);

        if (cacheValid) {
            console.log('[disboard filter] using cached blocklist (' + remoteBlocklist.size + ' ids)');
            if (callback) callback();
            return;
        }

        console.log('[disboard filter] fetching blocklist from:', BLOCKLIST_URL);
        GM_xmlhttpRequest({
            method: 'GET',
            url: BLOCKLIST_URL,
            onload: function (resp) {
                if (resp.status === 200) {
                    const ids = resp.responseText
                        .split(/\r?\n/)
                        .map(l => l.trim())
                        .filter(l => l && !l.startsWith('#'));
                    remoteBlocklist = new Set(ids);
                    GM_setValue('cachedBlocklist', ids);
                    GM_setValue('blocklistLastFetch', Date.now());
                    GM_setValue('blocklistLastUrl', BLOCKLIST_URL);
                    mergeBlocklist();
                    console.log('[disboard filter] blocklist loaded:', ids.length, 'server ids');
                } else {
                    console.warn('[disboard filter] blocklist fetch failed, status:', resp.status);
                }
                if (callback) callback();
            },
            onerror: function (err) {
                console.warn('[disboard filter] blocklist fetch error:', err);
                // offline / error: keep using cached list
                if (callback) callback();
            }
        });
    }

    function throttle(fn, wait) {
        let lastCall = 0;
        return function (...args) {
            const now = Date.now();
            if (now - lastCall >= wait) {
                lastCall = now;
                return fn(...args);
            }
        };
    }

    function injectReflowCSS() {
        const style = document.createElement('style');
        style.textContent = `
            .container .columns.is-multiline {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 12px !important;
                margin: 0 !important;
                padding: 0 !important;
                justify-content: flex-start !important;
                align-content: flex-start !important;
                width: 100% !important;
            }
            .container .columns.is-multiline .column.is-one-third-desktop {
                flex: 0 0 calc(33.333% - 8px) !important;
                max-width: calc(33.333% - 8px) !important;
                width: calc(33.333% - 8px) !important;
                box-sizing: border-box !important;
                margin: 0 !important;
                padding: 0.25rem !important;
            }
            .container .columns.is-multiline .column.is-one-third-desktop[style*="display: none"] {
                display: none !important;
            }
            @media screen and (max-width: 999px) {
                .container .columns.is-multiline .column.is-one-third-desktop {
                    flex: 0 0 calc(50% - 6px) !important;
                    max-width: calc(50% - 6px) !important;
                    width: calc(50% - 6px) !important;
                }
            }
            @media screen and (max-width: 767px) {
                .container .columns.is-multiline .column.is-one-third-desktop {
                    flex: 0 0 100% !important;
                    max-width: 100% !important;
                    width: 100% !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function createFilterUI() {
        const filterDiv = document.createElement('div');
        filterDiv.style = `
            margin: 20px;
            padding: 20px;
            background: #272c3e;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            display: flex;
            gap: 20px;
            align-items: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        filterDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="hideGateways" checked style="
                    width: 18px;
                    height: 18px;
                    accent-color: #3b82f6;
                    cursor: pointer;
                ">
                <label for="hideGateways" style="font-size: 16px; color: #ffffff; font-weight: bold; cursor: pointer;">hide known gateways</label>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <label style="font-size: 16px; color: #ffffff; font-weight: bold;">min online users:</label>
                <input type="number" id="minOnline" min="0" value="0" style="
                    padding: 8px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    width: 100px;
                    font-size: 14px;
                    transition: border-color 0.2s;
                " onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#e2e8f0'">
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <label style="font-size: 16px; color: #ffffff; font-weight: bold;">max online users:</label>
                <input type="number" id="maxOnline" min="0" value="" placeholder="∞" style="
                    padding: 8px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    width: 100px;
                    font-size: 14px;
                    transition: border-color 0.2s;
                " onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#e2e8f0'">
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="hideNew" style="
                    width: 18px;
                    height: 18px;
                    accent-color: #3b82f6;
                    cursor: pointer;
                ">
                <label for="hideNew" style="font-size: 16px; color: #ffffff; font-weight: bold; cursor: pointer;">hide new servers</label>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="onlyRated" style="
                    width: 18px;
                    height: 18px;
                    accent-color: #3b82f6;
                    cursor: pointer;
                ">
                <label for="onlyRated" style="font-size: 16px; color: #ffffff; font-weight: bold; cursor: pointer;">only show rated servers</label>
            </div>
        `;
        const mainContainer = document.querySelector('.columns.is-multiline');
        const parentContainer = mainContainer?.parentElement;
        if (parentContainer && mainContainer) {
            parentContainer.insertBefore(filterDiv, mainContainer);
        }

        const hideGatewaysCheckbox = document.getElementById('hideGateways');
        const minOnlineInput = document.getElementById('minOnline');
        const maxOnlineInput = document.getElementById('maxOnline');
        const hideNewCheckbox = document.getElementById('hideNew');
        const onlyRatedCheckbox = document.getElementById('onlyRated');
        hideGatewaysCheckbox.addEventListener('change', applyFilters);
        minOnlineInput.addEventListener('input', applyFilters);
        maxOnlineInput.addEventListener('input', applyFilters);
        hideNewCheckbox.addEventListener('change', applyFilters);
        onlyRatedCheckbox.addEventListener('change', applyFilters);

        return () => {
            hideGatewaysCheckbox.removeEventListener('change', applyFilters);
            minOnlineInput.removeEventListener('input', applyFilters);
            maxOnlineInput.removeEventListener('input', applyFilters);
            hideNewCheckbox.removeEventListener('change', applyFilters);
            onlyRatedCheckbox.removeEventListener('change', applyFilters);
        };
    }

    function addHideOption() {
        const dropdowns = document.querySelectorAll('.server-menu.dropdown');
        dropdowns.forEach(dropdown => {
            const serverDiv = dropdown.closest('.column.is-one-third-desktop');
            let serverId = serverDiv.querySelector('.button-mute-server')?.dataset.serverId;
            if (!serverId) {
                const serverLink = serverDiv.querySelector('a[href*="/server/"]');
                serverId = serverLink?.href.match(/\/server\/(\d+)/)?.[1];
            }
            if (!serverId) return;

            const dropdownMenu = dropdown.querySelector('.dropdown-content ul');
            if (dropdownMenu && !dropdownMenu.querySelector('.hide-forever')) {
                const hideItem = document.createElement('li');
                hideItem.innerHTML = `
                    <a class="dropdown-item hide-forever" href="javascript:;" rel="nofollow">
                        <i class="icon icon-eye-off"></i>
                        hide this server forever
                    </a>
                `;
                dropdownMenu.appendChild(hideItem);
                const hideButton = hideItem.querySelector('.hide-forever');
                hideButton.dataset.serverId = serverId;
                hideButton.addEventListener('click', () => hideServer(serverId, serverDiv));
            }
        });
    }

    function hideServer(serverId, serverDiv) {
        if (!hiddenServers.includes(serverId)) {
            hiddenServers.push(serverId);
            GM_setValue('hiddenServers', hiddenServers);
        }
        serverDiv.remove();
        reflowLayout();
    }

    function reflowLayout() {
        const mainContainer = document.querySelector('.columns.is-multiline');
        if (mainContainer) {
            const hideGateways = document.getElementById('hideGateways')?.checked ?? true;
            const manuallyHidden = GM_getValue('hiddenServers', []);
            const effectiveHidden = hideGateways ? hiddenServers : manuallyHidden;

            const visibleChildren = Array.from(mainContainer.children).filter(child => {
                const serverId = child.querySelector('.button-mute-server')?.dataset.serverId ||
                    child.querySelector('a[href*="/server/"]')?.href.match(/\/server\/(\d+)/)?.[1];
                return !effectiveHidden.includes(serverId);
            });
            mainContainer.innerHTML = '';
            visibleChildren.forEach(child => mainContainer.appendChild(child));
            // force a reflow
            mainContainer.style.display = 'none';
            mainContainer.offsetHeight;
            mainContainer.style.display = '';
            // trigger resize
            window.dispatchEvent(new Event('resize'));
        }
    }

    function applyFilters() {
        const hideGateways = document.getElementById('hideGateways')?.checked ?? true;
        const minOnline = parseInt(document.getElementById('minOnline').value) || 0;
        const maxOnlineVal = document.getElementById('maxOnline').value;
        const maxOnline = maxOnlineVal !== '' ? parseInt(maxOnlineVal) : Infinity;
        const hideNew = document.getElementById('hideNew').checked;
        const onlyRated = document.getElementById('onlyRated').checked;
        const mainContainer = document.querySelector('.columns.is-multiline');
        if (!mainContainer) return;

        // move servers to a temp
        const currentFragment = document.createDocumentFragment();
        const servers = document.querySelectorAll('.column.is-one-third-desktop');
        servers.forEach(server => currentFragment.appendChild(server));

        // mix in previously filtered servers
        const allServers = Array.from(currentFragment.children).concat(Array.from(filteredServersFragment.children));
        filteredServersFragment = document.createDocumentFragment();

        const manuallyHidden = GM_getValue('hiddenServers', []);
        const effectiveHidden = hideGateways
            ? hiddenServers
            : manuallyHidden;

        allServers.forEach(server => {
            let serverId = server.querySelector('.button-mute-server')?.dataset.serverId;
            if (!serverId) {
                const serverLink = server.querySelector('a[href*="/server/"]');
                serverId = serverLink?.href.match(/\/server\/(\d+)/)?.[1];
            }
            if (effectiveHidden.includes(serverId)) {
                filteredServersFragment.appendChild(server);
                return;
            }

            // mark gateway servers with a red name
            const nameLink = server.querySelector('.server-name a');
            if (nameLink) {
                nameLink.style.color = remoteBlocklist.has(serverId) ? '#ff4444' : '';
            }

            const onlineCount = parseInt(server.querySelector('.server-online')?.textContent) || 0;
            const isNew = server.querySelector('.server-newborn') !== null;
            const hasRating = server.querySelector('.server-rating-body') !== null;

            if ((hideNew && isNew) || onlineCount < minOnline || onlineCount > maxOnline || (onlyRated && !hasRating)) {
                filteredServersFragment.appendChild(server);
            } else {
                mainContainer.appendChild(server);
            }
        });

        reflowLayout();
    }

    function observeDOM() {
        const observer = new MutationObserver(throttle(() => {
            addHideOption();
            applyFilters();
        }, 500));
        observer.observe(document.body, { childList: true, subtree: true });
        return observer;
    }

    window.addEventListener('load', () => {
        injectReflowCSS();
        const cleanupFilterUI = createFilterUI();
        addHideOption();
        applyFilters();
        const observer = observeDOM();

        fetchBlocklist(() => {
            applyFilters();
        });

        window.addEventListener('unload', () => {
            observer.disconnect();
            cleanupFilterUI();
            filteredServersFragment = document.createDocumentFragment();
        });
    });
})();