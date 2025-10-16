/* VLife Diagnostic 2.52 — subpath-safe, aggressive logs, hard fallbacks */

console.log("🔵 script.js loaded");
const scene  = document.getElementById("scene");
const world  = document.getElementById("world");
const rig    = document.getElementById("rig");
const cam    = document.getElementById("cam");
const splash = document.getElementById("splash");
const status = document.getElementById("status");
const walkBtn= document.getElementById("walkBtn");

function showStatus(msg, ok=false){
  status.hidden = false;
  status.textContent = msg;
  status.style.borderColor = ok ? "rgba(120,255,180,.35)" : "rgba(255,160,160,.35)";
  status.style.color = ok ? "#cfffdf" : "#ffdede";
}

function hideSplash(reason="ready"){
  if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
  showStatus(`✅ ${reason}`, true);
}

function failSplash(reason){
  if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
  showStatus(`❌ ${reason}`, false);
}

if (!scene || !world || !rig || !cam) {
  console.error("❌ Missing core elements", {scene,world,rig,cam});
  failSplash("index.html missing #scene/#world/#rig/#cam");
  throw new Error("Missing DOM nodes");
}

console.log("🟣 waiting for A-Frame scene ‘loaded’…");
scene.addEventListener("loaded", () => {
  console.log("✅ A-Frame scene loaded");
  try {
    buildWorld();
    console.log("✅ buildWorld complete");
    hideSplash("World ready");
  } catch (e) {
    console.error("❌ buildWorld error", e);
    failSplash("buildWorld() threw an error (see console)");
  }
});

// Hard timeout: never let splash hang forever
setTimeout(() => {
  if (splash && splash.isConnected) {
    console.warn("⚠️ Splash timeout; forcing removal");
    hideSplash("Forced start (timeout)");
  }
}, 6000);

/* -------------------- CONFIG -------------------- */
const CFG = {
  ROOM: 12,
  COR_W: 4, COR_L: 18,
  WALL_H: 3,
  WALK_SPEED: 1.6
};

/* -------------------- BUILD --------------------- */
function buildWorld(){
  // Lights
  addLight("ambient", {intensity:0.45, color:"#ffffff"});
  addLight("point",   {intensity:1.0, distance:60, position:"0 6 0", color:"#ffdca8"});

  // Main square
  addRoom(0,0,"Main");

  // Corridors + end markers (so we see orientation)
  addCorridor( 1, 0, "E → Library");     // along +X
  addCorridor(-1, 0, "W → Log Cabin");   // along -X
  addCorridor( 0, 1, "S → Neon Lab");    // along +Z
  addCorridor( 0,-1, "N → Space Ship");  // along -Z

  // End rooms (very simple boxes)
  const end = CFG.COR_L/2 + CFG.ROOM/2;
  addSimpleRoom( end, 0, "#2a2f3a"); // East
  addSimpleRoom(-end, 0, "#3a2f2a"); // West
  addSimpleRoom(0,  end, "#24402e"); // South
  addSimpleRoom(0, -end, "#3f3845"); // North
}

function addLight(type, opts={}){
  const e = document.createElement("a-entity");
  e.setAttribute("light", Object.entries(opts).reduce((s,[k,v])=>{
    if (k==="position") { e.setAttribute("position", v); return s; }
    return s + `${k}:${v};`;
  }, `type:${type};`));
  world.appendChild(e);
}

function addRoom(x,z,label){
  const g = document.createElement("a-entity");
  g.setAttribute("position", `${x} 0 ${z}`);

  // floor: thin box (easier raycast)
  const floor = document.createElement("a-box");
  floor.setAttribute("width", CFG.ROOM);
  floor.setAttribute("depth", CFG.ROOM);
  floor.setAttribute("height", 0.05);
  floor.setAttribute("color", "#1e232c");
  floor.classList.add("teleport");
  g.appendChild(floor);

  // 4 walls
  const W=CFG.ROOM/2, H=CFG.WALL_H, col="#343b49";
  g.appendChild(makeWall( 0, H/2,-W,   0, col, CFG.ROOM, H));
  g.appendChild(makeWall( 0, H/2, W, 180, col, CFG.ROOM, H));
  g.appendChild(makeWall(-W, H/2, 0,  90, col, CFG.ROOM, H, true));
  g.appendChild(makeWall( W, H/2, 0, -90, col, CFG.ROOM, H, true));

  // label
  const t = document.createElement("a-text");
  t.setAttribute("value", label);
  t.setAttribute("align", "center");
  t.setAttribute("color", "#cfe9ff");
  t.setAttribute("position", `0 ${H-0.6} 0`);
  g.appendChild(t);

  world.appendChild(g);
}

function addCorridor(dirX, dirZ, label){
  // dirX ∈ {-1,0,1}, dirZ ∈ {-1,0,1}
  const alongX = Math.abs(dirX) === 1;
  const startX = alongX ? dirX*(CFG.ROOM/2 + CFG.COR_L/2) : 0;
  const startZ = !alongX ? dirZ*(CFG.ROOM/2 + CFG.COR_L/2) : 0;

  const g = document.createElement("a-entity");
  g.setAttribute("position", `${startX} 0 ${startZ}`);

  // floor box
  const floor = document.createElement("a-box");
  floor.setAttribute("width", alongX ? CFG.COR_L : CFG.COR_W);
  floor.setAttribute("depth", alongX ? CFG.COR_W : CFG.COR_L);
  floor.setAttribute("height", 0.04);
  floor.setAttribute("rotation", "0 0 0");
  floor.setAttribute("color", "#2a2e38");
  floor.classList.add("teleport");
  g.appendChild(floor);

  // side walls
  const halfW = CFG.COR_W/2, H = CFG.WALL_H;
  if (alongX){
    g.appendChild(makeWall(0, H/2,  halfW,   0, "#bfa76f", CFG.COR_L, H));
    g.appendChild(makeWall(0, H/2, -halfW, 180, "#bfa76f", CFG.COR_L, H));
  }else{
    g.appendChild(makeWall( halfW, H/2, 0, -90, "#bfa76f", CFG.COR_L, H, true));
    g.appendChild(makeWall(-halfW, H/2, 0,  90, "#bfa76f", CFG.COR_L, H, true));
  }

  // end label marker
  const endText = document.createElement("a-text");
  const ex = alongX ? 0 : 0;
  const ez = alongX ? 0 : 0;
  endText.setAttribute("value", label);
  endText.setAttribute("align", "center");
  endText.setAttribute("color", "#ffd891");
  endText.setAttribute("position", `${ex} 1.6 ${alongX ? 0 : 0}`);
  g.appendChild(endText);

  world.appendChild(g);
}

function makeWall(x,y,z, yaw, color, w, h, vertical=false){
  const p = document.createElement("a-plane");
  p.setAttribute("position", `${x} ${y} ${z}`);
  p.setAttribute("rotation", `0 ${yaw} 0`);
  p.setAttribute("width", w);
  p.setAttribute("height", h);
  p.setAttribute("color", color);
  return p;
}

function addSimpleRoom(x,z,color){
  const g = document.createElement("a-entity");
  g.setAttribute("position", `${x} 0 ${z}`);

  const floor = document.createElement("a-box");
  floor.setAttribute("width", CFG.ROOM);
  floor.setAttribute("depth", CFG.ROOM);
  floor.setAttribute("height", 0.04);
  floor.setAttribute("color", color);
  floor.classList.add("teleport");
  g.appendChild(floor);

  const W=CFG.ROOM/2, H=CFG.WALL_H;
  g.appendChild(makeWall( 0, H/2,-W,   0, color, CFG.ROOM, H));
  g.appendChild(makeWall( 0, H/2, W, 180, color, CFG.ROOM, H));
  g.appendChild(makeWall(-W, H/2, 0,  90, color, CFG.ROOM, H, true));
  g.appendChild(makeWall( W, H/2, 0, -90, color, CFG.ROOM, H, true));

  world.appendChild(g);
}

/* -------------------- MOVEMENT ------------------- */
let walking = false;
walkBtn.addEventListener("click", () => {
  walking = !walking;
  walkBtn.classList.toggle("active", walking);
  walkBtn.textContent = walking ? "Walking…" : "Walk";
  console.log(walking ? "🚶 Walking enabled" : "🛑 Walking stopped");
});

let last = performance.now();
scene.addEventListener("tick", () => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (walking) moveForward(dt);
});

function moveForward(dt){
  const y = cam.object3D.rotation.y; // radians
  rig.object3D.position.x += Math.sin(y) * CFG.WALK_SPEED * dt;
  rig.object3D.position.z += Math.cos(y) * CFG.WALK_SPEED * dt;
}