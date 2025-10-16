/* =========================================================
   VLife • Chateau Hub – script.js (chateau1.6)
   Fixes / Upgrades
   - Walls use thin BOXES (no z-fighting, no see-through)
   - Corridor "caps" + door jambs so you never see outside
   - Corrected face rotations (no backface cull glitches)
   - Softer lights, consistent emissives
   - Starship viewport orientation fixed
   - Jungle shafts toned down, Ice walls opacity tuned
========================================================= */

/* ---- Config ---- */
const TELEPORT_VIA_GAZE=false, TELEPORT_DURATION_MS=900, TELEPORT_DEADZONE_M=0.25, TELEPORT_ARM_DELAY_MS=1200;

const scene=document.getElementById('scene');
const env  =document.getElementById('env');
const rig  =document.getElementById('rig');
const camEl=document.getElementById('cam');
const map  =document.getElementById('mapCanvas');
const mctx =map.getContext('2d');

/* Sizes */
const HALL_W=18, HALL_D=18, HALL_H=4.8, WALL_T=0.10;  // thicker walls (box depth)
const COR_W =3.0, COR_H =HALL_H, COR_L =14.0;
const ROOM_W=12.0, ROOM_D=12.0, ROOM_H=4.8;
const DOOR_W=COR_W+0.35, DOOR_H=3.2;

const LINKS=[
  {title:'Grand Canyon 360',   url:'https://www.youtube.com/watch?v=CSvFpBOe8eY'},
  {title:'Roller Coaster 360', url:'https://www.youtube.com/watch?v=VR1b7GdQf2I'},
  {title:'Cities at Night 360',url:'https://www.youtube.com/watch?v=v8VrmkG2FvE'},
  {title:'Ocean Dive 360',     url:'https://www.youtube.com/watch?v=6B9vLwYxGZ0'},
  {title:'Space Walk 360',     url:'https://www.youtube.com/watch?v=0qisGSwZym4'},
  {title:'Mountain Flight 360',url:'https://www.youtube.com/watch?v=GoB9aSxUjYw'}
];

/* Helpers */
function parseYouTubeId(u){try{const url=new URL(u); if(url.hostname.includes('youtu.be'))return url.pathname.slice(1); if(url.hostname.includes('youtube.com'))return url.searchParams.get('v');}catch(e){} return null;}
function ytThumb(u){const id=parseYouTubeId(u); return id?`https://img.youtube.com/vi/${id}/hqdefault.jpg`:null;}
(function tuneRaycaster(){const gaze=document.getElementById('gazeCursor'); if(!gaze)return; gaze.setAttribute('raycaster',`objects:${TELEPORT_VIA_GAZE?'.teleport, .interact':'.interact'}; far:70; interval:0`);})();

/* Teleport (tap) with room-aware clamps */
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
  scene.addEventListener('click',(e)=>{ if(!armed) return; const t=e.target; if(!t?.classList?.contains('teleport'))return; const d=e.detail||{}, i=d.intersection||(d.intersections&&d.intersections[0]); if(!i)return; moveTo(i.point.x,i.point.z); });
})();

/* Procedural textures (same as 1.5, trimmed) */
function stoneTilesTexture(rx,rz){const c=document.createElement('canvas');c.width=512;c.height=512;const g=c.getContext('2d');g.fillStyle='#d8d2c6';g.fillRect(0,0,512,512);const N=8,s=512/N;for(let i=0;i<N;i++){for(let j=0;j<N;j++){const shade=205+((i+j)%2?-10:0);g.fillStyle=`rgb(${shade},${shade-6},${shade-12})`;g.fillRect(i*s+1,j*s+1,s-2,s-2);}}g.strokeStyle='rgba(60,60,60,0.35)';for(let k=0;k<=N;k++){g.beginPath();g.moveTo(k*s,0);g.lineTo(k*s,512);g.stroke();g.beginPath();g.moveTo(0,k*s);g.lineTo(512,k*s);g.stroke();}const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(rx,rz);return tex;}
function stripedWoodTexture(along='x'){const c=document.createElement('canvas');c.width=1024;c.height=256;const g=c.getContext('2d');const stripes=28;for(let i=0;i<stripes;i++){const t=i/stripes;const col=`rgb(${110+Math.floor(60*Math.sin(t*6.28+0.8))},${70+Math.floor(40*Math.sin(t*7.5+1.2))},${40+Math.floor(35*Math.sin(t*5.9+2.0))})`;g.fillStyle=col;if(along==='x')g.fillRect(Math.floor(i*(c.width/stripes)),0,Math.ceil(c.width/stripes),c.height);else g.fillRect(0,Math.floor(i*(c.height/stripes)),c.width,Math.ceil(c.height/stripes));}const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(along==='x'?8:2,along==='x'?2:8);return tex;}
function plankWallTexture(){const c=document.createElement('canvas');c.width=512;c.height=512;const g=c.getContext('2d');for(let i=0;i<16;i++){const y=i*(512/16);g.fillStyle=`rgb(${92+Math.floor(Math.random()*20)},${58+Math.floor(Math.random()*18)},${36+Math.floor(Math.random()*12)})`;g.fillRect(0,y,512,Math.ceil(512/16)-2);}g.strokeStyle='rgba(30,20,10,0.45)';for(let i=0;i<=16;i++){g.beginPath();g.moveTo(0,i*(512/16));g.lineTo(512,i*(512/16));g.stroke();}const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(2,2);return tex;}
function metalPanelTexture(){const c=document.createElement('canvas');c.width=512;c.height=512;const g=c.getContext('2d');const grad=g.createLinearGradient(0,0,512,512);grad.addColorStop(0,'#9aa5b3');grad.addColorStop(0.5,'#b9c2ce');grad.addColorStop(1,'#8c95a3');g.fillStyle=grad;g.fillRect(0,0,512,512);g.fillStyle='rgba(255,255,255,0.15)';g.fillRect(0,220,512,14);g.fillRect(0,410,512,10);const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(2,2);return tex;}
function frostedTexture(){const c=document.createElement('canvas');c.width=256;c.height=256;const g=c.getContext('2d');for(let i=0;i<500;i++){g.fillStyle=`rgba(200,240,255,${Math.random()*0.2+0.1})`;g.beginPath();g.arc(Math.random()*256,Math.random()*256,Math.random()*3+1,0,Math.PI*2);g.fill();}const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(6,6);return tex;}

/* Build */
(function build(){
  /* ambient */
  const hemi=document.createElement('a-entity'); hemi.setAttribute('light','type:hemisphere; intensity:0.8; color:#eef3ff; groundColor:#4a3e38'); hemi.setAttribute('position','0 3 0'); env.appendChild(hemi);

  /* floor */
  const hallFloor=document.createElement('a-entity'); hallFloor.classList.add('teleport');
  hallFloor.setAttribute('geometry',`primitive:plane; width:${HALL_W}; height:${HALL_D}`);
  hallFloor.setAttribute('rotation','-90 0 0'); hallFloor.setAttribute('material','shader:flat; src:');
  hallFloor.addEventListener('loaded',()=>{const m=hallFloor.getObject3D('mesh'); if(m){m.material.map=stoneTilesTexture(HALL_W/3,HALL_D/3); m.material.needsUpdate=true;}}); env.appendChild(hallFloor);

  /* helper creators */
  const addBox=(x,y,z,w,h,d,color)=>{const b=document.createElement('a-box'); b.setAttribute('position',`${x} ${y} ${z}`); b.setAttribute('width',w); b.setAttribute('height',h); b.setAttribute('depth',d); b.setAttribute('color',color); env.appendChild(b); return b;};
  const wallColor='#cfc8bc', trim='#b3ab9b', panelA='#c8c1b5', panelB='#bfb7a9';

  /* trims */
  addBox(0,0.10,0,HALL_W+WALL_T*2,0.12,HALL_D+WALL_T*2,trim);
  addBox(0,HALL_H-0.08,0,HALL_W+WALL_T*2,0.12,HALL_D+WALL_T*2,trim);

  /* Hall walls with openings (boxes) */
  function wallWithOpening(side,label){
    const alongX=(side==='N'||side==='S'), sign=(side==='N'||side==='W')?-1:1;
    const wx=(side==='E'? HALL_W/2 : side==='W'? -HALL_W/2 : 0);
    const wz=(side==='S'? HALL_D/2 : side==='N'? -HALL_D/2 : 0);

    // long wall split into 3 boxes (left, lintel, right) to create a clean doorway
    if(alongX){
      const leftW=(HALL_W-DOOR_W)/2;
      addBox(-HALL_W/2+leftW/2, HALL_H/2, wz, leftW, HALL_H, WALL_T, wallColor);
      addBox( HALL_W/2-leftW/2, HALL_H/2, wz, leftW, HALL_H, WALL_T, wallColor);
      // lintel above the gap
      addBox(0, (DOOR_H+HALL_H)/2, wz, DOOR_W, HALL_H-DOOR_H, WALL_T, wallColor);
      // jambs (to mask seam edges)
      addBox(-DOOR_W/2-0.03, DOOR_H/2, wz+sign*(WALL_T/2-0.01), 0.06, DOOR_H, 0.08, trim);
      addBox( DOOR_W/2+0.03, DOOR_H/2, wz+sign*(WALL_T/2-0.01), 0.06, DOOR_H, 0.08, trim);
    }else{
      const leftD=(HALL_D-DOOR_W)/2;
      addBox(wx, HALL_H/2, -HALL_D/2+leftD/2, WALL_T, HALL_H, leftD, wallColor);
      addBox(wx, HALL_H/2,  HALL_D/2-leftD/2, WALL_T, HALL_H, leftD, wallColor);
      addBox(wx, (DOOR_H+HALL_H)/2, 0, WALL_T, HALL_H-DOOR_H, DOOR_W, wallColor);
      addBox(wx+sign*(WALL_T/2-0.01), DOOR_H/2, -DOOR_W/2-0.03, 0.08, DOOR_H, 0.06, trim);
      addBox(wx+sign*(WALL_T/2-0.01), DOOR_H/2,  DOOR_W/2+0.03, 0.08, DOOR_H, 0.06, trim);
    }

    // chair rail (thin box)
    if(alongX) addBox(0,1.0, wz+sign*(WALL_T/2+0.02), HALL_W, 0.06, 0.06, trim);
    else       addBox(wx+sign*(WALL_T/2+0.02), 1.0, 0, 0.06, 0.06, HALL_D, trim);

    // 1m panels (planes slightly off wall to avoid z-fight)
    const panelW=1.0, gapP=0.08, panelH=3.0, panelY=1.6, off=sign*(WALL_T/2+0.006);
    const width=alongX?HALL_W:HALL_D, count=Math.floor((width-0.4)/(panelW+gapP));
    for(let i=0;i<count;i++){
      const step=-((count-1)*(panelW+gapP))/2 + i*(panelW+gapP);
      if(Math.abs(step)<DOOR_W/2+0.05) continue;
      const p=document.createElement('a-plane'); p.setAttribute('width',panelW); p.setAttribute('height',panelH);
      p.setAttribute('material',`color:${i%2?panelA:panelB}`);
      if(alongX){ p.setAttribute('position',`${step} ${panelY} ${wz+off}`); p.setAttribute('rotation',`0 ${sign>0?180:0} 0`); }
      else{ p.setAttribute('position',`${wx+off} ${panelY} ${step}`); p.setAttribute('rotation',`0 ${side==='E'?-90:90} 0`); }
      env.appendChild(p);
    }

    // label
    const labelEnt=document.createElement('a-entity');
    const rot=alongX?(sign>0?180:0):(side==='E'?-90:90);
    const lx=alongX?0:wx+sign*(WALL_T/2+0.02), lz=alongX?wz+sign*(WALL_T/2+0.02):0;
    labelEnt.setAttribute('position',`${lx} ${DOOR_H+0.35} ${lz}`);
    labelEnt.setAttribute('rotation',`0 ${rot} 0`);
    labelEnt.setAttribute('text',`value:${label}; align:center; color:#3a2a17; width:6`); env.appendChild(labelEnt);
  }

  wallWithOpening('N','Cabin Wing');
  wallWithOpening('E','Starship Wing');
  wallWithOpening('S','Jungle Wing');
  wallWithOpening('W','Ice Vault Wing');

  /* ceiling */
  const ceil=document.createElement('a-plane'); ceil.setAttribute('rotation','90 0 0'); ceil.setAttribute('position',`0 ${HALL_H} 0`);
  ceil.setAttribute('width',HALL_W); ceil.setAttribute('height',HALL_D); ceil.setAttribute('material','color:#4d341c'); env.appendChild(ceil);

  /* chandeliers (softer) */
  function chandelier(x,z){const y=HALL_H-0.7; const bulb=document.createElement('a-sphere'); bulb.setAttribute('radius','0.10'); bulb.setAttribute('color','#ffe9ba'); bulb.setAttribute('material','emissive:#ffd995; emissiveIntensity:1.0'); bulb.setAttribute('position',`${x} ${y} ${z}`); env.appendChild(bulb); const l=document.createElement('a-entity'); l.setAttribute('light','type:point; intensity:0.9; distance:14; color:#ffd08a'); l.setAttribute('position',`${x} ${y} ${z}`); env.appendChild(l);}
  [[-3,-3],[3,-3],[-3,3],[3,3],[0,0]].forEach(([x,z])=>chandelier(x,z));

  /* corridor maker (with caps so you never see outside) */
  function corridor(axis){
    const alongX=(axis==='x+'||axis==='x-'), sign=axis.includes('+')?1:-1;
    const sx=alongX?sign*(HALL_W/2):0, sz=alongX?0:sign*(HALL_D/2);

    // floor
    const floor=document.createElement('a-entity'); floor.classList.add('teleport');
    if(alongX){ floor.setAttribute('geometry',`primitive:plane; width:${COR_L}; height:${COR_W}`); floor.setAttribute('position',`${sx+sign*(COR_L/2)} 0 0`); }
    else{ floor.setAttribute('geometry',`primitive:plane; width:${COR_W}; height:${COR_L}`); floor.setAttribute('position',`0 0 ${sz+sign*(COR_L/2)}`); }
    floor.setAttribute('rotation','-90 0 0'); floor.setAttribute('material','shader:flat; src:');
    floor.addEventListener('loaded',()=>{const m=floor.getObject3D('mesh'); if(m){m.material.map=stripedWoodTexture(alongX?'x':'z'); m.material.needsUpdate=true;}}); env.appendChild(floor);

    // side walls (BOXES)
    const zA= COR_W/2 + WALL_T/2, zB=-COR_W/2 - WALL_T/2;
    const xA= COR_W/2 + WALL_T/2, xB=-COR_W/2 - WALL_T/2;
    if(alongX){
      addBox(sx+sign*(COR_L/2), HALL_H/2,  zA, COR_L, HALL_H, WALL_T, wallColor);
      addBox(sx+sign*(COR_L/2), HALL_H/2,  zB, COR_L, HALL_H, WALL_T, wallColor);
      // caps
      addBox(sx+sign*0.02,        HALL_H/2, 0, WALL_T, HALL_H, COR_W, wallColor);                     // near cap (door jamb covers seam)
      addBox(sx+sign*(COR_L-0.02),HALL_H/2, 0, WALL_T, HALL_H, COR_W, wallColor);                     // far cap (room junction)
    }else{
      addBox( xA, HALL_H/2, sz+sign*(COR_L/2), WALL_T, HALL_H, COR_L, wallColor);
      addBox( xB, HALL_H/2, sz+sign*(COR_L/2), WALL_T, HALL_H, COR_L, wallColor);
      addBox(0, HALL_H/2, sz+sign*0.02, COR_W, HALL_H, WALL_T, wallColor);
      addBox(0, HALL_H/2, sz+sign*(COR_L-0.02), COR_W, HALL_H, WALL_T, wallColor);
    }

    // sconces
    function sconce(x,y,z,yaw){const plate=document.createElement('a-box'); plate.setAttribute('width','0.12'); plate.setAttribute('height','0.12'); plate.setAttribute('depth','0.02'); plate.setAttribute('rotation',`0 ${yaw} 0`); plate.setAttribute('position',`${x} ${y} ${z}`); plate.setAttribute('color','#4b3a2a'); env.appendChild(plate); const flame=document.createElement('a-sphere'); flame.setAttribute('radius','0.05'); flame.setAttribute('color','#ffe7a3'); flame.setAttribute('material','emissive:#ffd68a; emissiveIntensity:0.9'); flame.setAttribute('position',`${x} ${y} ${z}`); env.appendChild(flame); const l=document.createElement('a-entity'); l.setAttribute('light','type:point; intensity:0.6; distance:7; color:#ffd08a'); l.setAttribute('position',`${x} ${y} ${z}`); env.appendChild(l);}
    const step=5; if(alongX){for(let x=sx+sign*2; Math.abs(x-sx)<COR_L-1.5; x+=sign*step){sconce(x,2.0, zA,180); sconce(x,2.0, zB,0);}}
    else{for(let z=sz+sign*2; Math.abs(z-sz)<COR_L-1.5; z+=sign*step){sconce( xA,2.0,z,-90); sconce( xB,2.0,z,90);}}

    return {alongX,sign,startX:sx,startZ:sz};
  }

  const corE=corridor('x+'), corW=corridor('x-'), corS=corridor('z+'), corN=corridor('z-');

  /* corridor frames (flush) */
  const STEP=3.2, MARGIN=1.6, OFFSET=0.06; let linkIdx=0;
  function addFrame(pos,yaw){const link=LINKS[linkIdx++%LINKS.length]; const frame=document.createElement('a-entity'); frame.classList.add('interact');
    const outer=document.createElement('a-box'); outer.setAttribute('width','1.68'); outer.setAttribute('height','1.08'); outer.setAttribute('depth','0.04'); outer.setAttribute('color','#3d2a16'); frame.appendChild(outer);
    const inner=document.createElement('a-box'); inner.setAttribute('width','1.60'); inner.setAttribute('height','1.00'); inner.setAttribute('depth','0.02'); inner.setAttribute('color','#1d2230'); inner.setAttribute('position','0 0 0.03'); frame.appendChild(inner);
    const img=document.createElement('a-image'); img.setAttribute('src',ytThumb(link.url)||'#fallbackPoster'); img.setAttribute('width','1.52'); img.setAttribute('height','0.92'); img.setAttribute('position','0 0 0.04'); frame.appendChild(img);
    const cap=document.createElement('a-entity'); cap.setAttribute('text',`value:${link.title}; align:center; color:#f5f5f5; width:2.4; wrapCount:22; zOffset:0.01`); cap.setAttribute('position','0 -0.70 0.05'); frame.appendChild(cap);
    frame.setAttribute('position',`${pos.x} ${pos.y} ${pos.z}`); frame.setAttribute('rotation',`0 ${yaw} 0`);
    frame.addEventListener('mouseenter',()=>inner.setAttribute('color','#273045'));
    frame.addEventListener('mouseleave',()=>inner.setAttribute('color','#1d2230'));
    frame.addEventListener('click',()=>{try{window.open(link.url,'_blank');}catch(e){location.href=link.url;}});
    env.appendChild(frame);}
  [corE,corW,corS,corN].forEach(({alongX,sign,startX,startZ})=>{
    const y=1.6;
    if(alongX){
      const zpos= COR_W/2 + WALL_T/2 + OFFSET, zneg=-COR_W/2 - WALL_T/2 - OFFSET;
      for(let x=startX+sign*MARGIN; Math.abs(x-startX)<COR_L-0.8; x+=sign*STEP){ addFrame({x,y,z:zpos},180); addFrame({x,y,z:zneg},0); }
    } else {
      const xpos= COR_W/2 + WALL_T/2 + OFFSET, xneg=-COR_W/2 - WALL_T/2 - OFFSET;
      for(let z=startZ+sign*MARGIN; Math.abs(z-startZ)<COR_L-0.8; z+=sign*STEP){ addFrame({x:xpos,y,z},-90); addFrame({x:xneg,y,z},90); }
    }
  });

  /* Themed rooms */
  function roomCenter({alongX,sign,startX,startZ}){ return alongX? {cx:startX+sign*(COR_L+ROOM_W/2), cz:0} : {cx:0, cz:startZ+sign*(COR_L+ROOM_D/2)}; }
  function buildRoomShellBoxes(cx,cz,w,d,h,opts={}){
    // floor
    const floor=document.createElement('a-entity'); floor.classList.add('teleport');
    floor.setAttribute('geometry',`primitive:plane; width:${w}; height:${d}`); floor.setAttribute('rotation','-90 0 0'); floor.setAttribute('position',`${cx} 0 ${cz}`);
    floor.setAttribute('material',opts.floorMaterial||'color:#888'); floor.addEventListener('loaded',()=>{const m=floor.getObject3D('mesh'); if(m && opts.floorMap){m.material.map=opts.floorMap; m.material.needsUpdate=true;}}); env.appendChild(floor);
    // walls (boxes)
    const wc=opts.wallColor||'#bbb', wm=opts.wallMap;
    const wA=addBox(cx, h/2, cz-d/2+WALL_T/2, w, h, WALL_T, wc);
    const wB=addBox(cx, h/2, cz+d/2-WALL_T/2, w, h, WALL_T, wc);
    const wC=addBox(cx-w/2+WALL_T/2, h/2, cz, WALL_T, h, d, wc);
    const wD=addBox(cx+w/2-WALL_T/2, h/2, cz, WALL_T, h, d, wc);
    [wA,wB,wC,wD].forEach(b=>b.addEventListener('loaded',()=>{const m=b.getObject3D('mesh'); if(m && wm){m.material.map=wm; m.material.needsUpdate=true;} if(opts.wallOpacity!=null){m.material.transparent=true; m.material.opacity=opts.wallOpacity;}}));
    // ceiling
    if(opts.ceiling!==false){ const ceil=document.createElement('a-entity'); ceil.setAttribute('geometry',`primitive:plane; width:${w}; height:${d}`); ceil.setAttribute('rotation','90 0 0'); ceil.setAttribute('position',`${cx} ${h} ${cz}`); ceil.setAttribute('material',opts.ceilingMaterial||'color:#444'); ceil.addEventListener('loaded',()=>{const m=ceil.getObject3D('mesh'); if(m && opts.ceilingMap){m.material.map=opts.ceilingMap; m.material.needsUpdate=true;}}); env.appendChild(ceil); }
    // light
    if(opts.light){ const L=document.createElement('a-entity'); L.setAttribute('light',opts.light); L.setAttribute('position',`${cx} ${h-0.6} ${cz}`); env.appendChild(L); }
    if(opts.extra) opts.extra(cx,cz,w,d,h);
  }

  /* Cabin (North) */
  (function(){const {cx,cz}=roomCenter(corN);
    buildRoomShellBoxes(cx,cz,ROOM_W,ROOM_D,ROOM_H,{
      floorMap:stripedWoodTexture('x'), wallMap:plankWallTexture(), wallColor:'#6a4a2b',
      ceilingMaterial:'color:#3a2816', light:'type:point; intensity:1.0; distance:16; color:#ffd39a',
      extra:(cx,cz,w,d,h)=>{const fp=addBox(cx,1.0,cz-d/2+0.45,2.2,1.2,0.6,'#4b3220'); const glow=document.createElement('a-sphere'); glow.setAttribute('radius','0.18'); glow.setAttribute('position',`${cx} 1.0 ${cz - d/2 + 0.2}`); glow.setAttribute('material','emissive:#ffb36b; emissiveIntensity:1.0; color:#ffdb9a'); env.appendChild(glow);}
    });
  })();

  /* Starship (East) */
  (function(){const {cx,cz}=roomCenter(corE);
    buildRoomShellBoxes(cx,cz,ROOM_W,ROOM_D,ROOM_H,{
      floorMaterial:'color:#20262f; metalness:0.6; roughness:0.2', wallMap:metalPanelTexture(), wallColor:'#9aa5b3',
      ceilingMaterial:'color:#12161c', light:'type:point; intensity:1.0; distance:18; color:#a8cfff',
      extra:(cx,cz,w,d,h)=>{
        const strip=(x,z)=>{addBox(x,1.2,z,3.2,0.06,0.02,'#cfe8ff');};
        strip(cx,cz-d/3); strip(cx,cz+d/3);
        // viewport (now facing inward)
        const view=document.createElement('a-plane');
        view.setAttribute('width','4.6'); view.setAttribute('height','2.2');
        view.setAttribute('position',`${cx + w/2 - 0.06} 2.4 ${cz}`); view.setAttribute('rotation','0 -90 0');
        view.addEventListener('loaded',()=>{const m=view.getObject3D('mesh'); if(m){const c=document.createElement('canvas'); c.width=512;c.height=256;const g=c.getContext('2d');g.fillStyle='#03060b';g.fillRect(0,0,512,256);for(let i=0;i<320;i++){g.fillStyle=`rgba(255,255,255,${Math.random()*0.9})`;g.fillRect(Math.random()*512,Math.random()*256,1,1);}const t=new THREE.CanvasTexture(c); m.material.map=t; m.material.needsUpdate=true;}}); env.appendChild(view);
      }
    });
  })();

  /* Jungle (South) */
  (function(){const {cx,cz}=roomCenter(corS);
    buildRoomShellBoxes(cx,cz,ROOM_W,ROOM_D,ROOM_H,{
      floorMap:stripedWoodTexture('x'), wallColor:'#2a3d2e', ceilingMaterial:'color:#2b2f1a',
      light:'type:hemisphere; intensity:0.75; color:#e8ffcf; groundColor:#20361e',
      extra:(cx,cz,w,d,h)=>{for(let i=0;i<3;i++){const beam=document.createElement('a-cone'); beam.setAttribute('radius-bottom','1.3'); beam.setAttribute('radius-top','0.12'); beam.setAttribute('height','3.6'); beam.setAttribute('rotation','-90 0 0'); beam.setAttribute('material','color:#fff6b8; opacity:0.10; transparent:true'); beam.setAttribute('position',`${cx - w/4 + i*(w/4)} ${h-0.4} ${cz - d/5 + i*(d/6)}`); env.appendChild(beam);}}
    });
  })();

  /* Ice Vault (West) */
  (function(){const {cx,cz}=roomCenter(corW);
    buildRoomShellBoxes(cx,cz,ROOM_W,ROOM_D,ROOM_H,{
      floorMaterial:'color:#eaf9ff', wallMap:frostedTexture(), wallOpacity:0.88, wallColor:'#cfefff',
      ceilingMaterial:'color:#cfefff', light:'type:point; intensity:0.9; distance:16; color:#bfe7ff',
      extra:(cx,cz,w,d,h)=>{const shine=document.createElement('a-plane'); shine.setAttribute('width',w); shine.setAttribute('height',d/4); shine.setAttribute('rotation','-90 0 0'); shine.setAttribute('position',`${cx} 0.01 ${cz+d/8}`); shine.setAttribute('material','color:#ffffff; opacity:0.08; transparent:true'); env.appendChild(shine);}
    });
  })();

})(); /* build end */

/* -------- Minimap (extended) -------- */
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
    const p=rig.object3D.position, r=camEl.object3D.rotation.y; const {mx,my}={mx:w2m(p.x,p.z).mx,my:w2m(p.x,p.z).mz}; const len=10;
    mctx.fillStyle='#ffcf6b'; mctx.beginPath(); mctx.moveTo(mx+Math.sin(r)*len, my-Math.cos(r)*len); mctx.lineTo(mx+Math.sin(r+2.5)*8, my-Math.cos(r+2.5)*8); mctx.lineTo(mx+Math.sin(r-2.5)*8, my-Math.cos(r-2.5)*8); mctx.closePath(); mctx.fill();
    requestAnimationFrame(draw);
  }
  draw();
})();