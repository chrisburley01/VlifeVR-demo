/* ---------- Orb + Billboard ---------- */
AFRAME.registerComponent('orb', {
  init: function () {
    this.el.setAttribute('geometry', 'primitive: sphere; radius: 0.12');
    this.el.setAttribute('material', 'color: #ffd100; emissive: #ffd100; emissiveIntensity: 0.9; metalness: 0.1; roughness: 0.4');
    this.el.setAttribute('animation__pulse', 'property: scale; dir: alternate; dur: 1200; easing: easeInOutSine; loop: true; to: 1.3 1.3 1.3');
    this.el.addEventListener('mouseenter', () => this.el.object3D.scale.set(1.5,1.5,1.5));
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

/* ---------- Data (6 x 360 links) ---------- */
/* Edit assets/links.json to change these live */
let ORB_LINKS = [
  { title: 'YouTube 360', url: 'https://www.youtube.com/360' },
  { title: 'Vimeo 360', url: 'https://vimeo.com/360' },
  { title: 'AirPano 360 Videos', url: 'https://www.airpano.com/video/' },
  { title: 'National Geographic 360', url: 'https://www.youtube.com/playlist?list=PLivjPDlt6ApQUgZgY2hLpcZ3g4Zz4icZT' },
  { title: 'NYTimes – The Daily 360', url: 'https://www.nytimes.com/spotlight/the-daily-360' },
  { title: 'GoPro 360 (YouTube)', url: 'https://www.youtube.com/@GoPro/search?query=360' }
];

fetch('assets/links.json')
  .then(r => r.ok ? r.json() : Promise.reject())
  .then(data => { if (Array.isArray(data) && data.length === 6) ORB_LINKS = data; })
  .catch(()=>{}); // fall back to defaults

/* ---------- UI + Background ---------- */
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

/* ---------- Dwell-to-open Link Panel ---------- */
/* Using a-cursor with fuse=true: after ~1.2s gaze, a 'click' event fires on the orb */
document.addEventListener('DOMContentLoaded', () => {
  const rig = document.getElementById('rig');

  // Ensure panel stays in front of the user (parent to rig when showing)
  function showLinkPanelForIndex(idx){
    const row = ORB_LINKS[idx] || ORB_LINKS[0];
    linkTitle.setAttribute('text', 'value: ' + (row.title || 'Link'));
    linkUrl.setAttribute('text', 'value: ' + (row.url || ''));
    openBtn.onclick = () => {
      const u = (row.url || '').trim();
      if (u) { try { window.open(u, '_blank'); } catch(e){ location.href = u; } }
    };
    if (rig && !rig.object3D.children.includes(linkPanel.object3D)) {
      rig.object3D.add(linkPanel.object3D);
      linkPanel.object3D.position.set(0, -0.1, -1.8); // a touch below eye and 1.8m ahead
    }
    linkPanel.setAttribute('visible', true);
  }

  // Hide panel if user taps outside later (optional: map to ESC/back button)
  window.hideLinkPanel = () => linkPanel.setAttribute('visible', false);

  // Attach to all hotspots: gaze dwell (cursor fuse) triggers 'click'
  document.querySelectorAll('.hotspot').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.getAttribute('data-key') || '0', 10);
      showLinkPanelForIndex(Math.max(0, Math.min(5, idx)));
    });
  });
});

/* Expose */
window.setBackground = setBackground;
window.toggleMenu = toggleMenu;