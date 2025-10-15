/* =========================================================
   VLife • Library – script.js (lib1.2)
   - Triple-size hall + corridors
   - Smooth teleport (tap-only by default)
   - Gaze/tap posters → door panel with YouTube thumbnails
   - Brighter lighting & safe JS for mobile
========================================================= */

/* ---------- Teleport behaviour (tweak here) ---------- */
const TELEPORT_VIA_GAZE      = false; // tap-only by default
const TELEPORT_DURATION_MS   = 900;   // slower glide
const TELEPORT_DEADZONE_M    = 0.25;  // ignore tiny moves
const TELEPORT_ARM_DELAY_MS  = 1200;  // prevent accidental first move

/* ---------- Elements & UI ---------- */
function toggleHelp(){ document.getElementById('help').classList.toggle('hidden'); }
var scene = document.getElementById('scene');
var env   = document.getElementById('env');
var rig   = document.getElementById('rig');

/* Adjust gaze raycaster to avoid floor teleport targets unless enabled */
(function adjustGazeRaycaster(){
  var gaze = document.getElementById('gazeCursor');
  if (!gaze) return;
  var objs = TELEPORT_VIA_GAZE ? '.teleport, .interact' : '.interact';
  gaze.setAttribute('raycaster', 'objects: '+objs+'; far: 60; interval: 0');
})();

/* ---------- Dimensions (triple room) ---------- */
var HALL_W = 18, HALL_D = 18, HALL_H = 4.5, WALL_T = 0.06;
var COR_W  = 3.0, COR_H  = HALL_H, COR_L  = 14.0;

/* ---------- Links (YouTube = guaranteed thumbnail) ---------- */
var LINKS = [
  { title: 'Grand Canyon 360',   url: 'https://www.youtube.com/watch?v=CSvFpBOe8eY' },
  { title: 'Roller Coaster 360', url: 'https://www.youtube.com/watch?v=VR1b7GdQf2I' },
  { title: 'Cities at Night 360',url: 'https://www.youtube.com/watch?v=v8VrmkG2FvE' },
  { title: 'Ocean Dive 360',     url: 'https://www.youtube.com/watch?v=6B9vLwYxGZ0' },
  { title: 'Space Walk 360',     url: 'https://www.youtube.com/watch?v=0qisGSwZym4' },
  { title: 'Mountain Flight 360',url: 'https://www.youtube.com/watch?v=GoB9aSxUjYw' }
];

/* ---------- Utils ---------- */
function parseYouTubeId(u){
  try{
    var url = new URL(u);
    if (url.hostname.indexOf('youtu.be')>-1) return url.pathname.slice(1);
    if (url.hostname.indexOf('youtube.com')>-1) return url.searchParams.get('v');
  }catch(e){}
  return null;
}
function ytThumb(u){ var id = parseYouTubeId(u); return id ? ('https://img.youtube.com/vi/' + id + '/hqdefault.jpg') : null; }
function worldPosOf(el, lift){
  if (lift == null) lift = 1.35;
  var v = new THREE.Vector3();
  el.object3D.getWorldPosition(v);
  v.y += lift;
  return v;
}

/* ---------- Smooth teleport on .teleport (tap-only by default) ---------- */
(function setupTeleport(){
  const lerpMs = TELEPORT_DURATION_MS;
  let armed = false;
  setTimeout(function(){ armed = true; }, TELEPORT_ARM_DELAY_MS);

  function moveTo(x, z){
    // clamp within large bounds (hall + corridors)
    const halfHallX = HALL_W/2 - 0.4;
    const halfHallZ = HALL_D/2 - 0.4;

    let tx = x, tz = z;
    function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
    const inHall = (Math.abs(x) <= halfHallX && Math.abs(z) <= halfHallZ);

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

    // deadzone (ignore tiny moves)
    const cur = rig.object3D.position;
    const dx = tx - cur.x, dz = tz - cur.z;
    if (Math.hypot(dx, dz) < TELEPORT_DEADZONE_M) return;

    // smooth ease-in-out
    const start = cur.clone();
    const end   = new THREE.Vector3(tx, start.y, tz);
    const t0 = performance.now();

    function step(){
      const t = (performance.now() - t0) / lerpMs;
      const k = t >= 1 ? 1 : (1 - Math.cos(Math.min(1,t)*Math.PI)) / 2;
      const p = start.clone().lerp(end, k);
      rig.object3D.position.copy(p);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Only react to clicks on teleport surfaces
  scene.addEventListener('click', function(evt){
    if (!armed) return; // prevent accidental first move
    const target = evt.target;
    if (!target || !target.classList || !target.classList.contains('teleport')) return;
    const d = evt.detail || {};
    const inter = d.intersection || (d.intersections && d.intersections[0]);
    if (!inter) return;
    moveTo(inter.point.x, inter.point.z);
  });
})();

/* ---------- Door panel (centered, billboard, auto-close) ---------- */
function spawnDoorPanel(worldPos, title, url, imgSrc){
  var W=3.2, H=1.8, headerH=0.16;

  var root = document.createElement('a-entity');
  root.setAttribute('position', worldPos.x+' '+worldPos.y+' '+worldPos.z);
  root.setAttribute('billboard','');
  scene.appendChild(root);

  var back = document.createElement('a-entity');
  back.setAttribute('geometry', 'primitive: plane; width:'+W+'; height:'+H);
  back.setAttribute('material', 'color:#000; opacity:0.9; transparent:true');
  back.setAttribute('position', '0 0 0.002');
  root.appendChild(back);

  var header = document.createElement('a-entity');
  header.setAttribute('geometry', 'primitive: plane; width:'+W+'; height:'+headerH);
  header.setAttribute('material', 'color:#ffd100; opacity:0.98');
  header.setAttribute('position', '0 '+(H/2 - headerH/2)+' 0.01');
  root.appendChild(header);

  var t = document.createElement('a-entity');
  t.setAttribute('text', 'value:'+title+'; align:center; color:#111; width:5; zOffset:0.01');
  t.setAttribute('position', '0 '+(H/2 - headerH/2)+' 0.02');
  root.appendChild(t);

  var urlTxt = document.createElement('a-entity');
  urlTxt.setAttribute('text', 'value:'+url+'; align:center; color:#fff; width:4.8; wrapCount:68; zOffset:0.01');
  urlTxt.setAttribute('position', '0 '+(H/2 - headerH - 0.10)+' 0.02');
  root.appendChild(urlTxt);

  if (imgSrc){
    var img = document.createElement('a-image');
    img.setAttribute('src', imgSrc);
    img.setAttribute('width', W - 0.36);
    img.setAttribute('height', H - headerH - 0.56);
    img.setAttribute('position', '0 0.05 0.025');
    img.setAttribute('animation__zoom', 'property: scale; dir: alternate; from: 1 1 1; to: 1.05 1.05 1; dur: 2600; easing: easeInOutSine; loop:true');
    root.appendChild(img);
  } else {
    var ph = document.createElement('a-entity');
    ph.setAttribute('geometry', 'primitive: plane; width:'+(W - 0.36)+'; height:'+(H - headerH - 0.56));
    ph.setAttribute('material', 'color:#0b1a3a; opacity:0.92; transparent:true');
    ph.setAttribute('position', '0 0.05 0.025');
    root.appendChild(ph);
  }

  var openBtn = document.createElement('a-entity');
  openBtn.setAttribute('class','interact');
  openBtn.setAttribute('geometry','primitive: plane; width:1.10; height:0.28');
  openBtn.setAttribute('material','color:#0f2353; opacity:0.96');
  openBtn.setAttribute('position', '0 '+(-H/2 + 0.22)+' 0.03');
  var label = document.createElement('a-entity');
  label.setAttribute('text','value:Open; align:center; color:#fff; width:1.8; zOffset:0.01');
  label.setAttribute('position','0 0 0.01');
  openBtn.appendChild(label);
  openBtn.addEventListener('click', function(){ try{ window.open(url, '_blank'); } catch(e){ location.href = url; } });
  root.appendChild(openBtn);

  var closeBtn = document.createElement('a-entity');
  closeBtn.setAttribute('class','interact');
  closeBtn.setAttribute('geometry','primitive: plane; width:0.20; height:0.20');
  closeBtn.setAttribute('material','color:#000; opacity:0.001; transparent:true');
  closeBtn.setAttribute('position', (W/2 - 0.14)+' '+(H/2 - 0.14)+' 0.04');
  var glyph = document.createElement('a-entity');
  glyph.setAttribute('text','value:✕; align:center; color:#fff; width:2; zOffset:0.01');
  glyph.setAttribute('position','0 0 0.01');
  closeBtn.appendChild(glyph);
  root.appendChild(closeBtn);

  function destroy(){ try{ root.parentNode.removeChild(root); }catch(e){} }
  var auto = setTimeout(destroy, 8000);
  var armed = false; setTimeout(function(){ armed=true; }, 300);
  var look = setTimeout(function(){}, 999999);
  function cancel(){ if (armed) clearTimeout(look); }
  function rearm(){ if (!armed) return; clearTimeout(look); look = setTimeout(destroy, 1200); }
  root.addEventListener('mouseenter', cancel);
  root.addEventListener('mouseleave', rearm);
  closeBtn.addEventListener('click', function(){ clearTimeout(auto); destroy(); });

  return root;
}

/* ---------- Build: brighter hall + corridors + posters ---------- */
(function buildLibrary(){
  // Lights
  var hemi = document.createElement('a-entity');
  hemi.setAttribute('light','type: hemisphere; intensity: 0.9; color: #cfd8ff; groundColor: #445;');
  hemi.setAttribute('position','0 3 0');
  env.appendChild(hemi);

  var dir = document.createElement('a-entity');
  dir.setAttribute('light','type: directional; intensity: 0.8; castShadow: false');
  dir.setAttribute('position','3 6 2');
  env.appendChild(dir);

  // Hall floor
  var floorHall = document.createElement('a-entity');
  floorHall.classList.add('teleport');
  floorHall.setAttribute('geometry', 'primitive: plane; width:'+HALL_W+'; height:'+HALL_D);
  floorHall.setAttribute('material', 'color:#2a2f3a; metalness:0.1; roughness:0.9');
  floorHall.setAttribute('rotation','-90 0 0');
  env.appendChild(floorHall);

  // Walls
  var wallColor = '#111827';
  function mkWall(x,y,z, w,h,d){
    var wall = document.createElement('a-box');
    wall.setAttribute('color', wallColor);
    wall.setAttribute('position', x+' '+y+' '+z);
    wall.setAttribute('width',  ''+w);
    wall.setAttribute('height', ''+h);
    wall.setAttribute('depth',  ''+d);
    env.appendChild(wall);
  }
  mkWall(0, HALL_H/2, -HALL_D/2, HALL_W, HALL_H, WALL_T);
  mkWall(0, HALL_H/2,  HALL_D/2, HALL_W, HALL_H, WALL_T);
  mkWall( HALL_W/2, HALL_H/2, 0, WALL_T, HALL_H, HALL_D);
  mkWall(-HALL_W/2, HALL_H/2, 0, WALL_T, HALL_H, HALL_D);

  // Ceiling
  var ceil = document.createElement('a-plane');
  ceil.setAttribute('rotation','90 0 0');
  ceil.setAttribute('position', '0 '+HALL_H+' 0');
  ceil.setAttribute('width', ''+HALL_W);
  ceil.setAttribute('height', ''+HALL_D);
  ceil.setAttribute('material','color:#1a2030; metalness:0; roughness:1');
  env.appendChild(ceil);

  // Rug
  var rug = document.createElement('a-ring');
  rug.setAttribute('position','0 0.01 0');
  rug.setAttribute('rotation','-90 0 0');
  rug.setAttribute('radius-inner','1.1');
  rug.setAttribute('radius-outer','2.0');
  rug.setAttribute('material','color:#30405f; opacity:0.9; transparent:true');
  env.appendChild(rug);

  // Corridors
  function mkCorridor(axis){
    var grp = document.createElement('a-entity'); env.appendChild(grp);
    var alongX = (axis === 'x+' || axis === 'x-');
    var sign = axis.indexOf('+')>-1 ? 1 : -1;
    var startX = alongX ? sign * (HALL_W/2) : 0;
    var startZ = alongX ? 0 : sign * (HALL_D/2);

    var floor = document.createElement('a-entity');
    floor.classList.add('teleport');
    if (alongX){
      floor.setAttribute('geometry', 'primitive: plane; width:'+COR_L+'; height:'+COR_W);
      floor.setAttribute('rotation','-90 0 0');
      floor.setAttribute('position', (startX + sign*(COR_L/2))+' 0 0');
    } else {
      floor.setAttribute('geometry', 'primitive: plane; width:'+COR_W+'; height:'+COR_L);
      floor.setAttribute('rotation','-90 0 0');
      floor.setAttribute('position', '0 0 '+(startZ + sign*(COR_L/2)));
    }
    floor.setAttribute('material','color:#2a2f3a; metalness:0.1; roughness:0.9');
    grp.appendChild(floor);

    function mkStripWall(x,y,z, w,h,d){
      var wall = document.createElement('a-box');
      wall.setAttribute('color', wallColor);
      wall.setAttribute('position', x+' '+y+' '+z);
      wall.setAttribute('width',  ''+w);
      wall.setAttribute('height', ''+h);
      wall.setAttribute('depth',  ''+d);
      grp.appendChild(wall);
    }

    if (alongX){
      var zA = COR_W/2 + WALL_T/2, zB = -COR_W/2 - WALL_T/2;
      mkStripWall(startX + sign*(COR_L/2), COR_H/2, zA, COR_L, COR_H, WALL_T);
      mkStripWall(startX + sign*(COR_L/2), COR_H/2, zB, COR_L, COR_H, WALL_T);
    } else {
      var xA = COR_W/2 + WALL_T/2, xB = -COR_W/2 - WALL_T/2;
      mkStripWall(xA, COR_H/2, startZ + sign*(COR_L/2), WALL_T, COR_H, COR_L);
      mkStripWall(xB, COR_H/2, startZ + sign*(COR_L/2), WALL_T, COR_H, COR_L);
    }

    return {alongX:alongX, sign:sign, startX:startX, startZ:startZ};
  }

  var corridors = [ mkCorridor('x+'), mkCorridor('x-'), mkCorridor('z+'), mkCorridor('z-') ];

  // Frames along corridor walls
  var step = 3.2, margin = 1.6, linkIdx = 0;
  function addFrame(pos, yawDeg){
    var link = LINKS[linkIdx % LINKS.length]; linkIdx++;

    var frame = document.createElement('a-plane');
    frame.classList.add('interact','poster');
    frame.setAttribute('width','1.6');
    frame.setAttribute('height','1.0');
    frame.setAttribute('material','color:#151a23; metalness:0.2; roughness:0.8');
    frame.setAttribute('position', pos.x+' '+pos.y+' '+pos.z);
    frame.setAttribute('rotation', '0 '+yawDeg+' 0');
    frame.setAttribute('data-title', link.title);
    frame.setAttribute('data-url',   link.url);

    var thumb = ytThumb(link.url);
    var img = document.createElement('a-image');
    img.setAttribute('src', thumb || '#fallbackPoster');
    img.setAttribute('width','1.52');
    img.setAttribute('height','0.92');
    img.setAttribute('position','0 0 0.01');
    frame.appendChild(img);

    var cap = document.createElement('a-entity');
    cap.setAttribute('text', 'value:'+link.title+'; align:center; color:#eaeefc; width: 2.4; wrapCount: 22; zOffset: 0.01');
    cap.setAttribute('position', '0 -0.68 0.02');
    frame.appendChild(cap);

    frame.addEventListener('click', function(){
      var p = worldPosOf(frame, 1.0);
      spawnDoorPanel(p, link.title, link.url, thumb);
    });

    env.appendChild(frame);
  }

  for (var c=0;c<corridors.length;c++){
    var C = corridors[c];
    var y = 1.6;
    if (C.alongX){
      var wallZs = [COR_W/2 + WALL_T/2, -COR_W/2 - WALL_T/2];
      for (var i=0;i<wallZs.length;i++){
        var z = wallZs[i];
        var yaw = (z > 0) ? 90 : -90;
        var baseX = C.startX + C.sign*margin;
        for (var x = baseX; Math.abs(x - C.startX) < COR_L - 0.8; x += C.sign*step) {
          addFrame({x:x, y:y, z:z}, yaw);
        }
      }
    } else {
      var wallXs = [COR_W/2 + WALL_T/2, -COR_W/2 - WALL_T/2];
      for (var j=0;j<wallXs.length;j++){
        var x = wallXs[j];
        var yaw = (x > 0) ? 0 : 180;
        var baseZ = C.startZ + C.sign*margin;
        for (var z = baseZ; Math.abs(z - C.startZ) < COR_L - 0.8; z += C.sign*step) {
          addFrame({x:x, y:y, z:z}, yaw);
        }
      }
    }
  }
})();