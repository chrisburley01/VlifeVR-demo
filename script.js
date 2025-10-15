/* =========================================================
   VLife • Chateau Library – script.js (chateau1.3)
   - Main hall: 1m vertical stone panels with trim
   - Frames: correct rotation + 6cm standoff; open link directly
   - No pop-up panel; subtle hover glow on frames
   - Mini-map + tap-to-teleport retained
========================================================= */

/* ---- Teleport behaviour ---- */
const TELEPORT_VIA_GAZE      = false; // tap-only
const TELEPORT_DURATION_MS   = 900;
const TELEPORT_DEADZONE_M    = 0.25;
const TELEPORT_ARM_DELAY_MS  = 1200;

/* ---- Elements / UI ---- */
function toggleHelp(){ document.getElementById('help').classList.toggle('hidden'); }
const scene = document.getElementById('scene');
const env   = document.getElementById('env');
const rig   = document.getElementById('rig');
const camEl = document.getElementById('cam');
const map   = document.getElementById('mapCanvas');
const mctx  = map.getContext('2d');

/* ---- Geometry dims ---- */
const HALL_W = 18, HALL_D = 18, HALL_H = 4.8, WALL_T = 0.06;
const COR_W  = 3.0, COR_H  = HALL_H, COR_L  = 14.0;

/* ---- Links ---- */
const LINKS = [
  { title: 'Grand Canyon 360',   url: 'https://www.youtube.com/watch?v=CSvFpBOe8eY' },
  { title: 'Roller Coaster 360', url: 'https://www.youtube.com/watch?v=VR1b7GdQf2I' },
  { title: 'Cities at Night 360',url: 'https://www.youtube.com/watch?v=v8VrmkG2FvE' },
  { title: 'Ocean Dive 360',     url: 'https://www.youtube.com/watch?v=6B9vLwYxGZ0' },
  { title: 'Space Walk 360',     url: 'https://www.youtube.com/watch?v=0qisGSwZym4' },
  { title: 'Mountain Flight 360',url: 'https://www.youtube.com/watch?v=GoB9aSxUjYw' }
];

/* ---- Utils ---- */
function parseYouTubeId(u){
  try{
    const url = new URL(u);
    if (url.hostname.indexOf('youtu.be')>-1) return url.pathname.slice(1);
    if (url.hostname.indexOf('youtube.com')>-1) return url.searchParams.get('v');
  }catch(e){}
  return null;
}
function ytThumb(u){ const id = parseYouTubeId(u); return id ? ('https://img.youtube.com/vi/'+id+'/hqdefault.jpg') : null; }

/* ---- Adjust gaze (skip floor by default) ---- */
(function adjustGazeRaycaster(){
  const gaze = document.getElementById('gazeCursor');
  if (!gaze) return;
  const objs = TELEPORT_VIA_GAZE ? '.teleport, .interact' : '.interact';
  gaze.setAttribute('raycaster', 'objects:'+objs+'; far:60; interval:0');
})();

/* ---- Teleport (tap-only) ---- */
(function setupTeleport(){
  const lerpMs = TELEPORT_DURATION_MS;
  let armed = false; setTimeout(()=>armed=true, TELEPORT_ARM_DELAY_MS);

  function moveTo(x, z){
    const halfHallX = HALL_W/2 - 0.4;
    const halfHallZ = HALL_D/2 - 0.4;

    let tx=x, tz=z;
    const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
    const inHall = (Math.abs(x)<=halfHallX && Math.abs(z)<=halfHallZ);

    if (inHall) {
      tx = clamp(x, -halfHallX, halfHallX);
      tz = clamp(z, -halfHallZ, halfHallZ);
    } else {
      const inXStrip = (Math.abs(z) <= COR_W/2 - 0.2);
      const inZStrip = (Math.abs(x) <= COR_W/2 - 0.2);
      if (inXStrip) {
        const limitX = halfHallX + COR_L;
        tx = clamp(x, -limitX, limitX);
        tz = clamp(z, -COR_W/2 + 0.2, COR_W/2 - 0.2);
      } else if (inZStrip) {
        const limitZ = halfHallZ + COR_L;
        tz = clamp(z, -limitZ, limitZ);
        tx = clamp(x, -COR_W/2 + 0.2, COR_W/2 - 0.2);
      } else {
        tx = clamp(x, -halfHallX, halfHallX);
        tz = clamp(z, -halfHallZ, halfHallZ);
      }
    }

    const cur = rig.object3D.position;
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
    const target=evt.target;
    if (!armed || !target || !target.classList || !target.classList.contains('teleport')) return;
    const d = evt.detail || {};
    const inter = d.intersection || (d.intersections && d.intersections[0]);
    if (!inter) return;
    moveTo(inter.point.x, inter.point.z);
  });
})();

/* ---------- Build Chateau: panelled main hall + corridors ---------- */
(function buildChateau(){

  /* Lights */
  const hemi = document.createElement('a-entity');
  hemi.setAttribute('light','type: hemisphere; intensity: 0.9; color: #e9f0ff; groundColor:#443333;');
  hemi.setAttribute('position','0 3 0'); env.appendChild(hemi);

  /* === MAIN HALL FLOOR (stone tile texture via canvas) === */
  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = 512; tileCanvas.height = 512;
  const g = tileCanvas.getContext('2d');
  g.fillStyle = '#d8d2c6'; g.fillRect(0,0,512,512);
  const N = 8, s = 512/N;
  for (let i=0;i<N;i++){
    for (let j=0;j<N;j++){
      const shade = 205 + ((i+j)%2 ? -10 : 0);
      g.fillStyle = `rgb(${shade},${shade-6},${shade-12})`;
      g.fillRect(i*s+1, j*s+1, s-2, s-2);
    }
  }
  g.strokeStyle = 'rgba(60,60,60,0.35)';
  for (let k=0;k<=N;k++){ g.beginPath(); g.moveTo(k*s,0); g.lineTo(k*s,512); g.stroke();
                          g.beginPath(); g.moveTo(0,k*s); g.lineTo(512,k*s); g.stroke(); }
  const tex = new THREE.CanvasTexture(tileCanvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(HALL_W/3, HALL_D/3);

  const hallFloor = document.createElement('a-entity');
  hallFloor.classList.add('teleport');
  hallFloor.setAttribute('geometry', `primitive: plane; width:${HALL_W}; height:${HALL_D}`);
  hallFloor.setAttribute('rotation', '-90 0 0');
  hallFloor.setAttribute('material', 'shader: flat; src:'); // placeholder
  hallFloor.addEventListener('loaded', ()=>{
    const mesh = hallFloor.getObject3D('mesh');
    if (mesh) { mesh.material.map = tex; mesh.material.needsUpdate = true; }
  });
  env.appendChild(hallFloor);

  /* === MAIN HALL WALLS: 1m vertical panels === */
  const wallBase = '#cfc8bc';
  const panelA   = '#c8c1b5';
  const panelB   = '#bfb7a9';
  const trim     = '#b3ab9b';

  function addTrimRings(){
    const base = document.createElement('a-box');
    base.setAttribute('position',`0 0.10 0`);
    base.setAttribute('width',`${HALL_W+WALL_T*2}`);
    base.setAttribute('height',`0.12`);
    base.setAttribute('depth',`${HALL_D+WALL_T*2}`);
    base.setAttribute('color', trim);
    env.appendChild(base);

    const corn = base.cloneNode();
    corn.setAttribute('position',`0 ${HALL_H-0.08} 0`);
    env.appendChild(corn);
  }

  function buildPanelWall(side){
    // side: 'N','S','E','W'
    const alongX = (side==='N' || side==='S');
    const width  = alongX ? HALL_W : HALL_D;
    const sign   = (side==='N'||side==='W') ? -1 : 1;
    const wallPos = {
      x: (side==='E' ?  HALL_W/2 : side==='W' ? -HALL_W/2 : 0),
      y: HALL_H/2,
      z: (side==='S' ?  HALL_D/2 : side==='N' ? -HALL_D/2 : 0)
    };

    // base thin wall slab
    const slab = document.createElement('a-box');
    slab.setAttribute('position', `${wallPos.x} ${wallPos.y} ${wallPos.z}`);
    slab.setAttribute('width',  alongX ? `${HALL_W}` : `${WALL_T}`);
    slab.setAttribute('height', `${HALL_H}`);
    slab.setAttribute('depth',  alongX ? `${WALL_T}` : `${HALL_D}`);
    slab.setAttribute('color', wallBase);
    env.appendChild(slab);

    // chair-rail
    const rail = document.createElement('a-box');
    rail.setAttribute('color', trim);
    if (alongX){
      rail.setAttribute('width', `${HALL_W}`);
      rail.setAttribute('height', `0.06`);
      rail.setAttribute('depth', `0.05`);
      rail.setAttribute('position', `0 1.0 ${wallPos.z + sign*(WALL_T/2 + 0.025)}`);
    } else {
      rail.setAttribute('width', `0.05`);
      rail.setAttribute('height', `0.06`);
      rail.setAttribute('depth', `${HALL_D}`);
      rail.setAttribute('position', `${wallPos.x + sign*(WALL_T/2 + 0.025)} 1.0 0`);
    }
    env.appendChild(rail);

    // vertical 1m panels
    const panelW = 1.0, gap = 0.08, panelH = 3.0, panelY = 1.6;
    const count = Math.floor((width - 0.4) / (panelW + gap));
    for (let i=0;i<count;i++){
      const offset = -((count-1)*(panelW+gap))/2 + i*(panelW+gap);
      const pane = document.createElement('a-plane');
      pane.setAttribute('width', `${panelW}`);
      pane.setAttribute('height', `${panelH}`);
      pane.setAttribute('material', `color:${i%2?panelA:panelB}`);
      if (alongX){
        pane.setAttribute('position', `${offset} ${panelY} ${wallPos.z + sign*(WALL_T/2 + 0.006)}`);
        pane.setAttribute('rotation', `0 ${sign>0?180:0} 0`);
      } else {
        pane.setAttribute('position', `${wallPos.x + sign*(WALL_T/2 + 0.006)} ${panelY} ${offset}`);
        pane.setAttribute('rotation', `0 ${side==='E'?-90:90} 0`);
      }
      env.appendChild(pane);
    }
  }

  addTrimRings();
  ['N','S','E','W'].forEach(buildPanelWall);

  // Ceiling (dark timber)
  const ceil=document.createElement('a-plane');
  ceil.setAttribute('rotation','90 0 0'); ceil.setAttribute('position',`0 ${HALL_H} 0`);
  ceil.setAttribute('width',`${HALL_W}`); ceil.setAttribute('height',`${HALL_D}`);
  ceil.setAttribute('material','color:#4d341c'); env.appendChild(ceil);

  // Chandeliers
  function chandelier(x,z){
    const y=HALL_H-0.6;
    const bulb=document.createElement('a-sphere');
    bulb.setAttribute('radius','0.12'); bulb.setAttribute('color','#ffefc0');
    bulb.setAttribute('position',`${x} ${y} ${z}`); bulb.setAttribute('material','emissive:#ffe39a; emissiveIntensity:1.4; roughness:0.2');
    env.appendChild(bulb);
    const l=document.createElement('a-entity');
    l.setAttribute('light','type: point; intensity: 1.0; distance: 16; decay: 1; color: #ffd08a');
    l.setAttribute('position',`${x} ${y} ${z}`); env.appendChild(l);
  }
  chandelier(-3, -3); chandelier(3, -3); chandelier(-3, 3); chandelier(3, 3); chandelier(0,0);

  /* === CORRIDORS === */
  function mkCorridor(axis){
    const grp=document.createElement('a-entity'); env.appendChild(grp);
    const alongX=(axis==='x+'||axis==='x-'); const sign=axis.includes('+')?1:-1;
    const startX=alongX?sign*(HALL_W/2):0; const startZ=alongX?0:sign*(HALL_D/2);

    // wood floor
    const floor=document.createElement('a-entity'); floor.classList.add('teleport');
    if(alongX){
      floor.setAttribute('geometry',`primitive: plane; width:${COR_L}; height:${COR_W}`);
      floor.setAttribute('rotation','-90 0 0'); floor.setAttribute('position',`${startX+sign*(COR_L/2)} 0 0`);
    }else{
      floor.setAttribute('geometry',`primitive: plane; width:${COR_W}; height:${COR_L}`);
      floor.setAttribute('rotation','-90 0 0'); floor.setAttribute('position',`0 0 ${startZ+sign*(COR_L/2)}`);
    }
    floor.setAttribute('material','color:#986135; roughness:0.95'); grp.appendChild(floor);

    // plain stone corridor walls
    const wallTone='#cfc8bc';
    function wall(x,y,z,w,h,d){
      const box=document.createElement('a-box');
      box.setAttribute('position',`${x} ${y} ${z}`); box.setAttribute('width',`${w}`); box.setAttribute('height',`${h}`); box.setAttribute('depth',`${d}`);
      box.setAttribute('color', wallTone); grp.appendChild(box);
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

    // sconces every ~5m
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

  const corridors = [ mkCorridor('x+'), mkCorridor('x-'), mkCorridor('z+'), mkCorridor('z-') ];

  /* === FRAMES (flush, correct yaw, open link directly) === */
  const step = 3.2, margin = 1.6; let linkIdx = 0;
  const OFFSET = 0.06; // standoff from wall

  function addFrame(pos, yawDeg){
    const link = LINKS[linkIdx % LINKS.length]; linkIdx++;

    const frame = document.createElement('a-entity');
    frame.classList.add('interact');

    // wooden frame (bevel)
    const outer = document.createElement('a-plane');
    outer.setAttribute('width','1.68'); outer.setAttribute('height','1.08');
    outer.setAttribute('material','color:#3d2a16'); outer.setAttribute('position','0 0 0');
    frame.appendChild(outer);

    const inner = document.createElement('a-plane');
    inner.setAttribute('width','1.6'); inner.setAttribute('height','1.0');
    inner.setAttribute('material','color:#1d2230'); inner.setAttribute('position','0 0 0.005');
    frame.appendChild(inner);

    const img = document.createElement('a-image');
    img.setAttribute('src', ytThumb(link.url) || '#fallbackPoster');
    img.setAttribute('width','1.52'); img.setAttribute('height','0.92');
    img.setAttribute('position','0 0 0.01');
    frame.appendChild(img);

    const cap = document.createElement('a-entity');
    cap.setAttribute('text', `value:${link.title}; align:center; color:#f5f5f5; width: 2.4; wrapCount: 22; zOffset: 0.01`);
    cap.setAttribute('position', '0 -0.70 0.015'); frame.appendChild(cap);

    // orientation & position
    frame.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
    frame.setAttribute('rotation', `0 ${yawDeg} 0`);

    // subtle hover glow (gaze or mouse)
    frame.addEventListener('mouseenter', ()=> { inner.setAttribute('material','color:#273045'); });
    frame.addEventListener('mouseleave', ()=> { inner.setAttribute('material','color:#1d2230'); });

    // open link directly
    frame.addEventListener('click', ()=> {
      try { window.open(link.url, '_blank'); } catch(e){ location.href = link.url; }
    });

    env.appendChild(frame);
  }

  corridors.forEach(({alongX, sign, startX, startZ})=>{
    const y=1.6;
    if (alongX){
      const zpos =  COR_W/2 + WALL_T/2 + OFFSET; // face -Z
      const zneg = -COR_W/2 - WALL_T/2 - OFFSET; // face +Z
      const yawPos = 180;
      const yawNeg =   0;
      for (let x = startX + sign*margin; Math.abs(x - startX) < COR_L - 0.8; x += sign*step){
        addFrame({x, y, z: zpos}, yawPos);
        addFrame({x, y, z: zneg}, yawNeg);
      }
    } else {
      const xpos =  COR_W/2 + WALL_T/2 + OFFSET; // face -X
      const xneg = -COR_W/2 - WALL_T/2 - OFFSET; // face +X
      const yawPos = -90;
      const yawNeg =  90;
      for (let z = startZ + sign*margin; Math.abs(z - startZ) < COR_L - 0.8; z += sign*step){
        addFrame({x: xpos, y, z}, yawPos);
        addFrame({x: xneg, y, z}, yawNeg);
      }
    }
  });

})(); // buildChateau

/* ---- Mini-map (top-down) ---- */
(function miniMap(){
  const W = map.width, H = map.height;

  function worldToMap(x, z){
    const maxX = (HALL_W/2 + COR_L), maxZ = (HALL_D/2 + COR_L);
    return {
      mx: Math.round( W * (x + maxX) / (2*maxX) ),
      mz: Math.round( H * (z + maxZ) / (2*maxX) )
    };
  }

  function draw(){
    // bg
    mctx.fillStyle = 'rgba(0,0,0,0.35)'; mctx.fillRect(0,0,W,H);

    // hall rectangle
    mctx.strokeStyle = '#6c7bbf'; mctx.lineWidth = 2;
    const hallTL = worldToMap(-HALL_W/2, -HALL_D/2), hallBR = worldToMap(HALL_W/2, HALL_D/2);
    mctx.strokeRect(hallTL.mx, hallTL.mz, hallBR.mx - hallTL.mx, hallBR.mz - hallTL.mz);

    // corridors
    function rect(x1,z1,x2,z2){ const a=worldToMap(x1,z1), b=worldToMap(x2,z2); mctx.strokeRect(a.mx,a.mz,b.mx-a.mx,b.mz-a.mz); }
    rect( HALL_W/2, -COR_W/2,  HALL_W/2+COR_L,  COR_W/2);
    rect(-HALL_W/2-COR_L, -COR_W/2, -HALL_W/2,  COR_W/2);
    rect(-COR_W/2,  HALL_D/2,  COR_W/2,  HALL_D/2+COR_L);
    rect(-COR_W/2, -HALL_D/2-COR_L,  COR_W/2, -HALL_D/2);

    // player arrow
    const p = rig.object3D.position;
    const r = camEl.object3D.rotation.y;
    const {mx,my} = {mx:worldToMap(p.x,p.z).mx, my:worldToMap(p.x,p.z).mz};
    const len = 10;

    mctx.fillStyle = '#ffcf6b';
    mctx.beginPath();
    mctx.moveTo(mx + Math.sin(r)*len,  my - Math.cos(r)*len);
    mctx.lineTo(mx + Math.sin(r + 2.5)*8, my - Math.cos(r + 2.5)*8);
    mctx.lineTo(mx + Math.sin(r - 2.5)*8, my - Math.cos(r - 2.5)*8);
    mctx.closePath(); mctx.fill();

    requestAnimationFrame(draw);
  }
  draw();
})();