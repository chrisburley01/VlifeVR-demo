// === VLife Château 2.5 ===

const scene = document.querySelector("a-scene");
const world = document.getElementById("world");
const rig = document.getElementById("rig");
const cam = document.getElementById("cam");
const walkBtn = document.getElementById("walkBtn");
const mini = document.getElementById("minimap");
const ctx = mini.getContext("2d");

const CONFIG = {
  corW: 4, corL: 18, roomSize: 10, speed: 1.5,
  wallH: 3, mapSize: 180
};

let walking = false;

// Hide splash once renderer is ready
scene.addEventListener("loaded", () => {
  document.getElementById("splash").remove();
  drawMini();
});

// ============ BUILD WORLD ============
function build() {
  addMainRoom(0, 0);
  addCorridor(0, -CONFIG.corL, "Library");
  addCorridor(CONFIG.corL, 0, "LogCabin");
  addCorridor(-CONFIG.corL, 0, "SpaceShip");
  addCorridor(0, CONFIG.corL, "NeonLab");
}
build();

// ============ ADD ROOM TYPES ============
function addMainRoom(x, z) {
  const g = document.createElement("a-entity");
  g.setAttribute("position", `${x} 0 ${z}`);

  const floor = makeBox(CONFIG.roomSize, 0.1, CONFIG.roomSize, "#222");
  g.appendChild(floor);

  const walls = [
    [0, CONFIG.wallH / 2, -CONFIG.roomSize / 2, 0],
    [0, CONFIG.wallH / 2, CONFIG.roomSize / 2, 180],
    [-CONFIG.roomSize / 2, CONFIG.wallH / 2, 0, 90],
    [CONFIG.roomSize / 2, CONFIG.wallH / 2, 0, -90],
  ];
  walls.forEach(([wx, wy, wz, ry]) => {
    const w = makePlane(CONFIG.roomSize, CONFIG.wallH, "#333");
    w.setAttribute("position", `${wx} ${wy} ${wz}`);
    w.setAttribute("rotation", `0 ${ry} 0`);
    g.appendChild(w);
  });

  // Light
  const l = document.createElement("a-light");
  l.setAttribute("type", "point");
  l.setAttribute("position", `0 2 0`);
  l.setAttribute("intensity", "1.2");
  g.appendChild(l);

  world.appendChild(g);
}

function addCorridor(x, z, type) {
  const g = document.createElement("a-entity");
  g.setAttribute("position", `${x} 0 ${z}`);

  // corridor base
  const floor = makeBox(CONFIG.corW, 0.05, CONFIG.corL, "#403020");
  g.appendChild(floor);

  const walls = [
    [-CONFIG.corW / 2, CONFIG.wallH / 2, 0, 90],
    [CONFIG.corW / 2, CONFIG.wallH / 2, 0, -90],
  ];
  walls.forEach(([wx, wy, wz, ry]) => {
    const wall = makePlane(CONFIG.corL, CONFIG.wallH, "#bfa76f");
    wall.setAttribute("position", `${wx} ${wy} ${wz}`);
    wall.setAttribute("rotation", `0 ${ry} 0`);
    g.appendChild(wall);
  });

  // Themed room at the far end
  const rz = z > 0 ? z + CONFIG.corL / 2 + CONFIG.roomSize / 2 :
             z < 0 ? z - CONFIG.corL / 2 - CONFIG.roomSize / 2 : z;
  const rx = x > 0 ? x + CONFIG.corL / 2 + CONFIG.roomSize / 2 :
             x < 0 ? x - CONFIG.corL / 2 - CONFIG.roomSize / 2 : x;
  addThemedRoom(rx, rz, type);

  world.appendChild(g);
}

function addThemedRoom(x, z, theme) {
  const g = document.createElement("a-entity");
  g.setAttribute("position", `${x} 0 ${z}`);

  const themeData = {
    Library:  { floor: "#5c3a21", wall: "#ccb38f", light: "#ffdca8" },
    LogCabin: { floor: "#5a3820", wall: "#4a2d1a", light: "#ffb973" },
    SpaceShip:{ floor: "#0a0f18", wall: "#303848", light: "#00f0ff" },
    NeonLab:  { floor: "#101020", wall: "#181820", light: "#ff00ff" }
  }[theme];

  const floor = makeBox(CONFIG.roomSize, 0.1, CONFIG.roomSize, themeData.floor);
  g.appendChild(floor);

  const walls = [
    [0, CONFIG.wallH / 2, -CONFIG.roomSize / 2, 0],
    [0, CONFIG.wallH / 2, CONFIG.roomSize / 2, 180],
    [-CONFIG.roomSize / 2, CONFIG.wallH / 2, 0, 90],
    [CONFIG.roomSize / 2, CONFIG.wallH / 2, 0, -90],
  ];
  walls.forEach(([wx, wy, wz, ry]) => {
    const w = makePlane(CONFIG.roomSize, CONFIG.wallH, themeData.wall);
    w.setAttribute("position", `${wx} ${wy} ${wz}`);
    w.setAttribute("rotation", `0 ${ry} 0`);
    g.appendChild(w);
  });

  const l = document.createElement("a-light");
  l.setAttribute("type", "point");
  l.setAttribute("position", `0 2 0`);
  l.setAttribute("intensity", "1.3");
  l.setAttribute("color", themeData.light);
  g.appendChild(l);

  world.appendChild(g);
}

// Helpers
function makeBox(w, h, d, color) {
  const e = document.createElement("a-box");
  e.setAttribute("width", w);
  e.setAttribute("height", h);
  e.setAttribute("depth", d);
  e.setAttribute("color", color);
  e.classList.add("teleport");
  return e;
}
function makePlane(w, h, color) {
  const e = document.createElement("a-plane");
  e.setAttribute("width", w);
  e.setAttribute("height", h);
  e.setAttribute("color", color);
  return e;
}

// ============ WALK / MOVE ============
walkBtn.addEventListener("click", () => walking = !walking);

let lastTime = performance.now();
scene.addEventListener("tick", () => {
  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  if (walking) moveForward(dt);
  drawMini();
});

function moveForward(dt) {
  const y = cam.object3D.rotation.y;
  rig.object3D.position.x += Math.sin(y) * CONFIG.speed * dt;
  rig.object3D.position.z += Math.cos(y) * CONFIG.speed * dt;
}

// ============ MINIMAP ============
function drawMini() {
  ctx.clearRect(0, 0, CONFIG.mapSize, CONFIG.mapSize);
  ctx.strokeStyle = "#4466ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(CONFIG.mapSize/2-40, CONFIG.mapSize/2-40, 80, 80);
  ctx.fillStyle = "#ff0";
  ctx.beginPath();
  ctx.moveTo(CONFIG.mapSize/2, CONFIG.mapSize/2);
  ctx.lineTo(CONFIG.mapSize/2+6, CONFIG.mapSize/2+14);
  ctx.lineTo(CONFIG.mapSize/2-6, CONFIG.mapSize/2+14);
  ctx.closePath();
  ctx.fill();
}