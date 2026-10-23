import {createModelBuilder} from './atlas-models.js';

// The maritime miniatures are solid, hand-painted forms. Sails are curved cloth
// shells with thickness; rigging, foam, scales and suckers are actual geometry.
const P={hull:0x805633,wood:0xb18c51,dark:0x493d2c,gold:0xd4ac58,
 cream:0xe2d2a2,sail:0xddd3af,red:0x9b4936,ink:0x293c38,
 sea:0x67978c,foam:0xd6dec0,green:0x667448,belly:0xc6ad61};

function workshop(THREE,b,origin=[0,0,0],size=1,yaw=0){
 const root=new THREE.Matrix4().compose(new THREE.Vector3(...origin),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw),new THREE.Vector3(size,size,size));
 const local=new THREE.Object3D();
 const add=(g,c,p=[0,0,0],r=[0,0,0],s=[1,1,1])=>{local.position.fromArray(p);local.rotation.set(...r);local.scale.fromArray(s);local.updateMatrix();g.applyMatrix4(local.matrix);g.applyMatrix4(root);b.add(g,c);};
 const box=(x,y,z,w,h,d,c,r=[0,0,0])=>add(new THREE.BoxGeometry(w,h,d),c,[x,y,z],r);
 const ellipsoid=(x,y,z,rx,ry,rz,c,segments=12,rows=8)=>add(new THREE.SphereGeometry(1,segments,rows),c,[x,y,z],[0,0,0],[rx,ry,rz]);
 const beam=(a,z,r,c,r2=r,segments=7)=>{const from=new THREE.Vector3(...a),to=new THREE.Vector3(...z),delta=to.clone().sub(from),g=new THREE.CylinderGeometry(r2,r,delta.length(),segments,1);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));add(g,c,from.add(to).multiplyScalar(.5).toArray());};
 const cylinder=(x,y,z,top,bottom,h,c,n=16)=>add(new THREE.CylinderGeometry(top,bottom,h,n),c,[x,y,z]);
 const tube=(points,r,c,steps=20,radial=6)=>{const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));add(new THREE.TubeGeometry(path,steps,r,radial,false),c);return path;};
 const polygon=(points,depth,c,p=[0,0,0],r=[0,0,0])=>{const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:depth*.22,bevelThickness:depth*.22});g.translate(0,0,-depth/2);add(g,c,p,r);};
 return {add,box,ellipsoid,beam,cylinder,tube,polygon};
}

function surface(THREE,vertices,indices){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;}

// Smooth tapered sweep, with welded normals and capped ends. It also supplies
// the moving frame used to seat each little scale or sucker on the creature.
function sweep(THREE,a,points,radius,pigment,steps=56,radial=12){
 const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),frame=path.computeFrenetFrames(steps,false),vertices=[],indices=[];
 for(let i=0;i<=steps;i++){const t=i/steps,p=path.getPointAt(t),r=radius(t);for(let j=0;j<=radial;j++){const theta=j/radial*Math.PI*2,n=frame.normals[i].clone().multiplyScalar(Math.cos(theta)).addScaledVector(frame.binormals[i],Math.sin(theta));vertices.push(p.x+n.x*r,p.y+n.y*r,p.z+n.z*r);}}
 for(let i=0;i<steps;i++)for(let j=0;j<radial;j++){const n=i*(radial+1)+j;indices.push(n,n+radial+1,n+1,n+1,n+radial+1,n+radial+2);}
 for(const i of[0,steps]){const p=path.getPointAt(i/steps),c=vertices.length/3;vertices.push(...p.toArray());for(let j=0;j<radial;j++){const n=i*(radial+1)+j;indices.push(...(i?[c,n,n+1]:[c,n+1,n]));}}
 a.add(surface(THREE,vertices,indices),pigment);return {path,frame,steps,radius};
}

function framedPart(THREE,a,curve,t,angle,offset,geometry,color,scale=[1,1,1]){
 const i=Math.min(curve.steps,Math.round(t*curve.steps)),p=curve.path.getPointAt(t),n=curve.frame.normals[i].clone().multiplyScalar(Math.cos(angle)).addScaledVector(curve.frame.binormals[i],Math.sin(angle));
 const tangent=curve.path.getTangentAt(t),side=new THREE.Vector3().crossVectors(tangent,n).normalize(),basis=new THREE.Matrix4().makeBasis(side,n,tangent);geometry.scale(...scale);geometry.applyMatrix4(basis);p.addScaledVector(n,curve.radius(t)+offset);a.add(geometry,color,p.toArray());
}

function sail(THREE,a,x,y,z,w,h,color=P.sail,skew=0){
 const nx=8,ny=5,vertices=[],indices=[],thickness=.035;
 const point=(u,v,side=0)=>[x+(u-.5)*w*(.87+.13*v)+skew*(1-v),y+v*h+.13*Math.sin(Math.PI*u)*(1-v),z+.32*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)+.06*Math.sin(Math.PI*u)+side*thickness];
 for(let side=0;side<2;side++)for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++)vertices.push(...point(i/nx,j/ny,side));
 const sideSize=(nx+1)*(ny+1);
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const n=j*(nx+1)+i;indices.push(n,n+1,n+nx+1,n+1,n+nx+2,n+nx+1);const q=n+sideSize;indices.push(q,q+nx+1,q+1,q+1,q+nx+1,q+nx+2);}
 const perimeter=[];for(let i=0;i<=nx;i++)perimeter.push(i);for(let j=1;j<=ny;j++)perimeter.push(j*(nx+1)+nx);for(let i=nx-1;i>=0;i--)perimeter.push(ny*(nx+1)+i);for(let j=ny-1;j>0;j--)perimeter.push(j*(nx+1));
 for(let i=0;i<perimeter.length;i++){const p=perimeter[i],q=perimeter[(i+1)%perimeter.length];indices.push(p,q,p+sideSize,q,q+sideSize,p+sideSize);}
 a.add(surface(THREE,vertices,indices),color);
 for(const u of[0,.25,.5,.75,1])a.tube(Array.from({length:7},(_,j)=>point(u,j/6,1.1)),.008,u===0||u===1?P.wood:0xb8a77c,7,4);
 a.tube(Array.from({length:9},(_,i)=>point(i/8,0,1.1)),.014,P.wood,10,5);
 a.beam([x-w*.55,y+h+.035,z],[x+w*.55,y+h+.035,z],.034,P.dark,.025);
}

function hull(THREE,a){
 const rings=[[-3.05,.43,1.03],[-2.7,.69,.94],[-2.05,.83,.77],[-1,.9,.70],[.45,.88,.71],[1.7,.68,.8],[2.6,.37,.98],[3.15,.035,1.16]],v=[],idx=[];
 for(const[x,w,top]of rings){for(const[y,z]of[[top,-w],[.12,-w*.88],[-.2,-w*.3],[-.26,0],[-.2,w*.3],[.12,w*.88],[top,w]])v.push(x,y,z);}
 for(let i=0;i<rings.length-1;i++)for(let j=0;j<6;j++){const n=i*7+j;idx.push(n,n+7,n+1,n+1,n+7,n+8);}
 for(const ring of[0,rings.length-1]){const [x,w,top]=rings[ring],center=v.length/3;v.push(x,(top-.26)/2,0);for(let j=0;j<6;j++){const n=ring*7+j;idx.push(...(ring?[center,n+1,n]:[center,n,n+1]));}}
 a.add(surface(THREE,v,idx),P.hull);
 // Cambered solid deck, with a gunwale and a golden rubbing strake.
 for(let i=0;i<rings.length-1;i++){
  const [x,w,y]=rings[i],[q,ww,yy]=rings[i+1],vertices=[x,y,-w,x,y,w,q,yy,ww,q,yy,-ww,x,y-.09,-w,x,y-.09,w,q,yy-.09,ww,q,yy-.09,-ww];
  a.add(surface(THREE,vertices,[0,1,2,0,2,3,4,7,6,4,6,5,0,4,5,0,5,1,3,2,6,3,6,7]),P.wood);
  for(const side of[-1,1]){a.beam([x,y-.18,w*side],[q,yy-.18,ww*side],.038,P.gold,.034);a.beam([x,y+.14,w*side],[q,yy+.14,ww*side],.035,P.dark,.027);for(let k=0;k<3;k++){const t=k/3,xx=x+(q-x)*t,zy=w+(ww-w)*t,by=y+(yy-y)*t;a.beam([xx,by,zy*side],[xx,by+.15,zy*side],.016,P.gold);}}
 }
 a.box(-2.54,1.18,0,.94,.6,1.25,P.hull);a.box(-2.54,1.5,0,1.02,.09,1.4,P.gold);
 for(const z of[-.648,.648])for(let i=0;i<4;i++){a.box(-2.88+i*.23,1.22,z,.14,.21,.035,P.dark);a.box(-2.88+i*.23,1.22,z*1.025,.018,.21,.025,P.gold);}
 for(let i=0;i<5;i++){const z=-.50+i*.25;a.box(-3.035,1.2,z,.035,.24,.17,P.dark);a.box(-3.06,1.2,z,.035,.24,.025,P.gold);}
 a.box(2.21,1.00,0,.77,.22,.7,P.wood);a.beam([2.5,1.07,0],[4.05,1.58,0],.06,P.wood,.018);
 for(const z of[-.89,.89])for(let i=0;i<7;i++){const x=-1.6+i*.48;a.ellipsoid(x,.37,z,.09,.09,.035,P.dark,8,6);a.ellipsoid(x,.37,z*1.025,.047,.047,.035,0xb9a46d,8,6);}
 // Board seams are incised timber strips with thickness, including a hatch.
 for(const z of[-.5,-.25,0,.25,.5])a.beam([-1.9,.79,z],[1.6,.8,z],.008,0x8e7047,.008,4);
 a.box(-.55,.82,.15,.65,.11,.46,P.dark);for(let x=-.8;x<-.2;x+=.12)a.box(x,.885,.15,.035,.035,.43,P.wood);
}

function ship(THREE,b,{origin=[0,0,0],size=1,yaw=0,schooner=false,damaged=false}={}){
 const a=workshop(THREE,b,origin,size,yaw);hull(THREE,a);
 const masts=schooner?[[-1.35,3.9],[.9,4.8]]:[[-1.55,3.7],[.15,5.1],[1.7,3.55]];
 for(let mi=0;mi<masts.length;mi++){
  const [x,h]=masts[mi];a.beam([x,.75,0],[x,h,0],.065,P.dark,.027,10);
  a.cylinder(x,h*.7,0,.21,.15,.1,P.wood,12);a.cylinder(x,h*.7+.12,0,.22,.22,.035,P.gold,12);
  const w=mi===1?2.0:1.55,base=mi===1?1.8:1.55;
  sail(THREE,a,x,base,.06,w,h*.48,P.sail,mi===0?-.12:.08);
  sail(THREE,a,x,h*.76,.035,w*.64,h*.20,mi===1?0xe5d9b6:0xd4c49a);
  a.polygon([[0,0],[.52,-.05],[.39,-.19],[0,-.14]],.035,P.red,[x,h+.03,0]);
  for(const side of[-1,1]){
   for(const dx of[-.36,0,.36])a.beam([x+dx,.9,side*.73],[x,h*.83,0],.009,P.dark,.006,5);
   for(let j=0;j<9;j++){const t=j/10,half=.36*(1-t),yy=.95+(h*.83-.95)*t,zz=side*.73*(1-t);a.beam([x-half,yy,zz],[x+half,yy,zz],.008,P.dark,.008,4);}
  }
 }
 const lead=masts[masts.length-1];a.beam([4.0,1.58,0],[lead[0],lead[1]-.15,0],.012,P.dark,.008,5);a.beam([-3.0,1.4,0],[masts[0][0],masts[0][1],0],.012,P.dark,.008,5);
 for(let i=1;i<masts.length;i++)a.beam([masts[i-1][0],masts[i-1][1],0],[masts[i][0],masts[i][1],0],.012,P.dark,.009,5);
 a.polygon([[0,0],[1.55,-1.35],[.35,-1.35]],.035,0xd4c394,[lead[0]+.11,lead[1]-.28,.04]);
 if(schooner)a.polygon([[0,0],[-1.3,-.6],[-1.05,-1.75],[0,-1.9]],.045,0xe6dab3,[-1.44,3.55,.05]);
 if(damaged){a.beam([-.8,2.6,.3],[.5,1.1,1.0],.045,P.wood,.018);a.polygon([[-.65,.55],[.4,.1],[.7,-.22],[-.2,-.45]],.04,0xd5c394,[.4,1.6,1.0],[.2,0,.5]);}
 // A tiny longboat and its thwarts remain fully dimensional on deck.
 a.ellipsoid(.7,.91,.43,.42,.13,.18,0x715331,12,6);a.ellipsoid(.7,1.00,.43,.33,.06,.12,P.wood,12,6);for(let i=0;i<3;i++)a.box(.45+i*.2,1.035,.43,.045,.03,.25,P.dark);
 return a;
}

function serpent(THREE,material){
 const b=createModelBuilder(THREE),a=workshop(THREE,b);
 // The troughs sit well below the real water surface. Only three rounded
 // coils, a small tail tip and the low swimming head break through it.
 const points=[[-4.7,.48,-.10],[-4.45,.18,-.07],[-4.15,-.65,0],[-3.83,-.55,0],[-3.52,.30,.04],[-3.10,.88,.09],[-2.67,.80,.13],[-2.28,.18,.16],[-2.05,-.67,.16],[-1.74,-.66,.15],[-1.43,.40,.10],[-.94,1.02,.04],[-.43,.80,-.02],[-.12,.08,-.04],[.12,-.69,-.04],[.45,-.65,-.04],[.76,.40,-.01],[1.13,1.12,.04],[1.50,.76,.06],[1.75,-.55,.05],[2.06,-.57,.03],[2.30,.28,.02],[2.42,1.25,0],[2.78,2.0,0],[3.18,2.12,0]];
 const curve=sweep(THREE,a,points,t=>.055+.27*Math.sin(Math.min(t*2.5,1)*Math.PI*.5),P.green,142,12);
 for(let row=3;row<113;row++){
  const t=row/115,p=curve.path.getPointAt(t);if(p.y<-.25)continue;
  for(let column=0;column<7;column++){const angle=column/7*Math.PI*2+(row%2)*.18;framedPart(THREE,a,curve,t,angle,.004,new THREE.SphereGeometry(1,6,4),column<2?0xb6a466:(row%3?0x7e8b52:0x596e46),[.082,.018,.09]);}
 }
 for(let i=11;i<106;i+=3){const t=i/111,p=curve.path.getPointAt(t);if(p.y<.15)continue;const r=curve.radius(t);a.polygon([[p.x-.13,p.y+r*.78],[p.x-.19,p.y+r+.28],[p.x+.14,p.y+r*.75]],.055,0x9c653d,[0,0,p.z]);}
 // Broad brow, long toothed muzzle and pale jaw echo the engraved sea beast.
 a.ellipsoid(3.20,2.10,0,.53,.39,.36,P.green,22,14);a.ellipsoid(3.70,1.95,.015,.63,.22,.28,0x839050,20,12);
 a.ellipsoid(3.67,1.65,.015,.60,.12,.25,P.belly,20,10);a.ellipsoid(3.76,1.78,.02,.51,.07,.245,0x49392e,16,8);
 for(const side of[-1,1]){const z=side*.32;a.ellipsoid(3.14,2.24,z,.15,.145,.05,P.belly,12,8);a.ellipsoid(3.18,2.24,z*1.09,.065,.08,.025,P.ink,10,8);a.ellipsoid(3.83,2.06,z*.65,.075,.04,.035,P.ink,10,6);a.tube([[2.95,2.32,z],[2.83,2.55,z*1.2],[2.98,2.77,z*1.18]],.045,P.gold,14,6);
  for(let i=0;i<6;i++){const x=3.32+i*.16;a.beam([x,1.87,side*.25],[x+.035,1.72,side*.25],.035,0xe8ddb4,.002,7);a.beam([x,1.69,side*.25],[x+.015,1.78,side*.25],.026,0xe8ddb4,.002,6);}
 }
 const creature=b.finish('serpent-swimming-coils',material);creature.position.set(4.65,0,0);creature.rotation.y=-Math.PI/2;creature.userData.kind='serpent-creature';
 const sb=createModelBuilder(THREE);ship(THREE,sb,{size:.82});const vessel=sb.finish('serpent-stationary-ship',material);vessel.position.y=.03;vessel.userData.kind='serpent-ship';
 const group=new THREE.Group();group.add(vessel,creature);group.animation={kind:'serpent',ship:vessel,creature,orbitRadius:[4.65,2.7],waterline:0};return group;
}

function kraken(THREE,material){
 const b=createModelBuilder(THREE),a=workshop(THREE,b);
 a.ellipsoid(-1.5,.53,.22,1.10,1.17,.82,0x9d5940,24,16);a.ellipsoid(-1.66,1.28,.14,.80,.77,.67,0xb36f4b,20,12);
 for(const z of[-.67,1.10]){a.ellipsoid(-1.05,1.0,z,.22,.25,.08,0xd2b776,16,10);a.ellipsoid(-.98,1.0,z*1.045,.10,.14,.045,P.ink,12,8);a.ellipsoid(-.94,1.055,z*1.075,.025,.035,.02,P.cream,8,5);}
 const paths=[
 [[-1.3,.2,.7],[-.4,.4,1.4],[1.4,1.0,1.5],[2.9,2.4,1.4],[2.65,4.0,.9],[1.7,4.3,.8],[1.35,3.6,.7],[1.9,3.35,.8]],
 [[-1.2,.25,-.4],[-.1,.6,-1.2],[1.8,1.15,-1.2],[3.7,.7,-.8],[4.5,.8,.1],[4.6,1.8,.6],[4.05,2.15,.7],[3.75,1.6,.65]],
 [[-1.7,.25,.8],[-2.5,.6,1.6],[-3.9,.85,1.6],[-4.4,1.8,1.0],[-4.05,2.3,.5],[-3.45,2.0,.55],[-3.5,1.52,.7]],
 [[-2,.1,-.1],[-3.2,.4,-1.4],[-4.1,.25,-1.4],[-4.9,.5,-.65],[-5.05,1.12,-.3],[-4.55,1.45,-.15]],
 [[-1.2,.15,.5],[-.1,.23,1.8],[1.6,.2,2.0],[2.4,.5,1.8],[2.8,1.4,1.6],[2.45,1.7,1.6]],
 [[-1.7,.1,-.3],[-1.7,.5,-1.9],[-.9,1.4,-1.8],[.0,2.4,-1.1],[.65,3.0,-.7],[1.2,2.8,-.6],[1.1,2.25,-.8]],
 [[-2,.15,.5],[-3.0,.12,.65],[-3.4,.25,.15],[-3.0,.65,-.05],[-2.55,.6,.2]],
 [[-1.1,.15,.4],[.15,.45,.6],[.55,1.4,.55],[.15,2.2,.65],[-.5,2.25,.7],[-.75,1.8,.75]]];
 paths.forEach((p,index)=>{
  const c=sweep(THREE,a,p,t=>.26*Math.pow(1-t,.7)+.025,index%2?0x9b513d:0xb86b46,42,10);
  for(let i=3;i<24;i++){const t=i/26,r=(1-t)*.078+.025;for(const side of[-.34,.34])framedPart(THREE,a,c,t,side,.005,new THREE.SphereGeometry(1,8,4),0xd9b97e,[r,.035,r*.9]);}
 });
 const creature=b.finish('kraken-emerging-creature',material);creature.userData.kind='kraken-creature';
 const sb=createModelBuilder(THREE);ship(THREE,sb,{size:.86,yaw:.16});const vessel=sb.finish('kraken-returning-ship',material);vessel.position.set(1.35,.03,0);vessel.userData.kind='kraken-ship';
 // One instanced draw keeps the little rising bubbles inexpensive. The atlas
 // pigment shader needs the instance transform as well as the world transform.
 const bubbleGeometry=new THREE.SphereGeometry(1,10,7),bubbleColors=[],bubbleColor=new THREE.Color();
 for(let i=0;i<bubbleGeometry.attributes.position.count;i++){bubbleColor.setHex(bubbleGeometry.attributes.position.getY(i)>.55?0xf3edce:0xdce5cb);bubbleColors.push(bubbleColor.r,bubbleColor.g,bubbleColor.b);}
 bubbleGeometry.setAttribute('color',new THREE.Float32BufferAttribute(bubbleColors,3));
 const bubbleMaterial=creature.children[0].material.clone();bubbleMaterial.vertexShader=`varying vec3 vPigment;varying vec3 vAtlasPoint;varying vec3 vAtlasNormal;
  void main(){vPigment=color;vec4 point=vec4(position,1.);vec3 n=normal;
  #ifdef USE_INSTANCING
   point=instanceMatrix*point;n=mat3(instanceMatrix)*n;
  #endif
   vAtlasPoint=(modelMatrix*point).xyz;vAtlasNormal=normalize(mat3(modelMatrix)*n);gl_Position=projectionMatrix*viewMatrix*vec4(vAtlasPoint,1.);
  }`;
 const bubbles=new THREE.InstancedMesh(bubbleGeometry,bubbleMaterial,9),bubbleTransform=new THREE.Object3D();bubbles.name='kraken-surface-bubbles';bubbles.position.set(1.35,0,0);bubbles.visible=false;bubbles.frustumCulled=false;bubbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);bubbles.userData={parts:9,particles:[]};
 for(let i=0;i<9;i++){
  const radius=.10+(i%3)*.035,angle=i*2.39996,rad=.30+Math.sqrt(i/8)*1.4,basePosition=[Math.cos(angle)*rad,.08,Math.sin(angle)*rad*.55];
  bubbleTransform.position.fromArray(basePosition);bubbleTransform.scale.setScalar(radius);bubbleTransform.updateMatrix();bubbles.setMatrixAt(i,bubbleTransform.matrix);bubbles.userData.particles.push({index:i,basePosition,phase:i/9,radius});
 }
 const group=new THREE.Group();group.add(vessel,creature,bubbles);group.animation={kind:'kraken',ship:vessel,creature,bubbles,waterline:0,submergedDepth:5.7};return group;
}

function whale(THREE,b){
 const a=workshop(THREE,b);a.ellipsoid(.15,.21,0,2.75,.91,.84,0x4e7166,28,16);a.ellipsoid(1.75,.36,0,1.2,.76,.79,0x55776b,22,14);a.ellipsoid(1.6,.13,.1,1.45,.38,.79,0xa9aa7f,22,12);
 sweep(THREE,a,[[-1.9,.16,0],[-2.9,.2,0],[-3.75,.6,.0],[-4.1,.94,0]],t=>.47*(1-t)+.13,0x547367,25,12);
 for(const s of[-1,1]){a.polygon([[0,0],[-.75,.3],[-1.0,.68],[-.65,.71],[.0,.2]],.10,0x46685f,[-3.9,.9,0],[0,s*1.1,s*.17]);a.ellipsoid(.0,.02,s*.77,.86,.09,.33,0x3f625b,14,8);}
 for(let i=0;i<8;i++){const z=.34+i*.055;a.tube([[2.55,.25,z],[1.7,.04,z*1.25],[.75,-.06,z*1.1]],.012,0x73795c,14,4);}
 a.ellipsoid(2.1,.55,.72,.10,.10,.045,P.ink,12,8);a.ellipsoid(2.12,.57,.752,.027,.027,.012,P.cream,8,6);
 a.tube([[1.5,1.00,0],[1.45,1.6,0],[1.10,2.15,.02],[.6,2.30,.05],[.35,2.12,.1]],.039,P.foam,24,6);a.tube([[1.5,1.01,0],[1.55,1.65,0],[1.9,2.1,-.03],[2.3,2.13,-.08]],.031,P.foam,20,6);
 for(let i=0;i<6;i++)a.ellipsoid(.4+i*.34,2.18-.07*Math.sin(i),.07,.055,.07,.04,P.foam,7,5);
}

function lobster(THREE,b,material){
 const a=workshop(THREE,b),red=0xa94f37,light=0xc5764b,claws=[];
 for(let i=0;i<7;i++){const x=-2.0+i*.35,r=.28+i*.043;a.ellipsoid(x,.30,0,.32,.31+i*.035,r,i%2?red:light,14,8);a.tube([[x-.16,.32,-r],[x-.14,.59,0],[x-.16,.32,r]],.028,0x823f2c,12,5);}
 a.ellipsoid(.35,.42,0,.79,.52,.54,red,20,12);a.ellipsoid(.8,.55,0,.40,.31,.43,light,16,10);
 for(const s of[-1,1]){
  // Each complete arm is one painted mesh, hinged at its shoulder. Keeping
  // the joint separate avoids deforming the body or uploading vertices.
  const cb=createModelBuilder(THREE),c=workshop(THREE,cb);
  sweep(THREE,c,[[.48,.35,s*.4],[1.10,.47,s*.95],[1.55,.75,s*1.22],[2.0,1.0,s*1.32]],t=>.16-.045*t,red,22,10);c.ellipsoid(1.52,.74,s*1.20,.24,.24,.23,light,12,8);
  c.ellipsoid(2.23,1.05,s*1.24,.62,.40,.36,red,20,12);
  sweep(THREE,c,[[2.38,1.18,s*1.42],[2.88,1.35,s*1.42],[3.19,1.43,s*1.19],[3.04,1.37,s*.95]],t=>.21*(1-t)+.025,light,22,10);
  sweep(THREE,c,[[2.34,.94,s*1.12],[2.73,1.0,s*.82],[3.05,1.2,s*.80]],t=>.17*(1-t)+.02,red,19,10);
  const claw=cb.finish(`lobster-claw-${s<0?'left':'right'}`,material),pivot=new THREE.Group();
  pivot.name=`lobster-shoulder-${s}`;pivot.position.set(.48,.35,s*.4);claw.position.copy(pivot.position).multiplyScalar(-1);pivot.add(claw);pivot.userData={kind:'lobster-claw-joint',side:s};claws.push(pivot);
  for(let i=0;i<5;i++){const x=-1.2+i*.34;a.tube([[x,.25,s*.32],[x+.12,.48,s*.80],[x+.42,.18,s*1.25],[x+.62,.02,s*1.40]],.052,red,14,7);}
  a.beam([.76,.65,s*.20],[1.04,.99,s*.34],.045,light,.035);a.ellipsoid(1.05,1.0,s*.34,.085,.10,.08,P.ink,10,6);
  a.tube([[.99,.66,s*.23],[1.6,.9,s*.30],[1.9,1.70,s*.53],[1.55,2.35,s*.70],[.75,2.52,s*.95]],.028,light,32,6);
  a.ellipsoid(-2.32,.24,s*.24,.47,.10,.29,red,14,8);
 }a.ellipsoid(-2.45,.24,0,.45,.11,.22,light,14,8);return claws;
}

function rig(THREE,b,material){
 const a=workshop(THREE,b),iron=0x7d6b43,red=0x985039;
 for(const x of[-1.95,1.95])for(const z of[-1.15,1.15]){a.cylinder(x,1.48,z,.17,.24,3.05,iron,14);a.cylinder(x,.15,z,.33,.38,.35,0x655e43,14);for(let y=.3;y<2.9;y+=.82){a.beam([x,y,z],[-x,y+.82,z],.045,P.gold,.04);a.beam([x,y,z],[x,y+.82,-z],.044,iron,.04);}}
 a.box(0,3.0,0,5.0,.25,3.0,0xb69b61);a.box(0,2.8,0,5.05,.18,3.08,iron);a.box(-1.25,3.65,-.25,1.7,1.05,1.6,0xd2be86);a.box(-1.25,4.23,-.25,1.9,.15,1.8,red);
 for(let i=0;i<5;i++)a.box(-1.9+i*.32,3.79,.565,.20,.26,.035,0x3a5850);
 for(const x of[-2.45,2.45]){a.beam([x,3.55,-1.45],[x,3.55,1.45],.024,P.gold);for(let z=-1.45;z<=1.45;z+=.3)a.beam([x,3.12,z],[x,3.55,z],.02,P.gold);}
 for(const z of[-1.45,1.45]){a.beam([-2.45,3.55,z],[2.45,3.55,z],.024,P.gold);for(let x=-2.45;x<=2.45;x+=.3)a.beam([x,3.12,z],[x,3.55,z],.02,P.gold);}
 // Tapering four-sided lattice derrick, with real cross braces on every face.
 for(const x of[-1,1])for(const z of[-1,1]){a.beam([.8+x*.64,3.15,z*.60],[.8+x*.19,7.15,z*.19],.07,iron,.035);}
 for(let level=0;level<7;level++){const y=3.2+level*.55,w=.64-level*.063,next=w-.063;for(const s of[-1,1]){a.beam([.8-w,y,s*w],[.8+w,y,s*w],.036,P.gold);a.beam([.8+s*w,y,-w],[.8+s*w,y,w],.036,P.gold);a.beam([.8-w,y,s*w],[.8+next,y+.55,s*next],.029,iron);a.beam([.8+s*w,y,-w],[.8+s*next,y+.55,next],.029,iron);}}
 a.box(.8,7.2,0,.48,.12,.48,red);a.cylinder(.8,7.5,0,.04,.04,.55,P.gold,8);
 a.box(-2.4,4.55,-.05,2.2,.11,2.15,0x657b64);a.box(-2.4,4.62,-.05,1.5,.025,1.6,0xd0bd86);a.box(-2.4,4.64,-.05,1.25,.025,1.35,0x657b64);for(const x of[-2.68,-2.12])a.box(x,4.665,-.05,.12,.022,.7,P.cream);a.box(-2.4,4.665,-.05,.6,.022,.12,P.cream);
 a.cylinder(1.9,3.65,-.85,.18,.18,1.0,red,12);
 const cb=createModelBuilder(THREE),c=workshop(THREE,cb);c.beam([0,0,0],[2.05,1.5,0],.08,P.gold,.05);c.beam([0,0,0],[1.9,1.8,0],.07,P.gold,.045);
 for(let i=0;i<5;i++){const t=i/5;c.beam([2.05*t,1.5*t,0],[1.9*(t+.2),1.8*(t+.2),0],.027,iron);}
 c.ellipsoid(0,0,0,.18,.18,.22,iron,12,8);c.box(-.18,.18,0,.55,.35,.42,red);
 const crane=cb.finish('oil-rig-crane-boom',material);crane.position.set(1.9,4.1,-.85);crane.userData.kind='rig-crane-joint';
 const hb=createModelBuilder(THREE),h=workshop(THREE,hb);h.beam([0,0,0],[0,-2.3,0],.014,P.dark);h.tube([[0,-2.3,0],[0,-2.5,0],[-.12,-2.57,0],[-.18,-2.46,0]],.035,iron,12,6);
 const hoist=hb.finish('oil-rig-hanging-hook',material);hoist.position.set(2,1.6,0);hoist.userData.kind='rig-hoist-joint';crane.add(hoist);
 for(let i=0;i<3;i++){a.cylinder(.15+i*.36,3.52,.87,.13,.13,.7,0x9b6544,12);a.tube([[.15+i*.36,3.9,.87],[.15+i*.36,4.03,.7],[.15+i*.36,4.0,.35]],.045,iron,12,6);}
 a.ellipsoid(-1.3,3.4,1.64,.64,.22,.22,0xc1793f,18,10);return {kind:'rig',crane,hoist};
}

export function createMaritimeModel(THREE,kind,{material,name=kind,schooner=false}={}){
 const b=createModelBuilder(THREE);let claws=[],group,animation;
 if(kind==='serpent_attack')group=serpent(THREE,material);
 else if(kind==='kraken_attack')group=kraken(THREE,material);
 else if(kind==='northern_whale')whale(THREE,b);
 else if(kind==='great_lobster')claws=lobster(THREE,b,material);
 else if(kind==='offshore_rig')animation=rig(THREE,b,material);
 else ship(THREE,b,{schooner:kind==='schooner_ship'||schooner});
 group=group||b.finish(name,material);group.name=name;if(claws.length)group.add(...claws);if(animation){group.add(animation.crane);group.animation=animation;}
 let parts=0,triangles=0,drawCalls=0;group.traverse(child=>{if(child.isMesh){parts+=child.userData.parts||0;triangles+=(child.geometry.index?.count||child.geometry.attributes.position.count)/3*(child.isInstancedMesh?child.count:1);drawCalls++;}});
 group.userData={...group.userData,parts,triangles,drawCalls,dimensional:true,style:'hand-painted-solid-diorama',maritimeModel:kind,geometryOnly:true,animatedClaws:claws.length,animationKind:group.animation?.kind||null,waterBase:false};return group;
}
