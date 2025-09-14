(function() {
  const repoBase = "https://itaplyr.github.io/RollerGods/scripts/";
  const toolList = ["tool1.js"];

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
    header.addEventListener("mousedown",e=>{isDragging=true;offsetX=e.clientX-panel.offsetLeft;offsetY=e.clientY-panel.offsetTop;document.body.style.userSelect="none"});
    document.addEventListener("mousemove",e=>{if(!isDragging)return;panel.style.left=(e.clientX-offsetX)+"px";panel.style.top=(e.clientY-offsetY)+"px"});
    document.addEventListener("mouseup",()=>{isDragging=false;document.body.style.userSelect=""});
  })();

  // ===== Resizing =====
  (function() {
    const handle = panel.querySelector("#myToolsResizeHandle");
    let startX,startY,startW,startH,isResizing=false;
    handle.addEventListener("mousedown",e=>{e.preventDefault();isResizing=true;startX=e.clientX;startY=e.clientY;startW=panel.offsetWidth;startH=panel.offsetHeight;document.body.style.userSelect="none"});
    document.addEventListener("mousemove",e=>{if(!isResizing)return;panel.style.width=startW+(e.clientX-startX)+"px";panel.style.height=startH+(e.clientY-startY)+"px"});
    document.addEventListener("mouseup",()=>{isResizing=false;document.body.style.userSelect=""});
  })();

  panel.querySelector("#myToolsPanelClose").addEventListener("click",()=>{panel.remove()});

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
      loadedTools[file]=module;
      currentTool=file;
      content.innerHTML="";

      const toolUI=document.createElement("div");
      const title=document.createElement("h3"); title.textContent=module.name||file.replace(".js",""); toolUI.appendChild(title);

      // Tool1 UI: thresholds per part/rarity
      if(file==="tool1.js") {
        const parts=["Hashboard","Wire","Fan"];
        const rarities=["Common","Uncommon","Rare","Epic","Legendary"];
        const settings = JSON.parse(localStorage.getItem("tool1_settings")||"{}");

        parts.forEach(p=>{
          rarities.forEach(r=>{
            const label=document.createElement("label");
            label.textContent=`${p} ${r} price threshold:`;
            toolUI.appendChild(label);
            const input=document.createElement("input");
            input.type="number";
            input.value=settings[`${p}_${r}`]||0;
            input.addEventListener("input",()=>{ 
              settings[`${p}_${r}`] = parseInt(input.value)||0;
              localStorage.setItem("tool1_settings", JSON.stringify(settings));
            });
            toolUI.appendChild(input);
          });
        });

        const runBtn=document.createElement("button"); runBtn.textContent="Run Tool1";
        runBtn.addEventListener("click",()=>module.action(settings));
        toolUI.appendChild(runBtn);

        const stopBtn=document.createElement("button"); stopBtn.textContent="Stop";
        stopBtn.addEventListener("click",()=>module.stop());
        toolUI.appendChild(stopBtn);
      }

      content.appendChild(toolUI);
    };
    document.body.appendChild(script);
  }

  function loadMenu() {
    menu.innerHTML="";
    for(let file of toolList){
      const btn=document.createElement("button");
      btn.textContent=file.replace(".js","");
      btn.addEventListener("click",()=>selectTool(file,btn));
      menu.appendChild(btn);
    }
  }

  loadMenu();
})();
