(async () => {
    // Only run if enabled
    if (localStorage.getItem("rollergods_autobuy_enabled") !== "1") return;

    // Prevent multiple runs
    if (window.__rollergods_loaded) return;
    window.__rollergods_loaded = true;
    if (!window.pako) {
        await new Promise(resolve => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js";
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    // --- decoding helpers ---
    function os(t) { return Uint8Array.from(atob(t), c => c.charCodeAt(0)); }
    function ds(t) {
        const c = new DataView(t.buffer);
        let a = 0;
        const s = c.getUint16(a); a += 2;
        const n = Number(c.getBigUint64(a)); a += 8;
        const l = [];
        for (let r = 0; r < s; r++) {
            const o = c.getUint32(a); a += 4;
            const i = c.getUint32(a); a += 4;
            l.push([o, i]);
        }
        return [l, n];
    }
    function us(t, c) {
        let a = c;
        const s = [];
        for (const [n, l] of t) {
            a += n;
            if (l !== 0) s.push([a, l]);
        }
        return s;
    }
    function gs(t) {
        const c = os(t);
        const a = window.pako.inflate(c);
        const [s, n] = ds(a);
        return us(s, n);
    }

    // --- auth ---
    const token = localStorage.getItem("token");
    const csrfToken = (document.cookie.match(/x-csrf=([^;]+)/) || [])[1];
    if (!token || !csrfToken) {
        console.error("❌ Missing token or CSRF token!");
        window.location.reload();
        return;
    }

    const locks = {};

    // --- sell prices ---
    const sellPrices = {
        // --- Hashboards ---
        "61b3606767433d2dc58913a9": 2200,     // Hashboard Common
        "6319f840a8ce530569ef82b7": 120000,   // Hashboard Uncommon
        "61b35e3767433d2dc57f86a2": 2500000,  // Hashboard Rare
        "6319fc56a8ce530569024d79": 24000000, // Hashboard Epic
        "6196289f67433d2dc53c0c5d": 99999999999999999999999,    // Hashboard Legendary

        // --- Wires ---
        "61b3604967433d2dc58893b0": 2200,     // Wire Common
        "6319f81fa8ce530569eee9dd": 120000,   // Wire Uncommon
        "61b35dcd67433d2dc57daca3": 2500000,  // Wire Rare
        "6319f969a8ce530569f4b3e8": 24000000, // Wire Epic
        "6196281467433d2dc53872b3": 999999999999999999999999999,    // Wire Legendary

        // --- Fans ---
        "61b35fea67433d2dc586f7fe": 2200,     // Fan Common
        "6319f7baa8ce530569ed16b9": 120000,   // Fan Uncommon
        "61b35dac67433d2dc57d1156": 2500000,  // Fan Rare
        "6319f918a8ce530569f33dd5": 24000000, // Fan Epic
        "6196269b67433d2dc52e0130": 99999999999999999999999999999999,  // Fan Legendary
    };

    // --- sell function ---
    async function sellItem(itemId, quantity = 1, itemType = "mutation_component") {
        const price = sellPrices[itemId];
        if (!price) {
            console.warn(`No sell price set for item ${itemId}`);
            return;
        }
        try {
            const res = await fetch("https://rollercoin.com/api/marketplace/sell-item", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Authorization": "Bearer " + token,
                    "CSRF-Token": csrfToken,
                    "X-KL-Ajax-Request": "Ajax_Request",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    challenge: "",
                    action: "marketplace",
                    itemId,
                    itemType,
                    totalCount: quantity,
                    currency: "RLT",
                    exchangeCurrency: "RLT",
                    perItemPrice: price
                }),
                keepalive: true,
            });
            if (res.status == 401) window.location.reload();
            if (res.status >= 400) {
                console.warn(`Sell failed ${res.status}`);
                return;
            }
            const data = await res.json();
            console.log(`✅ Listed ${itemId} for sale at ${price}`, data);
        } catch (err) {
            console.error("Sell error:", err);
        }
    }

    // --- buy function ---
    async function buyItem(itemId, price, quantity, itemType = "mutation_component") {
        if (locks[itemId]) return;
        locks[itemId] = true;
        try {
            const res = await fetch("https://rollercoin.com/api/marketplace/purchase-item", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Authorization": "Bearer " + token,
                    "CSRF-Token": csrfToken,
                    "X-KL-Ajax-Request": "Ajax_Request",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    challenge: "",
                    action: "marketplace",
                    itemId,
                    itemType,
                    totalCount: quantity,
                    currency: "RLT",
                    totalPrice: price * quantity,
                }),
                keepalive: true,
            });
            if (res.status >= 400) {
                console.warn(`Purchase failed ${res.status}`);
                return;
            }
            const data = await res.json();
            console.log(`✅ Bought ${itemId}`, data);

            // Auto-sell after buy
            await sellItem(itemId, quantity, itemType);

        } catch (err) {
            console.error("Buy error:", err);
        } finally {
            locks[itemId] = false;
        }
    }

    // --- WebSocket connection ---
    const ws = new WebSocket(`wss://nws.rollercoin.com/?token=${token}`);
    ws.onopen = () => console.log("✅ WS connected");
    ws.onclose = () => console.log("❌ WS closed");
    ws.onerror = e => console.error("WS error:", e);

    ws.onmessage = async (event) => {
        // Stop if parameter is disabled
        if (localStorage.getItem("rollergods_autobuy_enabled") !== "1") {
            ws.close();
            return;
        }
        try {
            const msg = JSON.parse(event.data);
            if (msg.cmd !== "marketplace_orders_update") return;

            const { item_id, currency, data } = msg.value;
            if (currency !== "RLT") return;

            const decodedOffers = gs(data.tradeOffers);
            if (!decodedOffers.length) return;

            const [firstPrice, firstQuantity] = decodedOffers[0] || [];
            let snipes = JSON.parse(localStorage.getItem("snipes") || "{}");

            for (const key in snipes) {
                const [type, id] = key.split(":");
                if (id === item_id && firstPrice <= snipes[key]) {
                    console.log(`⚡ Snipe: ${type}:${id} at ${firstPrice} (≤ ${snipes[key]})`);
                    await buyItem(item_id, firstPrice, firstQuantity, type);
                }
            }
        } catch (err) {
            console.error("WS message error:", err);
        }
    };

    // === Poll Google Sheet to check if script should run ===
    async function checkIfRunning() {
        if (localStorage.getItem("rollergods_autobuy_enabled") !== "1") return false;
        const rg_userId = localStorage.getItem("rg_userId");
        if (!rg_userId) return false;
        return true; // TEMP: always return true
    }

    let autoRunEnabled = true;
    setInterval(async () => {
        // Stop if parameter is disabled
        if (localStorage.getItem("rollergods_autobuy_enabled") !== "1") {
            ws.close();
            autoRunEnabled = false;
            return;
        }
        const running = await checkIfRunning();
        if (!running && autoRunEnabled) {
            console.log("🛑 Script disabled from Google Sheet. Stopping automation...");
            autoRunEnabled = false;
        }
    }, 1000);
})();

(function() {
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const interval = setInterval(() => {
                const el = document.querySelector(selector);
                if (el) {
                    clearInterval(interval);
                    resolve(el);
                } else if (Date.now() - start > timeout) {
                    clearInterval(interval);
                    reject(new Error('Element not found: ' + selector));
                }
            }, 100);
        });
    }

    async function createSnipeUI() {
        try {
            const wrapper = await waitForElement('[class*="roller-button default cyan"]');
            if (!wrapper || document.getElementById('snipe-ui')) return;

            const container = document.createElement('div');
            container.id = 'snipe-ui';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.style.marginLeft = '0px';
            container.style.marginTop = '18px';
            container.style.borderRadius = '12px';
            container.style.background = '#1F1F2D';
            container.style.padding = '10px 18px';
            container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)';

            const priceInput = document.createElement('input');
            priceInput.type = 'number';
            priceInput.placeholder = 'Price';
            priceInput.className = 'quantity-input form-control';
            priceInput.style.width = '80px';
            priceInput.style.marginRight = '8px';
            priceInput.style.borderRadius = '8px';
            priceInput.style.border = '1px solid #ccc';
            priceInput.style.boxShadow = 'none';
            priceInput.style.textAlign = 'center';
            priceInput.style.appearance = 'textfield';
            priceInput.style.MozAppearance = 'textfield';
            priceInput.addEventListener('wheel', e => e.preventDefault());
            priceInput.addEventListener('keydown', function(e) {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                }
            });

            const snipeBtn = document.createElement('button');
            snipeBtn.textContent = 'Snipe';
            snipeBtn.className = wrapper.className;
            snipeBtn.style.borderRadius = '8px';

            container.appendChild(priceInput);
            container.appendChild(snipeBtn);
            wrapper.parentNode.insertBefore(container, wrapper.nextSibling);

            snipeBtn.onclick = () => {
                const item = getItemIdFromUrl();
                const price = parseFloat(priceInput.value);
                if (!item || isNaN(price)) {
                    alert('Invalid item or price!');
                    return;
                }
                let snipes = JSON.parse(localStorage.getItem('snipes') || '{}');
                snipes[item.type + ':' + item.id] = price;
                localStorage.setItem('snipes', JSON.stringify(snipes));
                alert('Snipe set for ' + item.type + ' ' + item.id + ' at price ' + price);
            };
        } catch (e) {
            console.error(e);
        }
    }

    function isMarketplaceBuyPage() {
        return /^\/marketplace\/buy\/[^\/]+\/[^\/]+$/.test(location.pathname);
    }

    function getItemIdFromUrl() {
        const parts = location.pathname.split('/');
        return parts.length === 5 ? { type: parts[3], id: parts[4] } : null;
    }

    async function snipeItems() {
        let snipes = JSON.parse(localStorage.getItem('snipes') || '{}');
        window.snipePriceThresholds = snipes;
    }

    function init() {
        if (isMarketplaceBuyPage()) {
            createSnipeUI();
            setInterval(snipeItems, 5000);
        }
    }

    document.addEventListener('DOMContentLoaded', init);
    setInterval(() => {
        if (isMarketplaceBuyPage() && !document.getElementById('snipe-ui')) {
            createSnipeUI();
        }
    }, 1000);
})();
