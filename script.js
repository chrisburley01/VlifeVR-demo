/* VLife • Château 2.1
   - Fix: forward/back direction toggle (Flip)
   - Add: sphere-vs-box collisions (no more walking through walls)
   - Keep: press-and-hold Walk / Back, minimap
*/

const scene  = document.getElementById('scene');
const world  = document.getElementById('world');
const rig    = document.getElementById('rig');
const cam    = document.getElementById('cam');
const toast  = document.getElementById('toast');
const walkBtn= document.getElementById('walkBtn');
const backBtn= document.getElementById('backBtn');
const flipBtn= document.getElementById('flipBtn');
const mm     = document.getElementById('mm');

const CFG = {
  lobbySize: 20, wallH: 3.2,
  corridorW: 4, corridorL: 18,
  frameW: 1.2, frameH: 0.75,
  playerRadius: 0.35    // collision radius
};

const LINKS = [
  {title:"GoPro 360", url:"https://www.youtube.com/@GoPro/search?query=360"},
  {title:"National Geographic 360", url:"https://www.youtube.com/playlist?list=PLvjPDlt6ApQUgZgY2hLpcZ3g4Zz4Icz7T"},
  {title:"NYTimes Daily 360", url:"https://www.nytimes.com/spotlight/the-daily-360"},
  {title:"ISS Spacewalk 360", url:"https://www.youtube.com/watch?v=H9w5o6wEziA"},
  {title:"BBC Earth 360", url:"https://www.youtube.com/results?search_query=bbc+earth+360"},
  {title:"VR Rollercoaster", url:"https://www.youtube.com/results?search_query=rollercoaster+360"}
];

/* ---------- tiny utils ---------- */
const v3 = (x=0,y=0,z=0) => `${x} ${y} ${z}`;
const note = (msg) => { toast.textContent = msg; };

/* ---------- movement with collision ---------- */
AFRAME.registerComponent('player-move',{
  schema:{
    speed:{type:'number',default:1.6},
    active:{type:'boolean',default:false},
    back:{type:'boolean',default:false},
    forwardSign:{type:'number',default:1}
  },
  init(){
    this.dir = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
    this.colliderBoxes = []; // array of THREE.Box3
  },
  /* collect static colliders once world is built */
  scanColliders(){
    this.colliderBoxes.length = 0;
    const solids = world.querySelectorAll('.collider');
    solids.forEach(el=>{
      el.object3D.updateWorldMatrix(true,true);
      const box = new THREE.Box3().setFromObject(el.object3D);
      // slightly inflate to be safe
      box.expandByScalar(0.02);
      this.colliderBoxes.push(box);
    });
  },
  tick(time,dt){
    if(!this.data.active && !this.data.back) return;
    if(!cam || !cam.object3D) return;

    if(this.colliderBoxes.length===0) { this.scanColliders(); }

    // forward direction from camera
    cam.object3D.getWorldDirection(this.dir);
    this.dir.y = 0; this.dir.normalize();

    let sign = this.data.forwardSign;     // +1 or -1 depending on Flip
    if(this.data.back) sign *= -1;        // back reverses it

    const step = this.data.speed * (dt/1000) * sign;

    // candidate next position
    const rigObj = this.el.object3D;
    this.tmp.copy(rigObj.position).addScaledVector(this.dir, step);

    // collision test: player sphere vs each box
    const r = CFG.playerRadius;
    const sphere = new THREE.Sphere(this.tmp, r);
    let blocked = false;
    for(const box of this.colliderBoxes){
      if(box.intersectsSphere(sphere)){ blocked = true; break; }
    }
    if(!blocked){ rigObj.position.copy(this.tmp); }
  }
});

/* -------- scene build -------- */
scene.addEventListener('loaded', ()=>{
  buildGroundSky();
  buildLobbyAndCorridors();
  note('World ready');
});

/* ground + sky */
function buildGroundSky(){
  const ground = document.createElement('a-plane');
  ground.setAttribute('rotation','-90 0 0');
  ground.setAttribute('width','120');
  ground.setAttribute('height','120');
  ground.setAttribute('color','#222');
  ground.classList.add('collider');
  world.appendChild(ground);

  const sky = document.createElement('a-sky');
  sky.setAttribute('color','#0e1016');
  world.appendChild(sky);
}

/* solid helper (creates a collider box) */
function solidBox(parent, x,y,z, w,h,d, color){
  const e = document.createElement('a-box');
  e.setAttribute('position', v3(x, y + h/2, z));
  e.setAttribute('width', w);
  e.setAttribute('height', h);
  e.setAttribute('depth', d);
  e.setAttribute('color', color);
  e.classList.add('collider');
  parent.appendChild(e);
  return e;
}

/* decorative (non-collider) */
function decoBox(parent, x,y,z, w,h,d, color){
  const e = document.createElement('a-box');
  e.setAttribute('position', v3(x, y + h/2, z));
  e.setAttribute('width', w);
  e.setAttribute('height', h);
  e.setAttribute('depth', d);
  e.setAttribute('color', color);
  parent.appendChild(e);
  return e;
}

function buildLobbyAndCorridors(){
  const S = CFG.lobbySize, H = CFG.wallH;

  // lobby floor/ceiling (floor is collider)
  solidBox(world, 0, 0, 0,    S, 0.1, S, '#2a2a2a');
  decoBox (world, 0, H, 0,    S, 0.1, S, '#1b1b1b');

  // four lobby walls (colliders)
  solidBox(world, -S/2, 0, 0, .12, H, S, '#e8e1cf');
  solidBox(world,  S/2, 0, 0, .12, H, S, '#e8e1cf');
  solidBox(world, 0, 0, -S/2, S, H, .12, '#e8e1cf');
  solidBox(world, 0, 0,  S/2, S, H, .12, '#e8e1cf');

  // corridors
  corridor( 0, -S/2,   0);
  corridor( S/2,   0, 90);
  corridor( 0,  S/2,180);
  corridor(-S/2,  0,-90);
}

function corridor(ax, az, yaw){
  const root = document.createElement('a-entity');
  root.setAttribute('position', v3(ax,0,az));
  root.setAttribute('rotation', v3(0,yaw,0));
  world.appendChild(root);

  const W = CFG.corridorW, L = CFG.corridorL, H = CFG.wallH;

  // floor/ceiling
  solidBox(root, 0, 0, -L/2,  W, .05, L, '#3a2f24');
  decoBox (root, 0, H, -L/2,  W, .05, L, '#0f1114');

  // long side walls (colliders)
  solidBox(root, -W/2, 0, -L/2, .10, H, L, '#eae5d6');
  solidBox(root,  W/2, 0, -L/2, .10, H, L, '#eae5d6');

  // frames on both sides
  let idx=0;
  const step=3.2, y=1.5, inset=.16;
  for(let dz=-2; dz>=-L+2; dz-=step){
    frame(root, -W/2+inset, y, dz, 0, 90, 0, LINKS[idx%LINKS.length]); idx++;
    frame(root,  W/2-inset, y, dz, 0,-90, 0, LINKS[idx%LINKS.length]); idx++;
  }
}

function frame(parent, x,y,z, rx,ry,rz, link){
  const g = document.createElement('a-entity');
  g.setAttribute('position', v3(x,y,z));
  g.setAttribute('rotation', v3(rx,ry,rz));
  parent.appendChild(g);

  const w = CFG.frameW, h=CFG.frameH;

  // backing block is collider so you can't walk through the art
  const back = document.createElement('a-box');
  back.setAttribute('width', w+0.1);
  back.setAttribute('height', h+0.1);
  back.setAttribute('depth', 0.06);
  back.setAttribute('color', '#111');
  back.classList.add('collider');
  g.appendChild(back);

  const face = document.createElement('a-plane');
  face.classList.add('frame');
  face.setAttribute('width', w);
  face.setAttribute('height', h);
  face.setAttribute('material','color:#1d2632; metalness:0.4; roughness:0.25');
  g.appendChild(face);

  const title = document.createElement('a-entity');
  title.setAttribute('text', `value:${link.title}; align:center; width:2.6; color:#ffd988;`);
  title.setAttribute('position', v3(0, h/2 + .18, .001));
  g.appendChild(title);

  face.addEventListener('click', ()=>window.open(link.url,'_blank'));
}

/* ---------- press-and-hold buttons ---------- */
function pressHold(btn, onDown, onUp){
  const down = e=>{e.preventDefault(); onDown();};
  const up   = e=>{onUp();};
  btn.addEventListener('pointerdown', down);
  window.addEventListener('pointerup', up);
}
pressHold(walkBtn,
  ()=>{ rig.setAttribute('player-move','active:true'); walkBtn.classList.add('active'); walkBtn.textContent='Walking…'; },
  ()=>{ rig.setAttribute('player-move','active:false'); walkBtn.classList.remove('active'); walkBtn.textContent='Walk'; }
);
pressHold(backBtn,
  ()=>{ rig.setAttribute('player-move','back:true'); backBtn.classList.add('active'); },
  ()=>{ rig.setAttribute('player-move','back:false'); backBtn.classList.remove('active'); }
);

/* ---------- flip forward/back per-device ---------- */
flipBtn.addEventListener('click', ()=>{
  const comp = rig.getAttribute('player-move');
  const newSign = comp.forwardSign * -1;
  rig.setAttribute('player-move', `forwardSign:${newSign}`);
  flipBtn.classList.toggle('active');
  note(newSign===1 ? 'Forward: normal' : 'Forward: flipped');
});

/* ---------- minimap ---------- */
const ctx = mm.getContext('2d');
AFRAME.registerComponent('ui-loop',{
  tick(){ drawMinimap(); }
});
function drawMinimap(){
  const w=mm.width, h=mm.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#7a8bff'; ctx.lineWidth=3;
  const cx=90, cy=90, s=28;
  ctx.strokeRect(cx-s,cy-s,s*2,s*2);
  ctx.beginPath();
  ctx.moveTo(cx,cy-s); ctx.lineTo(cx,cy-70);
  ctx.moveTo(cx+s,cy); ctx.lineTo(cx+70,cy);
  ctx.moveTo(cx,cy+s); ctx.lineTo(cx,cy+70);
  ctx.moveTo(cx-s,cy); ctx.lineTo(cx-70,cy);
  ctx.stroke();

  const p = rig.object3D.position;
  const scale=2;
  const mx = cx + p.x*scale;
  const my = cy - p.z*scale;
  ctx.fillStyle='#ffd26b';
  ctx.beginPath(); ctx.arc(mx,my,5,0,Math.PI*2); ctx.fill();
}