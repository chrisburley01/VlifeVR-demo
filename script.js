/* =========================================================
   VLife 360 – script.js (v17)
   "Door" panel + auto preview (no uploads)
   - YouTube auto thumbnail
   - Fallback: domain card with favicon
   - Subtle motion on preview
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
   Door panel + previews (no uploads)
========================================================= */

// Hide/show all orbs when a panel is open
function setOrbsVisible(visible) {
  document.querySelectorAll('.hotspot').forEach(o => o.setAttribute('visible', visible));
}

// Try to build a preview image for a URL (no uploads)
// - YouTube → thumbnail
// - Others → favicon card
function parseYouTubeId(u) {
  try {
    const url = new URL(u);
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1);
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v) return v;
      // playlist/shorts – no single id; return null
    }
  } catch(_) {}
  return null;
}
function previewForLink(link) {
  const out = { type: 'image', src: null, title: link.title || '', host: null, favicon: null };
  try {
    const u = new URL(link.url);
    out.host = u.host;
    out.favicon = `https://icons.duckduckgo.com/ip3/${u.hostname}.ico`;
  } catch(_) {}
  const yt = parseYouTubeId(link.url || '');
  if (yt) {
    out.src = `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;
    return out;
  }
  // Fallback: no direct preview, use favicon-card pattern
  return out;
}

/* Create the door panel at a world position, with swing-open animation */
function spawnDoorPanel(worldPos, link) {
  const panel = document.createElement('a-entity');
  panel.setAttribute('position', `${worldPos.x} ${worldPos.y} ${worldPos.z}`);
  panel.setAttribute('billboard', '');

  // Start closed (like a thin edge), rotate a bit, then swing open
  panel.setAttribute('rotation', '0 20 0');
  panel.setAttribute('scale', '0.01 1 1');
  panel.setAttribute('animation__open_scale', 'property: scale; to: 1 1 1; dur: 380; easing: easeOutCubic');
  panel.setAttribute('animation__open_rot', 'property: rotation; to: 0 0 0; dur: 380; easing: easeOutCubic');

  // Sizes (door-size)
  const W = 3.2, H = 1.8, headerH = 0.16;

  // Backing plate
  const back = document.createElement('a-entity');
  back.setAttribute('geometry', `primitive: plane; width: ${W}; height: ${H}`);
  back.setAttribute('material', 'color: #000; opacity: 0.88; transparent: true');
  back.setAttribute('position', '0 0 0.002');
  panel.appendChild(back);

  // Header strip
  const header = document.createElement('a-entity');
  header.setAttribute('geometry', `primitive: plane; width: ${W}; height: ${headerH}`);
  header.setAttribute('material', 'color: #ffd100; opacity: 0.98');
  header.setAttribute('position', `0 ${H/2 - headerH/2} 0.01`);
  panel.appendChild(header);

  // Title text
  const title = document.createElement('a-entity');
  title.setAttribute('text', `value: ${link.title || ''}; align: center; color: #111; width: 5; zOffset: 0.01`);
  title.setAttribute('position', `${0} ${H/2 - headerH/2} ${0.02}`);
  panel.appendChild(title);

  // URL (white)
  const urlTxt = document.createElement('a-entity');
  urlTxt.setAttribute('text', `value: ${link.url || ''}; align: center; color: #fff; width: 4.6; wrapCount: 64; zOffset: 0.01`);
  urlTxt.setAttribute('position', `0 ${H/2 - headerH - 0.10} 0.02`);
  panel.appendChild(urlTxt);

  // Preview area (image or favicon card)
  const preview = previewForLink(link);
  if (preview.src) {
    // Image preview
    const img = document.createElement('a-image');
    img.setAttribute('src', preview.src);
    img.setAttribute('width', W - 0.4);
    img.setAttribute('height', H - headerH - 0.6);
    img.setAttribute('position', `0 ${0.05} 0.025`);
    // gentle “rolling” motion
    img.setAttribute('animation__zoom', 'property: scale; dir: alternate; from: 1 1 1; to: 1.06 1.06 1; dur: 2600; easing: easeInOutSine; loop: true');
    panel.appendChild(img);
  } else {
    // Favicon + host “card”
    const card = document.createElement('a-entity');
    card.setAttribute('geometry', `primitive: plane; width: ${W - 0.4}; height: ${H - headerH - 0.6}`);
    card.setAttribute('material', 'color: #0b1a3a; opacity: 0.92; transparent: true');
    card.setAttribute('position', `0 ${0.05} 0.025`);
    panel.appendChild(card);

    if (preview.favicon) {
      const ico = document.createElement('a-image');
      ico.setAttribute('src', preview.favicon);
      ico.setAttribute('width', 0.28);
      ico.setAttribute('height', 0.28);
      ico.setAttribute('position', `-1.2 ${0.32} 0.03`);
      panel.appendChild(ico);
    }
    const hostLabel = document.createElement('a-entity');
    hostLabel.setAttribute('text', `value: ${preview.host || ''}; align: left; color: #fff; width: 3.4; zOffset: 0.01`);
    hostLabel.setAttribute('position', `-1.0 ${0.32} 0.03`);
    panel.appendChild(hostLabel);

    const desc = document.createElement('a-entity');
    desc.setAttribute('text', 'value: Preview not available — tap Open to visit; align: center; color: #cfd8ff; width: 3.8; wrapCount: 40; zOffset: 0.01');
    desc.setAttribute('position', `0 ${-0.10} 0.03`);
    panel.appendChild(desc);

    // subtle shimmer to keep it “alive”
    card.setAttribute('animation__pulse', 'property: material.opacity; dir: alternate; from: 0.90; to: 0.96; dur: 1800; easing: easeInOutSine; loop: true');
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
  panel.appendChild(openBtn);

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
  panel.appendChild(closeBtn);

  return { panel, closeBtn };
}

/* Expand from orb click/gaze */
function expandOrbToPanel(orbEl, link) {
  // Clear older
  if (orbEl.__panelEl) {
    try { orbEl.__panelEl.parentNode.removeChild(orbEl.__panelEl); } catch(e){}
    orbEl.__panelEl = null;
  }
  clearTimeout(orbEl.__autoCloseTimer);
  clearTimeout(orbEl.__lookAwayTimer);

  // World position + lift
  const worldPos = new THREE.Vector3();
  orbEl.object3D.getWorldPosition(worldPos);
  worldPos.y += 1.3; // door higher

  // Hide orbs while panel is open
  setOrbsVisible(false);

  const { panel, closeBtn } = spawnDoorPanel(worldPos, link);
  scene.appendChild(panel);
  orbEl.__panelEl = panel;

  // Close handlers
  const closeAll = () => {
    clearTimeout(orbEl.__autoCloseTimer);
    clearTimeout(orbEl.__lookAwayTimer);
    if (orbEl.__panelEl) {
      try { orbEl.__panelEl.parentNode.removeChild(orbEl.__panelEl); } catch(e){}
      orbEl.__panelEl = null;
    }
    setOrbsVisible(true);
  };
  closeBtn.addEventListener('click', closeAll);

  // Auto/Look-away with 300ms lockout
  orbEl.__autoCloseTimer = setTimeout(closeAll, 8000);
  let lookAwayArmed = false;
  setTimeout(() => { lookAwayArmed = true; }, 300);
  const cancelLookAway = () => { if (lookAwayArmed) clearTimeout(orbEl.__lookAwayTimer); };
  const startLookAway  = () => {
    if (!lookAwayArmed) return;
    clearTimeout(orbEl.__lookAwayTimer);
    orbEl.__lookAwayTimer = setTimeout(closeAll, 1200);
  };
  panel.addEventListener('mouseenter', cancelLookAway);
  panel.addEventListener('mouseleave', startLookAway);
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
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleMenu(); });