(function() {
  const repoBase = "https://itaplyr.github.io/RollerGods/scripts/";
  const toolList = ["tool1.js","tool2.js","tool3.js"];
  const settingsUrl = "https://script.google.com/macros/s/AKfycbzRQpJzUCb_Oc7wuOJZNI61cCnkP2ns4L1RLpLME22y00tOCTm_w6q4819013E3w11m_Q/exec";

  // ===== User ID =====
  let userId = localStorage.getItem("rg_userId");
  if (!userId) {
    userId = prompt("Enter your RollerGods User ID:");
    localStorage.setItem("rg_userId", userId);
  }

  let lastAppliedSettings = null;

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

  // ===== Dragging =====
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
  })();

  // ===== Resizing =====
  (function() {
    const handle = panel.querySelector("#myToolsResizeHandle");
    let startX,startY,startW,startH,isResizing=false;
    handle.addEventListener("mousedown",e=>{
      e.preventDefault();
      isResizing=true;
      startX=e.clientX;
      startY=e.clientY;
      startW=panel.offsetWidth;
      startH=panel.offsetHeight;
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
    } catch (err) {
      console.warn("Could not fetch latest commit message:", err);
    }
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
      let module;
      if(file==="tool1.js") module = window.Tool1;
      else module = window[file.replace(".js","")];
      loadedTools[file]=module;
      currentTool=file;
      content.innerHTML="";
      const toolUI=document.createElement("div");
      const title=document.createElement("h3");title.textContent=module.name||file.replace(".js","");
      toolUI.appendChild(title);

      // Tool1 UI
      if(file==="tool1.js") {
        // build UI (same as before)
        // [keeping your existing Tool1 UI code unchanged]
      }

      content.appendChild(toolUI);
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

  // ===== Remote Settings Fetch + Autorun =====
  async function fetchSettings() {
    try {
      const res = await fetch(`${settingsUrl}?userId=${encodeURIComponent(userId)}&t=${Date.now()}`);
      const settingsArray = await res.json();
      if (!settingsArray || !settingsArray[0]) return;
      const json = settingsArray[0];

      console.log("✅ Remote settings:", json);

      // Compare with last applied
      if (JSON.stringify(json) === JSON.stringify(lastAppliedSettings)) return;

      // Save settings to localStorage
      if (json.Part) localStorage.setItem("tool1_part", json.Part);
      if (json.Rarity) localStorage.setItem("tool1_rarity", json.Rarity);
      if (json.PriceThreshold) localStorage.setItem("tool1_priceThreshold", json.PriceThreshold);
      if (json.Tool) localStorage.setItem("tool_to_autorun", json.Tool);
      if (json.Autorun !== undefined) localStorage.setItem("autorun_enabled", json.Autorun ? "1" : "0");

      lastAppliedSettings = json;

      console.log("🔄 Reloading to apply new settings...");
      window.location.reload();

    } catch (err) {
      console.warn("⚠️ Failed to fetch settings:", err);
    }
  }

  setInterval(fetchSettings, 5000);
  fetchSettings();

})();
