window.Tool1 = {
  name: "Tool 1",
  action: ({ part, rarity, priceThreshold } = {}) => {
    if (window.tool1Running) {
      console.warn("Tool1 is already running!");
      return;
    }
    window.tool1Running = true;

    const productIds = {
      Hashboard: {
        Common: "61b3606767433d2dc58913a9",
        Uncommon: "6319f840a8ce530569ef82b7",
        Rare: "61b35e3767433d2dc57f86a2",
        Epic: "6319fc56a8ce530569024d79",
        Legendary: "6196289f67433d2dc53c0c5d"
      },
      Wire: {
        Common: "61b3604967433d2dc58893b0",
        Uncommon: "6319f81fa8ce530569eee9dd",
        Rare: "61b35dcd67433d2dc57daca3",
        Epic: "6319f969a8ce530569f4b3e8",
        Legendary: "6196281467433d2dc53872b3"
      },
      Fan: {
        Common: "61b35fea67433d2dc586f7fe",
        Uncommon: "6319f7baa8ce530569ed16b9",
        Rare: "61b35dac67433d2dc57d1156",
        Epic: "6319f918a8ce530569f33dd5",
        Legendary: "6196269b67433d2dc52e0130"
      }
    };

    if (!part || !rarity || !productIds[part] || !productIds[part][rarity]) {
      console.error("Invalid part or rarity selected!", part, rarity);
      window.tool1Running = false;
      return;
    }

    const itemId = productIds[part][rarity];
    if (priceThreshold != null) localStorage.setItem("tool1_priceThreshold", priceThreshold);
    localStorage.setItem("tool1_itemId", itemId);

    (async () => {
      // Load pako if missing
      if (!window.pako) {
        await new Promise(resolve => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js";
          s.onload = resolve;
          document.head.appendChild(s);
        });
      }

      const csrfToken = (document.cookie.match(/x-csrf=([^;]+)/) || [])[1];
      const authToken = localStorage.getItem("token") || "";

      if (!csrfToken || !authToken) {
        console.error("Missing CSRF or auth token.");
        window.tool1Running = false;
        return;
      }

      const itemType = "mutation_component";
      const currency = "RLT";

      // Fetch offers
      async function fetchOffers() {
        try {
          const res = await fetch(`https://rollercoin.com/api/marketplace/buy/sale-orders?currency=${currency}&itemType=${itemType}&sort[field]=price&sort[order]=1&skip=0&limit=24&filter[0][name]=price&filter[0][min]=0&filter[0][max]=83000000`, {
            credentials: "include",
            headers: {
              "Authorization": "Bearer " + authToken,
              "CSRF-Token": csrfToken,
              "X-KL-Ajax-Request": "Ajax_Request",
              "Accept": "application/json"
            },
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || "API error");
          return json.data.items.filter(i => i.itemId === itemId);
        } catch (err) {
          console.error("Error fetching offers:", err);
          return [];
        }
      }

      // Buy item
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
          return await res.json();
        } catch (err) {
          console.error("Error buying item:", err);
          return null;
        }
      }

      // Main loop
      async function runTool() {
        if (!window.tool1Running) return;

        const offers = await fetchOffers();
        if (!Array.isArray(offers) || offers.length === 0) {
          console.log("No offers found. Retrying...");
          setTimeout(runTool, 1000);
          return;
        }

        for (let offer of offers) {
          const price = offer.price;
          const quantity = offer.count || 1;
          console.log(`Found ${part} (${rarity}) - Price: ${price}, Quantity: ${quantity}`);

          if (price <= priceThreshold) {
            console.log("Price below threshold, attempting purchase...");
            const json = await buyItem(price, quantity);
            console.log("Purchase response:", json);
          }
        }

        if (window.tool1Running) setTimeout(runTool, 2000); // continuous
      }

      runTool();
    })();
  },

  stop: () => {
    window.tool1Running = false;
    console.log("🛑 Tool1 stopped!");
  }
};
