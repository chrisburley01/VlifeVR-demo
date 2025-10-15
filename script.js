/* =========================================================
   VLife • Chateau Library – script.js (chateau1)
   - Big hall + 4 corridors (triple size)
   - Chateau style: stone walls, wood floors, sconces, chandeliers
   - Posters fixed to face the corridor (rotation bug fixed)
   - Tap-to-teleport (slow glide, deadzone, arm delay)
   - Mini-map overlay (top-down plan with player arrow)
   - Door panel previews (YouTube thumbnails) with Open button
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
function worldPosOf(el, lift=1.35){ const v = new THREE.Vector3(); el.object3D.getWorldPosition(v); v.y += lift; return v; }

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
    if (!armed) return;
    const target=evt.target;
    if (!target || !target.classList || !target.classList.contains('teleport')) return;
    const d = evt.detail || {};
    const inter = d.intersection || (d.intersections && d.intersections[0]);
    if (!inter) return;
    moveTo(inter.point.x, inter.point.z);
  });
})();

/* ---- Door panel ---- */
function spawnDoorPanel(worldPos, title, url, imgSrc){
  const W=3.2,H=1.8,headerH=0.16;
  const root=document.createElement('a-entity');
  root.setAttribute('position', `${worldPos.x} ${worldPos.y} ${worldPos.z}`);
  root.setAttribute('billboard',''); scene.appendChild(root);

  const back=document.createElement('a-entity');
  back.setAttribute('geometry',`primitive: plane; width:${W}; height:${H}`);
  back.setAttribute('material','color:#000; opacity:0.9; transparent:true'); back.setAttribute('position','0 0 0.002');
  root.appendChild(back);

  const header=document.createElement('a-entity');
  header.setAttribute('geometry',`primitive: plane; width:${W}; height:${headerH}`);
  header.setAttribute('material','color:#ffcf6b; opacity:0.98'); header.setAttribute('position',`0 ${H/2-headerH/2} 0.01`);
  root.appendChild(header);

  const t=document.createElement('a-entity');
  t.setAttribute('text',`value:${title}; align:center; color:#2b1a08; width:5; zOffset:0.01`);
  t.setAttribute('position',`0 ${H/2-headerH/2} 0.02`); root.appendChild(t);

  const urlTxt=document.createElement('a-entity');
  urlTxt.setAttribute('text',`value:${url}; align:center; color:#fff; width:4.8; wrapCount:68; zOffset:0.01`);
  urlTxt.setAttribute('position',`0 ${H/2-headerH-0.10} 0.02`); root.appendChild(urlTxt);

  if (imgSrc){
    const img=document.createElement('a-image');
    img.setAttribute('src',imgSrc); img.setAttribute('width',W-0.36); img.setAttribute('height',H-headerH-0.56);
    img.setAttribute('position','0 0.05 0.025');
    img.setAttribute('animation__zoom','property: scale; dir: alternate; from:1 1 1; to:1.05 1.05 1; dur:2600; easing:easeInOutSine; loop:true');
    root.appendChild(img);
  } else {
    const ph=document.createElement('a-entity');
    ph.setAttribute('geometry',`primitive: plane; width:${W-0.36}; height:${H-headerH-0.56}`);
    ph.setAttribute('material','color:#1c2a4b; opacity:0.92; transparent:true'); ph.setAttribute('position','0 0.05 0.025');
    root.appendChild(ph);
  }

  const openBtn=document.createElement('a-entity');
  openBtn.setAttribute('class','interact');
  openBtn.setAttribute('geometry','primitive: plane; width:1.10; height:0.28');
  openBtn.setAttribute('material','color:#1f3560; opacity:0.96'); openBtn.setAttribute('position',`0 ${-H/2+0.22} 0.03`);
  const label=document.createElement('a-entity');
  label.setAttribute('text','value:Open; align:center; color:#fff; width:1.8; zOffset:0.01'); label.setAttribute('position','0 0 0.01');
  openBtn.appendChild(label); openBtn.addEventListener('click',()=>{try{window.open(url,'_blank');}catch(e){location.href=url;}});
  root.appendChild(openBtn);

  const closeBtn=document.createElement('a-entity');
  closeBtn.setAttribute('class','interact'); closeBtn.setAttribute('geometry','primitive: plane; width:0.20; height:0.20');
  closeBtn.setAttribute('material','color:#000; opacity:0.001; transparent:true'); closeBtn.setAttribute('position',`${W/2-0.14} ${H/2-0.14} 0.04`);
  const glyph=document.createElement('a-entity');
  glyph.setAttribute('text','value:✕; align:center; color:#fff; width:2; zOffset:0.01'); glyph.setAttribute('position','0 0 0.01');
  closeBtn.appendChild(glyph); root.appendChild(closeBtn);

  function destroy(){ try{ root.parentNode.removeChild(root); }catch(e){} }
  const auto=setTimeout(destroy,8000); let armed=false; setTimeout(()=>armed=true,300);
  let look=setTimeout(()=>{},999999); const cancel=()=>armed&&clearTimeout(look); const rearm=()=>{if(!armed)return;clearTimeout(look);look=setTimeout(destroy,1200);};
  root.addEventListener('mouseenter',cancel); root.addEventListener('mouseleave',rearm);
  closeBtn.addEventListener('click',()=>{clearTimeout(auto);destroy();});
  return root;
}

/* ---- Build the chateau: hall, corridors, sconces, chandeliers, frames ---- */
(function buildChateau(){
  // Lighting: hemisphere + warm chandeliers + sconces
  const hemi = document.createElement('a-entity');
  hemi.setAttribute('light','type: hemisphere; intensity: 0.9; color: #dfe8ff; groundColor:#433;');
  hemi.setAttribute('position','0 3 0'); env.appendChild(hemi);

  // Hall floor (wood) + walls (stone)
  const floorHall=document.createElement('a-entity');
  floorHall.classList.add('teleport');
  floorHall.setAttribute('geometry',`primitive: plane; width:${HALL_W}; height:${HALL_D}`);
  floorHall.setAttribute('material','src:#texWood; repeat:6 6; color:#a06d3b; metalness:0.1; roughness:0.9');
  floorHall.setAttribute('rotation','-90 0 0'); env.appendChild(floorHall);

  const wallColor='#b5b1a6';
  function mkWall(x,y,z,w,h,d){
    const wall=document.createElement('a-box');
    wall.setAttribute('position',`${x} ${y} ${z}`);
    wall.setAttribute('width',`${w}`); wall.setAttribute('height',`${h}`); wall.setAttribute('depth',`${d}`);
    wall.setAttribute('material','src:#texStone; repeat:4 1; color:#bfbab0; metalness:0.05; roughness:1');
    env.appendChild(wall);
  }
  mkWall(0, HALL_H/2, -HALL_D/2, HALL_W, HALL_H, WALL_T);
  mkWall(0, HALL_H/2,  HALL_D/2, HALL_W, HALL_H, WALL_T);
  mkWall( HALL_W/2, HALL_H/2, 0, WALL_T, HALL_H, HALL_D);
  mkWall(-HALL_W/2, HALL_H/2, 0, WALL_T, HALL_H, HALL_D);

  // Ceiling (dark timber)
  const ceil=document.createElement('a-plane');
  ceil.setAttribute('rotation','90 0 0'); ceil.setAttribute('position',`0 ${HALL_H} 0`);
  ceil.setAttribute('width',`${HALL_W}`); ceil.setAttribute('height',`${HALL_D}`);
  ceil.setAttribute('material','src:#texWood; repeat:5 5; color:#5a3b1d; metalness:0; roughness:1'); env.appendChild(ceil);

  // Chandeliers (simple spheres + warm lights)
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

  // Corridors (stone + wood floors)
  function mkCorridor(axis){
    const grp=document.createElement('a-entity'); env.appendChild(grp);
    const alongX=(axis==='x+'||axis==='x-'); const sign=axis.includes('+')?1:-1;
    const startX=alongX?sign*(HALL_W/2):0; const startZ=alongX?0:sign*(HALL_D/2);

    const floor=document.createElement('a-entity'); floor.classList.add('teleport');
    if(alongX){
      floor.setAttribute('geometry',`primitive: plane; width:${COR_L}; height:${COR_W}`);
      floor.setAttribute('rotation','-90 0 0'); floor.setAttribute('position',`${startX+sign*(COR_L/2)} 0 0`);
    }else{
      floor.setAttribute('geometry',`primitive: plane; width:${COR_W}; height:${COR_L}`);
      floor.setAttribute('rotation','-90 0 0'); floor.setAttribute('position',`0 0 ${startZ+sign*(COR_L/2)}`);
    }
    floor.setAttribute('material','src:#texWood; repeat:8 1; color:#996636; metalness:0.1; roughness:0.9'); grp.appendChild(floor);

    function wall(x,y,z,w,h,d){
      const box=document.createElement('a-box');
      box.setAttribute('position',`${x} ${y} ${z}`); box.setAttribute('width',`${w}`); box.setAttribute('height',`${h}`); box.setAttribute('depth',`${d}`);
      box.setAttribute('material','src:#texStone; repeat:8 1; color:#c7c1b5; metalness:0.05; roughness:1'); grp.appendChild(box);
    }
    if(alongX){
      const zA =  COR_W/2 + WALL_T/2, zB = -COR_W/2 - WALL_T/2;
      wall(startX + sign*(COR_L/2), COR_H/2, zA, COR_L, COR_H, WALL_T);
      wall(startX + sign*(COR_L/2), COR_H/2, zB, COR_L, COR_H, WALL_T);
    }else{
      const xA =  COR_W/2 + WALL_T/2, xB = -COR_W/2 - WALL_T/2;
      wall(xA, COR_H/2, startZ + sign*(COR_L/2), WALL_T, COR_H, COR_L);
      wall(xB, COR_H/2, startZ + sign*(COR_L/2), WALL_T, COR_H, COR_L);
    }

    // Sconces every ~5m
    const step=5;
    if(alongX){
      for(let x = startX+sign*2.0; Math.abs(x-startX)<COR_L-1.5; x+=sign*step){
        sconce(x, 2.0,  COR_W/2 + WALL_T/2 + 0.01, 180); // faces -z
        sconce(x, 2.0, -COR_W/2 - WALL_T/2 - 0.01,   0); // faces +z
      }
    }else{
      for(let z = startZ+sign*2.0; Math.abs(z-startZ)<COR_L-1.5; z+=sign*step){
        sconce( COR_W/2 + WALL_T/2 + 0.01, 2.0, z, -90); // faces -x
        sconce(-COR_W/2 - WALL_T/2 - 0.01, 2.0, z,  90); // faces +x
      }
    }

    return {alongX, sign, startX, startZ};
  }

  // Sconce = small emissive disk + point light
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

  // Frames along corridor walls  ——— FIXED ROTATION
  // Planes face +Z by default. We rotate so they face INTO the corridor:
  //  • For walls at z>0  → face -Z → yaw = 180
  //  • For walls at z<0  → face +Z → yaw =   0
  //  • For walls at x>0  → face -X → yaw = -90
  //  • For walls at x<0  → face +X → yaw =  90
  const step = 3.2, margin = 1.6; let linkIdx = 0;

  function addFrame(pos, yawDeg){
    const link = LINKS[linkIdx % LINKS.length]; linkIdx++;

    const frame = document.createElement('a-plane');
    frame.classList.add('interact','poster');
    frame.setAttribute('width','1.6'); frame.setAttribute('height','1.0');
    frame.setAttribute('material','color:#1d2230; metalness:0.2; roughness:0.8');
    frame.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
    frame.setAttribute('rotation', `0 ${yawDeg} 0`);

    const thumb = ytThumb(link.url);
    const img = document.createElement('a-image');
    img.setAttribute('src', thumb || '#fallbackPoster');
    img.setAttribute('width','1.52'); img.setAttribute('height','0.92');
    img.setAttribute('position','0 0 0.01');
    frame.appendChild(img);

    const cap = document.createElement('a-entity');
    cap.setAttribute('text', `value:${link.title}; align:center; color:#f5f5f5; width: 2.4; wrapCount: 22; zOffset: 0.01`);
    cap.setAttribute('position', '0 -0.68 0.02'); frame.appendChild(cap);

    frame.addEventListener('click', ()=>{
      const p = worldPosOf(frame, 1.0);
      spawnDoorPanel(p, link.title, link.url, thumb);
    });

    env.appendChild(frame);
  }

  corridors.forEach(({alongX, sign, startX, startZ})=>{
    const y=1.6;
    if (alongX){
      // walls at z = ±
      const zpos =  COR_W/2 + WALL_T/2;
      const zneg = -COR_W/2 - WALL_T/2;
      const yawPos = 180;  // z>0 → face -Z
      const yawNeg =   0;  // z<0 → face +Z
      for (let x = startX + sign*margin; Math.abs(x - startX) < COR_L - 0.8; x += sign*step){
        addFrame({x, y, z: zpos}, yawPos);
        addFrame({x, y, z: zneg}, yawNeg);
      }
    } else {
      // walls at x = ±
      const xpos =  COR_W/2 + WALL_T/2;
      const xneg = -COR_W/2 - WALL_T/2;
      const yawPos = -90; // x>0 → face -X
      const yawNeg =  90; // x<0 → face +X
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
    // Scale world (hall+corridors) into map
    const maxX = (HALL_W/2 + COR_L), maxZ = (HALL_D/2 + COR_L);
    return {
      mx: Math.round( W * (x + maxX) / (2*maxX) ),
      mz: Math.round( H * (z + maxZ) / (2*maxZ) )
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
    // +X / -X
    rect( HALL_W/2, -COR_W/2,  HALL_W/2+COR_L,  COR_W/2);
    rect(-HALL_W/2-COR_L, -COR_W/2, -HALL_W/2,  COR_W/2);
    // +Z / -Z
    rect(-COR_W/2,  HALL_D/2,  COR_W/2,  HALL_D/2+COR_L);
    rect(-COR_W/2, -HALL_D/2-COR_L,  COR_W/2, -HALL_D/2);

    // player arrow
    const p = rig.object3D.position;
    const r = camEl.object3D.rotation.y; // yaw in radians
    const {mx,my} = {mx:worldToMap(p.x,p.z).mx, my:worldToMap(p.x,p.z).mz};
    const len = 10;

    mctx.fillStyle = '#ffcf6b';
    mctx.beginPath();
    // triangle pointing forward
    mctx.moveTo(mx + Math.sin(r)*len,  my - Math.cos(r)*len);
    mctx.lineTo(mx + Math.sin(r + 2.5)*8, my - Math.cos(r + 2.5)*8);
    mctx.lineTo(mx + Math.sin(r - 2.5)*8, my - Math.cos(r - 2.5)*8);
    mctx.closePath(); mctx.fill();

    requestAnimationFrame(draw);
  }
  draw();
})();