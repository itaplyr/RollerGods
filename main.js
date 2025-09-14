(function() {
  const repoBase = "https://itaplyr.github.io/RollerGods/scripts/";
  const toolList = ["tool1.js","tool2.js","tool3.js"];
  const settingsUrl = "https://script.google.com/macros/s/AKfycbzRQpJzUCb_Oc7wuOJZNI61cCnkP2ns4L1RLpLME22y00tOCTm_w6q4819013E3w11m_Q/exec";

  let autoRunActive = false; // tracks if autorun is active
  let lastSettings = null;   // tracks last applied settings

  // ===== Styles =====
  const style = document.createElement("style");
  style.textContent = `
    #myToolsPanel{position:fixed;top:50px;left:50px;width:600px;height:400px;
    background:rgba(34,34,34,0.7);backdrop-filter:blur(10px);color:#fff;
    border:1px solid rgba(255,255,255,0.2);border-radius:10px;
    box-shadow:0 8px 20px rgba(0,0,0,0.4);z-index:999999;display:flex;
    flex-direction:column;font-family:system-ui,sans-serif;overflow:hidden}
    #myToolsPanelHeader{background:rgba(255,255,255,0.1);padding:6px 10px;
    cursor:move;display:flex;justify-content:space-between;align-items:center;
    user-select:none} #myToolsPanelHeader span{font-weight:bold} #myToolsPanelClose{
    cursor:pointer;padding:2px 6px;background:rgba(200,0,0,0.6);
    border-radius:4px;font-weight:bold} #myToolsPanelClose:hover{background:rgba(220,0,0,0.8)}
    #myToolsBody{flex:1;display:flex;overflow:hidden} #myToolsMenu{width:150px;
    background:rgba(0,0,0,0.3);display:flex;flex-direction:column;padding:5px;
    overflow-y:auto} #myToolsMenu button{margin:5px 0;padding:6px;border:none;
    border-radius:6px;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;
    text-align:left;transition:background 0.2s} #myToolsMenu button.active{
    background:rgba(50,200,50,0.3)} #myToolsMenu button:hover{background:rgba(255,255,255,0.2)}
    #myToolsContent{flex:1;background:rgba(34,34,34,0.6);padding:10px;overflow-y:auto;position:relative}
    #myToolsResizeHandle{width:12px;height:12px;background:rgba(255,255,255,0.3);
    position:absolute;right:0;bottom:0;cursor:se-resize;border-bottom-right-radius:6px}
    #myToolsContent label{display:block;margin-top:8px;font-size:13px}
    #myToolsContent input,#myToolsContent select,#myToolsContent button{margin-top:4px;padding:6px;border-radius:6px;border:none}
    #myToolsContent button{margin-right:6px;cursor:pointer;background:#444;color:#fff}
    #myToolsContent button:hover{background:#666}
  `;
  document.head.appendChild(style);

  // ===== Create Panel =====
  const panel = document.createElement("div");
  panel.id = "myToolsPanel";
  panel.innerHTML = `
    <div id="myToolsPanelHeader"><span>RollerGods Manager</span><div id="myToolsPanelClose">×</div></div>
    <div id="myToolsBody"><div id="myToolsMenu"><p>Loading tools...</p></div><div id="myToolsContent">Select a tool</div></div>
    <div id="myToolsResizeHandle"></div>
  `;
  document.body.appendChild(panel);

  const menu = panel.querySelector("#myToolsMenu");
  const content = panel.querySelector("#myToolsContent");

  // ===== Dragging & Resizing =====
  (function() {
    const header = panel.querySelector("#myToolsPanelHeader");
    let offsetX=0,offsetY=0,isDragging=false;
    header.addEventListener("mousedown",e=>{
      isDragging=true;
      offsetX=e.clientX-panel.offsetLeft;
      offsetY=e.clientY-panel.offsetTop;
      document.body.style.userSelect="none";
    });
    document.addEventListener("mousemove",e=>{
      if(!isDragging) return;
      panel.style.left=(e.clientX-offsetX)+"px";
      panel.style.top=(e.clientY-offsetY)+"px";
    });
    document.addEventListener("mouseup",()=>{isDragging=false;document.body.style.userSelect=""});

    const handle = panel.querySelector("#myToolsResizeHandle");
    let startX,startY,startW,startH,isResizing=false;
    handle.addEventListener("mousedown",e=>{
      e.preventDefault();
      isResizing=true;
      startX=e.clientX; startY=e.clientY; startW=panel.offsetWidth; startH=panel.offsetHeight;
      document.body.style.userSelect="none";
    });
    document.addEventListener("mousemove",e=>{
      if(!isResizing) return;
      panel.style.width=startW+(e.clientX-startX)+"px";
      panel.style.height=startH+(e.clientY-startY)+"px";
    });
    document.addEventListener("mouseup",()=>{isResizing=false;document.body.style.userSelect=""});
  })();

  panel.querySelector("#myToolsPanelClose").addEventListener("click",()=>{panel.remove()});

  // ===== Update GUI title with latest GitHub commit =====
  async function updateGuiVersion() {
    try {
      const repoApi = "https://api.github.com/repos/itaplyr/RollerGods/commits?per_page=1&sha=main";
      const res = await fetch(repoApi);
      const json = await res.json();
      if (!json || !json[0] || !json[0].commit) return;
      const message = json[0].commit.message;
      const headerSpan = document.querySelector("#myToolsPanelHeader span");
      if (headerSpan) headerSpan.textContent = `RollerGods Manager - ${message}`;
      console.log("Latest commit:", message);
    } catch (err) { console.warn("Could not fetch latest commit message:", err); }
  }
  updateGuiVersion();

  // ===== Tool Management =====
  const loadedTools = {};
  let currentTool = null;

  function selectTool(file, button) {
    menu.querySelectorAll("button").forEach(b=>b.classList.remove("active"));
    button.classList.add("active");
    content.innerHTML = `<p>Loading ${file}...</p>`;

    const script = document.createElement("script");
    script.src = repoBase + file + "?v=" + Date.now();
    script.onload = () => {
      let module = file==="tool1.js" ? window.Tool1 : window[file.replace(".js","")];
      loadedTools[file]=module;
      currentTool=file;
      content.innerHTML="";

      // ===== Tool1 UI =====
      if(file==="tool1.js") {
        const toolUI = document.createElement("div");
        const title = document.createElement("h3"); title.textContent = module.name || "Tool1";
        toolUI.appendChild(title);

        const selectorRow = document.createElement("div"); selectorRow.style.display="flex"; selectorRow.style.gap="10px";
        const labelPart = document.createElement("label"); labelPart.textContent="Part:"; selectorRow.appendChild(labelPart);
        const selectPart = document.createElement("select"); ["Hashboard","Wire","Fan"].forEach(p=>{const o=document.createElement("option");o.value=p;o.textContent=p;o.selected=(p===localStorage.getItem("tool1_part")||"Hashboard"); selectPart.appendChild(o);}); selectorRow.appendChild(selectPart);
        const labelRarity = document.createElement("label"); labelRarity.textContent="Rarity:"; selectorRow.appendChild(labelRarity);
        const selectRarity = document.createElement("select"); ["Common","Uncommon","Rare","Epic","Legendary"].forEach(r=>{const o=document.createElement("option");o.value=r;o.textContent=r;o.selected=(r===localStorage.getItem("tool1_rarity")||"Common"); selectRarity.appendChild(o);}); selectorRow.appendChild(selectRarity);
        toolUI.appendChild(selectorRow);

        const label2=document.createElement("label"); label2.textContent="Price Threshold:"; toolUI.appendChild(label2);
        const input=document.createElement("input"); input.type="number"; input.value=localStorage.getItem("tool1_priceThreshold")||1700; toolUI.appendChild(input);

        const btnRow=document.createElement("div"); btnRow.style.marginTop="10px"; btnRow.style.display="flex"; btnRow.style.gap="6px";
        const runBtn=document.createElement("button"); runBtn.textContent="Run Tool1"; btnRow.appendChild(runBtn);
        const stopBtn=document.createElement("button"); stopBtn.textContent="Stop"; btnRow.appendChild(stopBtn);
        toolUI.appendChild(btnRow);

        // Graph
        const canvas=document.createElement("canvas"); canvas.width=560; canvas.height=120; canvas.style.marginTop="10px"; canvas.style.background="rgba(0,0,0,0.2)"; canvas.style.border="1px solid #555"; toolUI.appendChild(canvas);
        const ctx=canvas.getContext("2d"); let itemsBought=[];
        function updateGraph(){ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle="#0f0"; const max=Math.max(...itemsBought,1); itemsBought.forEach((val,i)=>{const barHeight=(val/max)*canvas.height; ctx.fillRect(i*20+5,canvas.height-barHeight,15,barHeight);});}

        const productIds = {
          "Hashboard": {"Common":"61b3606767433d2dc58913a9","Uncommon":"6319f840a8ce530569ef82b7","Rare":"61b35e3767433d2dc57f86a2","Epic":"6319fc56a8ce530569024d79","Legendary":"6196289f67433d2dc53c0c5d"},
          "Wire":{"Common":"61b3604967433d2dc58893b0","Uncommon":"6319f81fa8ce530569eee9dd","Rare":"61b35dcd67433d2dc57daca3","Epic":"6319f969a8ce530569f4b3e8","Legendary":"6196281467433d2dc53872b3"},
          "Fan":{"Common":"61b35fea67433d2dc586f7fe","Uncommon":"6319f7baa8ce530569ed16b9","Rare":"61b35dac67433d2dc57d1156","Epic":"6319f918a8ce530569f33dd5","Legendary":"6196269b67433d2dc52e0130"}
        };

        runBtn.addEventListener("click",()=>{
          // Stop previous run if any
          if(autoRunActive && module.stop) module.stop();
          itemsBought=[]; updateGraph();

          const part = selectPart.value; const rarity = selectRarity.value;
          const itemId = productIds[part][rarity]; const priceThreshold=parseInt(input.value,10);
          module.action({itemId,part,rarity,priceThreshold,onBuy:(qty)=>{itemsBought.push(qty); updateGraph(); console.log(`Purchased ${qty} x ${part} (${rarity})`);}});
          autoRunActive = true;
        });

        stopBtn.addEventListener("click",()=>{if(module.stop) module.stop(); autoRunActive=false;});

        content.appendChild(toolUI);

      } else {
        const runBtn=document.createElement("button"); runBtn.textContent="Run"; runBtn.addEventListener("click",()=>module.action?.()); content.appendChild(runBtn);
        if(module.stop){const stopBtn=document.createElement("button"); stopBtn.textContent="Stop"; stopBtn.addEventListener("click",()=>module.stop()); content.appendChild(stopBtn);}
      }
    };
    document.body.appendChild(script);
  }

  function loadMenu(){
    menu.innerHTML="";
    for(let file of toolList){
      const btn=document.createElement("button"); btn.textContent=file.replace(".js","");
      btn.addEventListener("click",()=>selectTool(file,btn));
      menu.appendChild(btn);
    }
  }
  loadMenu();

  // ===== Remote Settings Polling with reload =====
  // ===== Initialize lastAppliedSettings from localStorage =====
  let lastAppliedSettings = {
    Tool: localStorage.getItem("tool_to_autorun") || "tool1",
    Part: localStorage.getItem("tool1_part") || "Hashboard",
    Rarity: localStorage.getItem("tool1_rarity") || "Common",
    PriceThreshold: parseInt(localStorage.getItem("tool1_priceThreshold"), 10) || 1700,
    Autorun: localStorage.getItem("autorun_enabled") === "1"
  };

// ===== Remote Settings Polling with conditional reload =====
  async function pollSettings() {
    try {
      const res = await fetch(settingsUrl + "?t=" + Date.now());
      const arr = await res.json();
      if (!arr || !arr[0]) return;
      const json = arr[0];

      // If settings haven't changed, do nothing
      if (JSON.stringify(json) === JSON.stringify(lastAppliedSettings)) return;

      console.log("✅ Remote settings changed:", json);

      // Save settings into localStorage for the reload
      if (json.Part) localStorage.setItem("tool1_part", json.Part);
      if (json.Rarity) localStorage.setItem("tool1_rarity", json.Rarity);
      if (json.PriceThreshold) localStorage.setItem("tool1_priceThreshold", json.PriceThreshold);
      if (json.Tool) localStorage.setItem("tool_to_autorun", json.Tool);
      if (json.Autorun !== undefined) localStorage.setItem("autorun_enabled", json.Autorun ? "1" : "0");

      lastAppliedSettings = json;

      // Reload page to apply the new settings
      console.log("🔄 Settings updated, reloading page...");
      window.location.reload();

    } catch (err) {
      console.warn("⚠️ Failed to fetch settings:", err);
    }
  }

  setInterval(pollSettings, 5000);
  pollSettings();



})();
