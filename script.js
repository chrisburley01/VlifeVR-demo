/* =========================================================
   VLife 360 – script.js (v20)
   - Welcome splash + menu collapse
   - Orbs (gaze or tap)
   - Hinged "door" panel (centered on orb)
   - Swing OPEN and SWING CLOSE
   - Auto-close (8s) + look-away (1.2s, armed after 300ms)
   - YouTube links with thumbnail previews
========================================================= */

/* ---------- CONFIG ---------- */
// 'left' | 'right' — default hinge side
let HINGE_SIDE_DEFAULT = 'left';
// Alternate hinge side each time if true
let AUTO_ALTERNATE_HINGE = false;
let __lastHingeSide = 'right'; // so first open becomes 'left'

/* ---------- Components ---------- */
AFRAME.registerComponent('orb', {
  init: function () {
    this.el.setAttribute('geometry', 'primitive: sphere; radius: 0.2');
    this.el.setAttribute('material', 'color: #ffd100; emissive: #ffd100; emissiveIntensity: 0.95; metalness: 0.1; roughness: 0.4');
    this.el.setAttribute('animation__pulse', 'property: scale; dir: alternate; dur: 1200; easing: easeInOutSine; loop: true; to: 1.35 1.35 1.35');
    this.el.addEventListener('mouseenter', () => this.el.object3D.scale.set(1.6,1.6,1.6));
    this.el.addEventListener('mouseleave', () => this.el.object3D.scale.set(1,1,1));
  }
});
AFRAME.registerComponent('billboard', {
  tick: function () {
    const cam = this.cam || (this.cam = document.querySelector('a-camera'));
    if (!cam) return;
    this.el.object3D.lookAt(cam.object3D.position);
  }
});

/* ---------- Link data (override with /assets/links.json) ----------
   All YouTube links here → guaranteed preview thumbnails
------------------------------------------------------------------- */
let ORB_LINKS = [
  { title: 'YouTube 360 – Grand Canyon',    url: 'https://www.youtube.com/watch?v=CSvFpBOe8eY' },
  { title: 'YouTube 360 – Roller Coaster',  url: 'https://www.youtube.com/watch?v=VR1b7GdQf2I' },
  { title: 'YouTube 360 – Cities at Night', url: 'https://www.youtube.com/watch?v=v8VrmkG2FvE' },
  { title: 'YouTube 360 – Ocean Dive',      url: 'https://www.youtube.com/watch?v=6B9vLwYxGZ0' },
  { title: 'YouTube 360 – Space Walk',      url: 'https://www.youtube.com/watch?v=0qisGSwZym4' },
  { title: 'YouTube 360 – Mountain Flight', url: 'https://www.youtube.com/watch?v=GoB9aSxUjYw' }
];
fetch('assets/links.json')
  .then(r => (r.ok ? r.json() : Promise.reject()))
  .then(d => { if (Array.isArray(d) && d.length >= 6) ORB_LINKS = d.slice(0,6); })
  .catch(()=>{});

/* ---------- UI elements ---------- */
const scene      = document.getElementById('scene');
const sky        = document.getElementById('sky');
const statusText = document.getElementById('statusText');
const menuPanel  = document.getElementById('menuPanel');
const hamburger  = document.getElementById('hamburger');
const welcome    = document.getElementById('welcomeSplash');
const enterBtn   = document.getElementById('enterBtn');

const labelMap = {
  Park360: 'Park 360',
  Forrest360: 'Forest 360',
  Futurecity360: 'Future City 360',
  Neonnightclub: 'Neon Nightclub 360',
  floating_sky_monastery_upscaled_8k: 'Floating Sky Monastery 8K'
};

/* ---------- Welcome splash ---------- */
function showMenuAfterSplash() {
  if (!welcome) return;
  welcome.classList.add('fadeout');
  setTimeout(() => {
    welcome.classList.add('hidden');
    menuPanel?.classList.remove('hidden');
  }, 480);
}
if (enterBtn) enterBtn.addEventListener('click', showMenuAfterSplash);
setTimeout(() => { if (welcome && !welcome.classList.contains('hidden')) showMenuAfterSplash(); }, 2500);

/* ---------- Menu collapse ---------- */
function setBackground(bg) {
  sky.setAttribute('src', '#' + bg);
  if (statusText) statusText.textContent = 'Using 360: ' + (labelMap[bg] || bg);

  if (!menuPanel.classList.contains('hidden')) {
    menuPanel.classList.add('collapsing');
    setTimeout(() => {
      menuPanel.classList.remove('collapsing');
      menuPanel.classList.add('hidden');
      hamburger.classList.remove('hidden');
    }, 260);
  } else {
    hamburger.classList.remove('hidden');
  }
}
function toggleMenu() {
  const willShow = menuPanel.classList.contains('hidden');
  menuPanel.classList.toggle('hidden', !willShow ? true : false);
  hamburger.classList.toggle('hidden', willShow ? true : false);
}
window.setBackground = setBackground;
window.toggleMenu = toggleMenu;

/* =========================================================
   Door panel helpers
========================================================= */

// Hide/show all orbs when a panel is open
function setOrbsVisible(visible) {
  document.querySelectorAll('.hotspot').forEach(o => o.setAttribute('visible', visible));
}

// Parse a YouTube video ID for thumbnails
function parseYouTubeId(u) {
  try {
    const url = new URL(u);
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1);
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v) return v;
    }
  } catch(_) {}
  return null;
}

// Build a preview descriptor (image + host)
function previewForLink(link) {
  const out = { src: null, host: '', favicon: null, title: link.title || '' };
  try {
    const u = new URL(link.url);
    out.host = u.host;
    out.favicon = `https://icons.duckduckgo.com/ip3/${u.hostname}.ico`;
  } catch(_) {}
  const yt = parseYouTubeId(link.url || '');
  if (yt) out.src = `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;
  return out;
}

/* =========================================================
   Hinged door (centered on orb)
   Structure:
   panelRoot (billboard) @ worldPos
     └─ hinge (rotates Y, positioned at door edge)
         └─ door (CENTERED at 0,0,0; visible panel)
========================================================= */
function spawnHingedDoor(worldPos, link, hingeSide='left') {
  const panelRoot = document.createElement('a-entity');
  panelRoot.setAttribute('position', `${worldPos.x} ${worldPos.y} ${worldPos.z}`);
  panelRoot.setAttribute('billboard', '');
  scene.appendChild(panelRoot);

  // Sizes (big door)
  const W = 3.2, H = 1.8, headerH = 0.16;

  // Hinge: rotate from ±85° (edge-on) to 0°
  const startY = hingeSide === 'right' ? -85 : 85;
  const hinge = document.createElement('a-entity');
  hinge.setAttribute('rotation', `0 ${startY} 0`);
  hinge.setAttribute('animation__open', 'property: rotation; to: 0 0 0; dur: 420; easing: easeOutCubic');

  // >>> KEY: move hinge to door edge, keep door centered, so door stays centered on orb
  const hingeX = hingeSide === 'right' ? (W/2) : (-W/2);
  hinge.setAttribute('position', `${hingeX} 0 0`);
  panelRoot.appendChild(hinge);

  // Door content (CENTERED at origin)
  const door = document.createElement('a-entity');
  door.setAttribute('position', `0 0 0`);
  hinge.appendChild(door);

  // Backing plate
  const back = document.createElement('a-entity');
  back.setAttribute('geometry', `primitive: plane; width: ${W}; height: ${H}`);
  back.setAttribute('material', 'color: #000; opacity: 0.88; transparent: true');
  back.setAttribute('position', '0 0 0.002');
  door.appendChild(back);

  // Header strip
  const header = document.createElement('a-entity');
  header.setAttribute('geometry', `primitive: plane; width: ${W}; height: ${headerH}`);
  header.setAttribute('material', 'color: #ffd100; opacity: 0.98');
  header.setAttribute('position', `0 ${H/2 - headerH/2} 0.01`);
  door.appendChild(header);

  // Title
  const title = document.createElement('a-entity');
  title.setAttribute('text', `value: ${link.title || ''}; align: center; color: #111; width: 5; zOffset: 0.01`);
  title.setAttribute('position', `0 ${H/2 - headerH/2} 0.02`);
  door.appendChild(title);

  // URL (white)
  const urlTxt = document.createElement('a-entity');
  urlTxt.setAttribute('text', `value: ${link.url || ''}; align: center; color: #fff; width: 4.6; wrapCount: 64; zOffset: 0.01`);
  urlTxt.setAttribute('position', `0 ${H/2 - headerH - 0.10} 0.02`);
  door.appendChild(urlTxt);

  // Preview (YouTube thumb or host card)
  const prev = previewForLink(link);
  if (prev.src) {
    const img = document.createElement('a-image');
    img.setAttribute('src', prev.src);
    img.setAttribute('width', W - 0.4);
    img.setAttribute('height', H - headerH - 0.6);
    img.setAttribute('position', `0 0.05 0.025`);
    img.setAttribute('animation__zoom', 'property: scale; dir: alternate; from: 1 1 1; to: 1.06 1.06 1; dur: 2600; easing: easeInOutSine; loop: true');
    door.appendChild(img);
  } else {
    const card = document.createElement('a-entity');
    card.setAttribute('geometry', `primitive: plane; width: ${W - 0.4}; height: ${H - headerH - 0.6}`);
    card.setAttribute('material', 'color: #0b1a3a; opacity: 0.92; transparent: true');
    card.setAttribute('position', `0 0.05 0.025`);
    door.appendChild(card);
  }

  // Open button
  const openBtn = document.createElement('a-entity');
  openBtn.setAttribute('class', 'linkbtn');
  openBtn.setAttribute('geometry', 'primitive: plane; width: 1.10; height: 0.28');
  openBtn.setAttribute('material', 'color: #0f2353; opacity: 0.96');
  openBtn.setAttribute('position', `0 ${-H/2 + 0.22} 0.03`);
  const label = document.createElement('a-entity');
  label.setAttribute('text', 'value: Open; align: center; color: #fff; width: 1.8; zOffset: 0.01');
  label.setAttribute('position', '0 0 0.01');
  openBtn.appendChild(label);
  openBtn.addEventListener('click', () => {
    const u = (link.url || '').trim();
    if (u) { try { window.open(u, '_blank'); } catch(e) { location.href = u; } }
  });
  door.appendChild(openBtn);

  // Close (top-right)
  const closeBtn = document.createElement('a-entity');
  closeBtn.setAttribute('class', 'linkbtn');
  closeBtn.setAttribute('geometry', 'primitive: plane; width: 0.20; height: 0.20');
  closeBtn.setAttribute('material', 'color: #000; opacity: 0.001; transparent: true');
  closeBtn.setAttribute('position', `${W/2 - 0.14} ${H/2 - 0.14} 0.04`);
  const closeGlyph = document.createElement('a-entity');
  closeGlyph.setAttribute('text', 'value: ✕; align: center; color: #fff; width: 2; zOffset: 0.01');
  closeGlyph.setAttribute('position', '0 0 0.01');
  closeBtn.appendChild(closeGlyph);
  door.appendChild(closeBtn);

  return { panelRoot, hinge, door, closeBtn, W, H, headerH, hingeSide };
}

/* =========================================================
   OPEN/CLOSE logic
========================================================= */
function expandOrbToPanel(orbEl, link) {
  // clear older
  if (orbEl.__panelEl) {
    try { orbEl.__panelEl.parentNode.removeChild(orbEl.__panelEl); } catch(e){}
    orbEl.__panelEl = null;
  }
  clearTimeout(orbEl.__autoCloseTimer);
  clearTimeout(orbEl.__lookAwayTimer);

  // hinge side choice
  const hingeSide = AUTO_ALTERNATE_HINGE
    ? (__lastHingeSide === 'left' ? 'right' : 'left')
    : HINGE_SIDE_DEFAULT;
  __lastHingeSide = hingeSide;

  // world position + lift
  const worldPos = new THREE.Vector3();
  orbEl.object3D.getWorldPosition(worldPos);
  worldPos.y += 1.3; // door a bit higher

  // hide orbs while door open
  setOrbsVisible(false);

  const built = spawnHingedDoor(worldPos, link, hingeSide);
  const { panelRoot, hinge, closeBtn } = built;
  orbEl.__panelEl = panelRoot;
  orbEl.__hingeEl = hinge;
  orbEl.__hingeSide = hingeSide;

  // swing-close then remove
  const swingCloseAndRemove = () => {
    if (!orbEl.__panelEl) return;
    const toY = hingeSide === 'right' ? -85 : 85;
    hinge.setAttribute('animation__close', `property: rotation; to: 0 ${toY} 0; dur: 360; easing: easeInCubic`);
    setTimeout(() => {
      try { panelRoot.parentNode.removeChild(panelRoot); } catch(e){}
      orbEl.__panelEl = null;
      orbEl.__hingeEl = null;
      setOrbsVisible(true);
    }, 370);
  };

  const closeAll = () => {
    clearTimeout(orbEl.__autoCloseTimer);
    clearTimeout(orbEl.__lookAwayTimer);
    swingCloseAndRemove();
  };

  closeBtn.addEventListener('click', closeAll);

  // Auto / look-away with 300ms lockout
  orbEl.__autoCloseTimer = setTimeout(closeAll, 8000);
  let lookAwayArmed = false;
  setTimeout(() => { lookAwayArmed = true; }, 300);
  const cancelLookAway = () => { if (lookAwayArmed) clearTimeout(orbEl.__lookAwayTimer); };
  const startLookAway  = () => {
    if (!lookAwayArmed) return;
    clearTimeout(orbEl.__lookAwayTimer);
    orbEl.__lookAwayTimer = setTimeout(closeAll, 1200);
  };
  panelRoot.addEventListener('mouseenter', cancelLookAway);
  panelRoot.addEventListener('mouseleave', startLookAway);
}

/* =========================================================
   Bind (gaze fuse or tap)
========================================================= */
function bindOrbEvents() {
  document.querySelectorAll('.hotspot').forEach((el) => {
    const idx  = parseInt(el.getAttribute('data-key') || '0', 10);
    const link = ORB_LINKS[Math.max(0, Math.min(5, idx))] || ORB_LINKS[0];
    el.addEventListener('click', () => expandOrbToPanel(el, link));
  });
}
if (scene?.hasLoaded) bindOrbEvents();
else scene?.addEventListener('loaded', bindOrbEvents);

/* ---------- Optional: ESC toggles menu on desktop ---------- */
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleMenu(); });

/* ---------- Live hinge options (if you want to tweak from console) ---------- */
window.vlifeDoorOptions = {
  setDefault(side) { if (side === 'left' || side === 'right') HINGE_SIDE_DEFAULT = side; },
  setAlternate(on) { AUTO_ALTERNATE_HINGE = !!on; }
};