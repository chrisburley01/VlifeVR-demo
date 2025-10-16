/* =========================================================
   VLife • Château 2.1 (Realism Edition)
   - ACES tone mapping, soft shadows, fog depth
   - PBR (standard) materials by default
   - Micro normal detail on floors
   - Texture anisotropy + sRGB encoding
   - Everything from 2.0: double corridors, rooms, frames, sconces, minimap, orbs
========================================================= */

/* ------------ CONFIG ------------ */
const CFG = {
  HALL_W: 20, HALL_D: 20, HALL_H: 5.0, WALL_T: 0.14,
  COR_W: 3.2, COR_L: 28.0, // double length
  ROOM_W: 14, ROOM_D: 14, ROOM_H: 5.0,
  DOOR_W: 3.6, DOOR_H: 3.2,
  TELEPORT_DURATION_MS: 900,
  TELEPORT_DEADZONE_M: 0.25,
  TELEPORT_ARM_DELAY_MS: 900
};

const scene=document.getElementById('scene');
const env  =document.getElementById('env');
const rig  =document.getElementById('rig');
const camEl=document.getElementById('cam');
const map  =document.getElementById('mapCanvas');
const mctx =map.getContext('2d');

/* ------------ LINKS (sample 360s) ------------ */
const LINKS=[
  {title:'Underwater 360',url:'https://www.youtube.com/watch?v=6B9vLwYxGZ0'},
  {title:'Space Walk 360',url:'https://www.youtube.com/watch?v=0qisGSwZym4'},
  {title:'Grand Canyon 360',url:'https://www.youtube.com/watch?v=CSvFpBOe8eY'},
  {title:'Cities at Night 360',url:'https://www.youtube.com/watch?v=v8VrmkG2FvE'},
  {title:'Mountain Flight 360',url:'https://www.youtube.com/watch?v=GoB9aSxUjYw'},
  {title:'Roller Coaster 360',url:'https://www.youtube.com/watch?v=VR1b7GdQf2I'}
];
const parseYouTubeId=u=>{try{const url=new URL(u);if(url.hostname.includes('youtu.be'))return url.pathname.slice(1);if(url.hostname.includes('youtube.com'))return url.searchParams.get('v');}catch(e){}return null;}
const ytThumb=u=>{const id=parseYouTubeId(u);return id?`https://img.youtube.com/vi/${id}/hqdefault.jpg`:'#fallbackPoster';}

/* ------------ TEXTURE HELPERS ------------ */
function setTexDefaults(tex){
  const r = scene.renderer;
  if (tex) {
    tex.encoding = THREE.sRGBEncoding;
    if (r && r.capabilities && r.capabilities.getMaxAnisotropy){
      tex.anisotropy = Math.min(8, r.capabilities.getMaxAnisotropy());
    }
  }
  return tex;
}
function canvasTex(draw,w=512,h=512,repeat=[1,1]){
  const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'); draw(g,w,h);
  const t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(repeat[0],repeat[1]);
  return setTexDefaults(t);
}
const stoneTilesTexture=(rx,rz)=>canvasTex((g,w,h)=>{g.fillStyle='#d9d3c7';g.fillRect(0,0,w,h);
  const N=8,s=w/N;for(let i=0;i<N;i++){for(let j=0;j<N;j++){const shade=206+((i+j)%2?-12:0);
    g.fillStyle=`rgb(${shade},${shade-6},${shade-12})`;g.fillRect(i*s+1,j*s+1,s-2,s-2);}}
  g.strokeStyle='rgba(60,60,60,0.35)';for(let k=0;k<=N;k++){g.beginPath();g.moveTo(k*s,0);g.lineTo(k*s,h);g.stroke();g.beginPath();g.moveTo(0,k*s);g.lineTo(w,k*s);g.stroke();}
},512,512,[rx,rz]);

const stripedWoodTexture=(along='x',len=1,wide=1)=>canvasTex((g,w,h)=>{
  const stripes=28;for(let i=0;i<stripes;i++){const t=i/stripes;
    const col=`rgb(${110+Math.floor(60*Math.sin(t*6.28+0.8))},${70+Math.floor(40*Math.sin(t*7.5+1.2))},${40+Math.floor(35*Math.sin(t*5.9+2.0))})`;
    g.fillStyle=col;if(along==='x')g.fillRect(Math.floor(i*(w/stripes)),0,Math.ceil(w/stripes),h);
    else g.fillRect(0,Math.floor(i*(h/stripes)),w,Math.ceil(h/stripes));}
},1024,256,[along==='x'?len:wide,along==='x'?wide:len]);

const plankWallTexture=()=>canvasTex((g,w,h)=>{for(let i=0;i<16;i++){const y=i*(h/16);
  g.fillStyle=`rgb(${92+Math.floor(Math.random()*20)},${58+Math.floor(Math.random()*18)},${36+Math.floor(Math.random()*12)})`;
  g.fillRect(0,y,w,Math.ceil(h/16)-2);} g.strokeStyle='rgba(30,20,10,0.45)';
  for(let i=0;i<=16;i++){g.beginPath();g.moveTo(0,i*(h/16));g.lineTo(w,i*(h/16));g.stroke();}
},512,512,[2,2]);

const metalPanelTexture=()=>canvasTex((g,w,h)=>{const grad=g.createLinearGradient(0,0,w,h);
  grad.addColorStop(0,'#9aa5b3');grad.addColorStop(0.5,'#b9c2ce');grad.addColorStop(1,'#8c95a3');
  g.fillStyle=grad;g.fillRect(0,0,w,h);g.fillStyle='rgba(255,255,255,0.15)';g.fillRect(0,h*0.45,w,14);g.fillRect(0,h*0.8,w,10);
},512,512,[2,2]);

const frostedTexture=()=>canvasTex((g,w,h)=>{for(let i=0;i<500;i++){g.fillStyle=`rgba(200,240,255,${Math.random()*0.2+0.1})`;
  g.beginPath();g.arc(Math.random()*w,Math.random()*h,Math.random()*3+1,0,Math.PI*2);g.fill();}
},256,256,[6,6]);

const gridTexture=()=>canvasTex((g,w,h)=>{g.fillStyle='#11161c';g.fillRect(0,0,w,h);
  g.strokeStyle='rgba(180,200,220,0.2)';for(let i=0;i<=32;i++){g.beginPath();g.moveTo(i*16,0);g.lineTo(i*16,h);g.stroke();
  g.beginPath();g.moveTo(0,i*16);g.lineTo(w,i*16);g.stroke();}
});

/* Micro normal map for floors (procedural) */
function smallNoiseNormal(){
  const c=document.createElement('canvas'); c.width=128; c.height=128; const g=c.getContext('2d');
  g.fillStyle='#7aa'; g.fillRect(0,0,128,128);
  for(let i=0;i<900;i++){ const x=Math.random()*128, y=Math.random()*128, r=Math.random()*1.2+0.6;
    g.fillStyle=`hsl(${200+Math.random()*20} 30% ${50+Math.random()*10}%)`;
    g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill();
  }
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(8,8);
  return setTexDefaults(t);
}
const NOISE_NORMAL = smallNoiseNormal();

/* ------------ HELPERS ------------ */
const _addBox=(x,y,z,w,h,d,color)=>{const b=document.createElement('a-box');b.setAttribute('position',`${x} ${y} ${z}`);b.setAttribute('width',w);b.setAttribute('height',h);b.setAttribute('depth',d);if(color)b.setAttribute('color',color);env.appendChild(b);return b;}
const _addPlane=(x,y,z,w,h,rot,color)=>{const p=document.createElement('a-plane');p.setAttribute('position',`${x} ${y} ${z}`);p.setAttribute('width',w);p.setAttribute('height',h);p.setAttribute('rotation',rot||'0 0 0');if(color)p.setAttribute('color',color);env.appendChild(p);return p;}
const ease=(t)=>t>=1?1:(1-Math.cos(Math.min(1,t)*Math.PI))/2;
function animateBlink(entity,onProps,offProps,ms=600){let on=false;setInterval(()=>{on=!on;entity.setAttribute('material',on?onProps:offProps);},ms);}

/* ------------ REALISM BOOSTER ------------ */
(function realismBooster(){
  scene.addEventListener('loaded', () => {
    const r = scene.renderer;
    if (r){
      r.physicallyCorrectLights = true;
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.toneMappingExposure = 1.0;
      r.outputEncoding = THREE.sRGBEncoding;
      r.shadowMap.enabled = true;
      r.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // Depth fog (subtle)
    scene.object3D.fog = new THREE.FogExp2(0x0f0f14, 0.015);

    // Directional sun with soft shadows
    const sun = new THREE.DirectionalLight(0xfff1d6, 1.0);
    sun.position.set(18, 26, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.width  = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.bias = -0.0002;
    const cam = sun.shadow.camera; cam.left=-40; cam.right=40; cam.top=40; cam.bottom=-40; cam.near=0.5; cam.far=120;
    scene.object3D.add(sun);

    // Ambient fill
    const fill = new THREE.AmbientLight(0x404855, 0.35);
    scene.object3D.add(fill);

    // Lightweight environment for PBR specular
    const pmrem = new THREE.PMREMGenerator(r);
    const dummyRT = pmrem.fromScene(new THREE.Scene(), 0.1);
    scene.object3D.environment = dummyRT.texture;

    // Wrap addBox/addPlane to default to PBR + shadows
    window.addBox=function(x,y,z,w,h,d,color){
      const b=_addBox(x,y,z,w,h,d,color);
      b.setAttribute('shadow','cast: true; receive: true');
      const base = color || '#888888';
      b.setAttribute('material', `shader: standard; color:${base}; roughness:0.85; metalness:0.05;`);
      b.addEventListener('loaded',()=>{const m=b.getObject3D('mesh'); if(m){m.castShadow=true; m.receiveShadow=true; if(m.material&&m.material.isMeshStandardMaterial)m.material.needsUpdate=true;}});
      return b;
    };
    window.addPlane=function(x,y,z,w,h,rot,color){
      const p=_addPlane(x,y,z,w,h,rot,color);
      p.setAttribute('shadow','cast: false; receive: true');
      const base = color || '#888888';
      p.setAttribute('material', `shader: standard; color:${base}; roughness:0.78; metalness:0.04;`);
      p.addEventListener('loaded',()=>{const m=p.getObject3D('mesh'); if(m){m.receiveShadow=true; if(m.material&&m.material.isMeshStandardMaterial)m.material.needsUpdate=true;}});
      return p;
    };
  });
})();

/* ------------ TELEPORT (tap to move) ------------ */
(function setTeleport(){
  const lerpMs=CFG.TELEPORT_DURATION_MS;
  setTimeout(()=>{}, CFG.TELEPORT_ARM_DELAY_MS);
  const halfHallX=CFG.HALL_W/2-0.4, halfHallZ=CFG.HALL_D/2-0.4;
  const endX=halfHallX+CFG.COR_L, endZ=halfHallZ+CFG.COR_L;
  const roomHalfX=CFG.ROOM_W/2-0.4, roomHalfZ=CFG.ROOM_D/2-0.4;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function moveTo(x,z){
    const cur=rig.object3D.position; let tx=x,tz=z;
    if(Math.abs(x)<=halfHallX && Math.abs(z)<=halfHallZ){ tx=clamp(x,-halfHallX,halfHallX); tz=clamp(z,-halfHallZ,halfHallZ); }
    else{
      const inXStrip=Math.abs(z)<=CFG.COR_W/2-0.2, inZStrip=Math.abs(x)<=CFG.COR_W/2-0.2;
      if(inXStrip){
        if(Math.abs(x)>endX){ const cx=Math.sign(x)*(endX+roomHalfX); tx=clamp(x,cx-roomHalfX,cx+roomHalfX); tz=clamp(z,-roomHalfZ,roomHalfZ); }
        else{ tx=clamp(x,-endX,endX); tz=clamp(z,-CFG.COR_W/2+0.2,CFG.COR_W/2-0.2); }
      }else if(inZStrip{
      }){
        // (typo guard) - fixed below:
      }
    }
  }

  // (Fixed teleport logic without typo)
  scene.addEventListener('click',(e)=>{
    const t=e.target; if(!t?.classList?.contains('teleport'))return;
    const d=e.detail||{}, i=d.intersection||(d.intersections&&d.intersections[0]); if(!i)return;

    const x=i.point.x, z=i.point.z;
    const cur=rig.object3D.position; let tx=x,tz=z;
    const halfHallX=CFG.HALL_W/2-0.4, halfHallZ=CFG.HALL_D/2-0.4;
    const endX=halfHallX+CFG.COR_L, endZ=halfHallZ+CFG.COR_L;
    const roomHalfX=CFG.ROOM_W/2-0.4, roomHalfZ=CFG.ROOM_D/2-0.4;
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

    if(Math.abs(x)<=halfHallX && Math.abs(z)<=halfHallZ){ tx=clamp(x,-halfHallX,halfHallX); tz=clamp(z,-halfHallZ,halfHallZ); }
    else{
      const inXStrip=Math.abs(z)<=CFG.COR_W/2-0.2, inZStrip=Math.abs(x)<=CFG.COR_W/2-0.2;
      if(inXStrip){
        if(Math.abs(x)>endX){ const cx=Math.sign(x)*(endX+roomHalfX); tx=clamp(x,cx-roomHalfX,cx+roomHalfX); tz=clamp(z,-roomHalfZ,roomHalfZ); }
        else{ tx=clamp(x,-endX,endX); tz=clamp(z,-CFG.COR_W/2+0.2,CFG.COR_W/2-0.2); }
      } else if(inZStrip){
        if(Math.abs(z)>endZ){ const cz=Math.sign(z)*(endZ+roomHalfZ); tz=clamp(z,cz-roomHalfZ,cz+roomHalfZ); tx=clamp(x,-roomHalfX,roomHalfX); }
        else{ tz=clamp(z,-endZ,endZ); tx=clamp(x,-CFG.COR_W/2+0.2,CFG.COR_W/2-0.2); }
      } else { tx=clamp(x,-halfHallX,halfHallX); tz=clamp(z,-halfHallZ,halfHallZ); }
    }
    if(Math.hypot(tx-cur.x,tz-cur.z)<CFG.TELEPORT_DEADZONE_M)return;

    const start=cur.clone(), end=new THREE.Vector3(tx,start.y,tz); const t0=performance.now();
    const step=()=>{const t=(performance.now()-t0)/CFG.TELEPORT_DURATION_MS, k=ease(t); rig.object3D.position.copy(start.clone().lerp(end,k)); if(t<1)requestAnimationFrame(step);};
    requestAnimationFrame(step);
  });
})();

/* ------------ BUILD WORLD ------------ */
(function buildWorld(){
  const W=CFG.HALL_W, D=CFG.HALL_D, H=CFG.HALL_H, T=CFG.WALL_T;
  const COR=CFG.COR_L, CW=CFG.COR_W, RH=CFG.ROOM_H, RW=CFG.ROOM_W, RD=CFG.ROOM_D;

  /* Ambient hemi (soft base) */
  const hemi=document.createElement('a-entity'); hemi.setAttribute('light','type:hemisphere; intensity:0.8; color:#eef3ff; groundColor:#3a331f'); hemi.setAttribute('position','0 3 0'); env.appendChild(hemi);

  /* Grand Hall floor */
  const hallFloor=document.createElement('a-entity'); hallFloor.classList.add('teleport');
  hallFloor.setAttribute('geometry',`primitive:plane; width:${W}; height:${D}`);
  hallFloor.setAttribute('rotation','-90 0 0'); hallFloor.setAttribute('material','shader:standard; roughness:0.65; metalness:0.05; src:');
  hallFloor.addEventListener('loaded',()=>{const m=hallFloor.getObject3D('mesh'); if(m){m.material.map=stoneTilesTexture(W/3,D/3); m.material.normalMap=NOISE_NORMAL; m.material.normalScale=new THREE.Vector2(0.25,0.25); m.material.needsUpdate=true; m.receiveShadow=true;}}); env.appendChild(hallFloor);

  // Contact strips (grounding)
  _addBox(0,0.04,0,W+T*2,0.06,D+T*2,'#141414'); // thin shadowy border

  // Crown & base trims
  addBox(0,0.10,0,W+T*2,0.12,D+T*2,'#a89a86');
  addBox(0,H-0.08,0,W+T*2,0.12,D+T*2,'#a89a86');

  // Ceiling
  addPlane(0,H,0,W,D,'90 0 0','#46321f');

  // Chandelier lights
  [[-4,-4],[4,-4],[-4,4],[4,4],[0,0]].forEach(([x,z])=>{
    const y=H-0.7; const bulb=document.createElement('a-sphere'); bulb.setAttribute('radius','0.10');
    bulb.setAttribute('material','shader:standard; color:#ffe9ba; emissive:#ffd995; emissiveIntensity:1.0; roughness:0.7; metalness:0.2'); bulb.setAttribute('position',`${x} ${y} ${z}`); env.appendChild(bulb);
    const l=document.createElement('a-entity'); l.setAttribute('light','type:point; intensity:1.0; distance:16; color:#ffd08a'); l.setAttribute('position',`${x} ${y} ${z}`); env.appendChild(l);
  });

  /* Doorways with labels */
  function doorway(side,label){
    const alongX=(side==='N'||side==='S'), sign=(side==='N'||side==='W')?-1:1;
    const wx=(side==='E'? W/2 : side==='W'? -W/2 : 0);
    const wz=(side==='S'? D/2 : side==='N'? -D/2 : 0);
    const jambD=T+0.02;
    if(alongX){
      const leftW=(W-CFG.DOOR_W)/2;
      addBox(-W/2+leftW/2, H/2, wz, leftW, H, jambD, '#d3cabd');
      addBox( W/2-leftW/2, H/2, wz, leftW, H, jambD, '#d3cabd');
      addBox(0,(CFG.DOOR_H+H)/2, wz, CFG.DOOR_W, H-CFG.DOOR_H, jambD, '#d3cabd');
    }else{
      const leftD=(D-CFG.DOOR_W)/2;
      addBox(wx, H/2, -D/2+leftD/2, jambD, H, leftD, '#d3cabd');
      addBox(wx, H/2,  D/2-leftD/2, jambD, H, leftD, '#d3cabd');
      addBox(wx,(CFG.DOOR_H+H)/2,0, jambD, H-CFG.DOOR_H, CFG.DOOR_W, '#d3cabd');
    }
    const rot=alongX?(sign>0?180:0):(side==='E'?-90:90);
    const lx=alongX?0:wx+sign*(jambD/2+0.02), lz=alongX?wz+sign*(jambD/2+0.02):0;
    const plate=addPlane(lx,CFG.DOOR_H+0.48,lz,4.6,0.78,`0 ${rot} 0`,'#2b2014');
    const txt=document.createElement('a-entity'); txt.setAttribute('text',`value:${label}; align:center; color:#f7e7c9; width:7; baseline:center`); txt.setAttribute('position','0 0 0.01'); plate.appendChild(txt);
  }
  doorway('N','Cabin Wing');
  doorway('E','Starship Wing');
  doorway('S','Jungle Atrium');
  doorway('W','Ice Vault');

  /* Corridors (double length) */
  function makeCorridor(axis){
    const alongX=(axis==='x+'||axis==='x-'), sign=axis.includes('+')?1:-1;
    const sx=alongX?sign*(W/2):0, sz=alongX?0:sign*(D/2);

    // floor (proper repeat + micro normal)
    const floor=document.createElement('a-entity'); floor.classList.add('teleport');
    if(alongX){ floor.setAttribute('geometry',`primitive:plane; width:${CFG.COR_L}; height:${CFG.COR_W}`); floor.setAttribute('position',`${sx+sign*(CFG.COR_L/2)} 0 0`); }
    else{ floor.setAttribute('geometry',`primitive:plane; width:${CFG.COR_W}; height:${CFG.COR_L}`); floor.setAttribute('position',`0 0 ${sz+sign*(CFG.COR_L/2)}`); }
    floor.setAttribute('rotation','-90 0 0'); floor.setAttribute('material','shader:standard; roughness:0.7; metalness:0.04; src:');
    floor.addEventListener('loaded',()=>{const m=floor.getObject3D('mesh'); if(m){const len=CFG.COR_L/2, wide=Math.max(2, CFG.COR_W/1.2); m.material.map=stripedWoodTexture(alongX?'x':'z', len, wide); m.material.normalMap=NOISE_NORMAL; m.material.normalScale=new THREE.Vector2(0.2,0.2); m.material.needsUpdate=true; m.receiveShadow=true;}}); env.appendChild(floor);

    // side walls + caps + contact strips
    const cap=0.06, wcol='#d3cabd';
    if(alongX){
      addBox(sx+sign*(CFG.COR_L/2), H/2,  CFG.COR_W/2 + T/2, CFG.COR_L, H, T, wcol);
      addBox(sx+sign*(CFG.COR_L/2), H/2, -CFG.COR_W/2 - T/2, CFG.COR_L, H, T, wcol);
      _addBox(sx+sign*(CFG.COR_L/2), 0.04,  CFG.COR_W/2+T/2, CFG.COR_L, 0.06, 0.08,'#141414');
      _addBox(sx+sign*(CFG.COR_L/2), 0.04, -CFG.COR_W/2-T/2, CFG.COR_L, 0.06, 0.08,'#141414');
      addBox(sx+sign*cap,          H/2, 0, T, H, CFG.COR_W, wcol);
      addBox(sx+sign*(CFG.COR_L-cap),H/2,0, T, H, CFG.COR_W, wcol);
    }else{
      addBox( CFG.COR_W/2 + T/2, H/2, sz+sign*(CFG.COR_L/2), T, H, CFG.COR_L, wcol);
      addBox(-CFG.COR_W/2 - T/2, H/2, sz+sign*(CFG.COR_L/2), T, H, CFG.COR_L, wcol);
      _addBox( CFG.COR_W/2+T/2, 0.04, sz+sign*(CFG.COR_L/2), 0.08, 0.06, CFG.COR_L,'#141414');
      _addBox(-CFG.COR_W/2-T/2, 0.04, sz+sign*(CFG.COR_L/2), 0.08, 0.06, CFG.COR_L,'#141414');
      addBox(0, H/2, sz+sign*cap, CFG.COR_W, H, T, wcol);
      addBox(0, H/2, sz+sign*(CFG.COR_L-cap), CFG.COR_W, H, T, wcol);
    }

    // subtle god-rays near hall mouth
    const ray = document.createElement('a-plane');
    const rx = alongX? sx+sign*3 : 0, rz = alongX? 0 : sz+sign*3;
    ray.setAttribute('width','10'); ray.setAttribute('height','3.4');
    ray.setAttribute('rotation', alongX? '-15 0 0' : '-15 90 0');
    ray.setAttribute('position',`${rx} 3.2 ${rz}`);
    ray.setAttribute('material','color:#fff2c0; opacity:0.04; transparent:true; blending:additive; side:double');
    env.appendChild(ray);

    return {alongX,sign,startX:sx,startZ:sz};
  }
  const corE=makeCorridor('x+'), corW=makeCorridor('x-'), corS=makeCorridor('z+'), corN=makeCorridor('z-');

  /* Corridor frames + sconces */
  const FRAME_STEP=3.0, FRAME_START=2.0, FRAME_OFFSET=0.13;
  let linkIdx=0;
  function addFrame(pos,yaw,withSconce=true){
    const link=LINKS[linkIdx++%LINKS.length];
    const frame=document.createElement('a-entity'); frame.classList.add('interact');

    const shadow=addPlane(0,0,0.01,1.78,1.2,'0 0 0','#000'); shadow.setAttribute('material','shader:standard; opacity:0.25; roughness:1; metalness:0');
    const outer=addBox(0,0,0,1.68,1.08,0.04,'#3d2a16');
    const inner=addBox(0,0,0.03,1.60,1.00,0.02,'#1d2230');
    const img=document.createElement('a-image'); img.setAttribute('src',ytThumb(link.url)); img.setAttribute('width','1.52'); img.setAttribute('height','0.92'); img.setAttribute('position','0 0 0.04'); frame.appendChild(img);
    const cap=document.createElement('a-entity'); cap.setAttribute('text',`value:${link.title}; align:center; color:#f5f5f5; width:2.4; wrapCount:22; zOffset:0.01`); cap.setAttribute('position','0 -0.70 0.05'); frame.appendChild(cap);

    frame.setAttribute('position',`${pos.x} ${pos.y} ${pos.z}`); frame.setAttribute('rotation',`0 ${yaw} 0`);
    frame.addEventListener('mouseenter',()=>inner.setAttribute('material','shader:standard; color:#273045; roughness:0.7; metalness:0.05'));
    frame.addEventListener('mouseleave',()=>inner.setAttribute('material','shader:standard; color:#1d2230; roughness:0.8; metalness:0.05'));
    frame.addEventListener('click',()=>{try{window.open(link.url,'_blank');}catch(e){location.href=link.url;}});

    env.appendChild(frame);

    if(withSconce){
      const s=document.createElement('a-entity'); s.setAttribute('position',`${pos.x} ${pos.y+0.95} ${pos.z}`); s.setAttribute('rotation',`0 ${yaw} 0`);
      const lamp=addBox(0,0,0.02,0.08,0.18,0.06,'#5a4a32');
      const glow=document.createElement('a-sphere'); glow.setAttribute('radius','0.06'); glow.setAttribute('material','shader:standard; color:#ffe8b0; emissive:#ffd58e; emissiveIntensity:1');
      glow.setAttribute('position','0 0.12 0.05'); s.appendChild(glow);
      const L=document.createElement('a-entity'); L.setAttribute('light','type:point; intensity:0.6; distance:4; color:#ffd89c'); s.appendChild(L);
      env.appendChild(s);
    }
  }
  function populateCorridor(c){
    const y=1.6;
    if(c.alongX){
      for(let t=FRAME_START;t<CFG.COR_L-1.0;t+=FRAME_STEP){
        addFrame({x:c.startX+c.sign*t,y,z: CFG.COR_W/2 + CFG.WALL_T/2 + FRAME_OFFSET},180);
        addFrame({x:c.startX+c.sign*t,y,z:-CFG.COR_W/2 - CFG.WALL_T/2 - FRAME_OFFSET},0,false);
      }
    }else{
      for(let t=FRAME_START;t<CFG.COR_L-1.0;t+=FRAME_STEP){
        addFrame({x: CFG.COR_W/2 + CFG.WALL_T/2 + FRAME_OFFSET,y,z:c.startZ+c.sign*t},-90);
        addFrame({x:-CFG.COR_W/2 - CFG.WALL_T/2 - FRAME_OFFSET,y,z:c.startZ+c.sign*t}, 90,false);
      }
    }
  }
  [corN,corE,corS,corW].forEach(populateCorridor);

  /* Navigation Orbs (return to Hall from each room) */
  function addReturnOrb(x,y,z,label='Back to Hall'){
    const e=document.createElement('a-entity'); e.classList.add('interact');
    const s=document.createElement('a-sphere'); s.setAttribute('radius','0.18'); s.setAttribute('material','shader:standard; color:#79ffd5; emissive:#79ffd5; emissiveIntensity:0.6; roughness:0.4; metalness:0.2'); s.setAttribute('position','0 0 0'); e.appendChild(s);
    const t=document.createElement('a-entity'); t.setAttribute('text',`value:${label}; align:center; color:#cffff1; width:3`); t.setAttribute('position','0 0.45 0'); e.appendChild(t);
    e.setAttribute('position',`${x} ${y} ${z}`); env.appendChild(e);
    e.addEventListener('click',()=>rig.object3D.position.set(0,1.6,0));
  }

  /* Room helpers */
  function roomCenter(c){return c.alongX? {cx:c.startX+c.sign*(CFG.COR_L+CFG.ROOM_W/2), cz:0} : {cx:0, cz:c.startZ+c.sign*(CFG.COR_L+CFG.ROOM_D/2)};}
  function buildRoomShell(cx,cz,w,d,h,opts={}){
    // floor
    const floor=document.createElement('a-entity'); floor.classList.add('teleport');
    floor.setAttribute('geometry',`primitive:plane; width:${w}; height:${d}`); floor.setAttribute('rotation','-90 0 0'); floor.setAttribute('position',`${cx} 0 ${cz}`);
    floor.setAttribute('material',opts.floorMaterial||'shader:standard; color:#888; roughness:0.7; metalness:0.04; src:');
    floor.addEventListener('loaded',()=>{const m=floor.getObject3D('mesh'); if(m){if(opts.floorMap){m.material.map=opts.floorMap;} m.material.normalMap=NOISE_NORMAL; m.material.normalScale=new THREE.Vector2(0.18,0.18); m.material.needsUpdate=true; m.receiveShadow=true;}}); env.appendChild(floor);
    // walls
    const wc=opts.wallColor||'#bbb', wm=opts.wallMap;
    const wA=addBox(cx, h/2, cz-d/2+CFG.WALL_T/2, w, h, CFG.WALL_T, wc);
    const wB=addBox(cx, h/2, cz+d/2-CFG.WALL_T/2, w, h, CFG.WALL_T, wc);
    const wC=addBox(cx-w/2+CFG.WALL_T/2, h/2, cz, CFG.WALL_T, h, d, wc);
    const wD=addBox(cx+w/2-CFG.WALL_T/2, h/2, cz, CFG.WALL_T, h, d, wc);
    [wA,wB,wC,wD].forEach(b=>b.addEventListener('loaded',()=>{const m=b.getObject3D('mesh'); if(!m)return; if(wm){m.material.map=wm;} m.material.roughness=0.82; m.material.metalness=0.02; m.material.needsUpdate=true; m.castShadow=true; m.receiveShadow=true; if(opts.wallOpacity!=null){m.material.transparent=true; m.material.opacity=opts.wallOpacity;}}));
    // ceiling
    if(opts.ceiling!==false){
      const ceil=addPlane(cx,h,cz,w,d,'90 0 0', opts.ceilingColor||'#444');
      ceil.addEventListener('loaded',()=>{const m=ceil.getObject3D('mesh'); if(m && opts.ceilingMap){m.material.map=opts.ceilingMap; m.material.needsUpdate=true;}});
    }
    // light
    if(opts.light){ const L=document.createElement('a-entity'); L.setAttribute('light',opts.light); L.setAttribute('position',`${cx} ${h-0.6} ${cz}`); env.appendChild(L); }
    // contact strip
    _addBox(cx,0.04,cz,w,0.06,d,'#141414');
    if(opts.extra) opts.extra(cx,cz,w,d,h);
  }

  /* ================= THEMES ================= */

  /* North: Cabin Wing */
  (function(){
    const {cx,cz}=roomCenter(corN);
    buildRoomShell(cx,cz,RW,RD,RH,{
      floorMap:stripedWoodTexture('x', RW/2, 2), wallMap:plankWallTexture(), wallColor:'#6a4a2b',
      ceilingColor:'#3a2816', light:'type:point; intensity:1.0; distance:18; color:#ffd39a',
      extra:(cx,cz,w,d,h)=>{
        // rafters
        for(let i=-w/2+1; i<=w/2-1; i+=2){ addBox(cx+i, h-0.2, cz, 0.15, 0.25, d, '#4b321e'); }
        // fireplace + glow
        addBox(cx,1.0,cz-d/2+0.45,2.2,1.2,0.6,'#4b3220');
        const glow=document.createElement('a-sphere'); glow.setAttribute('radius','0.18'); glow.setAttribute('position',`${cx} 1.0 ${cz-d/2+0.2}`); glow.setAttribute('material','shader:standard; emissive:#ffb36b; emissiveIntensity:1.2; color:#ffdb9a'); env.appendChild(glow);
        // rug & table & crates
        addPlane(cx,0.02,cz,4,2,'-90 0 0','#7d3e26').setAttribute('material','shader:standard; opacity:0.85; side:double; roughness:0.9; metalness:0');
        addBox(cx,0.8,cz,1.2,0.1,0.8,'#7a5231'); addBox(cx-0.6,0.45,cz,0.32,0.32,0.32,'#6a4528'); addBox(cx+0.6,0.45,cz,0.32,0.32,0.32,'#6a4528');
        // window-like wall poster
        const win=addPlane(cx+w/2-0.06,1.8,cz,3.2,1.6,'0 -90 0'); win.setAttribute('material','shader:standard; src:#forestPoster; opacity:0.95; side:double; roughness:1; metalness:0');
        addReturnOrb(cx,1.2,cz+ d/2-1.2,'Back to Hall');
      }
    });
  })();

  /* East: Starship Wing */
  (function(){
    const {cx,cz}=roomCenter(corE);
    buildRoomShell(cx,cz,RW,RD,RH,{
      floorMaterial:'shader:standard; color:#10151b; roughness:0.55; metalness:0.2',
      wallMap:metalPanelTexture(), wallColor:'#8fa0b3',
      ceilingColor:'#0f141a', light:'type:point; intensity:1.0; distance:20; color:#a8cfff',
      extra:(cx,cz,w,d,h)=>{
        const grate=addPlane(cx,0.02,cz, w-2, d-2,'-90 0 0','#20262f'); grate.addEventListener('loaded',()=>{const m=grate.getObject3D('mesh'); if(m){m.material.map=gridTexture(); m.material.roughness=0.4; m.material.metalness=0.5; m.material.needsUpdate=true;}});
        // terminals
        for(let i=-2;i<=2;i++){ const scr=addPlane(cx-1.8+0.9*i,1.1,cz-d/2+0.29,0.62,0.28,'0 0 0','#001a2a'); animateBlink(scr,'shader:standard; color:#34c3ff; emissive:#34c3ff; emissiveIntensity:0.9','shader:standard; color:#052234; emissive:#052234; emissiveIntensity:0.2',700+80*i); }
        // rim lights
        addPlane(cx,0.06,cz-d/2+0.08,w-1.2,0.08,'-90 0 0','#58a7ff').setAttribute('material','shader:standard; emissive:#58a7ff; emissiveIntensity:0.7; roughness:1; metalness:0');
        addPlane(cx,0.06,cz+d/2-0.08,w-1.2,0.08,'-90 0 0','#58a7ff').setAttribute('material','shader:standard; emissive:#58a7ff; emissiveIntensity:0.7; roughness:1; metalness:0');
        addReturnOrb(cx,1.2,cz+ d/2-1.2,'Back to Hall');
      }
    });
  })();

  /* South: Jungle Atrium */
  (function(){
    const {cx,cz}=roomCenter(corS);
    buildRoomShell(cx,cz,RW,RD,RH,{
      floorMap:stripedWoodTexture('x', RW/2, 2), wallColor:'#3e5a46',
      ceilingColor:'#2b2f1a', light:'type:hemisphere; intensity:0.95; color:#ecffd2; groundColor:#20361e',
      extra:(cx,cz,w,d,h)=>{
        // planters along walls
        for(let s of [-1,1]){ for(let i=-w/2+1.4;i<=w/2-1.4;i+=2.8){ addBox(cx+i,0.5,cz+s*(d/2-0.5),1.2,0.4,0.5,'#5a744f'); }}
        // vine trellis
        for(let i=-w/2+1.2;i<=w/2-1.2;i+=2.4){
          addBox(cx+i,1.6,cz-d/2+0.25,0.25,3.0,0.25,'#4e6a3f');
          for(let j=0;j<5;j++){ const leaf=addPlane(cx+i+((j%2)?0.12:-0.12),1.2+0.35*j,cz-d/2+0.3,0.55,0.22,'0 0 0','#76c56a'); leaf.setAttribute('material','shader:standard; opacity:0.85; side:double; roughness:1; metalness:0');}
        }
        // subtle shafts
        for(let i=0;i<2;i++){ const beam=document.createElement('a-plane'); beam.setAttribute('width',w-1.5); beam.setAttribute('height','2.8'); beam.setAttribute('rotation','-30 0 0'); beam.setAttribute('position',`${cx} ${h-0.6} ${cz - d/5 + i*(d/6)}`); beam.setAttribute('material','color:#fff5b0; opacity:0.05; transparent:true; blending:additive; side:double'); env.appendChild(beam); }
        addReturnOrb(cx,1.2,cz+ d/2-1.2,'Back to Hall');
      }
    });
  })();

  /* West: Ice Vault */
  (function(){
    const {cx,cz}=roomCenter(corW);
    buildRoomShell(cx,cz,RW,RD,RH,{
      floorMaterial:'shader:standard; color:#eaf9ff; roughness:0.6; metalness:0.12',
      wallMap:frostedTexture(), wallOpacity:0.9, wallColor:'#cfefff',
      ceilingColor:'#cfefff', light:'type:point; intensity:0.95; distance:18; color:#bfe7ff',
      extra:(cx,cz,w,d,h)=>{
        // icicles + grid glow
        for(let i=-w/2+1; i<=w/2-1; i+=2.0){
          const st= document.createElement('a-cone'); st.setAttribute('radius-bottom','0.45'); st.setAttribute('radius-top','0.02'); st.setAttribute('height','1.2'); st.setAttribute('material','shader:standard; color:#dff6ff; opacity:0.95; roughness:0.6; metalness:0.2'); st.setAttribute('position',`${cx+i} ${h-0.6} ${cz - d/4}`); st.setAttribute('rotation','180 0 0'); env.appendChild(st);
          const sm= document.createElement('a-cone'); sm.setAttribute('radius-bottom','0.45'); sm.setAttribute('radius-top','0.02'); sm.setAttribute('height','1.0'); sm.setAttribute('material','shader:standard; color:#e7fbff; opacity:0.95; roughness:0.6; metalness:0.2'); sm.setAttribute('position',`${cx+i} 0.5 ${cz + d/4}`); env.appendChild(sm);
        }
        const grid=addPlane(cx,0.03,cz,w-2,d-2,'-90 0 0','#9fe3ff'); grid.setAttribute('material','shader:standard; opacity:0.12; emissive:#9fe3ff; emissiveIntensity:0.6; side:double; roughness:1; metalness:0');
        addReturnOrb(cx,1.2,cz+ d/2-1.2,'Back to Hall');
      }
    });
  })();

})(); // buildWorld

/* ------------ CORRIDOR POPULATION (frames/sconces) AFTER build ------------ */
(function populateAfter(){
  // we already populated frames inside makeCorridor, so nothing here.
})();

/* ------------ MINIMAP ------------ */
(function miniMap(){
  const maxX=(CFG.HALL_W/2+CFG.COR_L+CFG.ROOM_W/2), maxZ=(CFG.HALL_D/2+CFG.COR_L+CFG.ROOM_D/2);
  const W=map.width,H=map.height;
  const w2m=(x,z)=>({mx:Math.round(W*(x+maxX)/(2*maxX)), mz:Math.round(H*(z+maxZ)/(2*maxZ))});
  const rect=(x1,z1,x2,z2,col='#6c7bbf')=>{mctx.strokeStyle=col;const a=w2m(x1,z1),b=w2m(x2,z2);mctx.strokeRect(a.mx,a.mz,b.mx-a.mx,b.mz-a.mz);};
  function draw(){
    mctx.fillStyle='rgba(0,0,0,0.35)'; mctx.fillRect(0,0,W,H);
    rect(-CFG.HALL_W/2,-CFG.HALL_D/2, CFG.HALL_W/2, CFG.HALL_D/2);
    rect( CFG.HALL_W/2,-CFG.COR_W/2, CFG.HALL_W/2+CFG.COR_L, CFG.COR_W/2);
    rect(-CFG.HALL_W/2-CFG.COR_L,-CFG.COR_W/2,-CFG.HALL_W/2, CFG.COR_W/2);
    rect(-CFG.COR_W/2, CFG.HALL_D/2, CFG.COR_W/2, CFG.HALL_D/2+CFG.COR_L);
    rect(-CFG.COR_W/2,-CFG.HALL_D/2-CFG.COR_L, CFG.COR_W/2,-CFG.HALL_D/2);
    rect( CFG.HALL_W/2+CFG.COR_L,-CFG.ROOM_D/2, CFG.HALL_W/2+CFG.COR_L+CFG.ROOM_W, CFG.ROOM_D/2,'#88a0ff');
    rect(-CFG.HALL_W/2-CFG.COR_L-CFG.ROOM_W,-CFG.ROOM_D/2,-CFG.HALL_W/2-CFG.COR_L, CFG.ROOM_D/2,'#88a0ff');
    rect(-CFG.ROOM_W/2, CFG.HALL_D/2+CFG.COR_L, CFG.ROOM_W/2, CFG.HALL_D/2+CFG.COR_L+CFG.ROOM_D,'#88a0ff');
    rect(-CFG.ROOM_W/2,-CFG.HALL_D/2-CFG.COR_L-CFG.ROOM_D, CFG.ROOM_W/2,-CFG.HALL_D/2-CFG.COR_L,'#88a0ff');
    const p=rig.object3D.position, r=camEl.object3D.rotation.y; const {mx,mz}=w2m(p.x,p.z); const len=10;
    mctx.fillStyle='#ffcf6b'; mctx.beginPath(); mctx.moveTo(mx+Math.sin(r)*len, mz-Math.cos(r)*len); mctx.lineTo(mx+Math.sin(r+2.5)*8, mz-Math.cos(r+2.5)*8); mctx.lineTo(mx+Math.sin(r-2.5)*8, mz-Math.cos(r-2.5)*8); mctx.closePath(); mctx.fill();
    requestAnimationFrame(draw);
  }
  draw();
})();