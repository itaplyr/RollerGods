window.Tool1 = {
  name:"Tool1",
  action:(settings={})=>{
    if(window.tool1Running){console.warn("Already running"); return;}
    window.tool1Running=true;

    const csrfToken=(document.cookie.match(/x-csrf=([^;]+)/)||[])[1];
    const authToken=localStorage.getItem("token")||"";

    if(!csrfToken||!authToken){console.error("Missing CSRF or auth token"); window.tool1Running=false; return;}

    const itemType="mutation_component";
    const currency="RLT";

    async function fetchItems() {
      const res=await fetch(`https://rollercoin.com/api/marketplace/buy/sale-orders?currency=${currency}&itemType=${itemType}&sort%5Bfield%5D=price&sort%5Border%5D=1&skip=0&limit=50`, {
        credentials:"include",
        headers:{
          "Authorization":"Bearer "+authToken,
          "CSRF-Token":csrfToken,
          "X-KL-Ajax-Request":"Ajax_Request",
          "Accept":"application/json"
        }
      });
      const json=await res.json();
      return json.data.items||[];
    }

    async function purchaseItem(item) {
      try {
        const res=await fetch("https://rollercoin.com/api/marketplace/purchase-item", {
          method:"POST",
          credentials:"include",
          headers:{
            "Authorization":"Bearer "+authToken,
            "CSRF-Token":csrfToken,
            "X-KL-Ajax-Request":"Ajax_Request",
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            challenge:"",
            action:"marketplace",
            itemId:item.itemId,
            itemType:item.itemType,
            totalCount:item.count||1,
            currency,
            totalPrice:item.price*(item.count||1)
          })
        });
        const data=await res.json();
        console.log("Purchase response:",data);
      } catch(err){console.error("Purchase error:",err);}
    }

    async function loop() {
      if(!window.tool1Running) return;

      const items=await fetchItems();
      for(const item of items){
        const key=`${item.name.en}_${item.rarityGroup.title.en}`;
        const threshold=settings[key];
        if(threshold!==undefined && item.price<=threshold){
          console.log(`Buying ${item.name.en} (${item.rarityGroup.title.en}) for ${item.price}`);
          await purchaseItem(item);
        }
      }
      if(window.tool1Running) setTimeout(loop,2000);
    }

    loop();
  },
  stop:()=>{
    window.tool1Running=false;
    console.log("🛑 Tool1 stopped");
  }
};
