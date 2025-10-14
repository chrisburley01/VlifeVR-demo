/* ---------- ORB + BILLBOARD COMPONENTS ---------- */
AFRAME.registerComponent('orb', {
  init: function () {
    this.el.setAttribute('geometry', 'primitive: sphere; radius: 0.12');
    this.el.setAttribute('material', 'color: #ffd100; emissive: #ffd100; emissiveIntensity: 0.9; metalness: 0.1; roughness: 0.4');
    this.el.setAttribute('animation__pulse', 'property: scale; dir: alternate; dur: 1200; easing: easeInOutSine; loop: true; to: 1.3 1.3 1.3');
    this.el.addEventListener('mouseenter', () => this.el.object3D.scale.set(1.5,1.5,1.5));
    this.el.addEventListener('mouseleave', () => this.el.object3D.scale.set(1,1,1));
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

/* ---------- LINKS BOARD COMPONENT ---------- */
/*
  Usage:
  <a-entity link-board="src: assets/media.json; width:1.4; rowHeight:0.18; maxRows:7"></a-entity>

  media.json format:
  [
    {"title":"Walkers Website","url":"https://www.walkerstransport.co.uk"},
    {"title":"YouTube Demo","url":"https://youtu.be/..."},
    {"title":"Onboarding Portal","url":"https://chrisburley01.github.io/walkers-onboarding"}
  ]
*/
AFRAME.registerComponent('link-board', {
  schema: {
    src: {type: 'string'},
    width: {type: 'number', default: 1.4},
    rowHeight: {type: 'number', default: 0.18},
    maxRows: {type: 'number', default: 7}
  },
  init: function () {
    this.buildFrame();
    this.loadLinks();
  },
  buildFrame: function () {
    const w = this.data.width;
    const h = this.data.rowHeight * (this.data.maxRows + 1) + 0.2;
    // background panel
    this.panel = document.createElement('a-entity');
    this.panel.setAttribute('geometry', `primitive: plane; width: ${w + 0.2}; height: ${h}`);
    this.panel.setAttribute('material', 'color: #111a; opacity: 0.9; transparent: true');
    this.el.appendChild(this.panel);

    // title
    const title = document.createElement('a-entity');
    title.setAttribute('text', 'value: Links; color: #f7901e; align: center; width: 2;');
    title.setAttribute('position', '0 ' + (h/2 - 0.14) + ' 0.01');
    this.el.appendChild(title);

    // close button (X)
    const close = document.createElement('a-entity');
    close.setAttribute('geometry', 'primitive: plane; width: 0.16; height: 0.16');
    close.setAttribute('material', 'color: #550; opacity: 0.0; transparent: true'); // invisible hit area
    close.setAttribute('position', (w/2) + ' ' + (h/2 - 0.14) + ' 0.02');
    close.setAttribute('class', 'linkbtn');
    close.addEventListener('click', () => toggleLinksBoard(false));
    // visible X glyph
    const x = document.createElement('a-entity');
    x.setAttribute('text', 'value: ✕; color: #fff; align: center; width: 1.2;');
    x.setAttribute('position', '0 0 0.01');
    close.appendChild(x);
    this.el.appendChild(close);
  },
  loadLinks: function () {
    fetch(this.data.src)
      .then(r => r.json())
      .then(items => this.render(items))
      .catch(() => {
        // fallback if file missing or invalid
        this.render([
          {title: 'VLife Home', url: 'https://chrisburley01.github.io'},
          {title: 'Walkers Transport', url: 'https://www.walkerstransport.co.uk'},
          {title: 'YouTube', url: 'https://youtube.com'}
        ]);
      });
  },
  render: function (items) {
    const w = this.data.width;
    const rh = this.data.rowHeight;
    const startY = (this.data.rowHeight * (this.data.maxRows/2)) - 0.25;
    const max = Math.min(items.length, this.data.maxRows);
    for (let i = 0; i < max; i++) {
      const it = items[i];

      // button background
      const btn = document.createElement('a-entity');
      btn.setAttribute('geometry', `primitive: plane; width: ${w}; height: ${rh}`);
      btn.setAttribute('material', 'color: #0f2353; opacity: 0.95');
      btn.setAttribute('position', `0 ${startY - i*rh} 0.02`);
      btn.setAttribute('class', 'linkbtn');

      // label
      const label = document.createElement('a-entity');
      label.setAttribute('text', `value: ${it.title || it.url}; align: center; color: #fff; width: 1.8;`);
      label.setAttribute('position', '0 0 0.01');
      btn.appendChild(label);

      // interactions
      btn.addEventListener('mouseenter', () => btn.setAttribute('scale', '1.03 1.06 1'));
      btn.addEventListener('mouseleave', () => btn.setAttribute('scale', '1 1 1'));
      btn.addEventListener('click', () => {
        try { window.open(it.url, '_blank'); } catch (e) { location.href = it.url; }
      });

      this.el.appendChild(btn);
    }
  }
});

/* ---------- UI / BACKGROUND ---------- */
const sky = document.getElementById('sky');
const statusText = document.getElementById('statusText');
const menuPanel = document.getElementById('menuPanel');
const hamburger = document.getElementById('hamburger');
const linksBoard = document.getElementById('linksBoard');

const labelMap = {
  Park360: 'Park Steps 360',
  Forrest360: 'Forest 360',
  Futurecity360: 'Future City 360',
  Neonnightclub: 'Neon Nightclub 360',
  floating_sky_monastery_upscaled_8k: 'Floating Sky Monastery 8K'
};

function setBackground(bg) {
  sky.setAttribute('src', '#' + bg);
  statusText.textContent = 'Using 360 image: ' + (labelMap[bg] || bg);
  menuPanel.classList.add('hidden');
  hamburger.classList.remove('hidden');
}

function toggleMenu() {
  const hidden = menuPanel.classList.toggle('hidden');
  if (hidden) hamburger.classList.remove('hidden');
  else hamburger.classList.remove('hidden');
}

function toggleLinksBoard(force) {
  // if force is boolean, use it; else toggle
  const next = (typeof force === 'boolean') ? force : !linksBoard.getAttribute('visible');
  linksBoard.setAttribute('visible', next);
  if (next) {
    // keep it in front of the user
    const cam = document.querySelector('#rig');
    if (cam) {
      // place 2m in front of rig, same height
      linksBoard.object3D.position.set(0, 0, -2);
      cam.object3D.add(linksBoard.object3D);
    }
  } else {
    // detach if it was attached
    try { document.querySelector('a-scene').object3D.add(linksBoard.object3D); } catch(e){}
  }
}

function enterVR(){ document.querySelector('a-scene').enterVR(); }
function enterAR(){ document.querySelector('a-scene').enterAR(); }

/* expose to window */
window.setBackground = setBackground;
window.toggleMenu = toggleMenu;
window.toggleLinksBoard = toggleLinksBoard;
window.enterVR = enterVR;
window.enterAR = enterAR;