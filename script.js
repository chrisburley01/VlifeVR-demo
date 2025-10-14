/* ---- Orb + Billboard components ---- */
AFRAME.registerComponent('orb', {
  init: function () {
    // nice big hitbox for raycaster
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

/* ---- 6 demo 360 video links (override via assets/links.json if you like) ---- */
let ORB_LINKS = [
  { title: 'YouTube 360',                 url: 'https://www.youtube.com/360' },
  { title: 'Vimeo 360',                   url: 'https://vimeo.com/360' },
  { title: 'AirPano 360 Videos',          url: 'https://www.airpano.com/video/' },
  { title: 'National Geographic 360',     url: 'https://www.youtube.com/playlist?list=PLivjPDlt6ApQUgZgY2hLpcZ3g4Zz4icZT' },
  { title: 'NYT – The Daily 360',         url: 'https://www.nytimes.com/spotlight/the-daily-360' },
  { title: 'GoPro 360 (YouTube)',         url: 'https://www.youtube.com/@GoPro/search?query=360' }
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

/* ---- Turn an orb into its own link panel (morph) ---- */
function expandOrbToPanel(orbEl, link) {
  // store original state so we can restore
  if (!orbEl.__vlifeOriginal) {
    orbEl.__vlifeOriginal = {
      geom: orbEl.getAttribute('geometry'),
      mat: orbEl.getAttribute('material'),
      scale: orbEl.getAttribute('scale') || '1 1 1'
    };
  }

  // clear children (if any)
  while (orbEl.firstChild) orbEl.removeChild(orbEl.firstChild);

  // make the orb itself a little pedestal plane with content
  orbEl.setAttribute('geometry', 'primitive: plane; width: 1.1; height: 0.5');
  orbEl.setAttribute('material', 'color: #000; opacity: 0.8; transparent: true');
  orbEl.setAttribute('scale', '1 1 1');

  // title
  const title = document.createElement('a-entity');
  title.setAttribute('text', `value: ${link.title}; align: center; color: #ffd100; width: 2`);
  title.setAttribute('position', '0 0.15 0.01');
  orbEl.appendChild(title);

  // url (wrapped)
  const url = document.createElement('a-entity');
  url.setAttribute('text', `value: ${link.url}; align: center; color: #fff; width: 1.9; wrapCount: 28`);
  url.setAttribute('position', '0 0.02 0.01');
  orbEl.appendChild(url);

  // open button
  const openBtn = document.createElement('a-entity');
  openBtn.setAttribute('class', 'linkbtn');
  openBtn.setAttribute('geometry', 'primitive: plane; width: 0.45; height: 0.16');
  openBtn.setAttribute('material', 'color: #0f2353; opacity: 0.95');
  openBtn.setAttribute('position', '0 -0.16 0.02');
  const label = document.createElement('a-entity');
  label.setAttribute('text', 'value: Open; align: center; color: #fff; width: 1');
  label.setAttribute('position', '0 0 0.01');
  openBtn.appendChild(label);
  openBtn.addEventListener('click', () => {
    try { window.open(link.url, '_blank'); } catch(e) { location.href = link.url; }
  });
  orbEl.appendChild(openBtn);

  // close to revert
  const closeBtn = document.createElement('a-entity');
  closeBtn.setAttribute('class', 'linkbtn');
  closeBtn.setAttribute('text', 'value: ✕; align: center; color: #fff; width: 1');
  closeBtn.setAttribute('position', '0.52 0.22 0.03');
  closeBtn.addEventListener('click', () => restoreOrb(orbEl));
  orbEl.appendChild(closeBtn);
}

function restoreOrb(orbEl) {
  if (!orbEl.__vlifeOriginal) return;
  // remove children (panel bits)
  while (orbEl.firstChild) orbEl.removeChild(orbEl.firstChild);
  // restore sphere
  orbEl.setAttribute('geometry', orbEl.__vlifeOriginal.geom);
  orbEl.setAttribute('material', orbEl.__vlifeOriginal.mat);
  orbEl.setAttribute('scale', orbEl.__vlifeOriginal.scale);
}

/* ---- Bind gaze+tap to each orb (after scene is loaded) ---- */
function bindOrbEvents() {
  const orbs = document.querySelectorAll('.hotspot');
  orbs.forEach((el) => {
    const idx = parseInt(el.getAttribute('data-key') || '0', 10);
    const link = ORB_LINKS[Math.max(0, Math.min(5, idx))] || ORB_LINKS[0];

    // click fires after gaze fuse OR mouse/tap
    el.addEventListener('click', () => expandOrbToPanel(el, link));
  });
}

const scene = document.getElementById('scene');
if (scene.hasLoaded) bindOrbEvents();
else scene.addEventListener('loaded', bindOrbEvents);