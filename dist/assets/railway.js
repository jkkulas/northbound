/* A small double-ended intercity train. Build before villages/woodland so their
 * entire footprints can use railwayCorridor.intersectsDisc(x,z,radius).
 * update() takes elapsed seconds; it is deterministic and allocates no models. */
import {createMapModelMaterial,createModelBuilder} from './atlas-models.js';
const geoFrom=(x,z)=>[x/2.2+13,60-z/4.4];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smoother=t=>t*t*t*(t*(t*6-15)+10);
const corridorWidth=.60;

function distanceToSegment(x,z,a,b){
 const dx=b[0]-a[0],dz=b[2]-a[2],t=clamp(((x-a[0])*dx+(z-a[2])*dz)/(dx*dx+dz*dz||1),0,1);
 return Math.hypot(x-a[0]-dx*t,z-a[2]-dz*t);
}
function planarBoxDistance(x,z,b){const a=b.min,c=b.max;return Math.hypot(Math.max((a.x??a[0])-x,0,x-(c.x??c[0])),Math.max((a.z??a[2])-z,0,z-(c.z??c[2])));}

function makeCar(THREE,material,cab){
 const b=createModelBuilder(THREE),ivory=0xebe0bc,blue=0x376474,window=0x233f49,metal=0x696d62,red=0xad6145;
 // The tapered solid shell is swept around an eight-sided rounded rectangle.
 const rings=[[-.65,cab<0?.70:1,.04],[-.46,1,0],[.46,1,0],[.65,cab>0?.70:1,.04]],section=[[-.25,.14],[-.285,.21],[-.285,.45],[-.22,.53],[.22,.53],[.285,.45],[.285,.21],[.25,.14]],v=[];
 const point=(ring,i)=>[section[i][0]*ring[1],section[i][1]-ring[2],ring[0]];
 for(let r=0;r<rings.length-1;r++)for(let k=0;k<section.length;k++){
  const next=(k+1)%section.length,a=point(rings[r],k),c=point(rings[r],next),d=point(rings[r+1],next),e=point(rings[r+1],k);v.push(...a,...d,...c,...a,...e,...d);
 }
 for(const r of[0,rings.length-1])for(let k=1;k<section.length-1;k++){const a=point(rings[r],0),c=point(rings[r],k),d=point(rings[r],k+1);v.push(...(r?[a,d,c]:[a,c,d]).flat());}
 const shell=new THREE.BufferGeometry();shell.setAttribute('position',new THREE.Float32BufferAttribute(v,3));shell.computeVertexNormals();b.add(shell,ivory);
 b.box(0,.17,0,.50,.11,1.08,blue);b.box(0,.54,0,.35,.035,.76,metal);
 for(const x of[-.29,.29]){
  b.box(x,.265,0,.018,.035,1.12,red);
  for(let i=0;i<5;i++)b.box(x,.395,(i-2)*.19,.018,.12,.145,window);
  b.box(x,.31,-.48,.02,.27,.025,0xc9c4aa);b.box(x,.31,.48,.02,.27,.025,0xc9c4aa);
 }
 for(const z of[-.42,.42]){
  b.box(0,.105,z,.47,.11,.21,metal);
  for(const x of[-.21,.21])b.add(new THREE.CylinderGeometry(.075,.075,.055,10),0x3f4540,[x,.075,z],[0,0,Math.PI/2]);
 }
 if(cab){
  const z=cab*.65;b.box(0,.36,z,.31,.13,.018,window);b.box(0,.20,z,.33,.035,.028,blue);
  for(const x of[-.15,.15])b.box(x,.26,z+cab*.015,.055,.035,.028,0xf1cf7d);
 }else{
  for(const z of[-.67,.67])b.box(0,.30,z,.38,.32,.065,0x61685f);
  b.box(0,.575,0,.24,.06,.24,0x9b9e8c);
 }
 const group=b.finish(cab<0?'paris-driving-cab':cab>0?'warsaw-driving-cab':'intercity-coach',material);
 group.userData={...group.userData,kind:'modern-electric-intercity-car',cab};return group;
}

export function addRailway({THREE,scene,worldPoint,heightAt,regionAt,isDry,reservedBounds=[],mobile=false}){
 const group=new THREE.Group();group.name='paris-warsaw-railway';
 const material=createMapModelMaterial(THREE),b=createModelBuilder(THREE),dry=isDry||((x,z)=>!!regionAt(geoFrom(x,z)));
 // South of the exaggerated Eiffel, Cologne, Berlin and Warsaw foundations.
 // The endpoints sit beside their city ensembles rather than entering them.
 const waypoints=[[-23.8,51.4],[-18.3,52.0],[-15.3,47.3],[-10.1,43.5],[-4.5,41.5],[2.8,38.7],[9.5,39.3],[17.9,39.4],[19.3,36]],curve=new THREE.CatmullRomCurve3(waypoints.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal');
 const length=curve.getLength(),segments=Math.ceil(length/.075),step=length/segments,samples=[],normals=[],terrain=[],crossings=[];
 let landmarkClearance=Infinity;
 for(let i=0;i<=segments;i++){
  const p=curve.getPointAt(i/segments),t=curve.getTangentAt(i/segments),normal=new THREE.Vector3(-t.z,0,t.x).normalize();let high=-Infinity;
  for(const side of[-.42,-.21,0,.21,.42])high=Math.max(high,heightAt(...geoFrom(p.x+normal.x*side,p.z+normal.z*side)));
  for(const box of reservedBounds)landmarkClearance=Math.min(landmarkClearance,planarBoxDistance(p.x,p.z,box)-corridorWidth);
  if(!regionAt(geoFrom(p.x,p.z)))throw new Error('Paris-Warsaw railway route leaves continental land');
  samples.push([p.x,high+.19,p.z]);terrain.push(high);normals.push(normal);
  crossings.push(!dry(p.x,p.z,.39));
 }
 if(landmarkClearance<.12)throw new Error('Paris-Warsaw railway corridor overlaps a landmark');
 // A railway embankment smooths small DEM bumps while always covering the full
 // ballast footprint. The bounded grade envelope raises dips, never cuts hills.
 const profile=samples.map(p=>p[1]),radius=Math.ceil(1.2/step);
 for(let i=0;i<=segments;i++)for(let j=Math.max(0,i-radius);j<=Math.min(segments,i+radius);j++)samples[i][1]=Math.max(samples[i][1],profile[j]-Math.abs(j-i)*step*.30);
 const elevated=samples.map(p=>p[1]);
 for(let i=0;i<=segments;i++){let sum=0,weight=0;for(let j=-5;j<=5;j++){const w=6-Math.abs(j);sum+=elevated[clamp(i+j,0,segments)]*w;weight+=w;}samples[i][1]=Math.max(profile[i],sum/weight+.025);}
 const at=(distance,out=new THREE.Vector3())=>{const f=clamp(distance/length,0,1)*segments,i=Math.min(segments-1,Math.floor(f)),t=f-i;return out.set(samples[i][0]*(1-t)+samples[i+1][0]*t,samples[i][1]*(1-t)+samples[i+1][1]*t,samples[i][2]*(1-t)+samples[i+1][2]*t);};
 const intersectsDisc=(x,z,radius=0)=>samples.some((p,i)=>i&&distanceToSegment(x,z,samples[i-1],p)<=corridorWidth+radius);
 scene.userData.railwayCorridor={samples,halfWidth:corridorWidth,intersectsDisc};
 // All ballast, river decks, sleepers, rails and buffers share one draw call.
 const ribbon=(offset,width,top,bottom,pigment,grounded=false)=>{
  const vertices=[];
  const section=(i,side,lower)=>{const p=samples[i],n=normals[i],x=p[0]+n.x*(offset+side*width/2),z=p[2]+n.z*(offset+side*width/2),y=lower?(grounded&&!crossings[i]?Math.min(p[1]+bottom,heightAt(...geoFrom(x,z))-.02):p[1]+bottom):p[1]+top;return[x,y,z];};
  for(let i=0;i<segments;i++){
   const a=section(i,-1,false),c=section(i,1,false),d=section(i+1,1,false),e=section(i+1,-1,false),al=section(i,-1,true),cl=section(i,1,true),dl=section(i+1,1,true),el=section(i+1,-1,true);
   vertices.push(...a,...c,...d,...a,...d,...e,...a,...e,...el,...a,...el,...al,...c,...cl,...dl,...c,...dl,...d);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();b.add(geometry,pigment);
 };
 ribbon(0,.80,-.07,-.16,0x9a9980,true);ribbon(-.21,.034,0,-.045,0x6c756f);ribbon(.21,.034,0,-.045,0x6c756f);
 const p=new THREE.Vector3(),prev=new THREE.Vector3(),next=new THREE.Vector3(),tangent=new THREE.Vector3(),rotation=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),side=new THREE.Vector3(),normal=new THREE.Vector3(),basis=new THREE.Matrix4();
 function pose(distance,target){
  at(distance,p);at(distance-.42,prev);at(distance+.42,next);tangent.subVectors(next,prev).normalize();side.crossVectors(up,tangent).normalize();normal.crossVectors(tangent,side).normalize();basis.makeBasis(side,normal,tangent);rotation.setFromRotationMatrix(basis);
  target.position.set(p.x,(prev.y+next.y)*.5,p.z);target.quaternion.copy(rotation);
 }
 const sleeper=new THREE.Object3D();
 for(let d=.12;d<length;d+=.25){pose(d,sleeper);b.add(new THREE.BoxGeometry(.65,.045,.075),0x6e6551,[sleeper.position.x,sleeper.position.y-.045,sleeper.position.z],sleeper.rotation.toArray().slice(0,3));}
 for(const d of[.08,length-.08]){pose(d,sleeper);const q=sleeper.position.clone(),n=side.clone();for(const sign of[-1,1])b.box(q.x+n.x*.21*sign,q.y+.13,q.z+n.z*.21*sign,.055,.26,.055,0x675d46);b.beam([q.x-n.x*.28,q.y+.25,q.z-n.z*.28],[q.x+n.x*.28,q.y+.25,q.z+n.z*.28],.04,0x9e6645,6);}
 const track=b.finish('continuous-ballast-sleepers-and-steel-rails',material);group.add(track);
 const cars=[makeCar(THREE,material,-1),makeCar(THREE,material,0),makeCar(THREE,material,1)],carOffsets=[-1.4,0,1.4];cars.forEach(car=>group.add(car));
 const travelSeconds=54,dwellSeconds=2,period=2*(travelSeconds+dwellSeconds),endMargin=2.18;
 function update(timeSeconds){
  const t=((timeSeconds%period)+period)%period,reverse=t>=travelSeconds+dwellSeconds,leg=reverse?t-travelSeconds-dwellSeconds:t,progress=leg>=travelSeconds?1:smoother(leg/travelSeconds),distance=endMargin+(length-endMargin*2)*(reverse?1-progress:progress);
  for(let i=0;i<cars.length;i++)pose(distance+carOffsets[i],cars[i]);
  group.userData.motion={distance,direction:reverse?'Paris':'Warsaw',dwell:leg>=travelSeconds};
 }
 const bridgeSpans=[];let first=-1;
 for(let i=0;i<=segments+1;i++){if(crossings[i]&&first<0)first=i;if(!crossings[i]&&first>=0){bridgeSpans.push({start:Math.max(0,first-1)*step,end:Math.min(segments,i)*step});first=-1;}}
 group.userData={dimensional:true,route:'Paris - Warsaw',style:'modern double-ended intercity train',endpoints:[{city:'Paris',coordinates:geoFrom(samples[0][0],samples[0][2])},{city:'Warsaw',coordinates:geoFrom(samples.at(-1)[0],samples.at(-1)[2])}],routeSamples:samples,length,clearanceHalfWidth:corridorWidth,landmarkClearance,riverCrossings:bridgeSpans,carOffsets,travelSeconds,dwellSeconds,period,drawCalls:4,terrainFollowing:true,mobile};
 update(11);scene.add(group);return{group,cars,track,update,at,period,samples,length,drawCalls:4};
}
