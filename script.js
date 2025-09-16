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
  const locks = {
    "61b3604967433d2dc58893b0": false,
    "61b35fea67433d2dc586f7fe": false,
    "61b3606767433d2dc58913a9": false,
  };

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
      console.log("✅ Purchase response for", price, "and quantity", quantity, ":", data);
    } catch (err) {
      console.error(`Error buying item ${itemId}:`, err);
      window.location.reload();
    } finally {
      // release lock *after* the request is fully done
      locks[itemId] = false;
    }
  }

  // --- WebSocket connection ---
  const ws = new WebSocket(`wss://nws.rollercoin.com/?token=${token}`);
  const targetItems = Object.keys(locks);

  ws.onopen = () => console.log("✅ WebSocket connected");
  ws.onclose = () => console.log("❌ WebSocket disconnected");
  ws.onerror = e => console.error("WebSocket error:", e);

  ws.onmessage = async (event) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.cmd === "marketplace_orders_update") {
        const { item_id, currency, data } = msg.value;

        if (!targetItems.includes(item_id) || currency !== "RLT") return;

        const decodedOffers = gs(data.tradeOffers);
        if (!decodedOffers.length) return;

        const [firstPrice, firstQuantity] = decodedOffers[0] || [];
        console.log(`Item ${item_id} - First trade offer price:`, firstPrice, "quantity:", firstQuantity);

        if (firstPrice !== undefined && firstPrice < 1700) {
          console.log(`attempting purchase for price ${firstPrice} x${firstQuantity}`);
          await buyItem(item_id, firstPrice, firstQuantity);
        }
      }
    } catch (err) {
      console.error("Error parsing WebSocket message:", err);
    }
  };
})();
