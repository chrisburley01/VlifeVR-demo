/* =========================================================
   VLife 360 – full script.js (v15)
   - Welcome splash + menu collapse
   - Orbs (gaze or tap)
   - Panel spawns ABOVE the orb as a separate entity (billboard)
   - No marquee; just neat wrapping
   - Auto-close (8s) + look-away close (1.2s, armed after 300ms)
========================================================= */

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

/* ---------- Link data (override with /assets/links.json) ---------- */
let ORB_LINKS = [
  { title: 'YouTube 360',             url: 'https://www.youtube.com/360' },
  { title: 'Vimeo 360',               url: 'https://vimeo.com/360' },
  { title: 'AirPano 360 Videos',      url: 'https://www.airpano.com/video/' },
  { title: 'National Geographic 360', url: 'https://www.youtube.com/playlist?list=PLivjPDlt6ApQUgZgY2hLpcZ3g4Zz4icZT' },
  { title: 'NYT – The Daily 360',     url: 'https://www.nytimes.com/spotlight/the-daily-360' },
  { title: 'GoPro 360 (YouTube)',     url: 'https://www.youtube.com/@GoPro/search?query=360' }
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

/* Background labels for status line */
const labelMap = {
  Park360: 'Park 360',
  Forrest360: 'Forest 360',
  Futurecity360: 'Future City 360',
  Neonnightclub: 'Neon Nightclub 360',
  floating_sky_monastery_upscaled_8k: 'Floating Sky Monastery 8K'
};

/* ---------- Welcome splash control ---------- */
function showMenuAfterSplash() {
  if (!welcome) return;
  welcome.classList.add('fadeout');
  setTimeout(() => {
    welcome.classList.add('hidden');
    menuPanel?.classList.remove('hidden');
  }, 480);
}
if (enterBtn) enterBtn.addEventListener('click', showMenuAfterSplash);
// auto-enter after 2.5s
setTimeout(() => {
  if (welcome && !welcome.classList.contains('hidden')) showMenuAfterSplash();
}, 2500);

/* ---------- Menu: set background & collapse panel ---------- */
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
   Orb -> floating panel (separate entity; hides orbs while open)
========================================================= */

// hide/show all orbs convenience
function setOrbsVisible(visible) {
  document.querySelectorAll('.hotspot').forEach(o => o.setAttribute('visible', visible));
}

function expandOrbToPanel(orbEl, link) {
  // clear any previous panel for this orb
  if (orbEl.__panelEl) {
    try { orbEl.__panelEl.parentNode.removeChild(orbEl.__panelEl); } catch(e){}
    orbEl.__panelEl = null;
  }
  clearTimeout(orbEl.__autoCloseTimer);
  clearTimeout(orbEl.__lookAwayTimer);

  // compute world position of the orb and place panel above it
  const worldPos = new THREE.Vector3();
  orbEl.object3D.getWorldPosition(worldPos);
  const lift = 1.2; // metres above
  worldPos.y += lift;

  // hide all orbs so nothing can overlap the panel
  setOrbsVisible(false);

  // create a standalone panel in world space
  const panel = document.createElement('a-entity');
  panel.setAttribute('position', `${worldPos.x} ${worldPos.y} ${worldPos.z}`);
  panel.setAttribute('billboard', ''); // always face camera
  scene.appendChild(panel);
  orbEl.__panelEl = panel;

  // geometry constants (large)
  const panelW = 2.40, panelH = 0.84, headerH = 0.12;

  // background
  const bg = document.createElement('a-entity');
  bg.setAttribute('geometry', `primitive: plane; width: ${panelW}; height: ${panelH}`);
  bg.setAttribute('material', 'color: #000; opacity: 0.84; transparent: true');
  bg.setAttribute('position', '0 0 0.005');
  panel.appendChild(bg);

  // header bar
  const header = document.createElement('a-entity');
  header.setAttribute('geometry', `primitive: plane; width: ${panelW}; height: ${headerH}`);
  header.setAttribute('material', 'color: #ffd100; opacity: 0.98');
  header.setAttribute('position', `0 ${panelH/2 - headerH/2} 0.01`);
  panel.appendChild(header);

  // Title (no marquee; just wide text)
  const titleEntity = document.createElement('a-entity');
  titleEntity.setAttribute('text', `value: ${link.title}; align: center; color: #111; width: 3.4; zOffset: 0.01`);
  titleEntity.setAttribute('position', `0 ${panelH/2 - headerH/2} 0.015`);
  panel.appendChild(titleEntity);

  // URL (wrap neatly)


  // Open button (large)
  const openBtn = document.createElement('a-entity');
  openBtn.setAttribute('class', 'linkbtn');
  openBtn.setAttribute('geometry', 'primitive: plane; width: 0.90; height: 0.24');
  openBtn.setAttribute('material', 'color: #0f2353; opacity: 0.96');
  openBtn.setAttribute('position', '0 -0.22 0.02');
  const label = document.createElement('a-entity');
  label.setAttribute('text', 'value: Open; align: center; color: #fff; width: 1.6; zOffset: 0.01');
  label.setAttribute('position', '0 0 0.01');
  openBtn.appendChild(label);
  openBtn.addEventListener('click', () => {
    const u = (link.url || '').trim();
    if (u) { try { window.open(u, '_blank'); } catch(e) { location.href = u; } }
  });
  panel.appendChild(openBtn);

  // Close (top-right)
  const closeBtn = document.createElement('a-entity');
  closeBtn.setAttribute('class', 'linkbtn');
  closeBtn.setAttribute('geometry', 'primitive: plane; width: 0.18; height: 0.18');
  closeBtn.setAttribute('material', 'color: #000; opacity: 0.001; transparent: true');
  closeBtn.setAttribute('position', `${panelW/2 - 0.12} ${panelH/2 - 0.12} 0.03`);
  const closeGlyph = document.createElement('a-entity');
  closeGlyph.setAttribute('text', 'value: ✕; align: center; color: #fff; width: 1.8; zOffset: 0.01');
  closeGlyph.setAttribute('position', '0 0 0.01');
  closeBtn.appendChild(closeGlyph);
  closeBtn.addEventListener('click', () => restorePanel(orbEl));
  panel.appendChild(closeBtn);

  // --- timers: auto-close + look-away with 300ms lockout ---
  orbEl.__autoCloseTimer = setTimeout(() => restorePanel(orbEl), 8000);
  let lookAwayArmed = false;
  setTimeout(() => { lookAwayArmed = true; }, 300);

  const cancelLookAway = () => { if (lookAwayArmed) clearTimeout(orbEl.__lookAwayTimer); };
  const startLookAway  = () => {
    if (!lookAwayArmed) return;
    clearTimeout(orbEl.__lookAwayTimer);
    orbEl.__lookAwayTimer = setTimeout(() => restorePanel(orbEl), 1200);
  };
  panel.addEventListener('mouseenter', cancelLookAway);
  panel.addEventListener('mouseleave', startLookAway);
}

function restorePanel(orbEl) {
  clearTimeout(orbEl.__autoCloseTimer);
  clearTimeout(orbEl.__lookAwayTimer);

  if (orbEl.__panelEl) {
    try { orbEl.__panelEl.parentNode.removeChild(orbEl.__panelEl); } catch(e){}
    orbEl.__panelEl = null;
  }

  // show orbs again
  setOrbsVisible(true);
}

/* ---------- Bind (gaze fuse or tap) ---------- */
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
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') toggleMenu();
});