/* ===========================================================
   VLife · Château 2.0 — World + Controls
   =========================================================== */

const CFG = {
  // world sizes
  ROOM_W: 16, ROOM_H: 4.5, ROOM_L: 16,
  COR_W: 4,  COR_H: 3.2,  COR_L: 24,

  // movement
  WALK_SPEED: 2.2,            // m/s
  WALK_SMOOTH: 0.18,          // easing
  TELEPORT_Y: 1.6,

  // frames
  FRAME_W: 1.2, FRAME_H: 0.75,
  FRAME_STEP: 4.5, FRAME_START: 3.2,
  FRAME_OFFSET: 0.02, // how far “into” the wall to sit

  // colors / materials
  WALL: '#c7c0a6',
  FLOOR: '#0d0e12',
  CEIL: '#2b251e',
  COR_WALL: '#bcb28d',
  COR_FLOOR: '#15161d',
  COR_CEIL: '#0e0f13',

  // UI
  MINI_SCALE: 6
};

// Globals
let scene, rig, cam, world, lastTime = 0;
let walking = false, walkVel = 0;
const TMP = { v3: new THREE.Vector3(), dir: new THREE.Vector3() };

/* --------------------- Init --------------------- */
window.addEventListener('DOMContentLoaded', () => {
  scene = document.querySelector('a-scene');
  rig   = document.getElementById('rig');
  cam   = document.getElementById('cam');
  world = document.getElementById('world');

  buildWorld();
  setupWalkButton();
  setupTeleport();
  setupHelp();
  setupMinimap();

  scene.addEventListener('renderstart', () => {
    lastTime = performance.now();
    scene.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    scene.addEventListener('tick', onTick);
  });
});

/* ------------------ World Builder ------------------ */
function buildWorld() {
  // Main room
  addRoom(0, 0, 0, CFG.ROOM_W, CFG.ROOM_H, CFG.ROOM_L, {
    wall: CFG.WALL, floor: CFG.FLOOR, ceil: CFG.CEIL
  });

  // Four corridors from each side of room center
  addCorridor(+CFG.ROOM_W/2, 0, 0, true,  +1); // east
  addCorridor(-CFG.ROOM_W/2, 0, 0, true,  -1); // west
  addCorridor(0, 0, +CFG.ROOM_L/2, false, +1); // south
  addCorridor(0, 0, -CFG.ROOM_L/2, false, -1); // north

  // Small “rooms” at corridor ends (placeholders)
  const end = CFG.COR_L + 2;
  addRoom(+CFG.ROOM_W/2 + end, 0, 0, 12, 4, 12, { wall: '#2a2f3a', floor: '#0e1116', ceil: '#232833' });
  addRoom(-CFG.ROOM_W/2 - end, 0, 0, 12, 4, 12, { wall: '#3a2f2a', floor: '#1a1512', ceil: '#2f2420' });
  addRoom(0, 0, +CFG.ROOM_L/2 + end, 12, 4, 12, { wall: '#24402e', floor: '#0d1510', ceil: '#213829' });
  addRoom(0, 0, -CFG.ROOM_L/2 - end, 12, 4, 12, { wall: '#3f3845', floor: '#100f12', ceil: '#2e2834' });

  // Teleport floors everywhere a player can stand
  markFloorsTeleportable();
}

function addRoom(cx, cy, cz, w, h, l, theme) {
  const g = document.createElement('a-entity');
  g.setAttribute('position', `${cx} 0 ${cz}`);
  world.appendChild(g);

  // floor
  const floor = document.createElement('a-plane');
  floor.setAttribute('width', w);
  floor.setAttribute('height', l);
  floor.setAttribute('rotation', '-90 0 0');
  floor.setAttribute('color', theme.floor);
  floor.classList.add('teleport');      // <- tap-to-teleport target
  g.appendChild(floor);

  // ceiling
  const ceil = document.createElement('a-plane');
  ceil.setAttribute('width', w);
  ceil.setAttribute('height', l);
  ceil.setAttribute('rotation', '90 0 0');
  ceil.setAttribute('position', `0 ${h} 0`);
  ceil.setAttribute('color', theme.ceil);
  g.appendChild(ceil);

  // walls (centered box w/ open top & bottom effect)
  const halfW = w/2, halfL = l/2;

  // +X wall
  g.appendChild(makeWall( halfW, h/2, 0,   0, 90, 0,  h, l, theme.wall));
  // -X wall
  g.appendChild(makeWall(-halfW, h/2, 0,   0,-90, 0,  h, l, theme.wall));
  // +Z wall
  g.appendChild(makeWall(0, h/2,  halfL,   0, 0, 0,  h, w, theme.wall));
  // -Z wall
  g.appendChild(makeWall(0, h/2, -halfL,   0,180,0,  h, w, theme.wall));
}

function makeWall(x,y,z, rx,ry,rz, h, w, color){
  const p = document.createElement('a-plane');
  p.setAttribute('position', `${x} ${y} ${z}`);
  p.setAttribute('rotation', `${rx} ${ry} ${rz}`);
  p.setAttribute('width', w);
  p.setAttribute('height', h);
  p.setAttribute('color', color);
  return p;
}

function addCorridor(startX, _y, startZ, alongX, sign){
  const g = document.createElement('a-entity');
  world.appendChild(g);

  // dimensions & transform
  const len = CFG.COR_L, w = CFG.COR_W, h = CFG.COR_H;
  const cx = alongX ? startX + sign * len/2 : startX;
  const cz = alongX ? startZ : startZ + sign * len/2;
  g.setAttribute('position', `${cx} 0 ${cz}`);

  // floor
  const floor = document.createElement('a-plane');
  floor.setAttribute('width', alongX ? len : w);
  floor.setAttribute('height', alongX ? w : len);
  floor.setAttribute('rotation', '-90 0 0');
  floor.setAttribute('color', CFG.COR_FLOOR);
  floor.classList.add('teleport'); // <- tap-to-teleport
  g.appendChild(floor);

  // ceiling
  const ceil = document.createElement('a-plane');
  ceil.setAttribute('width', alongX ? len : w);
  ceil.setAttribute('height', alongX ? w : len);
  ceil.setAttribute('rotation', '90 0 0');
  ceil.setAttribute('position', `0 ${h} 0`);
  ceil.setAttribute('color', CFG.COR_CEIL);
  g.appendChild(ceil);

  // Long side walls
  const lwLen = alongX ? len : w;
  const swLen = alongX ? w : len;
  const halfW = w / 2;

  if (alongX) {
    // +Z wall (right)
    g.appendChild(makeWall(0, h/2,  halfW, 0,   0, 0, h, len, CFG.COR_WALL));
    // -Z wall (left)
    g.appendChild(makeWall(0, h/2, -halfW, 0, 180, 0, h, len, CFG.COR_WALL));
  } else {
    // +X wall (front)
    g.appendChild(makeWall( halfW, h/2, 0, 0, -90, 0, h, len, CFG.COR_WALL));
    // -X wall (back)
    g.appendChild(makeWall(-halfW, h/2, 0, 0,  90, 0, h, len, CFG.COR_WALL));
  }

  // sconce lights every ~6m
  const step = 6;
  for (let t = -len/2 + 3; t <= len/2 - 3; t += step) {
    const lamp = document.createElement('a-entity');
    const px = alongX ? t : -halfW + 0.01;
    const pz = alongX ? -halfW + 0.01 : t;
    lamp.setAttribute('position', `${px} ${h-0.6} ${pz}`);
    lamp.setAttribute('light', 'type: point; intensity: 0.4; distance: 6; color: #ffe7b1');
    g.appendChild(lamp);

    const lamp2 = lamp.cloneNode();
    const px2 = alongX ? t : +halfW - 0.01;
    const pz2 = alongX ? +halfW - 0.01 : t;
    lamp2.setAttribute('position', `${px2} ${h-0.6} ${pz2}`);
    g.appendChild(lamp2);
  }

  // Add frames on both inner walls
  populateCorridor({
    group: g,
    alongX, sign,
    startX: alongX ? startX : cx,
    startZ: alongX ? cz     : startZ
  });
}

/* ---------------- Frames in corridors ---------------- */
function populateCorridor(c){
  const y = 1.6;
  const inset = CFG.COR_W / 2 - CFG.FRAME_OFFSET; // inside wall surface

  if (c.alongX) {
    // frames along X, walls at ±Z
    for (let t = CFG.FRAME_START; t < CFG.COR_L - 1.0; t += CFG.FRAME_STEP) {
      // right wall (+Z) facing inward (-Z)
      addFrame({ x: (c.startX + c.sign * t), y, z:  inset }, 180);
      // left wall  (-Z) facing inward (+Z)
      addFrame({ x: (c.startX + c.sign * t), y, z: -inset },   0);
    }
  } else {
    // frames along Z, walls at ±X
    for (let t = CFG.FRAME_START; t < CFG.COR_L - 1.0; t += CFG.FRAME_STEP) {
      // front wall (+X) facing inward (-X)
      addFrame({ x:  inset, y, z: (c.startZ + c.sign * t) }, -90);
      // back wall  (-X) facing inward (+X)
      addFrame({ x: -inset, y, z: (c.startZ + c.sign * t) },  90);
    }
  }
}

function addFrame(pos, yawDeg){
  // frame group
  const g = document.createElement('a-entity');
  g.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
  g.setAttribute('rotation', `0 ${yawDeg} 0`);
  world.appendChild(g);

  // mat (background)
  const back = document.createElement('a-plane');
  back.setAttribute('width', CFG.FRAME_W + 0.18);
  back.setAttribute('height', CFG.FRAME_H + 0.18);
  back.setAttribute('material', 'color: #1c1e22; metalness: 0.1; roughness: 0.9');
  back.setAttribute('position', '0 0 -0.005');
  g.appendChild(back);

  // inner art
  const art = document.createElement('a-plane');
  art.setAttribute('class', 'interact');
  art.setAttribute('width', CFG.FRAME_W);
  art.setAttribute('height', CFG.FRAME_H);
  art.setAttribute('material', 'color: #222831; src: #'); // no external asset – neutral
  g.appendChild(art);

  // simple hover outline
  art.addEventListener('mouseenter', () => art.setAttribute('material', 'color: #2f3640'));
  art.addEventListener('mouseleave', () => art.setAttribute('material', 'color: #222831'));

  // click opens the preview panel later; for now log
  art.addEventListener('click', () => {
    // placeholder action
    console.log('Frame clicked at', pos);
  });
}

/* ---------------- Teleport ---------------- */
function setupTeleport(){
  // click anywhere on a teleport surface to move there
  scene.addEventListener('click', (ev) => {
    const ray = cam.components.raycaster;
    if (!ray || !ray.intersections || !ray.intersections.length) return;

    const hit = ray.intersections.find(i => i.object.el && i.object.el.classList.contains('teleport'));
    if (!hit) return;

    const p = hit.point;
    rig.object3D.position.set(p.x, CFG.TELEPORT_Y, p.z);
  });
}

function markFloorsTeleportable(){
  // already marked when building (floor.classList.add('teleport'))
  // keep here in case you add more grounds dynamically
}

/* ---------------- Walking (hold button) ---------------- */
function setupWalkButton(){
  const btn = document.getElementById('walkBtn');

  const setWalking = (on) => {
    walking = on;
    btn.classList.toggle('active', on);
    btn.textContent = on ? 'Walking…' : 'Walk';
  };

  // touch
  btn.addEventListener('touchstart', (e)=>{ e.preventDefault(); setWalking(true); });
  btn.addEventListener('touchend',   (e)=>{ e.preventDefault(); setWalking(false); });

  // mouse
  btn.addEventListener('mousedown', ()=> setWalking(true));
  window.addEventListener('mouseup', ()=> setWalking(false));
}

function onTick(t){
  const dt = Math.min((t - lastTime) / 1000, 0.05);
  lastTime = t;

  if (walking) {
    // accelerate smoothly
    walkVel = THREE.MathUtils.lerp(walkVel, CFG.WALK_SPEED, CFG.WALK_SMOOTH);
    moveForward(dt, walkVel);
  } else {
    walkVel = THREE.MathUtils.lerp(walkVel, 0, CFG.WALK_SMOOTH);
    if (walkVel > 0.01) moveForward(dt, walkVel);
  }

  drawMinimap();
}

function moveForward(dt, speed){
  const rig3 = rig.object3D;
  const dir  = TMP.dir;
  cam.object3D.getWorldDirection(dir);
  dir.y = 0;
  dir.normalize().multiplyScalar(speed * dt); // <- forward
  rig3.position.add(dir);
}

/* ---------------- Help ---------------- */
function setupHelp(){
  const btn = document.getElementById('helpBtn');
  btn.addEventListener('click', () => {
    alert(
`• Tap the floor to teleport
• Hold “Walk” to move forward
• Look around to steer
• Frames are interactable (tap them)

This is an early pass of the Château 2.0 layout.
More rooms & detail coming next.`
    );
  });
}

/* ---------------- Minimap ---------------- */
const mini = {
  c: null, ctx: null,
  w: 256, h: 256,
  // very simple orthographic mapping
  origin: new THREE.Vector2(128, 128),
  scale: CFG.MINI_SCALE,
  rooms: []
};

function setupMinimap(){
  mini.c = document.getElementById('miniCanvas');
  mini.ctx = mini.c.getContext('2d');

  // basic map nodes (rooms + corridors)
  const R = CFG.ROOM_W;
  const C = CFG.COR_L;
  // center square room
  mini.rooms.push({x:0,z:0,w:R,l:R,type:'room'});
  // corridors
  mini.rooms.push({x:+(R/2 + C/2), z:0, w:C, l:CFG.COR_W, type:'cor'});
  mini.rooms.push({x:-(R/2 + C/2), z:0, w:C, l:CFG.COR_W, type:'cor'});
  mini.rooms.push({x:0, z:+(R/2 + C/2), w:CFG.COR_W, l:C, type:'cor'});
  mini.rooms.push({x:0, z:-(R/2 + C/2), w:CFG.COR_W, l:C, type:'cor'});
}

function drawMinimap(){
  const ctx = mini.ctx, W = mini.w, H = mini.h;
  ctx.clearRect(0,0,W,H);

  // panel bg
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,W,H);

  // rooms/corridors
  for (const r of mini.rooms){
    ctx.fillStyle = (r.type==='room') ? '#2e3a55' : '#3a3550';
    const sx = mini.origin.x + r.x * mini.scale - (r.w/2)*mini.scale;
    const sz = mini.origin.y + r.z * mini.scale - (r.l/2)*mini.scale;
    ctx.fillRect(sx, sz, r.w*mini.scale, r.l*mini.scale);
  }

  // player arrow
  const p = rig.object3D.position;
  const px = mini.origin.x + p.x * mini.scale;
  const pz = mini.origin.y + p.z * mini.scale;

  // heading from camera
  const dir = TMP.dir;
  cam.object3D.getWorldDirection(dir);
  const angle = Math.atan2(dir.x, dir.z); // z-forward

  ctx.save();
  ctx.translate(px, pz);
  ctx.rotate(-angle);
  ctx.fillStyle = '#f7c96b';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 8);
  ctx.lineTo(-6, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}