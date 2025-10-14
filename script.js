/* ===== Config ===== */
const AUTO_CLOSE_MS = 8000;      // auto-close after 8 seconds
const LOOK_AWAY_GRACE_MS = 1200; // how long you can look away before closing

/* ---- Orb + Billboard components ---- */
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

/* ---- Demo links (override via assets/links.json) ---- */
let ORB_LINKS = [
  { title: 'YouTube 360',             url: 'https://www.youtube.com/360' },
  { title: 'Vimeo 360',               url: 'https://vimeo.com/360' },
  { title: 'AirPano 360 Videos',      url: 'https://www.airpano.com/video/' },
  { title: 'National Geographic 360', url: 'https://www.youtube.com/playlist?list=PLivjPDlt6ApQUgZgY2hLpcZ3g4Zz4icZT' },
  { title: 'NYT – The Daily 360',     url: 'https://www.nytimes.com/spotlight/the-daily-360' },
  { title: 'GoPro 360 (YouTube)',     url: 'https://www.youtube.com/@GoPro/search?query=360' }
];
fetch('assets/links.json')
  .then(r => r.ok ? r.json() : Promise.reject())
  .then(d => { if (Array.isArray(d) && d.length >= 6) ORB_LINKS = d.slice(0,6); })
  .catch(()=>{});

/* ---- UI + Background ---- */
const sky = document.getElementById('sky');
const statusText = document.getElementById('statusText');
const menuPanel = document.getElementById('menuPanel');
const hamburger = document.getElementById('hamburger');

const labelMap = {
  Park360: 'Park 360',
  Forrest360: 'Forest 360',
  Futurecity360: 'Future City 360',
  Neonnightclub: 'Neon Nightclub 360',
  floating_sky_monastery_upscaled_8k: 'Floating Sky Monastery 8K'
};

function setBackground(bg) {
  sky.setAttribute('src', '#' + bg);
  if (statusText) statusText.textContent = 'Using 360: ' + (labelMap[bg] || bg);
  menuPanel.classList.add('hidden');
  hamburger.classList.remove('hidden');
}
function toggleMenu() {
  const hidden = menuPanel.classList.toggle('hidden');
  if (hidden) hamburger.classList.remove('hidden');
}
window.setBackground = setBackground;
window.toggleMenu = toggleMenu;

/* ---------- Orb → Floating Panel (raised above orb) + Auto/Look-away close ---------- */

function expandOrbToPanel(orbEl, link) {
  // save original state
  if (!orbEl.__vlifeOriginal) {
    orbEl.__vlifeOriginal = {
      geom: orbEl.getAttribute('geometry'),
      mat: orbEl.getAttribute('material'),
      scale: orbEl.getAttribute('scale') || '1 1 1',
      pos: Object.assign({}, orbEl.getAttribute('position'))
    };
  }

  // lift panel above the orb
  const lift = 0.55;
  const p = orbEl.__vlifeOriginal.pos;
  orbEl.setAttribute('position', `${p.x} ${p.y + lift} ${p.z}`);

  // clear children
  while (orbEl.firstChild) orbEl.removeChild(orbEl.firstChild);

  // convert to panel
  const panelW = 1.05, panelH = 0.42;
  orbEl.setAttribute('geometry', `primitive: plane; width: ${panelW}; height: ${panelH}`);
  orbEl.setAttribute('material', 'color: #000; opacity: 0.80; transparent: true');

  // header strip + title
  const header = document.createElement('a-entity');
  header.setAttribute('geometry', `primitive: plane; width: ${panelW}; height: 0.08`);
  header.setAttribute('material', 'color: #ffd100; opacity: 0.95');
  header.setAttribute('position', `0 ${panelH/2 - 0.04} 0.01`);
  orbEl.appendChild(header);

  const title = document.createElement('a-entity');
  title.setAttribute('text', `value: ${link.title}; align: center; color: #111; width: 2`);
  title.setAttribute('position', '0 ' + (panelH/2 - 0.04) + ' 0.02');
  orbEl.appendChild(title);

  // url
  const url = document.createElement('a-entity');
  url.setAttribute('text', `value: ${link.url}; align: center; color: #fff; width: 1.7; wrapCount: 26`);
  url.setAttribute('position', '0 0.03 0.02');
  orbEl.appendChild(url);

  // open button
  const openBtn = document.createElement('a-entity');
  openBtn.setAttribute('class', 'linkbtn');
  openBtn.setAttribute('geometry', 'primitive: plane; width: 0.44; height: 0.16');
  openBtn.setAttribute('material', 'color: #0f2353; opacity: 0.95');
  openBtn.setAttribute('position', '0 -0.13 0.02');
  const label = document.createElement('a-entity');
  label.setAttribute('text', 'value: Open; align: center; color: #fff; width: 1');
  label.setAttribute('position', '0 0 0.01');
  openBtn.appendChild(label);
  openBtn.addEventListener('click', () => {
    try { window.open(link.url, '_blank'); } catch(e) { location.href = link.url; }
  });
  orbEl.appendChild(openBtn);

  // close (top-right)
  const closeBtn = document.createElement('a-entity');
  closeBtn.setAttribute('class', 'linkbtn');
  closeBtn.setAttribute('geometry', 'primitive: plane; width: 0.12; height: 0.12');
  closeBtn.setAttribute('material', 'color: #000; opacity: 0.001; transparent: true');
  closeBtn.setAttribute('position', (panelW/2 - 0.08) + ' ' + (panelH/2 - 0.08) + ' 0.03');
  const closeGlyph = document.createElement('a-entity');
  closeGlyph.setAttribute('text', 'value: ✕; align: center; color: #fff; width: 1.2');
  closeGlyph.setAttribute('position', '0 0 0.01');
  closeBtn.appendChild(closeGlyph);
  closeBtn.addEventListener('click', () => restoreOrb(orbEl));
  orbEl.appendChild(closeBtn);

  /* --- Auto-close + look-away timers --- */
  resetOrbTimers(orbEl); // start fresh timers

  // keep timers alive while hovering the panel
  const keepAlive = () => resetOrbTimers(orbEl);
  ['mouseenter', 'mousemove'].forEach(evt => {
    orbEl.addEventListener(evt, keepAlive);
    openBtn.addEventListener(evt, keepAlive);
    closeBtn.addEventListener(evt, keepAlive);
  });

  // if gaze leaves the panel, start grace countdown; if it returns, cancel
  let awayTimer = null;
  const startAway = () => {
    if (awayTimer) return;
    awayTimer = setTimeout(() => restoreOrb(orbEl), LOOK_AWAY_GRACE_MS);
  };
  const cancelAway = () => { if (awayTimer) { clearTimeout(awayTimer); awayTimer = null; } resetOrbTimers(orbEl); };

  orbEl.addEventListener('mouseleave', startAway);
  orbEl.addEventListener('cursor-leave', startAway);
  orbEl.addEventListener('mouseenter', cancelAway);
}

/* timers stored per-orb */
function resetOrbTimers(orbEl) {
  if (orbEl.__autoClose) clearTimeout(orbEl.__autoClose);
  orbEl.__autoClose = setTimeout(() => restoreOrb(orbEl), AUTO_CLOSE_MS);
}

function restoreOrb(orbEl) {
  if (!orbEl || !orbEl.__vlifeOriginal) return;
  // clear timers
  if (orbEl.__autoClose) clearTimeout(orbEl.__autoClose);
  orbEl.__autoClose = null;

  // remove children (panel UI)
  while (orbEl.firstChild) orbEl.removeChild(orbEl.firstChild);

  // restore sphere + position
  orbEl.setAttribute('geometry', orbEl.__vlifeOriginal.geom);
  orbEl.setAttribute('material', orbEl.__vlifeOriginal.mat);
  orbEl.setAttribute('scale', orbEl.__vlifeOriginal.scale);
  const p = orbEl.__vlifeOriginal.pos;
  orbEl.setAttribute('position', `${p.x} ${p.y} ${p.z}`);
}

/* ---- Bind gaze+tap to each orb ---- */
function bindOrbEvents() {
  document.querySelectorAll('.hotspot').forEach((el) => {
    const idx = parseInt(el.getAttribute('data-key') || '0', 10);
    const link = ORB_LINKS[Math.max(0, Math.min(5, idx))] || ORB_LINKS[0];
    el.addEventListener('click', () => expandOrbToPanel(el, link)); // fires after gaze fuse OR tap
  });
}

const scene = document.getElementById('scene');
if (scene.hasLoaded) bindOrbEvents();
else scene.addEventListener('loaded', bindOrbEvents);