/* Sculpted manuscript scenery. All positions are geographic, all ground contact
 * follows the DEM, and repeated small forms are merged or instanced at startup. */
import {createMapModelMaterial} from './atlas-models.js';
const randomFrom=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const geoFrom=(x,z)=>[x/2.2+13,60-z/4.4];
const rgb=hex=>[(hex>>16&255)/255,(hex>>8&255)/255,(hex&255)/255].map(c=>c<.04045?c/12.92:Math.pow((c+.055)/1.055,2.4));

export function sceneryPigment(THREE){
 const material=createMapModelMaterial(THREE);
 material.vertexShader=`varying vec3 vPigment,vAtlasPoint,vAtlasNormal;
 void main(){vec4 p=vec4(position,1.);vec3 n=normal;vPigment=color;
 #ifdef USE_INSTANCING
 p=instanceMatrix*p;n=mat3(instanceMatrix)*n;
 #endif
 vec4 world=modelMatrix*p;vAtlasPoint=world.xyz;vAtlasNormal=normalize(mat3(modelMatrix)*n);
 gl_Position=projectionMatrix*viewMatrix*world;}`;
 return material;
}

class Batch {
 constructor(THREE){this.THREE=THREE;this.positions=[];this.normals=[];this.colors=[];}
 add(geometry,position=[0,0,0],scale=[1,1,1],rotation=[0,0,0],color=0xddd0a1){
  const T=this.THREE,g=geometry.index?geometry.toNonIndexed():geometry,m=new T.Matrix4().compose(new T.Vector3(...position),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(...scale));
  const nm=new T.Matrix3().getNormalMatrix(m),p=new T.Vector3(),n=new T.Vector3(),c=rgb(color),a=g.attributes.position,b=g.attributes.normal;
  for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(m);n.fromBufferAttribute(b,i).applyMatrix3(nm).normalize();this.positions.push(p.x,p.y,p.z);this.normals.push(n.x,n.y,n.z);this.colors.push(...c);}
  if(g!==geometry)g.dispose();
 }
 geometry(){const T=this.THREE,g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(this.normals,3));g.setAttribute('color',new T.Float32BufferAttribute(this.colors,3));g.computeBoundingSphere();return g;}
 mesh(material,name){const mesh=new this.THREE.Mesh(this.geometry(),material);mesh.name=name;return mesh;}
}

function irregularCrown(THREE){
 const g=new THREE.SphereGeometry(1,14,9),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x),bulge=1+Math.sin(a*5+y*5)*.075+Math.sin(a*9-y*8)*.035;p.setXYZ(i,x*bulge,y*.86,z*bulge);}
 g.computeVertexNormals();return g;
}

function coniferCrown(THREE){
 const points=[[.025,.10],[.18,.16],[.33,.20],[.27,.25],[.14,.29],[.28,.34],[.25,.39],[.12,.43],[.23,.48],[.21,.53],[.10,.57],[.18,.63],[.15,.68],[.075,.72],[.125,.78],[.095,.84],[.05,.87],[.068,.91],[.018,.99],[0,1.07]];
 const g=new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),14),a=g.attributes.position;
 for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i),t=Math.atan2(z,x),r=1+Math.sin(t*7+y*14)*.065+Math.cos(t*11-y*20)*.025;a.setXYZ(i,x*r,y+Math.sin(t*6+y*18)*.012,z*r);}
 g.computeVertexNormals();return g;
}

export function addSculptedWoodland({THREE,scene,worldPoint,heightAt,regionAt,mobile=false}){
 const group=new THREE.Group();group.name='sculpted-manuscript-woodlands';
 const random=randomFrom(218),material=sceneryPigment(THREE),pine=new Batch(THREE),broad=new Batch(THREE),trunks=new Batch(THREE);
 const cone=coniferCrown(THREE),crown=irregularCrown(THREE),stem=new THREE.CylinderGeometry(.027,.047,.64,8);
 pine.add(cone,[0,0,0],[1,1,1],[0,0,0],0x3e593c);
 broad.add(crown,[-.16,.65,0],[.25,.31,.23],[0,0,.15],0x536b3e);
 broad.add(crown,[.15,.72,.03],[.25,.33,.23],[0,0,-.15],0x6b7d40);
 broad.add(crown,[0,.87,-.09],[.29,.31,.26],[0,0,0],0x798644);
 trunks.add(stem,[0,.28,0],[1,1,1],[0,0,0],0x705331);
 const groves=[
  [6.5,60.9,1.35,.65],[8.3,60.1,.95,.45],[11.8,62.6,1.6,.8],[14.5,60.8,1.8,.7],
  [15.9,63.0,1.7,.8],[19.3,64.9,1.9,.7],[24.2,64.1,1.7,.8],[25.8,61.6,1.7,.8],
  [22.8,52.0,1.3,.55],[15.2,53.4,1.3,.55],[14.8,50.8,1.1,.4],[8.5,50.9,1.2,.55],
  [-4.6,56.8,.9,.55],[-7.5,53.6,.65,.4],[-1.3,54.1,.75,.5],[-2.1,51.7,.9,.45],
  [16.0,57.1,.8,.5],[27.9,58.3,1.3,.65],[10.2,57.0,.45,.45],[21.4,55.4,.65,.6]
 ];
 const clearings=[[5.32,60.39,1.45,.7],[10.75,59.91,1.65,.8],[18.07,59.33,1.45,.9],[12.5,55.7,1.3,.8],[21.0,52.25,1.4,.65],[18.66,54.35,1.5,.7],[-.075,51.505,1.5,.65],[4.6,51.88,.8,.55],[7.81,61.05,.5,.3]];
 const placements=[];
 for(const[lon,lat,rx,ry]of groves)for(let i=0;i<(mobile?18:30);i++){
  const t=random()*Math.PI*2,r=Math.sqrt(random()),geo=[lon+Math.cos(t)*r*rx,lat+Math.sin(t)*r*ry],h=heightAt(...geo);
  if(!regionAt(geo)||h>4.6||clearings.some(([x,y,a,b])=>((geo[0]-x)/a)**2+((geo[1]-y)/b)**2<1))continue;
  if(geo[0]>9.7&&geo[0]<11.6&&geo[1]>58.5&&geo[1]<61.2)continue;
  const p=worldPoint(geo),scale=.72+random()*.72,radius=scale*.32;
  if([[-radius,0],[radius,0],[0,-radius],[0,radius]].some(([x,z])=>!regionAt(geoFrom(p.x+x,p.z+z))))continue;
  if(Math.abs(heightAt(geo[0]+.08,geo[1])-h)>.32||Math.abs(heightAt(geo[0],geo[1]+.04)-h)>.32)continue;
  placements.push({geo,p,scale,pine:lat>58||h>1.9||random()>.62,rotation:random()*Math.PI*2});
 }
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3();
 const install=(type,geometry,name)=>{
  const list=placements.filter(type),mesh=new THREE.InstancedMesh(geometry,material,list.length);mesh.name=name;
  list.forEach((tree,i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),tree.rotation);s.set(tree.scale,tree.scale,tree.scale);matrix.compose(tree.p,q,s);mesh.setMatrixAt(i,matrix);});
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);
 };
 install(t=>t.pine,pine.geometry(),'sculpted-fir-canopies');install(t=>!t.pine,broad.geometry(),'sculpted-oak-canopies');install(()=>true,trunks.geometry(),'woodland-trunks');
 const undergrowth=[];
 for(const{p,scale}of placements)for(let j=0;j<2;j++){
  const a=p.x+(.15-j*.31)*scale,b=p.z+.18*scale,geoA=geoFrom(a,b),geoB=geoFrom(a+.16*scale,b+.07*scale);
  if(regionAt(geoA)&&regionAt(geoB))undergrowth.push(...worldPoint(geoA,.033),...worldPoint(geoB,.033));
 }
 const inkGeometry=new THREE.BufferGeometry();inkGeometry.setAttribute('position',new THREE.Float32BufferAttribute(undergrowth,3));
 const ink=new THREE.LineSegments(inkGeometry,new THREE.LineBasicMaterial({color:0x4b4e2c,transparent:true,opacity:.40,depthWrite:false}));ink.name='forest-floor-quill';group.add(ink);
 group.userData={trees:placements.length,conifers:placements.filter(p=>p.pine).length,broadleaf:placements.filter(p=>!p.pine).length};
 cone.dispose();crown.dispose();stem.dispose();scene.add(group);return{group,count:placements.length,drawCalls:4};
}

const villageSites=[
 ['Hardanger',[6.3,60.32],3],['Telemark',[8.5,59.1],3],['Gudbrandsdal',[9.5,61.5],3],['Trøndelag',[11.1,63.9],3],
 ['Dalarna',[14.4,60.6],3],['Småland',[14.5,57.2],3],['Scania',[13.5,55.9],2],['Jutland',[9.2,56.1],3],
 ['Pomerania',[16.1,54.0],3],['Masuria',[21.9,53.8],3],['Wielkopolska',[17.0,52.1],3],['Lower Silesia',[16.3,51.0],2],
 ['Yorkshire',[-1.6,54.2],3],['Wales',[-3.8,52.1],3],['Munster',[-8.6,52.0],2],['Schleswig',[9.3,54.7],2],
 ['Brandenburg',[13.9,52.8],3],['Finnish lakes',[26.0,61.5],3]
];
const lighthouseSites=[
 {name:'Lindesnes lighthouse',geo:[7.0469,57.9828],height:1.26},
 {name:'Kullen lighthouse',geo:[12.4525,56.3017],height:1.13},
 {name:'Hirtshals lighthouse',geo:[9.9410,57.5844],height:1.25}
];

function landPosition(geo,regionAt,heightAt,footprint=.18){
 // NE's generalised coast omits some lighthouse headlands. Move only within
 // about 20 km to the nearest supported part of that very same cape.
 for(let ring=0;ring<=30;ring++)for(let i=0;i<(ring?24:1);i++){
  const t=i/24*Math.PI*2,a=[geo[0]+Math.cos(t)*ring*.012,geo[1]+Math.sin(t)*ring*.006],h=heightAt(...a);
  if(!regionAt(a))continue;
  if([[footprint/2.2,0],[-footprint/2.2,0],[0,footprint/4.4],[0,-footprint/4.4]].every(([x,y])=>regionAt([a[0]+x,a[1]+y])&&Math.abs(heightAt(a[0]+x,a[1]+y)-h)<.28))return a;
 }
 return null;
}

export function addMapScenery({THREE,scene,worldPoint,heightAt,regionAt,mobile=false}){
 const group=new THREE.Group();group.name='geographic-manuscript-scenery';
 const material=sceneryPigment(THREE),buildings=new Batch(THREE),rocks=new Batch(THREE),random=randomFrom(1502),ink=[];
 const cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,24),sphere=irregularCrown(THREE);
 // A gable is a solid extruded roof with two real sloping faces.
 const roofShape=new THREE.Shape();roofShape.moveTo(-.5,0);roofShape.lineTo(0,.42);roofShape.lineTo(.5,0);roofShape.closePath();
 const roof=new THREE.ExtrudeGeometry(roofShape,{depth:1,bevelEnabled:false,steps:1});roof.translate(0,0,-.5);
 const houses=[],lighthouses=[],seaRocks=[];
 const house=(geo,index)=>{
  const p=worldPoint(geo),scale=.64+random()*.35,angle=(random()-.5)*1.05,color=[0xdcc998,0xc5b982,0xd9b975,0xb9b38a][index%4],roofColor=[0x925335,0x7d4731,0x64674d,0xa35c35][index%4];
  const local=(x,y,z)=>[p.x+(x*Math.cos(angle)+z*Math.sin(angle))*scale,p.y+y*scale,p.z+(-x*Math.sin(angle)+z*Math.cos(angle))*scale];
  const add=(shape,pos,s,tint)=>buildings.add(shape,local(...pos),s.map(v=>v*scale),[0,angle,0],tint);
  add(cube,[0,.24,0],[.58,.48,.43],color);add(roof,[0,.48,0],[.70,.65,.56],roofColor);
  add(cube,[.17,.73,-.08],[.075,.26,.075],0x8b7651);
  for(const x of[-.17,.17]){add(cube,[x,.31,.22],[.095,.12,.018],0x3e5148);add(cube,[x,.31,.235],[.013,.13,.012],0xd2c392);}
  add(cube,[0,.13,.224],[.10,.26,.018],0x765539);
  if(index%3===0)add(cube,[.35,.14,-.02],[.25,.28,.39],color);
  // A few dry quill strokes leave the cottage in a meadow, with no base card.
  for(let j=0;j<3;j++){
   const a=local(-.40+j*.10,.04,.35),b=local(-.31+j*.10,.04,.48),ga=geoFrom(a[0],a[2]),gb=geoFrom(b[0],b[2]);
   if(regionAt(ga)&&regionAt(gb))ink.push(...worldPoint(ga,.045),...worldPoint(gb,.045));
  }
  houses.push({geo,position:p.toArray()});
 };
 for(const[name,center,count]of villageSites)for(let i=0;i<(mobile?Math.min(2,count):count);i++){
  const geo=[center[0]+(i-1)*.20+(random()-.5)*.13,center[1]+(random()-.5)*.14],fitted=landPosition(geo,regionAt,heightAt,.38);
  if(!fitted||heightAt(...fitted)>3.2)continue;
  house(fitted,houses.length);
 }
 const lanternGlass=new THREE.CylinderGeometry(.15,.15,.25,16),tower=new THREE.CylinderGeometry(.19,.27,1,28),lanternRoof=new THREE.ConeGeometry(.25,.22,28),ring=new THREE.TorusGeometry(.255,.018,5,32);
 for(const site of lighthouseSites){
  const geo=landPosition(site.geo,regionAt,heightAt,.24);if(!geo)continue;
  const p=worldPoint(geo),h=site.height;
  const add=(shape,pos,s,tint,rotation=[0,0,0])=>buildings.add(shape,[p.x+pos[0],p.y+pos[1],p.z+pos[2]],s,rotation,tint);
  add(tower,[0,h*.5,0],[1,h,1],0xe2d5ad);add(cylinder,[0,h*.68,0],[.22,h*.13,.22],0xa15c40);
  add(cylinder,[0,h+.015,0],[.30,.055,.30],0x4c574d);add(lanternGlass,[0,h+.15,0],[1,1,1],0x698a7b);
  for(let j=0;j<8;j++){const t=j/8*Math.PI*2;add(cube,[Math.cos(t)*.154,h+.15,Math.sin(t)*.154],[.021,.27,.021],0x354a41);}
  add(lanternRoof,[0,h+.36,0],[1,1,1],0x7e4c35);add(ring,[0,h+.07,0],[1,1,1],0x4a4f3c,[Math.PI/2,0,0]);
  add(cube,[.32,.15,.08],[.42,.30,.34],0xd1c38c);add(roof,[.32,.30,.08],[.48,.40,.40],0x975538);
  lighthouses.push({name:site.name,coordinates:site.geo,drawingCoordinates:geo,position:p.toArray()});
 }
 const clusters=[[4.2,58.5],[4.1,60.2],[7.0,63.2],[11.0,66.4],[-2.9,59.5],[-5.9,56.2],[-8.5,54.8],[17.3,57.0],[20.1,55.6],[7.2,55.3],[-.8,58.0],[-3.2,50.0]];
 for(const[lon,lat]of clusters)for(let i=0;i<(mobile?2:4);i++){
  const geo=[lon+(random()-.5)*.5,lat+(random()-.5)*.22],p=worldPoint(geo),size=.25+random()*.35;
  if(regionAt(geo)||[[size*1.6,0],[-size*1.6,0],[0,size*1.6],[0,-size*1.6]].some(([x,z])=>regionAt(geoFrom(p.x+x,p.z+z))))continue;
  p.y=-.055;rocks.add(sphere,[p.x,p.y+.12,p.z],[size*(.8+random()*.6),size*.72,size*.70],[random()*.2,random()*6.28,random()*.3],i%2?0x787c65:0x9b9877);
  // Broken foam curls hug each real rock rather than drawing an opaque patch.
  for(let j=0;j<14;j++){const a=j/18*Math.PI*2,b=(j+.65)/18*Math.PI*2,r=size*1.35;ink.push(p.x+Math.cos(a)*r,-.026,p.z+Math.sin(a)*r*.75,p.x+Math.cos(b)*r,-.026,p.z+Math.sin(b)*r*.75);}
  seaRocks.push({geo,size});
 }
 group.add(buildings.mesh(material,'rural-houses-and-coastal-lighthouses'));group.add(rocks.mesh(material,'smooth-offshore-rocks'));
 const inkGeometry=new THREE.BufferGeometry();inkGeometry.setAttribute('position',new THREE.Float32BufferAttribute(ink,3));const marks=new THREE.LineSegments(inkGeometry,new THREE.LineBasicMaterial({color:0xe4ddbd,transparent:true,opacity:.66,depthWrite:false}));marks.name='scenery-engraved-ground-and-foam';group.add(marks);
 group.userData={houses,lighthouses,seaRocks,houseCount:houses.length,lighthouseCount:lighthouses.length,rockCount:seaRocks.length};
 for(const g of[cube,cylinder,sphere,roof,tower,lanternGlass,lanternRoof,ring])g.dispose();scene.add(group);return{group,houses:houses.length,lighthouses:lighthouses.length,rocks:seaRocks.length,drawCalls:3};
}
