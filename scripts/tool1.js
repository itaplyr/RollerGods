window.Tool1 = {
  name: "Tool 1",
  action: async (settings={}) => {
    if(window.tool1Running) return console.warn("Tool1 already running!");
    window.tool1Running = true;

    const csrfToken = (document.cookie.match(/x-csrf=([^;]+)/) || [])[1];
    const authToken = localStorage.getItem("token") || "";
    if(!csrfToken || !authToken){ console.error("Missing CSRF or auth token."); window.tool1Running=false; return; }

    async function fetchAllItems() {
      const url="https://rollercoin.com/api/marketplace/buy/sale-orders?currency=RLT&itemType=mutation_component&sort[field]=price&sort[order]=1&skip=0&limit=24&filter[0][name]=price&filter[0][min]=0&filter[0][max]=83000000";
      const res=await fetch(url,{method:"GET",credentials:"include",headers:{"Authorization":"Bearer "+authToken,"CSRF-Token":csrfToken,"X-KL-Ajax-Request":"Ajax_Request","Accept":"application/json"}});
      const json=await res.json();
      if(!json.success) throw new Error(json.error||"Marketplace fetch failed");
      return json.data.items;
    }

    const items = await fetchAllItems();

    async function purchaseLoop() {
      if(!window.tool1Running) return;

      for(const item of items){
        const key=`${item.name.en}_${item.rarityGroup.title.en}`;
        const threshold=settings[key];
        if(!threshold) continue;

        if(item.price <= threshold){
          console.log(`Trying to buy ${item.name.en} (${item.rarityGroup.title.en}) for ${item.price} (threshold: ${threshold})`);
          try{
            const res = await fetch("https://rollercoin.com/api/marketplace/purchase-item",{
              method:"POST", credentials:"include", headers:{
                "Authorization":"Bearer "+authToken,
                "CSRF-Token":csrfToken,
                "X-KL-Ajax-Request":"Ajax_Request",
                "Content-Type":"application/json"
              },
              body: JSON.stringify({
                challenge:"", action:"marketplace",
                itemId:item.itemId,
                itemType:item.itemType,
                totalCount:item.count||1,
                currency:"RLT",
                totalPrice:item.price*(item.count||1)
              })
            });
            const data = await res.json();
            console.log("Purchase response:", data);
          } catch(err){
            console.error("Purchase error:", err);
          }
        }
      }

      if(window.tool1Running) setTimeout(purchaseLoop, 1000);
    }

    purchaseLoop();
  },

  stop: ()=>{
    window.tool1Running=false;
    console.log("🛑 Tool1 stopped!");
  }
};
