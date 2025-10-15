/* =========================================================
   A-Frame components
========================================================= */
AFRAME.registerComponent('orb', {
  init: function () {
    // Visible yellow orb with generous hitbox
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

/* =========================================================
   Link data (6 demo 360 links). Override via /assets/links.json
========================================================= */
let ORB_LINKS = [
  { title: 'YouTube 360',             url: 'https://www.youtube.com/360' },
  { title: 'Vimeo 360',               url: 'https://vimeo.com/360' },
  { title: 'AirPano 360 Videos',      url: 'https://www.airpano.com/video/' },
  { title: 'National Geographic 360', url: 'https://www.youtube.com/playlist?list=PLivjPDlt6ApQUgZgY2hLpcZ3g4Zz4icZT' },
  { title: 'NYT – The Daily 360',     url: 'https://www.nytimes.com/spotlight/the-daily-360' },
  { title: 'GoPro 360 (YouTube)',     url: 'https://www.youtube.com/@GoPro/search?query=360' }
];

// optional override file (exactly 6 items recommended)
fetch('assets/links.json')
  .then(r => (r.ok ? r.json() : Promise.reject()))
  .then(d => { if (Array.isArray(d) && d.length >= 6) ORB_LINKS = d.slice(0,6); })
  .catch(()=>{ /* fallback to defaults */ });

/* =========================================================
   UI elements
========================================================= */
const scene      = document.getElementById('scene');
const sky        = document.getElementById('sky');
const statusText = document.getElementById('statusText');
const menuPanel  = document.getElementById('menuPanel');
const hamburger  = document.getElementById('hamburger');

/* Background labels used in the menu status line */
const labelMap = {
  Park360: 'Park 360',
  Forrest360: 'Forest 360',
  Futurecity360: 'Future City 360',
  Neonnightclub: 'Neon Nightclub 360',
  floating_sky_monastery_upscaled_8k: 'Floating Sky Monastery 8K'
};

/* Smoothly collapse big menu -> hamburger after choosing a background */
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
window.setBackground = setBackground;

/* Toggle from hamburger */
function toggleMenu() {
  const willShow = menuPanel.classList.contains('hidden');
  menuPanel.classList.toggle('hidden', !willShow ? true : false); // keep consistent
  hamburger.classList.toggle('hidden', willShow ? true : false);
}
window.toggleMenu = toggleMenu;

/* =========================================================
   Orb -> floating link panel (above orb)
   - appears 0.9 m above the orb
   - auto-closes after 8s
   - closes 1.2s after you look away (armed after 300ms to avoid jitter)
========================================================= */

// neat URL for display (Open button still uses full URL)
function trimUrlForDisplay(u, max = 36) {
  try {
    const url = new URL(u);
    const base = url.host;
    const path = (url.pathname + url.search).replace(/\/+$/,'');
    const shown = (base + path);
    return shown.length > max ? shown.slice(0, max - 1) + '…' : shown;
  } catch { return u.length > max ? u.slice(0, max - 1) + '…' : u; }
}

function expandOrbToPanel(orbEl, link) {
  // remember original so we can restore
  if (!orbEl.__vlifeOriginal) {
    orbEl.__vlifeOriginal = {
      geom:  orbEl.getAttribute('geometry'),
      mat:   orbEl.getAttribute('material'),
      scale: orbEl.getAttribute('scale') || '1 1 1',
      pos:   Object.assign({}, orbEl.getAttribute('position'))
    };
  }

  // reset timers if any
  clearTimeout(orbEl.__autoCloseTimer);
  clearTimeout(orbEl.__lookAwayTimer);

  // raise panel above the orb
  const lift = 0.9;
  const p = orbEl.__vlifeOriginal.pos;
  orbEl.setAttribute('position', `${p.x} ${p.y + lift} ${p.z}`);

  // wipe children
  while (orbEl.firstChild) orbEl.removeChild(orbEl.firstChild);

  // container so enter/leave works on whole surface
  const panelRoot = document.createElement('a-entity');
  orbEl.appendChild(panelRoot);

  const panelW = 1.20, panelH = 0.46;

  // background
  const bg = document.createElement('a-entity');
  bg.setAttribute('geometry', `primitive: plane; width: ${panelW}; height: ${panelH}`);
  bg.setAttribute('material', 'color: #000; opacity: 0.82; transparent: true');
  bg.setAttribute('position', '0 0 0.005');
  panelRoot.appendChild(bg);

  // header bar
  const header = document.createElement('a-entity');
  header.setAttribute('geometry', `primitive: plane; width: ${panelW}; height: 0.09`);
  header.setAttribute('material', 'color: #ffd100; opacity: 0.96');
  header.setAttribute('position', `0 ${panelH/2 - 0.045} 0.01`);
  panelRoot.appendChild(header);

  // title
  const title = document.createElement('a-entity');
  title.setAttribute('text', `value: ${link.title}; align: center; color: #111; width: 2; zOffset: 0.01`);
  title.setAttribute('position', `0 ${panelH/2 - 0.045} 0.015`);
  panelRoot.appendChild(title);

  // url (short label)
  const shownUrl = trimUrlForDisplay(link.url, 36);
  const urlTxt = document.createElement('a-entity');
  urlTxt.setAttribute('text', `value: ${shownUrl}; align: center; color: #fff; width: 1.6; wrapCount: 24; zOffset: 0.01`);
  urlTxt.setAttribute('position', '0 0.05 0.015');
  panelRoot.appendChild(urlTxt);

  // open button
  const openBtn = document.createElement('a-entity');
  openBtn.setAttribute('class', 'linkbtn');
  openBtn.setAttribute('geometry', 'primitive: plane; width: 0.46; height: 0.16');
  openBtn.setAttribute('material', 'color: #0f2353; opacity: 0.96');
  openBtn.setAttribute('position', '0 -0.13 0.02');
  const label = document.createElement('a-entity');
  label.setAttribute('text', 'value: Open; align: center; color: #fff; width: 1; zOffset: 0.01');
  label.setAttribute('position', '0 0 0.01');
  openBtn.appendChild(label);
  openBtn.addEventListener('click', () => {
    try { window.open(link.url, '_blank'); } catch(e) { location.href = link.url; }
  });
  panelRoot.appendChild(openBtn);

  // close (top-right)
  const closeBtn = document.createElement('a-entity');
  closeBtn.setAttribute('class', 'linkbtn');
  closeBtn.setAttribute('geometry', 'primitive: plane; width: 0.12; height: 0.12');
  closeBtn.setAttribute('material', 'color: #000; opacity: 0.001; transparent: true');
  closeBtn.setAttribute('position', `${panelW/2 - 0.08} ${panelH/2 - 0.08} 0.03`);
  const closeGlyph = document.createElement('a-entity');
  closeGlyph.setAttribute('text', 'value: ✕; align: center; color: #fff; width: 1.2; zOffset: 0.01');
  closeGlyph.setAttribute('position', '0 0 0.01');
  closeBtn.appendChild(closeGlyph);
  closeBtn.addEventListener('click', () => restoreOrb(orbEl));
  panelRoot.appendChild(closeBtn);

  // --- timers: auto-close + look-away with lockout ---
  orbEl.__autoCloseTimer = setTimeout(() => restoreOrb(orbEl), 8000);

  let lookAwayArmed = false;           // ignore jitter just after open
  setTimeout(() => { lookAwayArmed = true; }, 300);

  const cancelLookAway = () => { if (lookAwayArmed) clearTimeout(orbEl.__lookAwayTimer); };
  const startLookAway  = () => {
    if (!lookAwayArmed) return;
    clearTimeout(orbEl.__lookAwayTimer);
    orbEl.__lookAwayTimer = setTimeout(() => restoreOrb(orbEl), 1200);
  };

  panelRoot.addEventListener('mouseenter', cancelLookAway);
  panelRoot.addEventListener('mouseleave', startLookAway);
}

function restoreOrb(orbEl) {
  if (!orbEl?.__vlifeOriginal) return;
  clearTimeout(orbEl.__autoCloseTimer);
  clearTimeout(orbEl.__lookAwayTimer);

  while (orbEl.firstChild) orbEl.removeChild(orbEl.firstChild);

  // restore sphere + original position
  orbEl.setAttribute('geometry', orbEl.__vlifeOriginal.geom);
  orbEl.setAttribute('material', orbEl.__vlifeOriginal.mat);
  orbEl.setAttribute('scale',    orbEl.__vlifeOriginal.scale);
  const p = orbEl.__vlifeOriginal.pos;
  orbEl.setAttribute('position', `${p.x} ${p.y} ${p.z}`);
}

/* =========================================================
   Wire up: click (tap) or gaze fuse triggers the panel
   (A-Frame’s cursor setup is in index.html with BOTH cursors)
========================================================= */
function bindOrbEvents() {
  document.querySelectorAll('.hotspot').forEach((el) => {
    const idx  = parseInt(el.getAttribute('data-key') || '0', 10);
    const link = ORB_LINKS[Math.max(0, Math.min(5, idx))] || ORB_LINKS[0];
    el.addEventListener('click', () => expandOrbToPanel(el, link)); // fires after gaze fuse or tap
  });
}

if (scene?.hasLoaded) bindOrbEvents();
else scene?.addEventListener('loaded', bindOrbEvents);

/* =========================================================
   (Optional) ESC to quickly toggle menu on desktop
========================================================= */
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') toggleMenu();
});