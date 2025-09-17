const productIds = {
  "Hashboard": {
    "Common": "61b3606767433d2dc58913a9",
    "Uncommon": "6319f840a8ce530569ef82b7",
    "Rare": "61b35e3767433d2dc57f86a2",
    "Epic": "6319fc56a8ce530569024d79",
    "Legendary": "6196289f67433d2dc53c0c5d",
  },
  "Wire": {
    "Common": "61b3604967433d2dc58893b0",
    "Uncommon": "6319f81fa8ce530569eee9dd",
    "Rare": "61b35dcd67433d2dc57daca3",
    "Epic": "6319f969a8ce530569f4b3e8",
    "Legendary": "6196281467433d2dc53872b3",
  },
  "Fan": {
    "Common": "61b35fea67433d2dc586f7fe",
    "Uncommon": "6319f7baa8ce530569ed16b9",
    "Rare": "61b35dac67433d2dc57d1156",
    "Epic": "6319f918a8ce530569f33dd5",
    "Legendary": "6196269b67433d2dc52e0130",
  },
};

// === price thresholds per itemId (for buying) ===
const priceThresholds = {
  // --- Hashboards ---
  "61b3606767433d2dc58913a9": 1700,
  "6319f840a8ce530569ef82b7": 90000,
  "61b35e3767433d2dc57f86a2": 1700000,
  "6319fc56a8ce530569024d79": 17000000,
  "6196289f67433d2dc53c0c5d": 28000,

  // --- Wires ---
  "61b3604967433d2dc58893b0": 1700,
  "6319f81fa8ce530569eee9dd": 90000,
  "61b35dcd67433d2dc57daca3": 1700000,
  "6319f969a8ce530569f4b3e8": 17000000,
  "6196281467433d2dc53872b3": 25600,

  // --- Fans ---
  "61b35fea67433d2dc586f7fe": 1700,
  "6319f7baa8ce530569ed16b9": 90000,
  "61b35dac67433d2dc57d1156": 1700000,
  "6319f918a8ce530569f33dd5": 17000000,
  "6196269b67433d2dc52e0130": 3500000,
};

// === fixed sell prices per itemId ===
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


(async () => {
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

  // --- load token and CSRF ---
  const token = localStorage.getItem("token");
  const csrfToken = (document.cookie.match(/x-csrf=([^;]+)/) || [])[1];

  if (!token || !csrfToken) {
    console.error("❌ Missing token or CSRF token!");
    return;
  }

  // --- per-item locks ---
  const locks = {};
  for (const group of Object.values(productIds)) {
    for (const id of Object.values(group)) {
      locks[id] = false;
    }
  }

  // --- build reverse lookup map ---
  const itemNames = {};
  for (const [name, rarities] of Object.entries(productIds)) {
    for (const [rarity, id] of Object.entries(rarities)) {
      itemNames[id] = `${name} ${rarity}`;
    }
  }

  // --- buy function ---
  async function buyItem(itemId, price, quantity) {
    if (locks[itemId]) return; // already buying → skip
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
          itemType: "mutation_component",
          totalCount: quantity,
          currency: "RLT",
          totalPrice: price * quantity,
        }),
        keepalive: true,
      });

      if (res.status === 401 || res.status === 409 || res.status >= 400) {
        console.warn(`Purchase failed with status ${res.status}, reloading page...`);
        return window.location.reload();
      }

      const data = await res.json();
      console.log(`✅ Purchase response for ${itemNames[itemId] || itemId}:`, data);

      await autoSellItem(itemId, [], quantity);
    } catch (err) {
      console.error(`Error buying item ${itemNames[itemId] || itemId}:`, err);
      window.location.reload();
    } finally {
      locks[itemId] = false;
    }
  }

  async function autoSellItem(itemId, decodedOffers, ownedQuantity = 1) {
    const itemName = itemNames[itemId] || itemId;
    const finalPrice = sellPrices[itemId];

    if (!finalPrice) {
        console.log(`🟡 [AutoSell] No fixed sell price set for ${itemName}, skipping...`);
        return;
    }

    // calculate profit (server expects this value)
    const profitPrice = Math.floor(finalPrice / 1.05);

    const payload = {
        challenge: "",
        action: "marketplace",
        itemId,
        itemType: "mutation_component",
        totalCount: ownedQuantity,
        currency: "RLT",
        exchangeCurrency: "RLT",
        perItemPrice: profitPrice,
    };

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
        body: JSON.stringify(payload),
        });

        if (res.status >= 400) {
        console.warn(`Sell failed for ${itemName} with status ${res.status}`);
        return;
        }

        const data = await res.json();
        console.log(`✅ Sold ${ownedQuantity}x ${itemName} at ${profitPrice} profit (final price ${finalPrice})`);
        console.log("Response:", data);

    } catch (err) {
        console.error(`Error selling ${itemName}:`, err);
    }
  }





  // --- WebSocket connection ---
  const ws = new WebSocket(`wss://nws.rollercoin.com/?token=${token}`);

  ws.onopen = () => console.log("✅ WebSocket connected");
  ws.onclose = () => console.log("❌ WebSocket disconnected");
  ws.onerror = e => console.error("WebSocket error:", e);

  ws.onmessage = async (event) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.cmd === "marketplace_orders_update") {
        const { item_id, currency, data } = msg.value;

        if (!(item_id in locks) || currency !== "RLT") return;

        const decodedOffers = gs(data.tradeOffers);
        if (!decodedOffers.length) return;

        const [firstPrice, firstQuantity] = decodedOffers[0] || [];
        const itemName = itemNames[item_id] || item_id;

        console.log(
          `📊 Market update for ${itemName} - lowest price: ${firstPrice}, quantity: ${firstQuantity}`
        );

        // --- Auto-buy check ---
        const threshold = priceThresholds[item_id];
        if (threshold && firstPrice !== undefined && firstPrice < threshold) {
          console.log(
            `⚡ Attempting purchase: ${itemName} at ${firstPrice} (threshold ${threshold})`
          );
          await buyItem(item_id, firstPrice, firstQuantity);
        }
      }
    } catch (err) {
      console.error("Error parsing WebSocket message:", err);
    }
  };
})();
