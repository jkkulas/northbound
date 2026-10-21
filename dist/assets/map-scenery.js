/* Small, solid manuscript scenery. Land supports are sampled over their entire
 * footprint against both the coast and the exaggerated river ribbons. */
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
 mesh(material,name){const mesh=new this.THREE.Mesh(this.geometry(),material);mesh.name=name;mesh.userData.dimensional=true;return mesh;}
}

function occupiedGround(scene,reservedBounds){
 const bounds=[...reservedBounds];
 const reserve=(position,width,depth,angle=0)=>{const x=position[0],z=position[2],rx=(Math.abs(Math.cos(angle))*width+Math.abs(Math.sin(angle))*depth)/2,rz=(Math.abs(Math.sin(angle))*width+Math.abs(Math.cos(angle))*depth)/2;bounds.push({min:[x-rx,0,z-rz],max:[x+rx,0,z+rz]});};
 scene.traverse(object=>{
  if(object.name==='terrain-fitted-island-bridges')for(const bridge of object.userData.bridges||[])for(const a of bridge.abutments)reserve(a.position,.54,.54);
  if(object.name==='geographic-manuscript-scenery'){
   for(const h of object.userData.houses||[])reserve(h.position,h.footprint.width,h.footprint.depth,h.rotation);
   for(const h of object.userData.lighthouses||[])reserve(h.position,h.footprint.width,h.footprint.depth);
  }
 });return bounds;
}

function sceneryGround(regionAt,heightAt,isDry,reservedBounds){
 const dry=isDry||((x,z)=>!!regionAt(geoFrom(x,z)));
 const reserved=(x,z,r)=>reservedBounds.some(b=>{const a=b.min,c=b.max,ax=a.x??a[0],az=a.z??a[2],cx=c.x??c[0],cz=c.z??c[2];return x+r>ax-.20&&x-r<cx+.20&&z+r>az-.20&&z-r<cz+.20;});
 const corridor=(x,z)=>{const[lon,lat]=geoFrom(x,z);return lon>9.7&&lon<11.6&&lat>58.5&&lat<61.2;};
 function footprint(x,z,width,depth,angle=0,maxRelief=.36){
  if(reserved(x,z,Math.hypot(width,depth)/2)||corridor(x,z))return null;
  const points=[],cos=Math.cos(angle),sin=Math.sin(angle),nx=Math.max(3,Math.ceil(width/.13)),nz=Math.max(3,Math.ceil(depth/.13));let min=Infinity,max=-Infinity;
  for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){
   const a=(i/nx-.5)*width,b=(j/nz-.5)*depth,px=x+a*cos+b*sin,pz=z-a*sin+b*cos;
   if(!dry(px,pz,.035))return null;const h=heightAt(...geoFrom(px,pz));min=Math.min(min,h);max=Math.max(max,h);points.push([px,h,pz]);
  }
  return max-min<=maxRelief?{min,max,points,width,depth,angle}:null;
 }
 function fit(geo,width,depth,angle=0,radius=.48){
  const x=(geo[0]-13)*2.2,z=(60-geo[1])*4.4;
  for(let ring=0;ring<=Math.ceil(radius/.09);ring++)for(let i=0;i<(ring?24:1);i++){
   const theta=i/24*Math.PI*2,px=x+Math.cos(theta)*ring*.09,pz=z+Math.sin(theta)*ring*.09,support=footprint(px,pz,width,depth,angle);
   if(support)return{geo:geoFrom(px,pz),x:px,z:pz,y:support.max+.025,support};
  }
  return null;
 }
 return{dry,reserved,corridor,footprint,fit};
}

function irregularCrown(THREE){
 const g=new THREE.SphereGeometry(1,10,6),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x),bulge=1+Math.sin(a*5+y*5)*.075+Math.sin(a*9-y*8)*.035;p.setXYZ(i,x*bulge,y*.86,z*bulge);}
 g.computeVertexNormals();return g;
}
function coniferCrown(THREE){
 const points=[[.025,.10],[.30,.20],[.19,.27],[.27,.34],[.13,.40],[.23,.48],[.12,.56],[.18,.63],[.085,.70],[.13,.78],[.055,.86],[.07,.91],[.018,.99],[0,1.07]];
 const g=new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),10),a=g.attributes.position;
 for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i),t=Math.atan2(z,x),r=1+Math.sin(t*7+y*14)*.07;a.setXYZ(i,x*r,y+Math.sin(t*6+y*18)*.012,z*r);}
 g.computeVertexNormals();return g;
}

export function addSculptedWoodland({THREE,scene,worldPoint,heightAt,regionAt,isDry,reservedBounds=[],mobile=false}){
 const group=new THREE.Group();group.name='sculpted-manuscript-woodlands';
 const random=randomFrom(218),ground=sceneryGround(regionAt,heightAt,isDry,occupiedGround(scene,reservedBounds)),material=sceneryPigment(THREE),pine=new Batch(THREE),broad=new Batch(THREE),trunks=new Batch(THREE);
 const cone=coniferCrown(THREE),crown=irregularCrown(THREE),stem=new THREE.CylinderGeometry(.027,.047,.64,6);
 pine.add(cone,[0,0,0],[1,1,1],[0,0,0],0x3e593c);
 broad.add(crown,[-.16,.65,0],[.25,.31,.23],[0,0,.15],0x536b3e);broad.add(crown,[.15,.72,.03],[.25,.33,.23],[0,0,-.15],0x6b7d40);broad.add(crown,[0,.87,-.09],[.29,.31,.26],[0,0,0],0x798644);
 trunks.add(stem,[0,.24,0],[1,1.12,1],[0,0,0],0x705331);
 const groves=[
  [6.5,60.9,1.35,.65],[8.3,60.1,.95,.45],[11.8,62.6,1.6,.8],[14.5,60.8,1.8,.7],
  [15.9,63.0,1.7,.8],[19.3,64.9,1.9,.7],[24.2,64.1,1.7,.8],[25.8,61.6,1.7,.8],
  [22.8,52.0,1.3,.55],[15.2,53.4,1.3,.55],[14.8,50.8,1.1,.4],[8.5,50.9,1.2,.55],
  [-4.6,56.8,.9,.55],[-7.5,53.6,.65,.4],[-1.3,54.1,.75,.5],[-2.1,51.7,.9,.45],
  [16.0,57.1,.8,.5],[27.9,58.3,1.3,.65],[10.2,57.0,.45,.45],[21.4,55.4,.65,.6],
  [24.7,57.1,1.5,.7],[25.0,58.7,1.3,.7],[23.5,55.8,1.2,.6],[27.7,60.9,1.5,.8],
  [28.0,63.0,1.6,.9],[19.0,59.0,.6,.6],[12.0,58.7,.65,.5],[8.1,63.0,.6,.6],
  [11.9,49.8,1.2,.7],[8.8,48.5,1.2,.6],[3.7,48.7,1.2,.6],[5.6,50.0,.8,.6],
  [18.5,50.2,1.1,.6],[17.0,51.8,1.0,.5],[-3.4,57.3,.8,.6],[-5.7,54.3,.65,.4],
  [12.3,55.6,.25,.25],[10.3,55.25,.28,.22],[7.5,52.5,.8,.6],[17.5,65.9,1.2,.6]
 ];
 const placements=[],target=mobile?440:760;
 for(let pass=0;pass<5&&placements.length<target;pass++)for(const[lon,lat,rx,ry]of groves)for(let i=0;i<(mobile?9:13)&&placements.length<target;i++){
  const t=random()*Math.PI*2,r=Math.sqrt(random()),geo=[lon+Math.cos(t)*r*rx,lat+Math.sin(t)*r*ry],h=heightAt(...geo);
  if(!regionAt(geo)||h>5.3)continue;
  const p=worldPoint(geo),scale=.76+random()*.66,support=ground.footprint(p.x,p.z,scale*.22,scale*.22,0,.43);
  if(!support||ground.reserved(p.x,p.z,scale*.38)||placements.some(q=>q.p.distanceToSquared(p)<.105))continue;
  p.y=support.min-.035;
  placements.push({geo,p,scale,pine:lat>58||h>1.9||random()>.62,rotation:random()*Math.PI*2,groundSamples:support.points});
 }
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3();
 const install=(type,geometry,name)=>{
  const list=placements.filter(type),mesh=new THREE.InstancedMesh(geometry,material,list.length);mesh.name=name;mesh.userData.dimensional=true;
  list.forEach((tree,i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),tree.rotation);s.set(tree.scale,tree.scale,tree.scale);matrix.compose(tree.p,q,s);mesh.setMatrixAt(i,matrix);});
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);
 };
 install(t=>t.pine,pine.geometry(),'sculpted-fir-canopies');install(t=>!t.pine,broad.geometry(),'sculpted-oak-canopies');install(()=>true,trunks.geometry(),'woodland-trunks');
 group.userData={dimensional:true,trees:placements.length,conifers:placements.filter(p=>p.pine).length,broadleaf:placements.filter(p=>!p.pine).length,placements:placements.map(p=>({coordinates:p.geo,position:p.p.toArray(),scale:p.scale,groundSamples:p.groundSamples})),grounding:'whole root footprint excludes coast, lakes, rivers and landmark foundations'};
 cone.dispose();crown.dispose();stem.dispose();scene.add(group);return{group,count:placements.length,drawCalls:3};
}

const villageSites=[
 ['Hardanger',[6.3,60.32],4],['Telemark',[8.5,59.1],5],['Gudbrandsdal',[9.5,61.5],5],['Trøndelag',[11.1,63.9],5],
 ['Dalarna',[14.4,60.6],5],['Småland',[14.5,57.2],5],['Scania',[13.5,55.9],5],['Jutland',[9.2,56.1],5],
 ['Pomerania',[16.1,54.0],5],['Masuria',[21.9,53.8],5],['Wielkopolska',[17.0,52.1],6],['Lower Silesia',[16.3,51.0],5],
 ['Yorkshire',[-1.6,54.2],5],['Wales',[-3.8,52.1],5],['Munster',[-8.6,52.0],4],['Schleswig',[9.3,54.7],4],
 ['Brandenburg',[13.9,52.8],5],['Finnish lakes',[26.0,61.5],5],['Savonia',[27.4,62.7],5],['Karelia',[29.0,61.7],4],
 ['Harju',[25.3,59.0],5],['Tartu hinterland',[26.1,58.3],5],['Vidzeme',[25.4,57.3],5],['Courland',[22.0,56.9],5],
 ['Samogitia',[22.4,55.6],5],['Aukštaitija',[25.7,55.4],5],['Rhineland',[6.8,50.3],6],['Bavaria',[11.4,49.1],6],
 ['Burgundy',[4.6,47.7],5],['Loire',[1.5,47.8],5],['Picardy',[2.6,49.4],6],['Flanders',[3.8,50.8],6],
 ['Friesland',[6.2,53.1],4],['East Anglia',[.7,52.3],4],['Perthshire',[-3.8,56.5],5],['Donegal',[-7.9,54.6],4],
 ['Gotland',[18.4,57.4],3],['Funen',[10.3,55.25],3],['Åland',[20.0,60.2],2],['South Iceland',[-20.4,64.0],4]
];
const lighthouseSites=[
 {name:'Lindesnes lighthouse',geo:[7.0469,57.9828],height:1.45},
 {name:'Kullen lighthouse',geo:[12.4525,56.3017],height:1.35},
 {name:'Hirtshals lighthouse',geo:[9.9410,57.5844],height:1.48},
 {name:'Kõpu lighthouse',geo:[22.199,58.915],height:1.38}
];

export function addMapScenery({THREE,scene,worldPoint,heightAt,regionAt,isDry,reservedBounds=[],mobile=false}){
 const group=new THREE.Group();group.name='geographic-manuscript-scenery';
 const ground=sceneryGround(regionAt,heightAt,isDry,occupiedGround(scene,reservedBounds)),material=sceneryPigment(THREE),buildings=new Batch(THREE),rocks=new Batch(THREE),random=randomFrom(1502);
 const cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,16),sphere=irregularCrown(THREE);
 const roofShape=new THREE.Shape();roofShape.moveTo(-.5,0);roofShape.lineTo(0,.42);roofShape.lineTo(.5,0);roofShape.closePath();
 const roof=new THREE.ExtrudeGeometry(roofShape,{depth:1,bevelEnabled:false,steps:1});roof.translate(0,0,-.5);
 const houses=[],lighthouses=[],seaRocks=[],settlements=[];
 function foundation(p,width,depth,angle){
  const c=Math.cos(angle),s=Math.sin(angle),points=[],vertices=[],corners=[[-width/2,-depth/2],[width/2,-depth/2],[width/2,depth/2],[-width/2,depth/2]];
  for(let k=0;k<4;k++){const a=corners[k],b=corners[(k+1)%4],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.10);
   for(let i=0;i<n;i++){
    const ends=[i/n,(i+1)/n].map(t=>{const u=a[0]+(b[0]-a[0])*t,v=a[1]+(b[1]-a[1])*t,x=p.x+u*c+v*s,z=p.z-u*s+v*c;return[x,heightAt(...geoFrom(x,z))-.055,z];});
    const[a0,b0]=ends,at=[a0[0],p.y+.055,a0[2]],bt=[b0[0],p.y+.055,b0[2]];vertices.push(...a0,...at,...bt,...a0,...bt,...b0);points.push(...ends);
   }
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();buildings.add(geo,[0,0,0],[1,1,1],[0,0,0],0x9c8a5d);geo.dispose();return points;
 }
 function house(fitted,index,scale,angle,name){
  const p={x:fitted.x,y:fitted.y,z:fitted.z},north=fitted.geo[1]>57,color=(north?[0xcab88c,0xad6550,0xd9bd8b,0xb38d58]:[0xdecba0,0xc9bb8d,0xd8bd80,0xbfb78e])[index%4],roofColor=[0x995b3c,0x784b38,0x626e56,0xa5653e][index%4],tall=index%5===0;
  const local=(x,y,z)=>[p.x+(x*Math.cos(angle)+z*Math.sin(angle))*scale,p.y+y*scale,p.z+(-x*Math.sin(angle)+z*Math.cos(angle))*scale];
  const add=(shape,pos,s,tint)=>buildings.add(shape,local(...pos),s.map(v=>v*scale),[0,angle,0],tint),body=tall?.72:.49;
  foundation(p,.72*scale,.55*scale,angle);
  add(cube,[0,body/2,0],[.70,body,.53],color);add(cube,[0,.065,0],[.74,.13,.57],0x9c8d69);add(roof,[0,body,0],[.84,.78,.68],roofColor);
  add(cube,[.21,body+.24,-.10],[.085,.28,.085],0x8b7651);add(cube,[.21,body+.385,-.10],[.115,.035,.115],0xb4a279);
  for(const y of(tall?[.29,.57]:[.31]))for(const x of[-.22,.22]){
   add(cube,[x,y,.273],[.12,.15,.025],0x405449);add(cube,[x,y,.291],[.018,.16,.015],0xdfce9e);add(cube,[x,y,.30],[.12,.018,.014],0xceba84);
   add(cube,[x-.09,y,.283],[.035,.16,.018],roofColor);add(cube,[x+.09,y,.283],[.035,.16,.018],roofColor);
  }
  add(cube,[0,.145,.28],[.13,.29,.03],0x6d5036);add(cube,[.035,.15,.30],[.012,.016,.016],0xcbb57a);
  for(const y of[.24,.43])add(cube,[.36,y,-.05],[.023,.12,.095],0x4a5848);
  if(north){add(cube,[0,body*.5,.28],[.028,body,.025],0x7b6245);add(cube,[0,body-.07,.28],[.71,.025,.025],0x7b6245);}
  if(index%13===0){
   // A small belfry belongs to the town house, with an actual pierced lantern.
   add(cube,[0,body+.26,0],[.21,.42,.21],0xcfbc8a);for(const x of[-.075,.075])add(cube,[x,body+.57,0],[.035,.18,.17],0xa59262);
   add(roof,[0,body+.67,0],[.34,.55,.30],0x646e52);
  }
  houses.push({settlement:name,geo:fitted.geo,position:[p.x,p.y,p.z],scale,rotation:angle,footprint:{width:.74*scale,depth:.57*scale},groundSamples:fitted.support.points,terrainRelief:fitted.support.max-fitted.support.min});
 }
 for(const[name,center,count]of villageSites){
  const before=houses.length;
  for(let i=0;i<(mobile?Math.ceil(count*.65):count);i++){
   const angle=(random()-.5)*1.15,scale=.70+random()*.28,theta=i*2.39996,r=.25+Math.sqrt(i)*.50;
   const geo=[center[0]+Math.cos(theta)*r/2.2,center[1]+Math.sin(theta)*r/4.4],fitted=ground.fit(geo,.78*scale,.60*scale,angle,.65);
   if(!fitted||heightAt(...fitted.geo)>3.5||houses.some(h=>Math.hypot(h.position[0]-fitted.x,h.position[2]-fitted.z)<.61))continue;
   house(fitted,houses.length,scale,angle,name);
  }
  if(houses.length>before)settlements.push({name,coordinates:center,houses:houses.length-before});
 }
 const lanternGlass=new THREE.CylinderGeometry(.15,.15,.25,16),tower=new THREE.CylinderGeometry(.19,.27,1,20),lanternRoof=new THREE.ConeGeometry(.25,.22,20),ring=new THREE.TorusGeometry(.255,.018,5,24);
 for(const site of lighthouseSites){
  const fitted=ground.fit(site.geo,1.08,.74,0,2.2);if(!fitted)continue;
  const p=fitted,h=site.height;foundation(p,1.04,.70,0);
  const add=(shape,pos,s,tint,rotation=[0,0,0])=>buildings.add(shape,[p.x+pos[0],p.y+pos[1],p.z+pos[2]],s,rotation,tint);
  add(tower,[-.20,h*.5,0],[1,h,1],0xe2d5ad);add(cylinder,[-.20,h*.68,0],[.22,h*.13,.22],0xa15c40);
  add(cylinder,[-.20,h+.015,0],[.30,.055,.30],0x4c574d);add(lanternGlass,[-.20,h+.15,0],[1,1,1],0x698a7b);
  for(let j=0;j<8;j++){const t=j/8*Math.PI*2;add(cube,[-.20+Math.cos(t)*.154,h+.15,Math.sin(t)*.154],[.021,.27,.021],0x354a41);}
  add(lanternRoof,[-.20,h+.36,0],[1,1,1],0x7e4c35);add(ring,[-.20,h+.07,0],[1,1,1],0x4a4f3c,[Math.PI/2,0,0]);
  add(cube,[.24,.15,.08],[.42,.30,.34],0xd1c38c);add(roof,[.24,.30,.08],[.48,.40,.40],0x975538);
  lighthouses.push({name:site.name,coordinates:site.geo,drawingCoordinates:fitted.geo,position:[p.x,p.y,p.z],groundSamples:fitted.support.points,footprint:{width:1.08,depth:.74}});
 }
 const clusters=[[4.2,58.5],[4.1,60.2],[7.0,63.2],[11.0,66.4],[-2.9,59.5],[-5.9,56.2],[-8.5,54.8],[17.3,57.0],[20.1,55.6],[7.2,55.3],[-.8,58.0],[-3.2,50.0]];
 for(const[lon,lat]of clusters)for(let i=0;i<(mobile?2:4);i++){
  const geo=[lon+(random()-.5)*.5,lat+(random()-.5)*.22],p=worldPoint(geo),size=.25+random()*.35;
  if(regionAt(geo)||[[size*1.6,0],[-size*1.6,0],[0,size*1.6],[0,-size*1.6]].some(([x,z])=>regionAt(geoFrom(p.x+x,p.z+z))))continue;
  p.y=-.055;rocks.add(sphere,[p.x,p.y+.12,p.z],[size*(.8+random()*.6),size*.72,size*.70],[random()*.2,random()*6.28,random()*.3],i%2?0x787c65:0x9b9877);
  seaRocks.push({geo,size});
 }
 group.add(buildings.mesh(material,'rural-towns-and-coastal-lighthouses'));group.add(rocks.mesh(material,'sculpted-offshore-rocks'));
 group.userData={dimensional:true,houses,lighthouses,seaRocks,settlements,houseCount:houses.length,lighthouseCount:lighthouses.length,rockCount:seaRocks.length,grounding:'whole foundation grid excludes sea, lakes, visible river ribbons and landmark foundations; masonry skirts conform to the DEM'};
 for(const g of[cube,cylinder,sphere,roof,tower,lanternGlass,lanternRoof,ring])g.dispose();scene.add(group);return{group,houses:houses.length,lighthouses:lighthouses.length,rocks:seaRocks.length,drawCalls:2};
}
