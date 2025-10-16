/* VLife Diagnostic 2.54 — visible test world + mono fix companion */

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
function hideSplash(reason="ready"){ splash?.remove(); showStatus(`✅ ${reason}`, true); }
function failSplash(reason){ splash?.remove(); showStatus(`❌ ${reason}`, false); }

scene.addEventListener("loaded", () => {
  console.log("✅ A-Frame scene loaded");
  try {
    buildWorld();
    hideSplash("World visible");
  } catch (e) {
    console.error("❌ buildWorld error", e);
    failSplash("buildWorld() failed");
  }
});

/* --------------- CONFIG --------------- */
const CFG = { WALK_SPEED: 1.6 };

/* --------------- WORLD ---------------- */
function buildWorld(){
  // Ambient + Directional light
  addLight("ambient", {color:"#ffffff", intensity:0.5});
  addLight("directional", {color:"#ffdca8", intensity:1.0, position:"0 5 3"});

  // Ground plane
  const ground = document.createElement("a-plane");
  ground.setAttribute("rotation", "-90 0 0");
  ground.setAttribute("width", "100");
  ground.setAttribute("height", "100");
  ground.setAttribute("color", "#222");
  ground.setAttribute("shadow", "cast:false; receive:true");
  world.appendChild(ground);

  // Sky dome
  const sky = document.createElement("a-sky");
  sky.setAttribute("color", "#0a0c12");
  world.appendChild(sky);

  // Central cube (always visible)
  const cube = document.createElement("a-box");
  cube.setAttribute("position", "0 1.5 -4");
  cube.setAttribute("depth", "2");
  cube.setAttribute("width", "2");
  cube.setAttribute("height", "2");
  cube.setAttribute("color", "#33aaff");
  cube.setAttribute("shadow", "cast:true; receive:true");
  world.appendChild(cube);

  // Four coloured markers
  addMarker(4, 0, 0,  "#f55");
  addMarker(-4, 0, 0, "#5f5");
  addMarker(0, 0, 4,  "#ff5");
  addMarker(0, 0, -4, "#55f");
}

function addLight(type, opts={}){
  const e = document.createElement("a-entity");
  let def = `type:${type};`;
  for (const [k,v] of Object.entries(opts)){
    if (k === "position") e.setAttribute("position", v);
    else def += `${k}:${v};`;
  }
  e.setAttribute("light", def);
  world.appendChild(e);
}
function addMarker(x,y,z,color){
  const sphere = document.createElement("a-sphere");
  sphere.setAttribute("position", `${x} ${y+1} ${z}`);
  sphere.setAttribute("radius", "0.5");
  sphere.setAttribute("color", color);
  world.appendChild(sphere);
}

/* --------------- MOVEMENT ------------- */
let walking = false;
walkBtn.addEventListener("click", () => {
  walking = !walking;
  walkBtn.classList.toggle("active", walking);
  walkBtn.textContent = walking ? "Walking…" : "Walk";
});

let last = performance.now();
scene.addEventListener("tick", () => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (walking) moveForward(dt);
});

function moveForward(dt){
  const y = cam.object3D.rotation.y;
  rig.object3D.position.x += Math.sin(y) * CFG.WALK_SPEED * dt;
  rig.object3D.position.z += Math.cos(y) * CFG.WALK_SPEED * dt;
}