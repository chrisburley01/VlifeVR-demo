/* =========================================================
   VLife • Library – script.js (lib1)
   - Triple-size hall (18×18 m) + long corridors
   - Smooth teleport on floor
   - Gallery frames on corridor walls (interactive)
   - Hinged door panel with YouTube thumbnail preview
   - Auto-close (8s) + look-away (1.2s)
========================================================= */

/* ---------- UI helpers ---------- */
function toggleHelp(){ document.getElementById('help').classList.toggle('hidden'); }

/* ---------- Elements ---------- */
const scene = document.getElementById('scene');
const env   = document.getElementById('env');
const rig   = document.getElementById('rig');

/* ---------- Dimensions (triple the room) ---------- */
const HALL_W = 18;   // X size (was 6)
const HALL_D = 18;   // Z size (was 6)
const HALL_H = 4.5;  // height (scaled up)
const WALL_T = 0.06; // wall thickness

// Corridors: width and length
const COR_W  = 3.0;   // clear width
const COR_H  = HALL_H;
const COR_L  = 14.0;  // each direction length from hall edge

/* ---------- Content data: wall links (YouTube for working thumbs) ---------- */
const LINKS = [
  { title: 'Grand Canyon 360',   url: 'https://www.youtube.com/watch?v=CSvFpBOe8eY' },
  { title: 'Roller Coaster 360', url: 'https://www.youtube.com/watch?v=VR1b7GdQf2I' },
  { title: 'Cities at Night 360',url: 'https://www.youtube.com/watch?v=v8VrmkG2FvE' },
  { title: 'Ocean Dive 360',     url: 'https://www.youtube.com/watch?v=6B9vLwYxGZ0' },
  { title: 'Space Walk 360',     url: 'https://www.youtube.com/watch?v=0qisGSwZym4' },
  { title: 'Mountain Flight 360',url: 'https://www.youtube.com/watch?v=GoB9aSxUjYw' },
  // add more freely – the generator will place them along the walls
];

/* ---------- Utilities ---------- */
function parseYouTubeId(u){
  try{
    const url = new URL(u);
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1);
    if (url.hostname.includes('youtube.com')) return url.searchParams.get('v');
  }catch(_){}
  return null;
}
function ytThumb(u){ const id = parseYouTubeId(u); return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null; }

function worldPosOf(el, lift=1.35){
  const v = new THREE.Vector3();
  el.object3D.getWorldPosition(v);
  v.y += lift;
  return v;
}

/* ---------- Smooth teleport on any .teleport floor ---------- */
(function setupTeleport(){
  const lerpMs = 320;

  function moveTo(x, z){
    // clamp within large bounds (hall + corridors)
    const halfHallX = HALL_W/2 - 0.4;
    const halfHallZ = HALL_D/2 - 0.4;
    const corridorReach = COR_L + 0.5;

    // Allow movement within a bounding plus shape:
    // If |x| <= halfHallX and |z| <= halfHallZ -> inside hall.
    // Else if in a corridor strip, allow extending beyond hall in ±X/±Z.
    let tx = x, tz = z;

    function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

    const inHall = (Math.abs(x) <= halfHallX && Math.abs(z) <= halfHallZ);

    if (inHall) {
      tx = clamp(x, -halfHallX, halfHallX);
      tz = clamp(z, -halfHallZ, halfHallZ);
    } else {
      // Corridors along +X / -X
      const inXStrip = (Math.abs(z) <= COR_W/2 - 0.2);
      const inZStrip = (Math.abs(x) <= COR_W/2 - 0.2);

      if (inXStrip) {
        // extend X out to hall edge + corridor length
        const limitX = halfHallX + COR_L;
        tx = clamp(x, -limitX, limitX);
        tz = clamp(z, -COR_W/2 + 0.2, COR_W/2 - 0.2);
      } else if (inZStrip) {
        // extend Z out to hall edge + corridor length
        const limitZ = halfHallZ + COR_L;
        tz = clamp(z, -limitZ, limitZ);
        tx = clamp(x, -COR_W/2 + 0.2, COR_W/2 - 0.2);
      } else {
        // outside strips: snap back toward nearest allowed area
        tx = clamp(x, -halfHallX, halfHallX);
        tz = clamp(z, -halfHallZ, halfHallZ);
      }
    }

    const start = rig.object3D.position.clone();
    const end   = new THREE.Vector3(tx, start.y, tz);
    const t0 = performance.now();

    function step(){
      const t = (performance.now() - t0) / lerpMs;
      const k = t >= 1 ? 1 : (1 - Math.cos(Math.min(1,t)*Math.PI)) / 2; // ease-in-out
      const p = start.clone().lerp(end, k);
      rig.object3D.position.copy(p);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  env.addEventListener('click', (evt)=>{
    // only respond if hit a .teleport surface
    const target = evt.target;
    if (!target.classList.contains('teleport')) return;
    const intersection = evt.detail?.intersection || evt.detail?.intersections?.[0];
    if (!intersection) return;
    moveTo(intersection.point.x, intersection.point.z);
  });
})();

/* ---------- Door panel (centered, billboard, auto-close) ---------- */
function spawnDoorPanel(worldPos, title, url, imgSrc){
  const W=3.2, H=1.8, headerH=0.16;

  // root that always faces camera
  const root = document.createElement('a-entity');
  root.setAttribute('position', `${worldPos.x} ${worldPos.y} ${worldPos.z}`);
  root.setAttribute('billboard','');
  scene.appendChild(root);

  // backing
  const back = document.createElement('a-entity');
  back.setAttribute('geometry', `primitive: plane; width:${W}; height:${H}`);
  back.setAttribute('material', 'color:#000; opacity:0.9; transparent:true');
  back.setAttribute('position', '0 0 0.002');
  root.appendChild(back);

  // header
  const header = document.createElement('a-entity');
  header.setAttribute('geometry', `primitive: plane; width:${W}; height:${headerH}`);
  header.setAttribute('material', 'color:#ffd100; opacity:0.98');
  header.setAttribute('position', `0 ${H/2 - headerH/2} 0.01`);
  root.appendChild(header);

  const t = document.createElement('a-entity');
  t.setAttribute('text', `value:${title}; align:center; color:#111; width:5; zOffset:0.01`);
  t.setAttribute('position', `0 ${H/2 - headerH/2} 0.02`);
  root.appendChild(t);

  const urlTxt = document.createElement('a-entity');
  urlTxt.setAttribute('text', `value:${url}; align:center; color:#fff; width:4.8; wrapCount:68; zOffset:0.01`);
  urlTxt.setAttribute('position', `0 ${H/2 - headerH - 0.10} 0.02`);
  root.appendChild(urlTxt);

  if (imgSrc){
    const img = document.createElement('a-image');
    img.setAttribute('src', imgSrc);
    img.setAttribute('width', W - 0.36);
    img.setAttribute('height', H - headerH - 0.56);
    img.setAttribute('position', `0 0.05 0.025`);
    img.setAttribute('animation__zoom', 'property: scale; dir: alternate; from: 1 1 1; to: 1.05 1.05 1; dur: 2600; easing: easeInOutSine; loop:true');
    root.appendChild(img);
  } else {
    const ph = document.createElement('a-entity');
    ph.setAttribute('geometry', `primitive: plane; width:${W - 0.36}; height:${H - headerH - 0.56}`);
    ph.setAttribute('material', 'color:#0b1a3a; opacity:0.92; transparent:true');
    ph.setAttribute('position', `0 0.05 0.025`);
    root.appendChild(ph);
  }

  const openBtn = document.createElement('a-entity');
  openBtn.setAttribute('class','interact');
  openBtn.setAttribute('geometry','primitive: plane; width:1.10; height:0.28');
  openBtn.setAttribute('material','color:#0f2353; opacity:0.96');
  openBtn.setAttribute('position', `0 ${-H/2 + 0.22} 0.03`);
  const label = document.createElement('a-entity');
  label.setAttribute('text','value:Open; align:center; color:#fff; width:1.8; zOffset:0.01');
  label.setAttribute('position','0 0 0.01');
  openBtn.appendChild(label);
  openBtn.addEventListener('click', () => { try{ window.open(url, '_blank'); } catch(e){ location.href = url; } });
  root.appendChild(openBtn);

  const closeBtn = document.createElement('a-entity');
  closeBtn.setAttribute('class','interact');
  closeBtn.setAttribute('geometry','primitive: plane; width:0.20; height:0.20');
  closeBtn.setAttribute('material','color:#000; opacity:0.001; transparent:true');
  closeBtn.setAttribute('position', `${W/2 - 0.14} ${H/2 - 0.14} 0.04`);
  const glyph = document.createElement('a-entity');
  glyph.setAttribute('text','value:✕; align:center; color:#fff; width:2; zOffset:0.01');
  glyph.setAttribute('position','0 0 0.01');
  closeBtn.appendChild(glyph);
  root.appendChild(closeBtn);

  const destroy = () => { try{ root.parentNode.removeChild(root); }catch(e){} };
  const auto = setTimeout(destroy, 8000);
  let armed = false; setTimeout(()=>armed=true, 300);
  let look = setTimeout(()=>{}, 999999);
  const cancel = ()=> armed && clearTimeout(look);
  const rearm  = ()=> { if (!armed) return; clearTimeout(look); look = setTimeout(destroy, 1200); };
  root.addEventListener('mouseenter', cancel);
  root.addEventListener('mouseleave', rearm);
  closeBtn.addEventListener('click', () => { clearTimeout(auto); destroy(); });

  return root;
}

/* ---------- Build geometry: big hall + 4 corridors + gallery frames ---------- */
(function buildLibrary(){
  // Lighting
  const amb = document.createElement('a-entity');
  amb.setAttribute('light','type: ambient; intensity: 0.55; color: #fff');
  env.appendChild(amb);
  const dir = document.createElement('a-entity');
  dir.setAttribute('light','type: directional; intensity: 0.8; castShadow: true');
  dir.setAttribute('position','3 6 2');
  env.appendChild(dir);

  // --- Hall: floor + perimeter walls + ceiling trim
  const floorHall = document.createElement('a-entity');
  floorHall.classList.add('teleport');
  floorHall.setAttribute('geometry', `primitive: plane; width: ${HALL_W}; height: ${HALL_D}`);
  floorHall.setAttribute('material', 'color: #1b1d24; metalness: 0.1; roughness: 0.9');
  floorHall.setAttribute('rotation','-90 0 0');
  env.appendChild(floorHall);

  // Walls (N,S,E,W)
  const wallColor = '#0e111a';
  function mkWall(x,y,z, w,h,d,rot){
    const wall = document.createElement('a-box');
    wall.setAttribute('color', wallColor);
    wall.setAttribute('position', `${x} ${y} ${z}`);
    wall.setAttribute('width',  `${w}`);
    wall.setAttribute('height', `${h}`);
    wall.setAttribute('depth',  `${d}`);
    if (rot) wall.setAttribute('rotation', rot);
    env.appendChild(wall);
  }
  // North & South
  mkWall(0, HALL_H/2, -HALL_D/2, HALL_W, HALL_H, WALL_T);
  mkWall(0, HALL_H/2,  HALL_D/2, HALL_W, HALL_H, WALL_T);
  // East & West
  mkWall( HALL_W/2, HALL_H/2, 0, WALL_T, HALL_H, HALL_D);
  mkWall(-HALL_W/2, HALL_H/2, 0, WALL_T, HALL_H, HALL_D);

  // Ceiling
  const ceil = document.createElement('a-plane');
  ceil.setAttribute('rotation','90 0 0');
  ceil.setAttribute('position', `0 ${HALL_H} 0`);
  ceil.setAttribute('width', `${HALL_W}`);
  ceil.setAttribute('height', `${HALL_D}`);
  ceil.setAttribute('material','color:#141824; metalness:0; roughness:1');
  env.appendChild(ceil);

  // Rug / feature in center
  const rug = document.createElement('a-ring');
  rug.setAttribute('position','0 0.01 0');
  rug.setAttribute('rotation','-90 0 0');
  rug.setAttribute('radius-inner','1.1');
  rug.setAttribute('radius-outer','2.0');
  rug.setAttribute('material','color:#253048; opacity:0.85; transparent:true');
  env.appendChild(rug);

  // --- Corridors (+X, -X, +Z, -Z)
  function mkCorridor(dirAxis){
    const grp = document.createElement('a-entity');
    env.appendChild(grp);

    const alongX = dirAxis === 'x+' || dirAxis === 'x-';
    const sign = (dirAxis.endsWith('+') ? 1 : -1);

    // Starting edge of hall along that axis
    const startX = alongX ? sign * (HALL_W/2) : 0;
    const startZ = alongX ? 0 : sign * (HALL_D/2);

    // Floor strip
    const floor = document.createElement('a-entity');
    floor.classList.add('teleport');
    if (alongX){
      floor.setAttribute('geometry', `primitive: plane; width: ${COR_L}; height: ${COR_W}`);
      floor.setAttribute('rotation','-90 0 0');
      floor.setAttribute('position', `${startX + sign*(COR_L/2)} 0 ${0}`);
    } else {
      floor.setAttribute('geometry', `primitive: plane; width: ${COR_W}; height: ${COR_L}`);
      floor.setAttribute('rotation','-90 0 0');
      floor.setAttribute('position', `${0} 0 ${startZ + sign*(COR_L/2)}`);
    }
    floor.setAttribute('material','color:#1b1d24; metalness:0.1; roughness:0.9');
    grp.appendChild(floor);

    // Side walls
    function mkStripWall(x,y,z, w,h,d){
      const wall = document.createElement('a-box');
      wall.setAttribute('color', wallColor);
      wall.setAttribute('position', `${x} ${y} ${z}`);
      wall.setAttribute('width',  `${w}`);
      wall.setAttribute('height', `${h}`);
      wall.setAttribute('depth',  `${d}`);
      grp.appendChild(wall);
    }

    if (alongX){
      // walls at z = ± COR_W/2
      const zA = COR_W/2, zB = -COR_W/2;
      // long thin boxes
      mkStripWall(startX + sign*(COR_L/2), COR_H/2, zA, COR_L, COR_H, WALL_T);
      mkStripWall(startX + sign*(COR_L/2), COR_H/2, zB, COR_L, COR_H, WALL_T);
    } else {
      const xA = COR_W/2, xB = -COR_W/2;
      mkStripWall(xA, COR_H/2, startZ + sign*(COR_L/2), WALL_T, COR_H, COR_L);
      mkStripWall(xB, COR_H/2, startZ + sign*(COR_L/2), WALL_T, COR_H, COR_L);
    }

    return {grp, alongX, sign, startX, startZ};
  }

  const corridors = [
    mkCorridor('x+'),
    mkCorridor('x-'),
    mkCorridor('z+'),
    mkCorridor('z-'),
  ];

  // --- Gallery frames along corridor walls ---
  // Even spacing every ~3m, starting a little out from the hall edge.
  const step = 3.2;
  const margin = 1.6;
  let linkIdx = 0;

  function addFrame(pos, yawDeg){
    const link = LINKS[linkIdx % LINKS.length];
    linkIdx++;

    const frame = document.createElement('a-plane');
    frame.classList.add('interact','poster');
    frame.setAttribute('width','1.6');
    frame.setAttribute('height','1.0');
    frame.setAttribute('material','color:#111; metalness:0.2; roughness:0.8');
    frame.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
    frame.setAttribute('rotation', `0 ${yawDeg} 0`);
    frame.setAttribute('data-title', link.title);
    frame.setAttribute('data-url',   link.url);

    // add a visible image child (thumb if available)
    const thumb = ytThumb(link.url);
    const img = document.createElement('a-image');
    img.setAttribute('src', thumb || '#fallbackPoster');
    img.setAttribute('width','1.52');
    img.setAttribute('height','0.92');
    img.setAttribute('position','0 0 0.01');
    frame.appendChild(img);

    // tiny caption strip under the image
    const cap = document.createElement('a-entity');
    cap.setAttribute('text', `value:${link.title}; align:center; color:#eee; width: 2.4; wrapCount: 22; zOffset: 0.01`);
    cap.setAttribute('position', `0 -0.68 0.02`);
    frame.appendChild(cap);

    // click opens door panel
    frame.addEventListener('click', ()=>{
      const p = worldPosOf(frame, 1.0);
      spawnDoorPanel(p, link.title, link.url, thumb);
    });

    env.appendChild(frame);
  }

  corridors.forEach(({alongX, sign, startX, startZ})=>{
    const halfH = HALL_H * 0.5;
    const y = 1.6; // hang height

    if (alongX){
      const wallZs = [COR_W/2 + WALL_T/2, -COR_W/2 - WALL_T/2];
      wallZs.forEach((z, sideIdx)=>{
        const yaw = (z > 0) ? 90 : -90; // face inward across corridor
        const dir = sign; // +X or -X
        const baseX = startX + sign*margin;
        const maxX  = startX + sign*COR_L;
        for (let x = baseX; Math.abs(x - startX) < COR_L - 0.8; x += sign*step) {
          addFrame({x, y, z}, yaw);
        }
      });
    } else {
      const wallXs = [COR_W/2 + WALL_T/2, -COR_W/2 - WALL_T/2];
      wallXs.forEach((x, sideIdx)=>{
        const yaw = (x > 0) ? 0 : 180; // face inward across corridor
        const dir = sign; // +Z or -Z
        const baseZ = startZ + sign*margin;
        const maxZ  = startZ + sign*COR_L;
        for (let z = baseZ; Math.abs(z - startZ) < COR_L - 0.8; z += sign*step) {
          addFrame({x, y, z}, yaw);
        }
      });
    }
  });

})(); // end buildLibrary