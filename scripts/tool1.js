window.Tool1 = {
  name: "Tool 1",
  action: ({ part, rarity, priceThreshold } = {}) => {
    if (window.tool1Running) {
      console.warn("Tool1 is already running!");
      return;
    }
    window.tool1Running = true;

    const currency = "RLT";
    const itemType = "mutation_component";

    // ===== Map of parts and rarities to itemIds =====
    const productIds = {
      "Hashboard": {
        "Common":"61b3606767433d2dc58913a9",
        "Uncommon":"6319f840a8ce530569ef82b7",
        "Rare":"61b35e3767433d2dc57f86a2",
        "Epic":"6319fc56a8ce530569024d79",
        "Legendary":"6196289f67433d2dc53c0c5d"
      },
      "Wire": {
        "Common":"61b3604967433d2dc58893b0",
        "Uncommon":"6319f81fa8ce530569eee9dd",
        "Rare":"61b35dcd67433d2dc57daca3",
        "Epic":"6319f969a8ce530569f4b3e8",
        "Legendary":"6196281467433d2dc53872b3"
      },
      "Fan": {
        "Common":"61b35fea67433d2dc586f7fe",
        "Uncommon":"6319f7baa8ce530569ed16b9",
        "Rare":"61b35dac67433d2dc57d1156",
        "Epic":"6319f918a8ce530569f33dd5",
        "Legendary":"6196269b67433d2dc52e0130"
      }
    };

    const itemId = productIds[part]?.[rarity];
    if (!itemId) {
      console.error("Invalid part or rarity selected!");
      window.tool1Running = false;
      return;
    }

    // ===== Get tokens =====
    const csrfToken = (document.cookie.match(/x-csrf=([^;]+)/) || [])[1];
    const authToken = localStorage.getItem("token") || "";
    if (!csrfToken || !authToken) {
      console.error("Missing CSRF or auth token.");
      window.tool1Running = false;
      return;
    }

    // ===== Helper to fetch sale orders page =====
    async function fetchSaleOrders(skip = 0, limit = 24) {
      const url = new URL("https://rollercoin.com/api/marketplace/buy/sale-orders");
      url.searchParams.set("currency", currency);
      url.searchParams.set("itemType", itemType);
      url.searchParams.set("sort[field]", "price");
      url.searchParams.set("sort[order]", "1"); // ascending price
      url.searchParams.set("skip", skip);
      url.searchParams.set("limit", limit);
      url.searchParams.set("filter[0][name]", "price");
      url.searchParams.set("filter[0][min]", "0");
      url.searchParams.set("filter[0][max]", priceThreshold);

      const res = await fetch(url.toString(), {
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
      return json.data;
    }

    // ===== Buy item =====
    async function buyItem(price, quantity) {
      const res = await fetch("https://rollercoin.com/api/marketplace/purchase-item", {
        method: "POST",
        credentials: "include",
        headers: {
          "Authorization": "Bearer " + authToken,
          "CSRF-Token": csrfToken,
          "X-KL-Ajax-Request": "Ajax_Request",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          challenge: "",
          action: "marketplace",
          itemId,
          itemType,
          totalCount: quantity,
          currency,
          totalPrice: price * quantity
        })
      });
      const json = await res.json();
      if (json.error === "Conflict") {
        console.warn("Purchase conflict (409).");
        return null;
      }
      return json;
    }

    // ===== Main loop =====
    async function runLoop() {
      if (!window.tool1Running) return;

      try {
        const limit = 24;
        let skip = 0;
        let purchased = false;

        while (window.tool1Running && !purchased) {
          const data = await fetchSaleOrders(skip, limit);
          const items = data.items.filter(i => i.itemId === itemId && i.price <= priceThreshold);

          for (const item of items) {
            console.log(`Attempting purchase: ${item.name.en} at ${item.price} RLT`);
            const result = await buyItem(item.price, item.count);
            console.log("Purchase result:", result);
            purchased = true;
            break;
          }

          if (!purchased && data.items.length === limit) {
            skip += limit; // next page
          } else {
            break;
          }
        }

      } catch (err) {
        console.error("Error in Tool1 loop:", err);
      }

      if (window.tool1Running) {
        setTimeout(runLoop, 1000); // loop every second
      }
    }

    runLoop();
  },

  stop: () => {
    window.tool1Running = false;
    console.log("🛑 Tool1 stopped!");
  }
};
