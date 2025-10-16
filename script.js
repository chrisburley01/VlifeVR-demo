// === VLife Château 2.51 – Diagnostic Build ===

console.log("🔵 script.js loaded — starting setup");

const scene = document.querySelector("a-scene");
const world = document.getElementById("world");
const rig = document.getElementById("rig");
const cam = document.getElementById("cam");
const splash = document.getElementById("splash");

if (!scene || !world || !rig || !cam) {
  console.error("❌ Scene elements missing – check index.html structure.");
}

scene.addEventListener("loaded", () => {
  console.log("✅ A-Frame scene loaded.");
  try {
    buildWorld();
    console.log("✅ World built successfully.");
  } catch (e) {
    console.error("❌ buildWorld() failed:", e);
  }
  splash?.remove();
});

// ============ CONFIG ============
const CFG = {
  room: 10,
  wallH: 3,
  corW: 4,
  corL: 18,
  speed: 1.5
};

// ============ WORLD ============
function buildWorld() {
  addRoom(0, 0, "Main");
  addCorridor(0, -CFG.corL, "Library");
  addCorridor(CFG.corL, 0, "LogCabin");
  addCorridor(-CFG.corL, 0, "SpaceShip");
  addCorridor(0, CFG.corL, "NeonLab");
  console.log("✅ Corridors and rooms created.");
}

// ============ BUILDERS ============
function addRoom(x, z, label) {
  const g = document.createElement("a-entity");
  g.setAttribute("position", `${x} 0 ${z}`);

  const floor = makeBox(CFG.room, 0.1, CFG.room, "#222");
  g.appendChild(floor);

  const walls = [
    [0, CFG.wallH / 2, -CFG.room / 2, 0],
    [0, CFG.wallH / 2, CFG.room / 2, 180],
    [-CFG.room / 2, CFG.wallH / 2, 0, 90],
    [CFG.room / 2, CFG.wallH / 2, 0, -90],
  ];
  walls.forEach(([wx, wy, wz, ry]) => {
    const w = makePlane(CFG.room, CFG.wallH, "#333");
    w.setAttribute("position", `${wx} ${wy} ${wz}`);
    w.setAttribute("rotation", `0 ${ry} 0`);
    g.appendChild(w);
  });

  const labelText = document.createElement("a-text");
  labelText.setAttribute("value", label);
  labelText.setAttribute("color", "#fff");
  labelText.setAttribute("position", `0 2 0`);
  labelText.setAttribute("align", "center");
  g.appendChild(labelText);

  world.appendChild(g);
}

function addCorridor(x, z, name) {
  const g = document.createElement("a-entity");
  g.setAttribute("position", `${x} 0 ${z}`);

  const floor = makeBox(CFG.corW, 0.1, CFG.corL, "#555");
  g.appendChild(floor);

  const sideWalls = [
    [-CFG.corW / 2, CFG.wallH / 2, 0, 90],
    [CFG.corW / 2, CFG.wallH / 2, 0, -90],
  ];
  sideWalls.forEach(([wx, wy, wz, ry]) => {
    const w = makePlane(CFG.corL, CFG.wallH, "#777");
    w.setAttribute("position", `${wx} ${wy} ${wz}`);
    w.setAttribute("rotation", `0 ${ry} 0`);
    g.appendChild(w);
  });

  const endLabel = document.createElement("a-text");
  endLabel.setAttribute("value", name);
  endLabel.setAttribute("color", "#ff0");
  endLabel.setAttribute("position", `0 2 ${CFG.corL / 2}`);
  endLabel.setAttribute("align", "center");
  g.appendChild(endLabel);

  world.appendChild(g);
}

function makeBox(w, h, d, color) {
  const e = document.createElement("a-box");
  e.setAttribute("width", w);
  e.setAttribute("height", h);
  e.setAttribute("depth", d);
  e.setAttribute("color", color);
  return e;
}

function makePlane(w, h, color) {
  const e = document.createElement("a-plane");
  e.setAttribute("width", w);
  e.setAttribute("height", h);
  e.setAttribute("color", color);
  return e;
}

// ============ MOVEMENT ============
let walking = false;
const walkBtn = document.getElementById("walkBtn");

walkBtn?.addEventListener("click", () => {
  walking = !walking;
  console.log(walking ? "🚶 Walking enabled" : "🛑 Walking stopped");
});

let last = performance.now();
scene.addEventListener("tick", () => {
  const now = performance.now();
  const dt = (now - last) / 1000;
  last = now;
  if (walking) moveForward(dt);
});

function moveForward(dt) {
  const y = cam.object3D.rotation.y;
  rig.object3D.position.x += Math.sin(y) * CFG.speed * dt;
  rig.object3D.position.z += Math.cos(y) * CFG.speed * dt;
}

// ============ READY ============
console.log("✅ Diagnostic script.js fully loaded");