/* =========================================================
   VLife • Chateau Hub – script.js (chateau1.5)
   - Central stone hall with arched doorways (as before)
   - Each corridor opens to a larger themed room:
       N: Log Cabin   E: Starship   S: Jungle   W: Ice Vault
   - Procedural floors/walls/lights (no assets)
   - Frames in corridors stay flush & open links directly
   - Tap-to-teleport + minimap extended for rooms
========================================================= */

/* ---- Teleport behaviour ---- */
const TELEPORT_VIA_GAZE      = false;   // tap-only
const TELEPORT_DURATION_MS   = 900;
const TELEPORT_DEADZONE_M    = 0.25;
const TELEPORT_ARM_DELAY_MS  = 1200;

/* ---- Elements / UI ---- */
function toggleHelp(){ document.getElementById('help')?.classList.toggle('hidden'); }
const scene = document.getElementById('scene');
const env   = document.getElementById('env');
const rig   = document.getElementById('rig');
const camEl = document.getElementById('cam');
const map   = document.getElementById('mapCanvas');
const mctx  = map.getContext('2d');

/* ---- Hall / corridor / room sizes ---- */
const HALL_W = 18, HALL_D = 18, HALL_H = 4.8, WALL_T = 0.06;
const COR_W  = 3.0, COR_H  = HALL_H, COR_L  = 14.0;
const ROOM_W = 12.0, ROOM_D = 12.0, ROOM_H = 4.8;   // themed room size
const DOOR_W = COR_W + 0.35, DOOR_H = 3.2;

/* ---- Links for corridor frames ---- */
const LINKS = [
  { title: 'Grand Canyon 360',   url: 'https://www.youtube.com/watch?v=CSvFpBOe8eY' },
  { title: 'Roller Coaster 360', url: 'https://www.youtube.com/watch?v=VR1b7GdQf2I' },
  { title: 'Cities at Night 360',url: 'https://www.youtube.com/watch?v=v8VrmkG2FvE' },
  { title: 'Ocean Dive 360',     url: 'https://www.youtube.com/watch?v=6B9vLwYxGZ0' },
  { title: 'Space Walk 360',     url: 'https://www.youtube.com/watch?v=0qisGSwZym4' },
  { title: 'Mountain Flight 360',url: 'https://www.youtube.com/watch?v=GoB9aSxUjYw' }
];

/* ---------- Helpers ---------- */
function parseYouTubeId(u){
  try{
    const url = new URL(u);
    if (url.hostname.includes('youtu.be'))   return url.pathname.slice(1);
    if (url.hostname.includes('youtube.com'))return url.searchParams.get('v');
  }catch(e){}
  return null;
}
function ytThumb(u){
  const id = parseYouTubeId(u);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
(function adjustGazeRaycaster(){
  const gaze = document.getElementById('gazeCursor');
  if (!gaze) return;
  const objs = TELEPORT_VIA_GAZE ? '.teleport, .interact' : '.interact';
  gaze.setAttribute('raycaster', `objects:${objs}; far:70; interval:0`);
})();

/* ---------- Teleport (tap) with room-aware bounds ---------- */
(function setupTeleport(){
  const lerpMs = TELEPORT_DURATION_MS;
  let armed=false; setTimeout(()=>armed=true, TELEPORT_ARM_DELAY_MS);

  // convenience
  const halfHallX = HALL_W/2 - 0.4;
  const halfHallZ = HALL_D/2 - 0.4;
  const endX = halfHallX + COR_L;     // end of corridor along X
  const endZ = halfHallZ + COR_L;     // end of corridor along Z
  const roomHalfX = ROOM_W/2 - 0.4;
  const roomHalfZ = ROOM_D/2 - 0.4;

  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }

  function moveTo(x,z){
    const cur = rig.object3D.position;

    // Determine which region the target falls into and clamp accordingly
    let tx=x, tz=z;

    // In main hall?
    if (Math.abs(x)<=halfHallX && Math.abs(z)<=halfHallZ){
      tx = clamp(x, -halfHallX, halfHallX);
      tz = clamp(z, -halfHallZ, halfHallZ);
    } else {
      const inXStrip = (Math.abs(z) <= COR_W/2 - 0.2);           // within X corridors
      const inZStrip = (Math.abs(x) <= COR_W/2 - 0.2);           // within Z corridors

      if (inXStrip){ // along ±X
        // are we past the corridor into a room?
        if (Math.abs(x) > endX){
          // clamp within the room rectangle centred at ±(endX + roomHalf)
          const cx = Math.sign(x) * (endX + roomHalfX);
          tx = clamp(x, cx - roomHalfX, cx + roomHalfX);
          tz = clamp(z, -roomHalfZ, roomHalfZ);
        } else {
          tx = clamp(x, -endX, endX);
          tz = clamp(z, -COR_W/2 + 0.2, COR_W/2 - 0.2);
        }
      } else if (inZStrip){ // along ±Z
        if (Math.abs(z) > endZ){
          const cz = Math.sign(z) * (endZ + roomHalfZ);
          tz = clamp(z, cz - roomHalfZ, cz + roomHalfZ);
          tx = clamp(x, -roomHalfX, roomHalfX);
        } else {
          tz = clamp(z, -endZ, endZ);
          tx = clamp(x, -COR_W/2 + 0.2, COR_W/2 - 0.2);
        }
      } else {
        // default back to hall bounds
        tx = clamp(x, -halfHallX, halfHallX);
        tz = clamp(z, -halfHallZ, halfHallZ);
      }
    }

    if (Math.hypot(tx-cur.x, tz-cur.z) < TELEPORT_DEADZONE_M) return;

    const start = cur.clone();
    const end   = new THREE.Vector3(tx, start.y, tz);
    const t0 = performance.now();
    function step(){
      const t=(performance.now()-t0)/lerpMs;
      const k=t>=1?1:(1-Math.cos(Math.min(1,t)*Math.PI))/2;
      rig.object3D.position.copy(start.clone().lerp(end,k));
      if (t<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  scene.addEventListener('click', (evt)=>{
    if (!armed) return;
    const target=evt.target;
    if (!target?.classList?.contains('teleport')) return;
    const d = evt.detail || {};
    const inter = d.intersection || (d.intersections && d.intersections[0]);
    if (!inter) return;
    moveTo(inter.point.x, inter.point.z);
  });
})();

/* ---------- Procedural textures ---------- */
function stoneTilesTexture(repeatX, repeatZ){
  const c = document.createElement('canvas'); c.width=512; c.height=512;
  const g = c.getContext('2d');
  g.fillStyle='#d8d2c6'; g.fillRect(0,0,512,512);
  const N=8, s=512/N;
  for (let i=0;i<N;i++){
    for (let j=0;j<N;j++){
      const shade = 205 + ((i+j)%2?-10:0);
      g.fillStyle=`rgb(${shade},${shade-6},${shade-12})`;
      g.fillRect(i*s+1, j*s+1, s-2, s-2);
    }
  }
  g.strokeStyle='rgba(60,60,60,0.35)';
  for (let k=0;k<=N;k++){ g.beginPath(); g.moveTo(k*s,0); g.lineTo(k*s,512); g.stroke();
                          g.beginPath(); g.moveTo(0,k*s); g.lineTo(512,k*s); g.stroke(); }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatZ);
  return tex;
}
function stripedWoodTexture(along='x'){
  const c = document.createElement('canvas'); c.width=1024; c.height=256;
  const g = c.getContext('2d');
  const stripes = 28;
  for (let i=0;i<stripes;i++){
    const t = i/stripes;
    const col = `rgb(${110+Math.floor(60*Math.sin(t*6.28+0.8))},${70+Math.floor(40*Math.sin(t*7.5+1.2))},${40+Math.floor(35*Math.sin(t*5.9+2.0))})`;
    g.fillStyle = col;
    if (along==='x') g.fillRect(Math.floor(i*(c.width/stripes)), 0, Math.ceil(c.width/stripes), c.height);
    else             g.fillRect(0, Math.floor(i*(c.height/stripes)), c.width, Math.ceil(c.height/stripes));
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.repeat.set(along==='x'?8:2, along==='x'?2:8);
  return tex;
}
function plankWallTexture(){
  const c=document.createElement('canvas'); c.width=512; c.height=512;
  const g=c.getContext('2d');
  for (let i=0;i<16;i++){
    const y=i*(512/16);
    g.fillStyle = `rgb(${92+Math.floor(Math.random()*20)},${58+Math.floor(Math.random()*18)},${36+Math.floor(Math.random()*12)})`;
    g.fillRect(0,y,512,Math.ceil(512/16)-2);
  }
  g.strokeStyle='rgba(30,20,10,0.45)';
  for(let i=0;i<=16;i++){ g.beginPath(); g.moveTo(0,i*(512/16)); g.lineTo(512,i*(512/16)); g.stroke(); }
  const tex=new THREE.CanvasTexture(c);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(2,2); return tex;
}
function metalPanelTexture(){
  const c=document.createElement('canvas'); c.width=512; c.height=512;
  const g=c.getContext('2d');
  const grad=g.createLinearGradient(0,0,512,512);
  grad.addColorStop(0,'#9aa5b3'); grad.addColorStop(0.5,'#b9c2ce'); grad.addColorStop(1,'#8c95a3');
  g.fillStyle=grad; g.fillRect(0,0,512,512);
  g.fillStyle='rgba(255,255,255,0.18)'; g.fillRect(0,240,512,18);
  g.fillRect(0,420,512,10);
  const tex=new THREE.CanvasTexture(c); tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(2,2); return tex;
}
function frostedTexture(){
  const c=document.createElement('canvas'); c.width=256; c.height=256;
  const g=c.getContext('2d');
  for(let i=0;i<500;i++){
    g.fillStyle=`rgba(200,240,255,${Math.random()*0.2+0.1})`;
    g.beginPath(); g.arc(Math.random()*256,Math.random()*256,Math.random()*3+1,0,Math.PI*2); g.fill();
  }
  const tex=new THREE.CanvasTexture(c); tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(6,6); return tex;
}

/* ---------- Build Chateau Hub + Corridors + Themed Rooms ---------- */
(function buildChateau(){

  /* Global lights */
  const hemi = document.createElement('a-entity');
  hemi.setAttribute('light','type: hemisphere; intensity: 0.9; color: #e9f0ff; groundColor:#443333;');
  hemi.setAttribute('position','0 3 0'); env.appendChild(hemi);

  /* === Main Hall floor === */
  const hallFloor = document.createElement('a-entity');
  hallFloor.classList.add('teleport');
  hallFloor.setAttribute('geometry', `primitive: plane; width:${HALL_W}; height:${HALL_D}`);
  hallFloor.setAttribute('rotation', '-90 0 0');
  hallFloor.setAttribute('material', 'shader: flat; src:');
  hallFloor.addEventListener('loaded', ()=>{
    const mesh = hallFloor.getObject3D('mesh');
    if (mesh){ mesh.material.map = stoneTilesTexture(HALL_W/3, HALL_D/3); mesh.material.needsUpdate = true; }
  });
  env.appendChild(hallFloor);

  /* === Main Hall walls: 1m panels + openings + labels + arches === */
  const wallBase='#cfc8bc', panelA='#c8c1b5', panelB='#bfb7a9', trim='#b3ab9b';

  function addTrimRings(){
    const base = document.createElement('a-box');
    base.setAttribute('position',`0 0.1 0`);
    base.setAttribute('width',`${HALL_W+WALL_T*2}`); base.setAttribute('height','0.12');
    base.setAttribute('depth',`${HALL_D+WALL_T*2}`); base.setAttribute('color',trim); env.appendChild(base);
    const corn=base.cloneNode(); corn.setAttribute('position',`0 ${HALL_H-0.08} 0`); env.appendChild(corn);
  }

  function wallWithDoor(side,labelText){
    const alongX=(side==='N'||side==='S'); const sign=(side==='N'||side==='W')?-1:1;
    const wx=(side==='E'? HALL_W/2 : side==='W'? -HALL_W/2 : 0);
    const wz=(side==='S'? HALL_D/2 : side==='N'? -HALL_D/2 : 0);

    // slabs around doorway
    if (alongX){
      const leftW=(HALL_W-DOOR_W)/2;
      const left=document.createElement('a-box');
      left.setAttribute('position',`${-DOOR_W/2-(HALL_W/2-leftW/2)} ${HALL_H/2} ${wz}`);
      left.setAttribute('width',`${leftW}`); left.setAttribute('height',`${HALL_H}`); left.setAttribute('depth',`${WALL_T}`);
      left.setAttribute('color',wallBase); env.appendChild(left);
      const right=left.cloneNode(); right.setAttribute('position',`${DOOR_W/2+(HALL_W/2-leftW/2)} ${HALL_H/2} ${wz}`); env.appendChild(right);
      const lint=document.createElement('a-box');
      lint.setAttribute('position',`0 ${(DOOR_H+HALL_H)/2} ${wz}`);
      lint.setAttribute('width',`${DOOR_W}`); lint.setAttribute('height',`${HALL_H-DOOR_H}`); lint.setAttribute('depth',`${WALL_T}`);
      lint.setAttribute('color',wallBase); env.appendChild(lint);
    } else {
      const leftD=(HALL_D-DOOR_W)/2;
      const near=document.createElement('a-box');
      near.setAttribute('position',`${wx} ${HALL_H/2} ${-DOOR_W/2-(HALL_D/2-leftD/2)}`);
      near.setAttribute('width',`${WALL_T}`); near.setAttribute('height',`${HALL_H}`); near.setAttribute('depth',`${leftD}`);
      near.setAttribute('color',wallBase); env.appendChild(near);
      const far=near.cloneNode(); far.setAttribute('position',`${wx} ${HALL_H/2} ${DOOR_W/2+(HALL_D/2-leftD/2)}`); env.appendChild(far);
      const lint=document.createElement('a-box');
      lint.setAttribute('position',`${wx} ${(DOOR_H+HALL_H)/2} 0`);
      lint.setAttribute('width',`${WALL_T}`); lint.setAttribute('height',`${HALL_H-DOOR_H}`); lint.setAttribute('depth',`${DOOR_W}`);
      lint.setAttribute('color',wallBase); env.appendChild(lint);
    }

    // chair rail
    const rail = document.createElement('a-box'); rail.setAttribute('color',trim);
    if (alongX){ rail.setAttribute('width',`${HALL_W}`); rail.setAttribute('height','0.06'); rail.setAttribute('depth','0.05');
      rail.setAttribute('position',`0 1.0 ${wz+sign*(WALL_T/2+0.025)}`);}
    else { rail.setAttribute('width','0.05'); rail.setAttribute('height','0.06'); rail.setAttribute('depth',`${HALL_D}`);
      rail.setAttribute('position',`${wx+sign*(WALL_T/2+0.025)} 1.0 0`);}
    env.appendChild(rail);

    // 1m panels (skip doorway span)
    const panelW=1.0,gapP=0.08,panelH=3.0,panelY=1.6;
    const width=alongX?HALL_W:HALL_D; const count=Math.floor((width-0.4)/(panelW+gapP));
    for (let i=0;i<count;i++){
      const off=-((count-1)*(panelW+gapP))/2+i*(panelW+gapP);
      if (Math.abs(off)<DOOR_W/2+0.05) continue;
      const pane=document.createElement('a-plane'); pane.setAttribute('width',`${panelW}`); pane.setAttribute('height',`${panelH}`);
      pane.setAttribute('material',`color:${i%2?panelA:panelB}`);
      if (alongX){ pane.setAttribute('position',`${off} ${panelY} ${wz+sign*(WALL_T/2+0.006)}`); pane.setAttribute('rotation',`0 ${sign>0?180:0} 0`); }
      else       { pane.setAttribute('position',`${wx+sign*(WALL_T/2+0.006)} ${panelY} ${off}`); pane.setAttribute('rotation',`0 ${side==='E'?-90:90} 0`); }
      env.appendChild(pane);
    }

    // arch blocks
    const archR = DOOR_W/2 + 0.12, seg=14;
    for (let k=0;k<=seg;k++){
      const t=Math.PI*k/seg;
      const ay=DOOR_H/2 + archR*Math.sin(t) + DOOR_H/2;
      const block=document.createElement('a-box');
      block.setAttribute('width','0.22'); block.setAttribute('height','0.16'); block.setAttribute('depth','0.12');
      block.setAttribute('color','#bdb39f');
      if (alongX){ const ax=archR*Math.cos(t); const az=wz+sign*(WALL_T/2+0.055); block.setAttribute('position',`${ax} ${ay} ${az}`); }
      else { const ax=wx+sign*(WALL_T/2+0.055); const az=archR*Math.cos(t); block.setAttribute('position',`${ax} ${ay} ${az}`); }
      env.appendChild(block);
    }

    // label
    const label=document.createElement('a-entity');
    label.setAttribute('text',`value:${labelText}; align:center; color:#3a2a17; width:6; zOffset:0.01`);
    const lx = alongX ? 0 : wx + sign*(WALL_T/2 + 0.02);
    const lz = alongX ? wz + sign*(WALL_T/2 + 0.02) : 0;
    const ry = alongX ? (sign>0?180:0) : (side==='E'?-90:90);
    label.setAttribute('position',`${lx} ${DOOR_H+0.35} ${lz}`); label.setAttribute('rotation',`0 ${ry} 0`);
    env.appendChild(label);
  }

  addTrimRings();
  wallWithDoor('N','Cabin Wing');
  wallWithDoor('E','Starship Wing');
  wallWithDoor('S','Jungle Wing');
  wallWithDoor('W','Ice Vault Wing');

  // Ceiling + chandeliers
  const ceil=document.createElement('a-plane');
  ceil.setAttribute('rotation','90 0 0'); ceil.setAttribute('position',`0 ${HALL_H} 0`);
  ceil.setAttribute('width',`${HALL_W}`); ceil.setAttribute('height',`${HALL_D}`);
  ceil.setAttribute('material','color:#4d341c'); env.appendChild(ceil);
  function chandelier(x,z){
    const y=HALL_H-0.6;
    const bulb=document.createElement('a-sphere');
    bulb.setAttribute('radius','0.12'); bulb.setAttribute('color','#ffefc0');
    bulb.setAttribute('position',`${x} ${y} ${z}`);
    bulb.setAttribute('material','emissive:#ffe39a; emissiveIntensity:1.4; roughness:0.2'); env.appendChild(bulb);
    const l=document.createElement('a-entity');
    l.setAttribute('light','type: point; intensity: 1.0; distance: 16; decay: 1; color: #ffd08a');
    l.setAttribute('position',`${x} ${y} ${z}`); env.appendChild(l);
  }
  [[-3,-3],[3,-3],[-3,3],[3,3],[0,0]].forEach(([x,z])=>chandelier(x,z));

  /* === Corridors === */
  function sconce(x,y,z,yaw){
    const plate=document.createElement('a-cylinder');
    plate.setAttribute('radius','0.08'); plate.setAttribute('height','0.02');
    plate.setAttribute('rotation',`0 ${yaw} 90`); plate.setAttribute('position',`${x} ${y} ${z}`);
    plate.setAttribute('color','#4b3a2a'); env.appendChild(plate);
    const flame=document.createElement('a-sphere');
    flame.setAttribute('radius','0.05'); flame.setAttribute('color','#ffe7a3');
    flame.setAttribute('material','emissive:#ffd68a; emissiveIntensity:1.2; roughness:0.3');
    flame.setAttribute('position',`${x} ${y} ${z}`); env.appendChild(flame);
    const light=document.createElement('a-entity');
    light.setAttribute('light','type: point; intensity: 0.75; distance: 8; decay: 1; color: #ffd08a');
    light.setAttribute('position',`${x} ${y} ${z}`); env.appendChild(light);
  }

  function mkCorridor(axis){
    const alongX=(axis==='x+'||axis==='x-'); const sign=axis.includes('+')?1:-1;
    const startX=alongX?sign*(HALL_W/2):0; const startZ=alongX?0:sign*(HALL_D/2);

    // floor (striped planks)
    const floor=document.createElement('a-entity'); floor.classList.add('teleport');
    const along = alongX ? 'x' : 'z';
    if(alongX){
      floor.setAttribute('geometry',`primitive: plane; width:${COR_L}; height:${COR_W}`);
      floor.setAttribute('rotation','-90 0 0'); floor.setAttribute('position',`${startX+sign*(COR_L/2)} 0 0`);
    }else{
      floor.setAttribute('geometry',`primitive: plane; width:${COR_W}; height:${COR_L}`);
      floor.setAttribute('rotation','-90 0 0'); floor.setAttribute('position',`0 0 ${startZ+sign*(COR_L/2)}`);
    }
    floor.setAttribute('material','shader: flat; src:');
    floor.addEventListener('loaded', ()=>{
      const mesh = floor.getObject3D('mesh');
      if (mesh){ mesh.material.map = stripedWoodTexture(along); mesh.material.needsUpdate = true; }
    });
    env.appendChild(floor);

    // side walls
    const tone='#cfc8bc';
    function wall(x,y,z,w,h,d){
      const box=document.createElement('a-box');
      box.setAttribute('position',`${x} ${y} ${z}`); box.setAttribute('width',`${w}`); box.setAttribute('height',`${h}`); box.setAttribute('depth',`${d}`);
      box.setAttribute('color', tone); env.appendChild(box);
    }
    if(alongX){
      const zA =  COR_W/2 + WALL_T/2, zB = -COR_W/2 - WALL_T/2;
      wall(startX + sign*(COR_L/2), HALL_H/2, zA, COR_L, HALL_H, WALL_T);
      wall(startX + sign*(COR_L/2), HALL_H/2, zB, COR_L, HALL_H, WALL_T);
    }else{
      const xA =  COR_W/2 + WALL_T/2, xB = -COR_W/2 - WALL_T/2;
      wall(xA, HALL_H/2, startZ + sign*(COR_L/2), WALL_T, HALL_H, COR_L);
      wall(xB, HALL_H/2, startZ + sign*(COR_L/2), WALL_T, HALL_H, COR_L);
    }

    // sconces
    const step=5;
    if(alongX){
      for(let x = startX+sign*2.0; Math.abs(x-startX)<COR_L-1.5; x+=sign*step){
        sconce(x, 2.0,  COR_W/2 + WALL_T/2 + 0.01, 180);
        sconce(x, 2.0, -COR_W/2 - WALL_T/2 - 0.01,   0);
      }
    }else{
      for(let z = startZ+sign*2.0; Math.abs(z-startZ)<COR_L-1.5; z+=sign*step){
        sconce( COR_W/2 + WALL_T/2 + 0.01, 2.0, z, -90);
        sconce(-COR_W/2 - WALL_T/2 - 0.01, 2.0, z,  90);
      }
    }

    return {alongX, sign, startX, startZ};
  }

  const corXpos = mkCorridor('x+'); // East
  const corXneg = mkCorridor('x-'); // West
  const corZpos = mkCorridor('z+'); // South
  const corZneg = mkCorridor('z-'); // North

  /* === Corridor frames (flush) === */
  const STEP = 3.2, MARGIN=1.6, OFFSET=0.06; let linkIdx=0;
  function addFrame(pos, yawDeg){
    const link = LINKS[linkIdx++ % LINKS.length];

    const frame = document.createElement('a-entity'); frame.classList.add('interact');
    const outer = document.createElement('a-plane');
    outer.setAttribute('width','1.68'); outer.setAttribute('height','1.08');
    outer.setAttribute('material','color:#3d2a16'); frame.appendChild(outer);

    const inner = document.createElement('a-plane');
    inner.setAttribute('width','1.6'); inner.setAttribute('height','1.0');
    inner.setAttribute('material','color:#1d2230'); inner.setAttribute('position','0 0 0.005'); frame.appendChild(inner);

    const img = document.createElement('a-image');
    img.setAttribute('src', ytThumb(link.url) || '#fallbackPoster');
    img.setAttribute('width','1.52'); img.setAttribute('height','0.92');
    img.setAttribute('position','0 0 0.01'); frame.appendChild(img);

    const cap = document.createElement('a-entity');
    cap.setAttribute('text',`value:${link.title}; align:center; color:#f5f5f5; width:2.4; wrapCount:22; zOffset:0.01`);
    cap.setAttribute('position','0 -0.70 0.015'); frame.appendChild(cap);

    frame.setAttribute('position',`${pos.x} ${pos.y} ${pos.z}`);
    frame.setAttribute('rotation',`0 ${yawDeg} 0`);
    frame.addEventListener('mouseenter',()=>inner.setAttribute('material','color:#273045'));
    frame.addEventListener('mouseleave',()=>inner.setAttribute('material','color:#1d2230'));
    frame.addEventListener('click',()=>{ try{window.open(link.url,'_blank');}catch(e){location.href=link.url;} });

    env.appendChild(frame);
  }
  [corXpos,corXneg,corZpos,corZneg].forEach(({alongX,sign,startX,startZ})=>{
    const y=1.6;
    if (alongX){
      const zpos =  COR_W/2 + WALL_T/2 + OFFSET;
      const zneg = -COR_W/2 - WALL_T/2 - OFFSET;
      const yawPos = 180, yawNeg = 0;
      for (let x=startX+sign*MARGIN; Math.abs(x-startX)<COR_L-0.8; x+=sign*STEP){
        addFrame({x,y,z:zpos}, yawPos);
        addFrame({x,y,z:zneg}, yawNeg);
      }
    } else {
      const xpos =  COR_W/2 + WALL_T/2 + OFFSET;
      const xneg = -COR_W/2 - WALL_T/2 - OFFSET;
      const yawPos = -90, yawNeg = 90;
      for (let z=startZ+sign*MARGIN; Math.abs(z-startZ)<COR_L-0.8; z+=sign*STEP){
        addFrame({x:xpos,y,z}, yawPos);
        addFrame({x:xneg,y,z}, yawNeg);
      }
    }
  });

  /* === Themed Rooms at corridor ends === */
  function roomCenterFromCorr({alongX,sign,startX,startZ}){
    return alongX
      ? {cx: startX + sign*(COR_L + ROOM_W/2), cz: 0, facingYaw: sign>0?180:0}    // E/W
      : {cx: 0, cz: startZ + sign*(COR_L + ROOM_D/2), facingYaw: (sign>0? -90:90)};// S/N
  }

  // Utility to build rectangular room shell
  function buildRoomShell(cx, cz, w, d, h, opts){
    const floor = document.createElement('a-entity');
    floor.classList.add('teleport');
    floor.setAttribute('geometry',`primitive: plane; width:${w}; height:${d}`);
    floor.setAttribute('rotation','-90 0 0'); floor.setAttribute('position',`${cx} 0 ${cz}`);
    floor.setAttribute('material', opts.floorMaterial || 'color:#888');
    floor.addEventListener('loaded', ()=>{
      const mesh = floor.getObject3D('mesh');
      if (mesh && opts.floorMap){ mesh.material.map = opts.floorMap; mesh.material.needsUpdate = true; }
    });
    env.appendChild(floor);

    // 4 walls
    const wallMat = opts.wallMaterial || 'color:#bbb';
    function wall(px,py,pz,wx,hx,dx,rot){
      const p = document.createElement('a-entity');
      p.setAttribute('geometry',`primitive: plane; width:${wx}; height:${hx}`);
      p.setAttribute('position',`${px} ${py} ${pz}`);
      p.setAttribute('rotation',rot);
      p.setAttribute('material',wallMat);
      p.addEventListener('loaded', ()=>{
        const mesh = p.getObject3D('mesh'); if (mesh && opts.wallMap){ mesh.material.map = opts.wallMap; mesh.material.needsUpdate = true; }
        if (mesh && opts.wallOpacity!=null){ mesh.material.transparent = true; mesh.material.opacity = opts.wallOpacity; }
      });
      env.appendChild(p);
    }
    // North & South
    wall(cx, h/2, cz - d/2, w, h, WALL_T, '0 0 0');
    wall(cx, h/2, cz + d/2, w, h, WALL_T, '0 180 0');
    // East & West
    wall(cx + w/2, h/2, cz, d, h, WALL_T, '0 -90 0');
    wall(cx - w/2, h/2, cz, d, h, WALL_T, '0 90 0');

    // ceiling (optional)
    if (opts.ceiling !== false){
      const ceil = document.createElement('a-entity');
      ceil.setAttribute('geometry',`primitive: plane; width:${w}; height:${d}`);
      ceil.setAttribute('rotation','90 0 0'); ceil.setAttribute('position',`${cx} ${h} ${cz}`);
      ceil.setAttribute('material', opts.ceilingMaterial || 'color:#444');
      ceil.addEventListener('loaded', ()=>{
        const mesh = ceil.getObject3D('mesh');
        if (mesh && opts.ceilingMap){ mesh.material.map = opts.ceilingMap; mesh.material.needsUpdate = true; }
      });
      env.appendChild(ceil);
    }

    // lighting
    if (opts.light){
      const L = document.createElement('a-entity');
      L.setAttribute('light', opts.light);
      L.setAttribute('position', `${cx} ${h-0.6} ${cz}`); env.appendChild(L);
    }
    if (opts.extra) opts.extra(cx,cz,w,d,h);
  }

  /* ---- Log Cabin (North) ---- */
  (function(){
    const corr = corZneg; const {cx,cz} = roomCenterFromCorr(corr);
    buildRoomShell(cx, cz, ROOM_W, ROOM_D, ROOM_H, {
      floorMap: stripedWoodTexture('x'),
      ceilingMaterial: 'color:#3a2816',
      wallMap: plankWallTexture(),
      light: 'type: point; intensity: 1.1; distance: 16; color: #ffd39a',
      extra: (cx,cz,w,d,h)=>{
        // fireplace: glowing box + light
        const fp = document.createElement('a-box');
        fp.setAttribute('color','#4b3220'); fp.setAttribute('position',`${cx} 1.0 ${cz - d/2 + 0.45}`);
        fp.setAttribute('width','2.2'); fp.setAttribute('height','1.2'); fp.setAttribute('depth','0.6'); env.appendChild(fp);
        const glow=document.createElement('a-sphere');
        glow.setAttribute('radius','0.18'); glow.setAttribute('position',`${cx} 1.0 ${cz - d/2 + 0.2}`);
        glow.setAttribute('material','emissive:#ffb36b; emissiveIntensity:1.2; color:#ffdb9a'); env.appendChild(glow);
      }
    });
  })();

  /* ---- Starship (East) ---- */
  (function(){
    const corr = corXpos; const {cx,cz} = roomCenterFromCorr(corr);
    buildRoomShell(cx, cz, ROOM_W, ROOM_D, ROOM_H, {
      floorMaterial: 'color:#20262f; metalness:0.6; roughness:0.2',
      wallMap: metalPanelTexture(),
      ceilingMaterial: 'color:#12161c',
      light: 'type: point; intensity: 1.2; distance: 18; color: #a8cfff',
      extra: (cx,cz,w,d,h)=>{
        // emissive strips
        const strip=(x,z,rot)=>{ const s=document.createElement('a-entity');
          s.setAttribute('geometry','primitive: box; width:3.2; height:0.06; depth:0.02');
          s.setAttribute('material','color:#cfe8ff; emissive:#cfe8ff; emissiveIntensity:1.2'); s.setAttribute('rotation',rot);
          s.setAttribute('position',`${x} ${1.2} ${z}`); env.appendChild(s); };
        strip(cx, cz-d/3, '0 0 0'); strip(cx, cz+d/3, '0 0 0');
        // star viewport (simple white dots)
        const view=document.createElement('a-plane');
        view.setAttribute('width','4.5'); view.setAttribute('height','2.2');
        view.setAttribute('position',`${cx + w/2 - 0.01} ${2.4} ${cz}`); view.setAttribute('rotation','0 -90 0');
        view.addEventListener('loaded', ()=>{
          const mesh=view.getObject3D('mesh');
          if (mesh){
            const c=document.createElement('canvas'); c.width=512; c.height=256; const g=c.getContext('2d');
            g.fillStyle='#04070b'; g.fillRect(0,0,512,256);
            for(let i=0;i<300;i++){ g.fillStyle=`rgba(255,255,255,${Math.random()*0.9})`;
              g.fillRect(Math.random()*512,Math.random()*256,1,1); }
            const tex=new THREE.CanvasTexture(c); mesh.material.map=tex; mesh.material.needsUpdate=true;
          }
        });
        env.appendChild(view);
      }
    });
  })();

  /* ---- Jungle (South) ---- */
  (function(){
    const corr = corZpos; const {cx,cz} = roomCenterFromCorr(corr);
    buildRoomShell(cx, cz, ROOM_W, ROOM_D, ROOM_H, {
      floorMap: stripedWoodTexture('x'),
      wallMaterial: 'color:#2a3d2e',
      ceilingMaterial: 'color:#2b2f1a',
      light: 'type: hemisphere; intensity: 0.85; color: #e8ffcf; groundColor:#20361e',
      extra: (cx,cz,w,d,h)=>{
        // sun shafts (cones)
        for(let i=0;i<3;i++){
          const beam=document.createElement('a-cone');
          beam.setAttribute('radius-bottom','1.5'); beam.setAttribute('radius-top','0.1'); beam.setAttribute('height','4.0');
          beam.setAttribute('rotation','-90 0 0');
          beam.setAttribute('material','color:#fff6b8; opacity:0.12; transparent:true');
          beam.setAttribute('position',`${cx - w/4 + i*(w/4)} ${h-0.4} ${cz - d/4 + i*(d/6)}`);
          env.appendChild(beam);
        }
      }
    });
  })();

  /* ---- Ice Vault (West) ---- */
  (function(){
    const corr = corXneg; const {cx,cz} = roomCenterFromCorr(corr);
    buildRoomShell(cx, cz, ROOM_W, ROOM_D, ROOM_H, {
      floorMaterial: 'color:#dff6ff',
      wallMap: frostedTexture(),
      wallOpacity: 0.85,
      ceilingMaterial: 'color:#cfefff',
      light: 'type: point; intensity: 1.0; distance: 16; color: #bfe7ff',
      extra: (cx,cz,w,d,h)=>{
        // faux reflective floor shine strip
        const shine=document.createElement('a-plane');
        shine.setAttribute('width',`${w}`); shine.setAttribute('height',`${d/4}`);
        shine.setAttribute('rotation','-90 0 0'); shine.setAttribute('position',`${cx} 0.01 ${cz+d/8}`);
        shine.setAttribute('material','color:#ffffff; opacity:0.10; transparent:true'); env.appendChild(shine);
      }
    });
  })();

})(); // buildChateau

/* ---------- Minimap (hall + corridors + rooms) ---------- */
(function miniMap(){
  const W = map.width, H = map.height;
  const maxX = (HALL_W/2 + COR_L + ROOM_W/2);
  const maxZ = (HALL_D/2 + COR_L + ROOM_D/2);
  function w2m(x,z){ return {mx: Math.round( W*(x+maxX)/(2*maxX) ), mz: Math.round( H*(z+maxZ)/(2*maxZ) )}; }
  function rect(x1,z1,x2,z2, stroke='#6c7bbf'){
    mctx.strokeStyle=stroke; const a=w2m(x1,z1), b=w2m(x2,z2); mctx.strokeRect(a.mx,a.mz,b.mx-a.mx,b.mz-a.mz);
  }
  function draw(){
    mctx.fillStyle='rgba(0,0,0,0.35)'; mctx.fillRect(0,0,W,H);
    // hall
    rect(-HALL_W/2,-HALL_D/2, HALL_W/2, HALL_D/2);
    // corridors
    rect( HALL_W/2, -COR_W/2,  HALL_W/2+COR_L,  COR_W/2);
    rect(-HALL_W/2-COR_L, -COR_W/2, -HALL_W/2,  COR_W/2);
    rect(-COR_W/2,  HALL_D/2,  COR_W/2,  HALL_D/2+COR_L);
    rect(-COR_W/2, -HALL_D/2-COR_L,  COR_W/2, -HALL_D/2);
    // rooms
    rect( HALL_W/2+COR_L, -ROOM_D/2, HALL_W/2+COR_L+ROOM_W, ROOM_D/2, '#88a0ff'); // E
    rect(-HALL_W/2-COR_L-ROOM_W, -ROOM_D/2, -HALL_W/2-COR_L, ROOM_D/2, '#88a0ff'); // W
    rect(-ROOM_W/2,  HALL_D/2+COR_L, ROOM_W/2, HALL_D/2+COR_L+ROOM_D, '#88a0ff'); // S
    rect(-ROOM_W/2, -HALL_D/2-COR_L-ROOM_D, ROOM_W/2, -HALL_D/2-COR_L, '#88a0ff'); // N

    // player arrow
    const p = rig.object3D.position; const r = camEl.object3D.rotation.y;
    const {mx,my} = {mx:w2m(p.x,p.z).mx, my:w2m(p.x,p.z).mz};
    const len=10;
    mctx.fillStyle='#ffcf6b';
    mctx.beginPath();
    mctx.moveTo(mx + Math.sin(r)*len,  my - Math.cos(r)*len);
    mctx.lineTo(mx + Math.sin(r + 2.5)*8, my - Math.cos(r + 2.5)*8);
    mctx.lineTo(mx + Math.sin(r - 2.5)*8, my - Math.cos(r - 2.5)*8);
    mctx.closePath(); mctx.fill();

    requestAnimationFrame(draw);
  }
  draw();
})();