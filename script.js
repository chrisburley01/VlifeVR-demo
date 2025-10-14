/* ---- Orb + Billboard components ---- */
AFRAME.registerComponent('orb', {
  init: function () {
    // bigger hitbox so raycaster finds it easily
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

/* ---- Data (6 x 360 links) ---- */
let ORB_LINKS = [
  { title: 'YouTube 360', url: 'https://www.youtube.com/360' },
  { title: 'Vimeo 360', url: 'https://vimeo.com/360' },
  { title: 'AirPano 360 Videos', url: 'https://www.airpano.com/video/' },
  { title: 'NatGeo 360', url: 'https://www.youtube.com/playlist?list=PLivjPDlt6ApQUgZgY2hLpcZ3g4Zz4icZT' },
  { title: 'NYT The Daily 360', url: 'https://www.nytimes.com/spotlight/the-daily-360' },
  { title: 'GoPro 360 (YouTube)', url: 'https://www.youtube.com/@GoPro/search?query=360' }
];

// optional override file
fetch('assets/links.json')
  .then(r => r.ok ? r.json() : Promise.reject())
  .then(data => { if (Array.isArray(data) && data.length >= 6) ORB_LINKS = data.slice(0,6); })
  .catch(()=>{});

/* ---- UI + Background ---- */
const sky = document.getElementById('sky');
const statusText = document.getElementById('statusText');
const menuPanel = document.getElementById('menuPanel');
const hamburger = document.getElementById('hamburger');
const linkPanel = document.getElementById('linkPanel');
const linkTitle = document.getElementById('panelTitle');
const linkUrl = document.getElementById('panelUrl');
const openBtn = document.getElementById('openBtn');

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

/* ---- Dwell-to-open Link Panel (robust binding) ---- */
function bindOrbEvents() {
  document.querySelectorAll('.hotspot').forEach((el) => {
    // listen for 'click' (fires after fuse completes OR mouse click)
    el.addEventListener('click', () => {
      const idx = parseInt(el.getAttribute('data-key') || '0', 10);
      const row = ORB_LINKS[Math.max(0, Math.min(5, idx))] || ORB_LINKS[0];
      // fill panel
      linkTitle.setAttribute('text', 'value: ' + (row.title || 'Link'));
      linkUrl.setAttribute('text', 'value: ' + (row.url || ''));
      openBtn.onclick = () => {
        const u = (row.url || '').trim();
        if (u) { try { window.open(u, '_blank'); } catch(e){ location.href = u; } }
      };
      // attach panel to rig so it stays in front
      const rig = document.getElementById('rig');
      if (rig && !rig.object3D.children.includes(linkPanel.object3D)) {
        rig.object3D.add(linkPanel.object3D);
      }
      linkPanel.object3D.position.set(0, -0.1, -1.75);
      linkPanel.setAttribute('visible', true);
    });
  });
}

// IMPORTANT: wait for the scene to finish initializing
const scene = document.getElementById('scene');
if (scene.hasLoaded) bindOrbEvents();
else scene.addEventListener('loaded', bindOrbEvents);

// expose
window.setBackground = setBackground;
window.toggleMenu = toggleMenu;