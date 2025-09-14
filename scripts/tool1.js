
// ===== tool1.js =====
window.Tool1 = {
  name: "Tool 1",
  action: (combos=[]) => {
    if(window.tool1Running){
      console.warn("Tool1 already running!");
      return;
    }
    window.tool1Running=true;

    const csrfToken = (document.cookie.match(/x-csrf=([^;]+)/)||[])[1];
    const authToken = localStorage.getItem("token")||"";
    if(!csrfToken||!authToken){console.error("Missing CSRF or auth token."); window.tool1Running=false; return;}

    (async ()=>{
      while(window.tool1Running){
        for(const combo of combos){
          const {part, rarity, itemId, priceThreshold} = combo;
          try{
            const res = await fetch(`https://rollercoin.com/api/marketplace/buy/sale-orders?currency=RLT&itemType=mutation_component&sort[field]=price&sort[order]=1&skip=0&limit=24&filter[0][name]=price&filter[0][min]=0&filter[0][max]=${priceThreshold}`, {
              credentials:"include",
              headers:{
                "Authorization":"Bearer "+authToken,
                "CSRF-Token":csrfToken,
                "X-KL-Ajax-Request":"Ajax_Request",
                "Accept":"application/json"
              },
              method:"GET"
            });
            const json=await res.json();
            if(!json.success){console.warn(`Failed fetch ${part} ${rarity}`,json.error); continue;}
            const items=json.data.items.filter(i=>i.itemId===itemId);
            for(const item of items){
              if(item.price<=priceThreshold){
                const buyRes = await fetch("https://rollercoin.com/api/marketplace/purchase-item",{
                  method:"POST",
                  credentials:"include",
                  headers:{
                    "Authorization":"Bearer "+authToken,
                    "CSRF-Token":csrfToken,
                    "X-KL-Ajax-Request":"Ajax_Request",
                    "Content-Type":"application/json"
                  },
                  body:JSON.stringify({challenge:"",action:"marketplace",itemId,itemType:"mutation_component",totalCount:item.count,currency:"RLT",totalPrice:item.price*item.count})
                });
                const buyJson=await buyRes.json();
                console.log(`Bought ${part} (${rarity}) price=${item.price}:`,buyJson);
              }
            }
          }catch(err){console.error("Error in combo",combo,err);}
          await new Promise(r=>setTimeout(r,50));
        }
        await new Promise(r=>setTimeout(r,100));
      }
    })();
  },
  stop: ()=>{window.tool1Running=false; console.log("Tool1 stopped!");}
};
