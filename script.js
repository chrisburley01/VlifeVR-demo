/* VLife • Château 2.0 (walking fix + minimap loop) */
const scene  = document.getElementById('scene');
const world  = document.getElementById('world');
const rig    = document.getElementById('rig');
const cam    = document.getElementById('cam');
const status = document.getElementById('status');
const walkBtn= document.getElementById('walkBtn');
const minimap= document.getElementById('minimap');

function note(msg, ok=true){
  status.hidden=false; status.textContent = msg;
  status.style.color = ok ? '#cbffd8' : '#ffd6d6';
}
function v3(x=0,y=0,z=0){ return `${x} ${y} ${z}`; }

const CFG = {
  lobbySize: 20,
  wallH: 3.2,
  corridorW: 4,
  corridorL: 18,
  frameW: 1.1,
  frameH: 0.7
};

const LINKS = [
  {title:"GoPro 360", url:"https://www.youtube.com/@GoPro/search?query=360"},
  {title:"National Geographic 360", url:"https://www.youtube.com/playlist?list=PLvjPDlt6ApQUgZgY2hLpcZ3g4Zz4Icz7T"},
  {title:"NYTimes Daily 360", url:"https://www.nytimes.com/spotlight/the-daily-360"},
  {title:"ISS Spacewalk 360", url:"https://www.youtube.com/watch?v=H9w5o6wEziA"},
  {title:"BBC Earth 360", url:"https://www.youtube.com/results?search_query=bbc+earth+360"},
  {title:"VR Rollercoaster", url:"https://www.youtube.com/results?search_query=rollercoaster+360"}
];

/* ---------- Movement component (runs every frame) ---------- */
AFRAME.registerComponent('player-move',{
  schema:{
    speed:{type:'number', default:1.6},
    active:{type:'boolean', default:false}
  },
  init(){
    this.forward = new THREE.Vector3();
  },
  tick(time, dt){
    if(!this.data.active) return;
    if(!cam || !cam.object3D) return;
    // Get camera forward vector (points along -Z)
    cam.object3D.getWorldDirection(this.forward);
    // Move forward (world units per second)
    const step = (this.data.speed * (dt/1000));
    // Optional: ignore vertical pitch so you don't drift up/down
    this.forward.y = 0; this.forward.normalize();
    // Move the rig
    this.el.object3D.position.addScaledVector(this.forward, step);
  }
});

/* ---------- UI/minimap refresher each frame ---------- */
AFRAME.registerComponent('ui-loop',{
  tick(){ drawMinimap(); }
});

/* ---------- Build world ---------- */
scene.addEventListener('loaded', () => {
  buildGroundSky();
  buildLobbyAndCorridors();
  installMinimap();
  note('World ready');
});

/* ground + sky */
function buildGroundSky(){
  const ground = document.createElement('a-plane');
  ground.setAttribute('rotation', '-90 0 0');
  ground.setAttribute('width', '120');
  ground.setAttribute('height', '120');
  ground.setAttribute('color', '#222');
  world.appendChild(ground);

  const sky = document.createElement('a-sky');
  sky.setAttribute('color', '#0d0f16');
  world.appendChild(sky);
}

/* lobby + 4 corridors */
function buildLobbyAndCorridors(){
  const S = CFG.lobbySize, H = CFG.wallH;
  addBox(0, 0, 0, S, 0.1, S, '#2a2a2a', true);
  addBox(0, H, 0, S, 0.1, S, '#1c1c1c', false);

  wallStrip(-S/2, H/2, 0,    0, 0, 0,    S, H, '#e8e1cf');
  wallStrip( S/2, H/2, 0,    0,180, 0,   S, H, '#e8e1cf');
  wallStrip( 0,   H/2,-S/2,  0, 90, 0,   S, H, '#e8e1cf');
  wallStrip( 0,   H/2, S/2,  0,-90, 0,   S, H, '#e8e1cf');

  corridor( 0, 0, -S/2, 0);
  corridor( S/2, 0,  0, 90);
  corridor( 0, 0,  S/2, 180);
  corridor(-S/2, 0,  0, -90);
}

function wallStrip(x,y,z, rx,ry,rz, len, h, color){
  const root = document.createElement('a-entity');
  root.setAttribute('position', v3(x,y,z));
  root.setAttribute('rotation', v3(rx,ry,rz));
  world.appendChild(root);
  const panelW = 1, gap = .05, usable = len - gap;
  const count = Math.floor(usable/(panelW+gap));
  const startX = -((count*(panelW+gap)-gap)/2) + panelW/2;
  for(let i=0;i<count;i++){
    const px = startX + i*(panelW+gap);
    const p = document.createElement('a-box');
    p.setAttribute('position', v3(px, 0, 0));
    p.setAttribute('width', panelW);
    p.setAttribute('height', h);
    p.setAttribute('depth', .08);
    p.setAttribute('color', color);
    p.setAttribute('shadow', 'receive:true');
    root.appendChild(p);
  }
}

function corridor(x,z, zOffOrXOff, yaw){
  const root = document.createElement('a-entity');
  root.setAttribute('position', v3(x,0,z));
  root.setAttribute('rotation', v3(0,yaw,0));
  world.appendChild(root);

  const W = CFG.corridorW, L = CFG.corridorL, H = CFG.wallH;
  addLocalBox(root, 0, 0, -L/2,  W, .05, L,  '#3a2f24', true);
  addLocalBox(root, 0, H, -L/2,  W, .05, L,  '#101215', false);
  addLocalBox(root, -W/2, H/2, -L/2, .08, H, L, '#eae5d6', false);
  addLocalBox(root,  W/2, H/2, -L/2, .08, H, L, '#eae5d6', false);

  const step = 3.2, yCenter = 1.5, inset = .15;
  let linkIdx = 0;
  for(let dz=-2; dz>=-L+2; dz-=step){
    createFrame(root,  W/2 - inset, yCenter, dz, 0, -90, 0, LINKS[linkIdx%LINKS.length]);
    createFrame(root, -W/2 + inset, yCenter, dz, 0,  90, 0, LINKS[(linkIdx+1)%LINKS.length]);
    linkIdx += 2;
  }
}

function createFrame(parent, x,y,z, rx,ry,rz, link){
  const group = document.createElement('a-entity');
  group.setAttribute('position', v3(x,y,z));
  group.setAttribute('rotation', v3(rx,ry,rz));
  parent.appendChild(group);

  const w = CFG.frameW, h = CFG.frameH;

  const back = document.createElement('a-plane');
  back.setAttribute('width', w+0.08);
  back.setAttribute('height', h+0.08);
  back.setAttribute('color', '#111');
  back.setAttribute('position', v3(0,0,-0.01));
  group.appendChild(back);

  const frame = document.createElement('a-plane');
  frame.classList.add('frame');
  frame.setAttribute('width', w);
  frame.setAttribute('height', h);
  frame.setAttribute('material', 'color:#1d2632; metalness:0.4; roughness:0.2');
  group.appendChild(frame);

  const title = document.createElement('a-entity');
  title.setAttribute('text', `value:${link.title}; align:center; width:2.5; color:#ffd988;`);
  title.setAttribute('position', v3(0, h/2 + .18, 0));
  group.appendChild(title);

  frame.addEventListener('click', () => window.open(link.url, '_blank'));
}

function addBox(x,y,z, w,h,d, color, receive){
  const e = document.createElement('a-box');
  e.setAttribute('position', v3(x, y + h/2, z));
  e.setAttribute('width', w);
  e.setAttribute('height', h);
  e.setAttribute('depth', d);
  e.setAttribute('color', color);
  e.setAttribute('shadow', `receive:${!!receive}; cast:${!receive}`);
  world.appendChild(e);
}
function addLocalBox(parent, x,y,z, w,h,d, color, receive){
  const e = document.createElement('a-box');
  e.setAttribute('position', v3(x, y + h/2, z));
  e.setAttribute('width', w);
  e.setAttribute('height', h);
  e.setAttribute('depth', d);
  e.setAttribute('color', color);
  e.setAttribute('shadow', `receive:${!!receive}; cast:${!receive}`);
  parent.appendChild(e);
}

/* -------- Walk button toggles the component -------- */
walkBtn.addEventListener('click', ()=>{
  const active = !(rig.getAttribute('player-move')?.active);
  rig.setAttribute('player-move', `active:${active}`);
  walkBtn.classList.toggle('active', active);
  walkBtn.textContent = active ? 'Walking…' : 'Walk';
});

/* ---------- Minimap ---------- */
function installMinimap(){
  minimap.innerHTML = `<canvas id="mm" width="180" height="180"></canvas>`;
}
function drawMinimap(){
  const c = document.getElementById('mm'); if(!c) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.fillRect(0,0,c.width,c.height);

  ctx.strokeStyle = '#7a8bff';
  ctx.lineWidth = 3;
  const cx=90, cy=90, s=28;
  ctx.strokeRect(cx-s, cy-s, s*2, s*2);
  ctx.beginPath();
  ctx.moveTo(cx, cy-s); ctx.lineTo(cx, cy-70);
  ctx.moveTo(cx+s, cy); ctx.lineTo(cx+70, cy);
  ctx.moveTo(cx, cy+s); ctx.lineTo(cx, cy+70);
  ctx.moveTo(cx-s, cy); ctx.lineTo(cx-70, cy);
  ctx.stroke();

  const p = rig.object3D.position;
  const scale=2;
  const mx = cx + p.x*scale;
  const my = cy + p.z*scale*-1;
  ctx.fillStyle = '#ffd26b';
  ctx.beginPath();
  ctx.arc(mx,my,5,0,Math.PI*2); ctx.fill();
}