// ========= Simple VR Room (teleport + interactions) =========

// UI helpers
function toggleHelp(){ document.getElementById('help').classList.toggle('hidden'); }

// Elements
const scene = document.getElementById('scene');
const rig   = document.getElementById('rig');
const cam   = document.getElementById('cam');

// --- Teleport: click/gaze floor to move rig smoothly ---
(function setupTeleport(){
  const floor = document.getElementById('floor');
  const lerpMs = 280;

  function moveTo(x, z){
    // clamp within room bounds (keep 0.4m from walls)
    const max = 2.6;
    const tx = Math.max(-max, Math.min(max, x));
    const tz = Math.max(-max, Math.min(max, z));

    // smooth lerp
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

  const onPick = (evt) => {
    const intersection = evt.detail?.intersection || evt.detail?.intersections?.[0];
    if (!intersection) return;
    const point = intersection.point;
    moveTo(point.x, point.z);
  };

  floor.addEventListener('click', onPick);
})();

// --- Interaction: posters → big door panel (thumbnail preview) ---
function parseYouTubeId(u){
  try {
    const url = new URL(u);
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1);
    if (url.hostname.includes('youtube.com')) return url.searchParams.get('v');
  } catch(_) {}
  return null;
}
function ytThumb(u){
  const id = parseYouTubeId(u);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

// Reuse your hinged door style from earlier, simplified & centered
function spawnDoorPanel(worldPos, title, url, imgSrc){
  const W=3.0, H=1.7, headerH=0.16;

  // root that always faces camera
  const root = document.createElement('a-entity');
  root.setAttribute('position', `${worldPos.x} ${worldPos.y} ${worldPos.z}`);
  root.setAttribute('billboard','');
  scene.appendChild(root);

  // a subtle pop forward on open
  root.setAttribute('animation__pop', 'property: position; dir: alternate; dur: 260; easing: easeOutCubic');

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
  urlTxt.setAttribute('text', `value:${url}; align:center; color:#fff; width:4.4; wrapCount: 60; zOffset:0.01`);
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
  }

  const openBtn = document.createElement('a-entity');
  openBtn.setAttribute('class','interact');
  openBtn.setAttribute('geometry','primitive: plane; width:1.05; height:0.28');
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
  closeBtn.setAttribute('geometry','primitive: plane; width:0.2; height:0.2');
  closeBtn.setAttribute('material','color:#000; opacity:0.001; transparent:true');
  closeBtn.setAttribute('position', `${W/2 - 0.14} ${H/2 - 0.14} 0.04`);
  const glyph = document.createElement('a-entity');
  glyph.setAttribute('text','value:✕; align:center; color:#fff; width:2; zOffset:0.01');
  glyph.setAttribute('position','0 0 0.01');
  closeBtn.appendChild(glyph);
  root.appendChild(closeBtn);

  const destroy = () => { try{ root.parentNode.removeChild(root); }catch(e){} };

  // auto close + look-away
  const auto = setTimeout(destroy, 8000);
  let armed = false; setTimeout(()=>armed=true, 300);
  const cancel = ()=> armed && clearTimeout(look);
  const rearm  = ()=> {
    if (!armed) return;
    clearTimeout(look);
    look = setTimeout(destroy, 1200);
  };
  let look = setTimeout(()=>{}, 999999);
  root.addEventListener('mouseenter', cancel);
  root.addEventListener('mouseleave', rearm);
  closeBtn.addEventListener('click', () => { clearTimeout(auto); destroy(); });

  return root;
}

function worldPosOf(el, lift=1.2){
  const v = new THREE.Vector3();
  el.object3D.getWorldPosition(v);
  v.y += lift;
  return v;
}

// Hook posters
document.querySelectorAll('.poster').forEach((p,i)=>{
  p.addEventListener('click', ()=>{
    const title = i===0 ? 'Mountains 360' : 'City 360';
    const url   = i===0 ? 'https://www.youtube.com/watch?v=0qisGSwZym4' : 'https://www.youtube.com/watch?v=CSvFpBOe8eY';
    const img   = ytThumb(url);
    spawnDoorPanel(worldPosOf(p, 1.3), title, url, img);
  });
});

// --- Interaction: orb → your classic link panel (quick) ---
(function setupOrb(){
  const orb = document.querySelector('.orb');
  const link = { title: 'YouTube 360 – Roller Coaster', url:'https://www.youtube.com/watch?v=VR1b7GdQf2I' };
  orb.addEventListener('click', ()=>{
    const img = ytThumb(link.url);
    spawnDoorPanel(worldPosOf(orb, 1.3), link.title, link.url, img);
  });
})();