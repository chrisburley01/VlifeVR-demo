// --- Components for orbs ---
AFRAME.registerComponent('orb', {
  init: function () {
    // sphere + glow material
    this.el.setAttribute('geometry', 'primitive: sphere; radius: 0.12');
    this.el.setAttribute('material', 'color: #ffd100; emissive: #ffd100; emissiveIntensity: 0.9; metalness: 0.1; roughness: 0.4');
    // pulse
    this.el.setAttribute('animation__pulse', 'property: scale; dir: alternate; dur: 1200; easing: easeInOutSine; loop: true; to: 1.3 1.3 1.3');
    // interactions
    this.el.addEventListener('mouseenter', () => this.el.object3D.scale.set(1.5,1.5,1.5));
    this.el.addEventListener('mouseleave', () => this.el.object3D.scale.set(1,1,1));
    // click to change background
    this.el.addEventListener('click', () => {
      const bg = this.el.getAttribute('data-bg');
      if (bg) setBackground(bg);
    });
  }
});

AFRAME.registerComponent('billboard', {
  tick: function () {
    const cam = this.cam || (this.cam = document.querySelector('a-camera'));
    if (!cam) return;
    this.el.object3D.lookAt(cam.object3D.position);
  }
});

// --- UI logic ---
const sky = document.getElementById('sky');
const statusText = document.getElementById('statusText');
const menuPanel = document.getElementById('menuPanel');
const hamburger = document.getElementById('hamburger');

const labelMap = {
  Park360: 'Park Steps 360',
  Forrest360: 'Forest 360',
  Futurecity360: 'Future City 360',
  Neonnightclub: 'Neon Nightclub 360',
  floating_sky_monastery_upscaled_8: 'Floating Sky Monastery 8K'
};

function setBackground(bg) {
  sky.setAttribute('src', '#' + bg);
  statusText.textContent = 'Using 360 image: ' + (labelMap[bg] || bg);
  // collapse panel to hamburger
  menuPanel.classList.add('hidden');
  hamburger.classList.remove('hidden');
}

function toggleMenu() {
  const hidden = menuPanel.classList.toggle('hidden');
  if (hidden) hamburger.classList.remove('hidden');
  else hamburger.classList.remove('hidden');
}

function enterVR(){ document.querySelector('a-scene').enterVR(); }
function enterAR(){ document.querySelector('a-scene').enterAR(); }

// expose functions
window.setBackground = setBackground;
window.toggleMenu = toggleMenu;
window.enterVR = enterVR;
window.enterAR = enterAR;