/* VLife • Chateau Hub – script.js (chateau-1.7.1 corridor & jungle pass)
   – Fix door/corridor seams
   – Correct corridor floor repeat
   – Frame placement/rotation on all corridors
   – Clearer Jungle room visuals
*/
const TELEPORT_VIA_GAZE=false, TELEPORT_DURATION_MS=900, TELEPORT_DEADZONE_M=0.25, TELEPORT_ARM_DELAY_MS=1200;
const HALL_W=18, HALL_D=18, HALL_H=4.8, WALL_T=0.14;          // WALL_T +0.04 (thicker)
const COR_W=3.0, COR_H=HALL_H, COR_L=14.0;
const ROOM_W=12.0, ROOM_D=12.0, ROOM_H=4.8;
const DOOR_W=COR_W+0.35, DOOR_H=3.2;

const scene=document.getElementById('scene');
const env  =document.getElementById('env');
const rig  =document.getElementById('rig');
const camEl=document.getElementById('cam');
const map  =document.getElementById('mapCanvas');
const mctx =map.getContext('2d');

/* ---- links (same) ---- */
const LINKS=[
  {title:'Grand Canyon 360',   url:'https://www.youtube.com/watch?v=CSvFpBOe8eY'},
  {title:'Roller Coaster 360', url:'https://www.youtube.com/watch?v=VR1b7GdQf2I'},
  {title:'Cities at Night 360',url:'https://www.youtube.com/watch?v=v8VrmkG2FvE'},
  {title:'Ocean Dive 360',     url:'https://www.youtube.com/watch?v=6B9vLwYxGZ0'},
  {title:'Space Walk 360',     url:'https://www.youtube.com/watch?v=0qisGSwZym4'},
  {title:'Mountain Flight 360',url:'https://www.youtube.com/watch?v=GoB9aSxUjYw'}
];
const parseYouTubeId=u=>{try{const url=new URL(u);if(url.hostname.includes('youtu.be'))return url.pathname.slice(1);if(url.hostname.includes('youtube.com'))return url.searchParams.get('v');}catch(e){}return null;}
const ytThumb=u=>{const id=parseYouTubeId(u);return id?`https://img.youtube.com/vi/${id}/hqdefault.jpg`:null;}
(function tuneRaycaster(){const c=document.getElementById('gazeCursor'); if(!c)return; c.setAttribute('raycaster',`objects:${TELEPORT_VIA_GAZE?'.teleport, .interact':'.interact'}; far:70; interval:0`);})();

/* ---- textures ---- */
function stoneTilesTexture(rx,rz){const c=document.createElement('canvas');c.width=512;c.height=512;const g=c.getContext('2d');g.fillStyle='#d8d2c6';g.fillRect(0,0,512,512);const N=8,s=512/N;for(let i=0;i<N;i++){for(let j=0;j<N;j++){const shade=205+((i+j)%2?-10:0);g.fillStyle=`rgb(${shade},${shade-6},${shade-12})`;g.fillRect(i*s+1,j*s+1,s-2,s-2);}}g.strokeStyle='rgba(60,60,60,0.35)';for(let k=0;k<=N;k++){g.beginPath();g.moveTo(k*s,0);g.lineTo(k*s,512);g.stroke();g.beginPath();g.moveTo(0,k*s);g.lineTo(512,k*s);g.stroke();}const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(rx,rz);return tex;}
function stripedWoodTexture(along='x',len=1,wide=1){const c=document.createElement('canvas');c.width=1024;c.height=256;const g=c.getContext('2d');const stripes=28;for(let i=0;i<stripes;i++){const t=i/stripes;const col=`rgb(${110+Math.floor(60*Math.sin(t*6.28+0.8))},${70+Math.floor(40*Math.sin(t*7.5+1.2))},${40+Math.floor(35*Math.sin(t*5.9+2.0))})`;g.fillStyle=col;if(along==='x')g.fillRect(Math.floor(i*(c.width/stripes)),0,Math.ceil(c.width/stripes),c.height);else g.fillRect(0,Math.floor(i*(c.height/stripes)),c.width,Math.ceil(c.height/stripes));}const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(along==='x'?len:wide,along==='x'?wide:len);return tex;}
function plankWallTexture(){const c=document.createElement('canvas');c.width=512;c.height=512;const g=c.getContext('2d');for(let i=0;i<16;i++){const y=i*(512/16);g.fillStyle=`rgb(${92+Math.floor(Math.random()*20)},${58+Math.floor(Math.random()*18)},${36+Math.floor(Math.random()*12)})`;g.fillRect(0,y,512,Math.ceil(512/16)-2);}g.strokeStyle='rgba(30,20,10,0.45)';for(let i=0;i<=16;i++){g.beginPath();g.moveTo(0,i*(512/16));g.lineTo(512,i*(512/16));g.stroke();}const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(2,2);return tex;}
function metalPanelTexture(){const c=document.createElement('canvas');c.width=512;c.height=512;const g=c.getContext('2d');const grad=g.createLinearGradient(0,0,512,512);grad.addColorStop(0,'#9aa5b3');grad.addColorStop(0.5,'#b9c2ce');grad.addColorStop(1,'#8c95a3');g.fillStyle=grad;g.fillRect(0,0,512,512);g.fillStyle='rgba(255,255,255,0.15)';g.fillRect(0,220,512,14);g.fillRect(0,410,512,10);const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(2,2);return tex;}
function frostedTexture(){const c=document.createElement('canvas');c.width=256;c.height=256;const g=c.getContext('2d');for(let i=0;i<500;i++){g.fillStyle=`rgba(200,240,255,${Math.random()*0.2+0.1})`;g.beginPath();g.arc(Math.random()*256,Math.random()*256,Math.random()*3+1,0,Math.PI*2);g.fill();}const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(6,6);return tex;}
function gridTexture(){const c=document.createElement('canvas');c.width=512;c.height=512;const g=c.getContext('2d');g.fillStyle='#11161c';g.fillRect(0,0,512,512);g.strokeStyle='rgba(180,200,220,0.2)';for(let i=0;i<=32;i++){g.beginPath();g.moveTo(i*16,0);g.lineTo(i*16,512);g.stroke();g.beginPath();g.moveTo(0,i*16);g.lineTo(512,i*16);g.stroke();}return new THREE.CanvasTexture(c);}

/* ---- utilities ---- */
const addBox=(x,y,z,w,h,d,color)=>{const b=document.createElement('a-box');b.setAttribute('position',`${x} ${y} ${z}`);b.setAttribute('width',w);b.setAttribute('height',h);b.setAttribute('depth',d);if(color)b.setAttribute('color',color);env.appendChild(b);return b;}
const addPlane=(x,y,z,w,h,rot,color)=>{const p=document.createElement('a-plane');p.setAttribute('position',`${x} ${y} ${z}`);p.setAttribute('width',w);p.setAttribute('height',h);p.setAttribute('rotation',rot||'0 0 0');if(color)p.setAttribute('color',color);env.appendChild(p);return p;}
function animateBlink(entity,onProps,offProps,ms=600){let on=false;setInterval(()=>{on=!on;entity.setAttribute('material',on?onProps:offProps);},ms);}

/* ---- teleport (unchanged) ---- */
(function setTeleport(){
  const lerpMs=TELEPORT_DURATION_MS; let armed=false; setTimeout(()=>armed=true, TELEPORT_ARM_DELAY_MS);
  const halfHallX=HALL_W/2-0.4, halfHallZ=HALL_D/2-0.4;
  const endX=halfHallX+COR_L, endZ=halfHallZ+COR_L;
  const roomHalfX=ROOM_W/2-0.4, roomHalfZ=ROOM_D/2-0.4;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function moveTo(x,z){
    const cur=rig.object3D.position; let tx=x,tz=z;
    if(Math.abs(x)<=halfHallX && Math.abs(z)<=halfHallZ){ tx=clamp(x,-halfHallX,halfHallX); tz=clamp(z,-halfHallZ,halfHallZ); }
    else{
      const inXStrip=Math.abs(z)<=COR_W/2-0.2, inZStrip=Math.abs(x)<=COR_W/2-0.2;
      if(inXStrip){
        if(Math.abs(x)>endX){ const cx=Math.sign(x)*(endX+roomHalfX); tx=clamp(x,cx-roomHalfX,cx+roomHalfX); tz=clamp(z,-roomHalfZ,roomHalfZ); }
        else{ tx=clamp(x,-endX,endX); tz=clamp(z,-COR_W/2+0.2,COR_W/2-0.2); }
      }else if(inZStrip){
        if(Math.abs(z)>endZ){ const cz=Math.sign(z)*(endZ+roomHalfZ); tz=clamp(z,cz-roomHalfZ,cz+roomHalfZ); tx=clamp(x,-roomHalfX,roomHalfX); }
        else{ tz=clamp(z,-endZ,endZ); tx=clamp(x,-COR_W/2+0.2,COR_W/2-0.2); }
      }else{ tx=clamp(x,-halfHallX,halfHallX); tz=clamp(z,-halfHallZ,halfHallZ); }
    }
    if(Math.hypot(tx-cur.x,tz-cur.z)<TELEPORT_DEADZONE_M)return;
    const start=cur.clone(), end=new THREE.Vector3(tx,start.y,tz); const t0=performance.now();
    const step=()=>{const t=(performance.now()-t0)/lerpMs, k=t>=1?1:(1-Math.cos(Math.min(1,t)*Math.PI))/2; rig.object3D.position.copy(start.clone().lerp(end,k)); if(t<1)requestAnimationFrame(step);};
    requestAnimationFrame(step);
  }
  scene.addEventListener('click',(e)=>{const t=e.target; if(!t?.classList?.contains('teleport'))return; const d=e.detail||{}, i=d.intersection||(d.intersections&&d.intersections[0]); if(!i)return; moveTo(i.point.x,i.point.z);});
})();

/* ---- build Hall, Corridors, Rooms ---- */
(function build(){
  const wallColor='#cfc8bc', trim='#b3ab9b', panelA='#c8c1b5', panelB='#bfb7a9';

  /* Hall floor (stone) */
  const hallFloor=document.createElement('a-entity'); hallFloor.classList.add('teleport');
  hallFloor.setAttribute('geometry',`primitive:plane; width:${HALL_W}; height:${HALL_D}`);
  hallFloor.setAttribute('rotation','-90 0 0'); hallFloor.setAttribute('material','shader:flat; src:');
  hallFloor.addEventListener('loaded',()=>{const m=hallFloor.getObject3D('mesh'); if(m){m.material.map=stoneTilesTexture(HALL_W/3,HALL_D/3); m.material.needsUpdate=true;}}); env.appendChild(hallFloor);
  addBox(0,0.10,0,HALL_W+WALL_T*2,0.12,HALL_D+WALL_T*2,trim);
  addBox(0,HALL_H-0.08,0,HALL_W+WALL_T*2,0.12,HALL_D+WALL_T*2,trim);

  /* Door walls with sign plates and deeper jambs */
  function wallWithOpening(side,label){
    const alongX=(side==='N'||side==='S'), sign=(side==='N'||side==='W')?-1:1;
    const wx=(side==='E'? HALL_W/2 : side==='W'? -HALL_W/2 : 0);
    const wz=(side==='S'? HALL_D/2 : side==='N'? -HALL_D/2 : 0);

    const jambD=WALL_T+0.02; // deeper to stop seams
    if(alongX){
      const leftW=(HALL_W-DOOR_W)/2;
      addBox(-HALL_W/2+leftW/2, HALL_H/2, wz, leftW, HALL_H, jambD, wallColor);
      addBox( HALL_W/2-leftW/2, HALL_H/2, wz, leftW, HALL_H, jambD, wallColor);
      addBox(0, (DOOR_H+HALL_H)/2, wz, DOOR_W, HALL_H-DOOR_H, jambD, wallColor);
    }else{
      const leftD=(HALL_D-DOOR_W)/2;
      addBox(wx, HALL_H/2, -HALL_D/2+leftD/2, jambD, HALL_H, leftD, wallColor);
      addBox(wx, HALL_H/2,  HALL_D/2-leftD/2, jambD, HALL_H, leftD, wallColor);
      addBox(wx, (DOOR_H+HALL_H)/2, 0, jambD, HALL_H-DOOR_H, DOOR_W, wallColor);
    }

    const labelEnt=document.createElement('a-entity');
    const rot=alongX?(sign>0?180:0):(side==='E'?-90:90);
    const lx=alongX?0:wx+sign*(jambD/2+0.02), lz=alongX?wz+sign*(jambD/2+0.02):0;
    labelEnt.setAttribute('position',`${lx} ${DOOR_H+0.42} ${lz}`); labelEnt.setAttribute('rotation',`0 ${rot} 0`);
    labelEnt.setAttribute('text',`value:${label}; align:center; color:#2d2214; width:6; baseline:center`);
    env.appendChild(labelEnt);

    // slim chair rail for readability
    if(alongX) addBox(0,1.0, wz+sign*(jambD/2+0.02), HALL_W, 0.05, 0.05, trim);
    else       addBox(wx+sign*(jambD/2+0.02), 1.0, 0, 0.05, 0.05, HALL_D, trim);
  }
  wallWithOpening('N','Cabin Wing');
  wallWithOpening('E','Starship Wing');
  wallWithOpening('S','Jungle Wing');
  wallWithOpening('W','Ice Vault Wing');

  /* Ceiling + chandelier points */
  addPlane(0,HALL_H,0,HALL_W,HALL_D,'90 0 0','#4d341c');
  [['-3','-3'],['3','-3'],['-3','3'],['3','3'],['0','0']].forEach(([x,z])=>{
    const bulb=document.createElement('a-sphere'); bulb.setAttribute('radius','0.10'); bulb.setAttribute('material','color:#ffe9ba; emissive:#ffd995; emissiveIntensity:1'); bulb.setAttribute('position',`${x} ${HALL_H-0.7} ${z}`); env.appendChild(bulb);
    const l=document.createElement('a-entity'); l.setAttribute('light','type:point; intensity:0.9; distance:14; color:#ffd08a'); l.setAttribute('position',`${x} ${HALL_H-0.7} ${z}`); env.appendChild(l);
  });

  /* Corridors (corrected caps & floor repeat) */
  function corridor(axis){
    const alongX=(axis==='x+'||axis==='x-'), sign=axis.includes('+')?1:-1;
    const sx=alongX?sign*(HALL_W/2):0, sz=alongX?0:sign*(HALL_D/2);

    const floor=document.createElement('a-entity'); floor.classList.add('teleport');
    if(alongX){ floor.setAttribute('geometry',`primitive:plane; width:${COR_L}; height:${COR_W}`); floor.setAttribute('position',`${sx+sign*(COR_L/2)} 0 0`); }
    else{ floor.setAttribute('geometry',`primitive:plane; width:${COR_W}; height:${COR_L}`); floor.setAttribute('position',`0 0 ${sz+sign*(COR_L/2)}`); }
    floor.setAttribute('rotation','-90 0 0'); floor.setAttribute('material','shader:flat; src:');
    floor.addEventListener('loaded',()=>{const m=floor.getObject3D('mesh'); if(m){const len=COR_L/2, wide=Math.max(2, COR_W/1.2); m.material.map=stripedWoodTexture(alongX?'x':'z', len, wide); m.material.needsUpdate=true;}}); env.appendChild(floor);

    // side walls
    const wcol='#cfc8bc', cap=0.06;
    if(alongX){
      addBox(sx+sign*(COR_L/2), HALL_H/2,  COR_W/2 + WALL_T/2, COR_L, HALL_H, WALL_T, wcol);
      addBox(sx+sign*(COR_L/2), HALL_H/2, -COR_W/2 - WALL_T/2, COR_L, HALL_H, WALL_T, wcol);
      addBox(sx+sign*cap,        HALL_H/2, 0, WALL_T, HALL_H, COR_W, wcol);                // inner cap
      addBox(sx+sign*(COR_L-cap),HALL_H/2, 0, WALL_T, HALL_H, COR_W, wcol);                // far cap
    }else{
      addBox( COR_W/2 + WALL_T/2, HALL_H/2, sz+sign*(COR_L/2), WALL_T, HALL_H, COR_L, wcol);
      addBox(-COR_W/2 - WALL_T/2, HALL_H/2, sz+sign*(COR_L/2), WALL_T, HALL_H, COR_L, wcol);
      addBox(0, HALL_H/2, sz+sign*cap, COR_W, HALL_H, WALL_T, wcol);
      addBox(0, HALL_H/2, sz+sign*(COR_L-cap), COR_W, HALL_H, WALL_T, wcol);
    }
    return {alongX,sign,startX:sx,startZ:sz};
  }
  const corE=corridor('x+'), corW=corridor('x-'), corS=corridor('z+'), corN=corridor('z-');

  /* Frames: bigger offset + correct yaw on all sides */
  const STEP=3.2, MARGIN=1.6, OFFSET=0.12;   // OFFSET doubled
  let linkIdx=0;
  function addFrame(pos,yaw){
    const link=LINKS[linkIdx++%LINKS.length];
    const frame=document.createElement('a-entity'); frame.classList.add('interact');
    const outer=addBox(0,0,0,1.68,1.08,0.04,'#3d2a16'); frame.appendChild(outer);
    const inner=addBox(0,0,0.03,1.60,1.00,0.02,'#1d2230'); frame.appendChild(inner);
    const img=document.createElement('a-image'); img.setAttribute('src',ytThumb(link.url)||'#fallbackPoster'); img.setAttribute('width','1.52'); img.setAttribute('height','0.92'); img.setAttribute('position','0 0 0.04'); frame.appendChild(img);
    const cap=document.createElement('a-entity'); cap.setAttribute('text',`value:${link.title}; align:center; color:#f5f5f5; width:2.4; wrapCount:22; zOffset:0.01`); cap.setAttribute('position','0 -0.70 0.05'); frame.appendChild(cap);
    frame.setAttribute('position',`${pos.x} ${pos.y} ${pos.z}`); frame.setAttribute('rotation',`0 ${yaw} 0`);
    frame.addEventListener('mouseenter',()=>inner.setAttribute('color','#273045'));
    frame.addEventListener('mouseleave',()=>inner.setAttribute('color','#1d2230'));
    frame.addEventListener('click',()=>{try{window.open(link.url,'_blank');}catch(e){location.href=link.url;}});
    env.appendChild(frame);
  }
  [corE,corW,corS,corN].forEach(({alongX,sign,startX,startZ})=>{
    const y=1.6;
    if(alongX){
      const zpos= COR_W/2 + WALL_T/2 + OFFSET;  // right wall (faces inward → yaw 180 if right of cam)
      const zneg=-COR_W/2 - WALL_T/2 - OFFSET;  // left wall
      for(let x=startX+sign*MARGIN; Math.abs(x-startX)<COR_L-0.8; x+=sign*STEP){
        addFrame({x,y,z:zpos}, 180);   // faces corridor
        addFrame({x,y,z:zneg},   0);
      }
    } else {
      const xpos= COR_W/2 + WALL_T/2 + OFFSET;  // top wall (faces inward → yaw -90)
      const xneg=-COR_W/2 - WALL_T/2 - OFFSET;  // bottom wall
      for(let z=startZ+sign*MARGIN; Math.abs(z-startZ)<COR_L-0.8; z+=sign*STEP){
        addFrame({x:xpos,y,z}, -90);
        addFrame({x:xneg,y,z},  90);
      }
    }
  });

  /* Helper to place rooms */
  const roomCenter = ({alongX,sign,startX,startZ}) => alongX ? {cx:startX+sign*(COR_L+ROOM_W/2), cz:0} : {cx:0, cz:startZ+sign*(COR_L+ROOM_D/2)};
  function buildRoomShellBoxes(cx,cz,w,d,h,opts={}){
    const floor=document.createElement('a-entity'); floor.classList.add('teleport');
    floor.setAttribute('geometry',`primitive:plane; width:${w}; height:${d}`); floor.setAttribute('rotation','-90 0 0'); floor.setAttribute('position',`${cx} 0 ${cz}`);
    floor.setAttribute('material',opts.floorMaterial||'color:#888');
    floor.addEventListener('loaded',()=>{const m=floor.getObject3D('mesh'); if(m && opts.floorMap){m.material.map=opts.floorMap; m.material.needsUpdate=true;}});
    env.appendChild(floor);
    const wc=opts.wallColor||'#bbb', wm=opts.wallMap;
    const wA=addBox(cx, h/2, cz-d/2+WALL_T/2, w, h, WALL_T, wc);
    const wB=addBox(cx, h/2, cz+d/2-WALL_T/2, w, h, WALL_T, wc);
    const wC=addBox(cx-w/2+WALL_T/2, h/2, cz, WALL_T, h, d, wc);
    const wD=addBox(cx+w/2-WALL_T/2, h/2, cz, WALL_T, h, d, wc);
    [wA,wB,wC,wD].forEach(b=>b.addEventListener('loaded',()=>{const m=b.getObject3D('mesh'); if(m && wm){m.material.map=wm; m.material.needsUpdate=true;} if(opts.wallOpacity!=null){m.material.transparent=true; m.material.opacity=opts.wallOpacity;}}));
    if(opts.ceiling!==false){ const ceil=addPlane(cx,h,cz,w,d,'90 0 0', (opts.ceilingColor||'#444')); ceil.addEventListener('loaded',()=>{const m=ceil.getObject3D('mesh'); if(m && opts.ceilingMap){m.material.map=opts.ceilingMap; m.material.needsUpdate=true;}}); }
    if(opts.light){ const L=document.createElement('a-entity'); L.setAttribute('light',opts.light); L.setAttribute('position',`${cx} ${h-0.6} ${cz}`); env.appendChild(L); }
    if(opts.extra) opts.extra(cx,cz,w,d,h);
  }

  /* -------- Rooms (same as 1.7, Jungle adjusted) -------- */
  // Cabin (N)
  (function(){
    const {cx,cz}=roomCenter(corN);
    buildRoomShellBoxes(cx,cz,ROOM_W,ROOM_D,ROOM_H,{
      floorMap:stripedWoodTexture('x', ROOM_W/2, 2), wallMap:plankWallTexture(), wallColor:'#6a4a2b',
      ceilingColor:'#3a2816', light:'type:point; intensity:1.0; distance:16; color:#ffd39a',
      extra:(cx,cz,w,d,h)=>{
        for(let i=-w/2+1; i<=w/2-1; i+=2){ addBox(cx+i, h-0.2, cz, 0.15, 0.25, d, '#4b321e'); }
        addBox(cx,1.0,cz-d/2+0.45,2.2,1.2,0.6,'#4b3220');
        const glow=document.createElement('a-sphere'); glow.setAttribute('radius','0.18'); glow.setAttribute('position',`${cx} 1.0 ${cz-d/2+0.2}`); glow.setAttribute('material','emissive:#ffb36b; emissiveIntensity:1.2; color:#ffdb9a'); env.appendChild(glow);
        addPlane(cx,0.02,cz,4,2,'-90 0 0','#7d3e26').setAttribute('material','opacity:0.85; side:double');
        addBox(cx,0.8,cz,1.2,0.1,0.8,'#7a5231'); addBox(cx-0.5,0.45,cz,0.3,0.3,0.3,'#6a4528'); addBox(cx+0.5,0.45,cz,0.3,0.3,0.3,'#6a4528');
        addBox(cx-w/2+0.5,1.4,cz,0.3,2.4,1.2,'#56381f'); for(let i=0;i<8;i++){ addBox(cx-w/2+0.5,0.6+0.2*i,cz-0.4+0.1*(i%3),0.2,0.16,0.06,`hsl(${20+15*i},60%,45%)`); }
      }
    });
  })();

  // Starship (E)
  (function(){
    const {cx,cz}=roomCenter(corE);
    buildRoomShellBoxes(cx,cz,ROOM_W,ROOM_D,ROOM_H,{
      floorMaterial:'color:#10151b', wallMap:metalPanelTexture(), wallColor:'#8fa0b3',
      ceilingColor:'#0f141a', light:'type:point; intensity:1.0; distance:18; color:#a8cfff',
      extra:(cx,cz,w,d,h)=>{
        const grate=addPlane(cx,0.02,cz, w-2, d-2,'-90 0 0','#20262f'); grate.addEventListener('loaded',()=>{const m=grate.getObject3D('mesh'); if(m){m.material.map=gridTexture(); m.material.needsUpdate=true;}});
        for(let z=cz-d/2+1.2; z<=cz+d/2-1.2; z+=1.4){ addBox(cx-w/2+0.25,2.0,z,0.12,3.6,0.2,'#54606f'); addBox(cx+w/2-0.25,2.0,z,0.12,3.6,0.2,'#54606f'); }
        for(let i=-2;i<=2;i++){ const scr=addPlane(cx-1.8+0.9*i,1.1,cz-d/2+0.29,0.62,0.28,'0 0 0','#001a2a'); animateBlink(scr,'color:#34c3ff; emissive:#34c3ff; emissiveIntensity:0.9','color:#052234; emissive:#052234; emissiveIntensity:0.2',700+80*i); }
      }
    });
  })();

  // Jungle (S) – clearer look, no big opaque cones
  (function(){
    const {cx,cz}=roomCenter(corS);
    buildRoomShellBoxes(cx,cz,ROOM_W,ROOM_D,ROOM_H,{
      floorMap:stripedWoodTexture('x', ROOM_W/2, 2), wallColor:'#3e5a46',
      ceilingColor:'#2b2f1a', light:'type:hemisphere; intensity:0.85; color:#ecffd2; groundColor:#20361e',
      extra:(cx,cz,w,d,h)=>{
        for(let i=-w/2+1.2;i<=w/2-1.2;i+=2.4){
          addBox(cx+i,1.6,cz-d/2+0.25,0.25,3.0,0.25,'#4e6a3f');
          for(let j=0;j<5;j++){ const leaf=addPlane(cx+i+((j%2)?0.12:-0.12),1.2+0.35*j,cz-d/2+0.3,0.55,0.22,'0 0 0','#76c56a'); leaf.setAttribute('material','opacity:0.85; side:double');}
        }
        // soft shafts (very faint)
        for(let i=0;i<2;i++){ const beam=document.createElement('a-plane'); beam.setAttribute('width',w-1.5); beam.setAttribute('height','2.8'); beam.setAttribute('rotation','-30 0 0'); beam.setAttribute('position',`${cx} ${h-0.6} ${cz - d/5 + i*(d/6)}`); beam.setAttribute('material','color:#fff5b0; opacity:0.05; transparent:true'); env.appendChild(beam); }
      }
    });
  })();

  // Ice (W)
  (function(){
    const {cx,cz}=roomCenter(corW);
    buildRoomShellBoxes(cx,cz,ROOM_W,ROOM_D,ROOM_H,{
      floorMaterial:'color:#eaf9ff', wallMap:frostedTexture(), wallOpacity:0.88, wallColor:'#cfefff',
      ceilingColor:'#cfefff', light:'type:point; intensity:0.9; distance:16; color:#bfe7ff',
      extra:(cx,cz,w,d,h)=>{
        for(let i=-w/2+1; i<=w/2-1; i+=2.0){
          const st= document.createElement('a-cone'); st.setAttribute('radius-bottom','0.45'); st.setAttribute('radius-top','0.02'); st.setAttribute('height','1.2'); st.setAttribute('material','color:#dff6ff; opacity:0.95'); st.setAttribute('position',`${cx+i} ${h-0.6} ${cz - d/4}`); st.setAttribute('rotation','180 0 0'); env.appendChild(st);
          const sm= document.createElement('a-cone'); sm.setAttribute('radius-bottom','0.45'); sm.setAttribute('radius-top','0.02'); sm.setAttribute('height','1.0'); sm.setAttribute('material','color:#e7fbff; opacity:0.95'); sm.setAttribute('position',`${cx+i} 0.5 ${cz + d/4}`); env.appendChild(sm);
        }
      }
    });
  })();
})(); // build

/* ---- minimap (unchanged) ---- */
(function miniMap(){
  const W=map.width,H=map.height;
  const maxX=(HALL_W/2+COR_L+ROOM_W/2), maxZ=(HALL_D/2+COR_L+ROOM_D/2);
  const w2m=(x,z)=>({mx:Math.round(W*(x+maxX)/(2*maxX)), mz:Math.round(H*(z+maxZ)/(2*maxZ))});
  const rect=(x1,z1,x2,z2,col='#6c7bbf')=>{mctx.strokeStyle=col;const a=w2m(x1,z1),b=w2m(x2,z2);mctx.strokeRect(a.mx,a.mz,b.mx-a.mx,b.mz-a.mz);};
  function draw(){
    mctx.fillStyle='rgba(0,0,0,0.35)'; mctx.fillRect(0,0,W,H);
    rect(-HALL_W/2,-HALL_D/2,HALL_W/2,HALL_D/2);
    rect( HALL_W/2,-COR_W/2, HALL_W/2+COR_L, COR_W/2);
    rect(-HALL_W/2-COR_L,-COR_W/2,-HALL_W/2, COR_W/2);
    rect(-COR_W/2, HALL_D/2, COR_W/2, HALL_D/2+COR_L);
    rect(-COR_W/2,-HALL_D/2-COR_L, COR_W/2,-HALL_D/2);
    rect( HALL_W/2+COR_L,-ROOM_D/2, HALL_W/2+COR_L+ROOM_W, ROOM_D/2,'#88a0ff');
    rect(-HALL_W/2-COR_L-ROOM_W,-ROOM_D/2,-HALL_W/2-COR_L, ROOM_D/2,'#88a0ff');
    rect(-ROOM_W/2, HALL_D/2+COR_L, ROOM_W/2, HALL_D/2+COR_L+ROOM_D,'#88a0ff');
    rect(-ROOM_W/2,-HALL_D/2-COR_L-ROOM_D, ROOM_W/2,-HALL_D/2-COR_L,'#88a0ff');
    const p=rig.object3D.position, r=camEl.object3D.rotation.y; const {mx,mz}=w2m(p.x,p.z); const len=10;
    mctx.fillStyle='#ffcf6b'; mctx.beginPath(); mctx.moveTo(mx+Math.sin(r)*len, mz-Math.cos(r)*len); mctx.lineTo(mx+Math.sin(r+2.5)*8, mz-Math.cos(r+2.5)*8); mctx.lineTo(mx+Math.sin(r-2.5)*8, mz-Math.cos(r-2.5)*8); mctx.closePath(); mctx.fill();
    requestAnimationFrame(draw);
  }
  draw();
})();