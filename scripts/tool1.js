window.Tool1 = {
  name: "Tool 1",
  action: ({ itemId, priceThreshold } = {}) => {
    if (window.tool1Running) {
      console.warn("Tool1 is already running!");
      return;
    }
    window.tool1Running = true;

    if (!itemId) {
      console.error("Item ID is required!");
      window.tool1Running = false;
      return;
    }

    if (priceThreshold != null) localStorage.setItem("tool1_priceThreshold", priceThreshold);
    localStorage.setItem("tool1_itemId", itemId);

    (async () => {
      const csrfToken = (document.cookie.match(/x-csrf=([^;]+)/) || [])[1];
      const authToken = localStorage.getItem("token") || "";

      if (!csrfToken || !authToken) {
        console.error("Missing CSRF or auth token.");
        window.tool1Running = false;
        return;
      }

      const itemType = "mutation_component";
      const currency = "RLT";

      async function fetchOffers() {
        try {
          const res = await fetch(
            `https://rollercoin.com/api/marketplace/buy/sale-orders?currency=${currency}&itemType=${itemType}&sort[field]=price&sort[order]=1&skip=0&limit=24&filter[0][name]=price&filter[0][min]=0&filter[0][max]=83000000`,
            {
              credentials: "include",
              headers: {
                "Authorization": "Bearer " + authToken,
                "CSRF-Token": csrfToken,
                "X-KL-Ajax-Request": "Ajax_Request",
                "Accept": "application/json"
              },
            }
          );
          const json = await res.json();
          if (!json.success) throw new Error(json.error || "API error");
          return json.data.items;
        } catch (err) {
          console.error("Error fetching offers:", err);
          return [];
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
          return await res.json();
        } catch (err) {
          console.error("Error buying item:", err);
          return null;
        }
      }

      async function runTool() {
        if (!window.tool1Running) return;

        const offers = await fetchOffers();
        if (!Array.isArray(offers) || offers.length === 0) {
          console.log("No offers found. Retrying...");
          setTimeout(runTool, 1000);
          return;
        }

        const offer = offers.find(o => o.itemId === itemId);

        if (offer) {
          console.log(`Found ${itemId} - Price: ${offer.price}, Quantity: ${offer.count}`);
          if (offer.price <= priceThreshold) {
            console.log("Price below threshold, attempting purchase...");
            const json = await buyItem(offer.price, offer.count);
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
