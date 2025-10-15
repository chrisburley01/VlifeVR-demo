/* =================== Gallery Library – Room v2 =================== */
/* Big room (18 x 18 x 4.5 m), corridors vibe, wall frames as portals */

function toggleHelp(){ document.getElementById('help').classList.toggle('hidden'); }

const scene  = document.getElementById('scene');
const rig    = document.getElementById('rig');
const assets = document.getElementById('assets');

/* -------------------- Config -------------------- */
const ROOM_W = 18;   // width (X)
const ROOM_D = 18;   // depth (Z)
const ROOM_H = 4.5;  // height (Y)

// Door panel / hinge behaviour (same feel as earlier)
let HINGE_SIDE_DEFAULT = 'left';
let AUTO_ALTERNATE_HINGE = false;
let __lastHingeSide = 'right';
const HINGE_OFFSET_FACTOR = 0.25; // 0=centered, 0.5=edge; 0.25 ~ “half the change”

// Gallery links (YouTube – guaranteed preview thumbs)
// Add as many as you like; we’ll auto-lay them on the walls/corridors.
const LINKS = [
  { title: 'Grand Canyon 360', url: 'https://www.youtube.com/watch?v=CSvFpBOe8eY' },
  { title: 'Roller Coaster 360', url: 'https://www.youtube.com/watch?v=VR1b7GdQf2I' },
  { title: 'Cities at Night 360', url: 'https://www.youtube.com/watch?v=v8VrmkG2FvE' },
  { title: 'Ocean Dive 360', url: 'https://www.youtube.com/watch?v=6B9vLwYxGZ0' },
  { title: 'Space Walk 360', url: 'https://www.youtube.com/watch?v=0qisGSwZym4' },
  { title: 'Mountain Flight 360', url: 'https://www.youtube.com/watch?v=GoB9aSxUjYw' },
  { title: 'Safari 360', url: 'https://www.youtube.com/watch?v=2OzlksZBTiA' },
  { title: 'Hiking Trail 360', url: 'https://www.youtube.com/watch?v=r5V6lK8Kp6A' },
  { title: 'Reef 360', url: 'https://www.youtube.com/watch?v=ZVhqotw8rD8' },
  { title: 'Aurora 360', url: 'https://www.youtube.com/watch?v=Q3oItpVa9fs' },
  { title: 'Tokyo 360', url: 'https://www.youtube.com/watch?v=Y9iI5_8Z7sY' },
  { title: 'Festival 360', url: 'https://www.youtube.com/watch?v=K18cpp_-gP8' }
];

/* -------------------- Utilities -------------------- */
function parseYouTubeId(u){
  try {
    const url = new URL(u);
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1);
    if (url.hostname.includes('youtube.com')) return url.searchParams.get('v');
  } catch(_) {}
  return null;
}
function ytThumb(u){
  const id = parseYouTubeId(u);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
function worldPosOf(el, lift=1.6){
  const v = new THREE.Vector3();
  el.object3D.getWorldPosition(v); v.y += lift; return v;
}

/* -------------------- Build Room & Corridors -------------------- */
function buildRoom(){
  //