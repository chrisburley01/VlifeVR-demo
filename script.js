/* =========================================================
   VLife 360 – full script.js
   - Orb components
   - Link data (with optional /assets/links.json override)
   - Menu collapse -> hamburger
   - Orb -> BIG floating link panel w/ marquee
   - Auto-close + look-away close
   - Binding (gaze fuse or tap)
========================================================= */

/* ---------- Components ---------- */
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
  .catch(()=>{ /* keep defaults */ });

/* ---------- UI elements ---------- */
const scene      = document.getElementById('scene');
const sky        = document.getElementById('sky');
const statusText = document.getElementById('statusText');
const menuPanel  = document.getElementById('menuPanel');
const hamburger  = document.getElementById('hamburger');

/* Background labels for status line */
const labelMap = {
  Park360: 'Park 360',
  Forrest360: 'Forest 360',
  Futurecity360: 'Future City 360',
  Neonnightclub: 'Neon Nightclub 360',
  floating_sky_monastery_upscaled_8k: 'Floating Sky Monastery 8K'
};

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
   Helpers for display + marquee
========================================================= */

// Trim for initial fit (Open button still uses full URL)
function trimUrlForDisplay(u, max = 44) {
  try {
    const url = new URL(u);
    const base = url.host;
    const path = (url.pathname + url.search).replace(/\/+$/,'');
    const shown = (base + path);
    return shown.length > max ? shown.slice(0, max - 1) + '…' : shown;
  } catch { return u.length > max ? u.slice(0, max - 1) + '…' : u; }
}

/**
 * Start a marquee that scrolls text inside a character window.
 * We emulate clipping by showing a moving substring.
 * Call stopMarquee(entity) to cancel.
 */
function startMarquee(textEntity, fullText, windowChars, stepMs = 120, spacer = '   •   ') {
  stopMarquee(textEntity);
  if (!fullText || fullText.length <= windowChars) {
    textEntity.setAttribute('text', 'value', fullText || '');
    return;
  }
  const scroll = fullText + spacer + fullText;
  let i = 0;
  const tick = () => {
    const slice = scroll.slice(i, i + windowChars);
    textEntity.setAttribute('text', 'value', slice);
    i = (i + 1) % (fullText.length + spacer.length);
    textEntity.__marqueeTimer = setTimeout(tick, stepMs);
  };
  tick();
}
function stopMarquee(textEntity) {
  if (textEntity && textEntity.__marqueeTimer) {
    clearTimeout(textEntity.__marqueeTimer);
    textEntity.__marqueeTimer = null;
  }
}

/* =========================================================
   Orb -> BIG floating panel (above orb) with marquee
   - appears 1.2 m above the orb
   - auto-closes after 8 s
   - closes 1.2 s after look-away (armed after 300 ms to avoid jitter)
========================================================= */
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

  // reset timers
  clearTimeout(orbEl.__autoCloseTimer);
  clearTimeout(orbEl.__lookAwayTimer);

  // raise panel above the orb line (higher so the orb never overlaps)
  const lift = 1.2; // metres
  const p = orbEl.__vlifeOriginal.pos;
  orbEl.setAttribute('position', `${p.x} ${p.y + lift} ${p.z}`);

  // wipe old children / geometry
  while (orbEl.firstChild) orbEl.removeChild(orbEl.firstChild);

  // container so hover/leave applies to whole surface
  const panelRoot = document.createElement('a-entity');
  orbEl.appendChild(panelRoot);

  // BIGGER BOXES
  const panelW = 2.40, panelH = 0.84;
  const headerH = 0.12;

  // background
  const bg = document.createElement('a-entity');
  bg.setAttribute('geometry', `primitive: plane; width: ${panelW}; height: ${panelH}`);
  bg.setAttribute('material', 'color: #000; opacity: 0.82; transparent: true');
  bg.setAttribute('position', '0 0 0.005');
  panelRoot.appendChild(bg);

  // header bar
  const header = document.createElement('a-entity');
  header.setAttribute('geometry', `primitive: plane; width: ${panelW}; height: ${headerH}`);
  header.setAttribute('material', 'color: #ffd100; opacity: 0.96');
  header.setAttribute('position', `0 ${panelH/2 - headerH/2} 0.01`);
  panelRoot.appendChild(header);

  // Title (marquee if long)
  const titleEntity = document.createElement('a-entity');
  titleEntity.setAttribute('text', `value: ${link.title}; align: center; color: #111; width: 3.2; zOffset: 0.01`);
  titleEntity.setAttribute('position', `0 ${panelH/2 - headerH/2} 0.015`);
  panelRoot.appendChild(titleEntity);
  startMarquee(titleEntity, link.title || '', 34, 120);

  // URL (display + marquee)
  const urlEntity = document.createElement('a-entity');
  urlEntity.setAttribute('text', `value: ${trimUrlForDisplay(link.url, 44)}; align: center; color: #fff; width: 2.6; wrapCount: 36; zOffset: 0.01`);
  urlEntity.setAttribute('position', '0 0.16 0.015');
  panelRoot.appendChild(urlEntity);
  startMarquee(urlEntity, link.url || '', 44, 90);

  // Open button (bigger)
  const openBtn = document.createElement('a-entity');
  openBtn.setAttribute('class', 'linkbtn');
  openBtn.setAttribute('geometry', 'primitive: plane; width: 0.80; height: 0.22');
  openBtn.setAttribute('material', 'color: #0f2353; opacity: 0.96');
  openBtn.setAttribute('position', '0 -0.22 0.02');
  const label = document.createElement('a-entity');
  label.setAttribute('text', 'value: Open; align: center; color: #fff; width: 1.4; zOffset: 0.01');
  label.setAttribute('position', '0 0 0.01');
  openBtn.appendChild(label);
  openBtn.addEventListener('click', () => {
    const u = (link.url || '').trim();
    if (u) { try { window.open(u, '_blank'); } catch(e) { location.href = u; } }
  });
  panelRoot.appendChild(openBtn);

  // Close (top-right, bigger hit area)
  const closeBtn = document.createElement('a-entity');
  closeBtn.setAttribute('class', 'linkbtn');
  closeBtn.setAttribute('geometry', 'primitive: plane; width: 0.16; height: 0.16');
  closeBtn.setAttribute('material', 'color: #000; opacity: 0.001; transparent: true');
  closeBtn.setAttribute('position', `${panelW/2 - 0.11} ${panelH/2 - 0.11} 0.03`);
  const closeGlyph = document.createElement('a-entity');
  closeGlyph.setAttribute('text', 'value: ✕; align: center; color: #fff; width: 1.6; zOffset: 0.01');
  closeGlyph.setAttribute('position', '0 0 0.01');
  closeBtn.appendChild(closeGlyph);
  closeBtn.addEventListener('click', () => restoreOrb(orbEl));
  panelRoot.appendChild(closeBtn);

  // --- timers: auto-close + look-away with 300ms lockout ---
  orbEl.__autoCloseTimer = setTimeout(() => restoreOrb(orbEl), 8000);

  let lookAwayArmed = false; // ignore jitter just after open
  setTimeout(() => { lookAwayArmed = true; }, 300);

  const cancelLookAway = () => { if (lookAwayArmed) clearTimeout(orbEl.__lookAwayTimer); };
  const startLookAway  = () => {
    if (!lookAwayArmed) return;
    clearTimeout(orbEl.__lookAwayTimer);
    orbEl.__lookAwayTimer = setTimeout(() => restoreOrb(orbEl), 1200);
  };

  panelRoot.addEventListener('mouseenter', cancelLookAway);
  panelRoot.addEventListener('mouseleave', startLookAway);

  // keep refs to stop marquees on restore
  orbEl.__panelNodes = { titleEntity, urlEntity };
}

/* ---------- Restore orb ---------- */
function restoreOrb(orbEl) {
  if (!orbEl?.__vlifeOriginal) return;
  clearTimeout(orbEl.__autoCloseTimer);
  clearTimeout(orbEl.__lookAwayTimer);

  // stop marquees
  if (orbEl.__panelNodes) {
    stopMarquee(orbEl.__panelNodes.titleEntity);
    stopMarquee(orbEl.__panelNodes.urlEntity);
    orbEl.__panelNodes = null;
  }

  // clear children
  while (orbEl.firstChild) orbEl.removeChild(orbEl.firstChild);

  // restore sphere + original position
  orbEl.setAttribute('geometry', orbEl.__vlifeOriginal.geom);
  orbEl.setAttribute('material', orbEl.__vlifeOriginal.mat);
  orbEl.setAttribute('scale',    orbEl.__vlifeOriginal.scale);
  const p = orbEl.__vlifeOriginal.pos;
  orbEl.setAttribute('position', `${p.x} ${p.y} ${p.z}`);
}

/* =========================================================
   Bind: gaze fuse or tap triggers the panel
   (Dual cursors are set in index.html)
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

/* ---------- Optional: ESC toggles menu on desktop ---------- */
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') toggleMenu();
});