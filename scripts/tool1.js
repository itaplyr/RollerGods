// v0.3.1 - Configurable product + threshold + restart + save config
export default {
  name: "Tool 1",
  action: ({ itemId, priceThreshold } = {}) => {
    if (window.tool1Running) {
      console.warn("Tool1 is already running!");
      return;
    }
    window.tool1Running = true;

    // save config for next run
    if (itemId) localStorage.setItem("tool1_itemId", itemId);
    if (priceThreshold) localStorage.setItem("tool1_priceThreshold", priceThreshold);

    (async () => {
      // load pako if missing
      if (!window.pako) {
        await new Promise(resolve => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js";
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      // === decoding helpers ===
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

      // === config ===
      const itemType = "mutation_component";
      const currency = "RLT";

      const csrfToken = (document.cookie.match(/x-csrf=([^;]+)/) || [])[1];
      const authToken = localStorage.getItem("token") || "";

      if (!csrfToken || !authToken) {
        console.error("Missing CSRF or auth token.");
        window.tool1Running = false;
        return;
      }

      // === API helpers ===
      async function fetchTradeOffers() {
        const res = await fetch(
          `https://rollercoin.com/api/marketplace/item-info?itemId=${itemId}&itemType=${itemType}&currency=${currency}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Authorization": "Bearer " + authToken,
              "CSRF-Token": csrfToken,
              "X-KL-Ajax-Request": "Ajax_Request",
              "Accept": "application/json",
            },
          }
        );
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "API error");
        return json.data.tradeOffers;
      }

      async function getFirstOffer() {
        try {
          const tradeOffers = await fetchTradeOffers();
          const offers = gs(tradeOffers);
          return offers[0] || null;
        } catch (err) {
          console.error("Error decoding tradeOffers:", err);
          return null;
        }
      }

      async function buyItem(price, quantity) {
        try {
          const res = await fetch("https://rollercoin.com/api/marketplace/purchase-item", {
            method: "POST",
            credentials: "include",
            headers: {
              "Authorization": "Bearer " + authToken,
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
              currency,
              totalPrice: price * quantity,
            }),
          });
          return res.json();
        } catch (err) {
          console.error("Error during purchase:", err);
          return null;
        }
      }

      // === main loop ===
      async function runTool() {
        if (!window.tool1Running) return;
        let purchased = false;

        while (window.tool1Running && !purchased) {
          const offer = await getFirstOffer();
          if (!offer) {
            await new Promise(r => setTimeout(r, 50));
            continue;
          }

          const [price, quantity] = offer;
          console.log("First offer - Price:", price, "Quantity:", quantity);

          if (price < priceThreshold) {
            console.log("Price below threshold, attempting purchase...");
            const json = await buyItem(price, quantity);
            if (!json) break;

            console.log("Purchase response:", json);
            if (json.error === "Conflict") {
              console.warn("Purchase conflict (409), stopping current iteration.");
            } else {
              console.log("✅ Purchase successful!");
            }
            purchased = true;
          }

          await new Promise(r => setTimeout(r, 50));
        }

        if (window.tool1Running) {
          console.log("🔄 Restarting Tool1 for next purchase...");
          setTimeout(runTool, 100);
        }
      }

      runTool();
    })();
  },
  stop: () => {
    window.tool1Running = false;
    console.log("🛑 Tool1 stopped!");
  },
};
