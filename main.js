(function() {
  // ===== Config =====
  const repoBase = "https://itaplyr.github.io/RollerGods/scripts/";

  const toolList = [
    "tool1.js",
    "tool2.js",
    "tool3.js"
    // Add more filenames from /scripts/
  ];

  // ===== Create Styles =====
  const style = document.createElement("style");
  style.textContent = `
    #myToolsPanel {
      position: fixed;
      top: 50px; left: 50px;
      width: 280px; height: 200px;
      background: rgba(34,34,34,0.7);
      backdrop-filter: blur(10px);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 10px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.4);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: system-ui, sans-serif;
    }
    #myToolsPanelHeader {
      background: rgba(255,255,255,0.1);
      padding: 6px 10px;
      cursor: move;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
    }
    #myToolsPanelHeader span {
      font-weight: bold;
    }
    #myToolsPanelClose {
      cursor: pointer;
      padding: 2px 6px;
      background: rgba(200,0,0,0.6);
      border-radius: 4px;
      font-weight: bold;
    }
    #myToolsPanelClose:hover {
      background: rgba(220,0,0,0.8);
    }
    #myToolsPanelContent {
      flex: 1;
      padding: 10px;
      overflow-y: auto;
    }
    #myToolsPanelContent button {
      display: block;
      width: 100%;
      margin: 5px 0;
      padding: 6px;
      border: none;
      border-radius: 6px;
      background: rgba(255,255,255,0.1);
      color: #fff;
      cursor: pointer;
      transition: background 0.2s;
    }
    #myToolsPanelContent button:hover {
      background: rgba(255,255,255,0.2);
    }
    #myToolsResizeHandle {
      width: 12px; height: 12px;
      background: rgba(255,255,255,0.3);
      position: absolute;
      right: 0; bottom: 0;
      cursor: se-resize;
      border-bottom-right-radius: 6px;
    }
  `;
  document.head.appendChild(style);

  // ===== Create Panel =====
  const panel = document.createElement("div");
  panel.id = "myToolsPanel";
  panel.innerHTML = `
    <div id="myToolsPanelHeader">
      <span>RollerGods Tools</span>
      <div id="myToolsPanelClose">×</div>
    </div>
    <div id="myToolsPanelContent">
      <p>Loading tools...</p>
    </div>
    <div id="myToolsResizeHandle"></div>
  `;
  document.body.appendChild(panel);

  const content = panel.querySelector("#myToolsPanelContent");

  // ===== Dragging =====
  (function() {
    const header = panel.querySelector("#myToolsPanelHeader");
    let offsetX = 0, offsetY = 0, isDragging = false;

    header.addEventListener("mousedown", e => {
      isDragging = true;
      offsetX = e.clientX - panel.offsetLeft;
      offsetY = e.clientY - panel.offsetTop;
      document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", e => {
      if (!isDragging) return;
      panel.style.left = (e.clientX - offsetX) + "px";
      panel.style.top = (e.clientY - offsetY) + "px";
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      document.body.style.userSelect = "";
    });
  })();

  // ===== Resizing =====
  (function() {
    const handle = panel.querySelector("#myToolsResizeHandle");
    let startX, startY, startW, startH, isResizing = false;

    handle.addEventListener("mousedown", e => {
      e.preventDefault();
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startW = panel.offsetWidth;
      startH = panel.offsetHeight;
      document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", e => {
      if (!isResizing) return;
      const newW = startW + (e.clientX - startX);
      const newH = startH + (e.clientY - startY);
      panel.style.width = newW + "px";
      panel.style.height = newH + "px";
    });

    document.addEventListener("mouseup", () => {
      isResizing = false;
      document.body.style.userSelect = "";
    });
  })();

  // ===== Close Button =====
  panel.querySelector("#myToolsPanelClose").addEventListener("click", () => {
    panel.remove();
  });

  // ===== Load Tools =====
  async function loadTools() {
    content.innerHTML = "";
    for (let file of toolList) {
      try {
        const module = await import(repoBase + file + "?v=" + Date.now()); // no cache
        if (module && module.default) {
          const btn = document.createElement("button");
          btn.textContent = module.default.name || file.replace(".js","");
          btn.onclick = module.default.action;
          content.appendChild(btn);
        }
      } catch (err) {
        console.error("Failed to load", file, err);
        const msg = document.createElement("div");
        msg.textContent = `⚠️ Error loading ${file}`;
        content.appendChild(msg);
      }
    }
  }

  loadTools();
})();
