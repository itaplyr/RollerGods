export default {
  name: "Tool 1",
  action: () => {
    if (window.tool1Interval) {
      console.warn("Tool1 is already running!");
      return;
    }

    (async () => {
      // Load pako if not present
      if (!window.pako) {
        await new Promise(resolve => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js';
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      // Helper functions
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
        for (const [n, l] of t) { a += n; if (l !== 0) s.push([a, l]); }
        return s;
      }
      function gs(t) {
        const c = os(t);
        const a = window.pako.inflate(c);
        const [s, n] = ds(a);
        return us(s, n);
      }

      // === CONFIG ===
      const itemId = "61b35fea67433d2dc586f7fe";
      const itemType = "mutation_component";
      const currency = "RLT";

      // Read CSRF token & auth token
      const csrfToken = (document.cookie.match(/x-csrf=([^;]+)/) || [])[1];
      const authToken = window.localStorage.getItem("token") || "";

      if (!csrfToken || !authToken) {
        console.error("Missing CSRF or auth token.");
        return;
      }

      // Fetch tradeOffers string
      async function fetchTradeOffers() {
        const res = await fetch(`https://rollercoin.com/api/marketplace/item-info?itemId=${itemId}&itemType=${itemType}&currency=${currency}`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Authorization": "Bearer " + authToken,
            "CSRF-Token": csrfToken,
            "X-KL-Ajax-Request": "Ajax_Request",
            "Accept": "application/json"
          }
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "API error");
        return json.data.tradeOffers;
      }

      // Decode tradeOffers and get first item price
      async function getFirstPrice() {
        try {
          const tradeOffers = await fetchTradeOffers();
          const offers = gs(tradeOffers);
          return offers[0]?.[1] || null; // [price, quantity], we want price
        } catch (err) {
          console.error("Error decoding tradeOffers:", err);
          return null;
        }
      }

      // Poll every 100ms and store interval ID
      window.tool1Interval = setInterval(async () => {
        const price = await getFirstPrice();
        if (price !== null) console.log("First item price:", price);
        else console.log("No price available.");
      }, 100);

    })();
  },
  stop: () => {
    if (window.tool1Interval) {
      clearInterval(window.tool1Interval);
      window.tool1Interval = null;
      console.log("Tool1 stopped!");
    }
  }
};
